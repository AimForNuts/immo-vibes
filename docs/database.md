# Database Schema Reference

Cloudflare D1 is the production database for migrated app data and better-auth tables. D1 migrations live in `d1/migrations/` and are applied with Wrangler.

Postgres via Neon remains configured for local/build fallback paths and legacy tables that have not been retired. Its Drizzle schema source is `lib/db/schema.ts`; migrations live in `lib/db/migrations/` and are applied with `drizzle-kit migrate`.

---

## Quick lookup — where to find data

| I need… | Table | Key columns |
|---|---|---|
| Item name, type, quality, image | D1 `items` | `hashed_id`, `name`, `type`, `quality`, `image_url` |
| Item vendor price | D1 `items` | `vendor_price` |
| Item market price (tier 1) | D1 `items` | `last_sold_price`, `last_sold_at` |
| Item market price (any tier) | D1 `market_price_history` | `item_hashed_id`, `tier`, `price`, `sold_at` |
| Item combat stats at tier 1 | D1 `items` | `base_stats` |
| Item combat stats at tier N | compute client-side | `baseStat + (tier-1) × tierModifiers[stat]` |
| Item tier range | D1 `items` | `max_tier` (1 = no tiers) |
| Item effects, requirements | D1 `items` | `effects`, `requirements` |
| Recipe materials for a RECIPE item | D1 `items` | `recipe` (full JSON) |
| Which recipe produces a given item | D1 `items` | `recipe_result_hashed_id` (deprecated → join on `recipe.result.hashed_item_id`) |
| Item store price (NPC shop cost) | D1 `items` | `store_price` |
| Item drop locations (enemies, dungeons, world bosses) | `zones` | `enemies`, `dungeons`, `world_bosses` |
| Zone catalog (name, level requirement) | D1 `zones` | `id`, `name`, `level_required` |
| Gathering item → zone associations | D1 `item_zones` | `item_hashed_id`, `zone_id` |
| User settings / dashboard layout | D1 `user_preferences` | `user_id`, `dashboard_layout` |
| User's tracked price alerts | D1 `price_tracker` | `user_id`, `item_hashed_id`, `tier` |
| Historical price series for a chart | D1 `market_price_history` | `item_hashed_id`, `tier`, `sold_at`, `price` |
| Cron sync progress | D1 `sync_state` | `job`, `status`, `current_type_index`, `current_page` |
| Recent sync failures / partial progress | D1 `sync_job_logs` | `job`, `status`, `created_at`, `details` |
| IdleMMO API typed response docs | D1 `api_endpoint_specs`, D1 `api_response_schemas`, D1 `api_schema_observations` | `key`, `active_schema`, `inferred_schema`, `new_fields` |
| Saved gear loadouts | D1 `gear_presets` | `user_id`, `slots` (JSON map of slot → `{hashedId, tier}`) |
| Cached character roster | D1 `characters` | `user_id`, `hashed_id`, `idlemmo_id` (for ordering), `current_status`, `is_member`, `cached_at` |
| Saved main-pet stats for a character | D1 `character_pets` | `user_id`, `character_hashed_id`, `attack_power`, `protection`, `agility`, `accuracy`, `max_stamina`, `movement_speed`, `critical_chance`, `critical_damage`, `synced_at` |
| Dungeon catalog (difficulty, duration, loot) | D1 `dungeons` | `id`, `name`, `zone_id`, `difficulty`, `duration_ms`, `loot` |
| User account/profile and IdleMMO token | D1 `user` | `id`, `email`, `role`, `idlemmo_token`, `idlemmo_character_id` |
| Auth sessions/accounts/verifications | D1 `session`, D1 `account`, D1 `verification` | better-auth managed columns |
| Enemy catalog (name, level, drops) | `enemies` | `id`, `name`, `level`, `zone_id`, `loot` |
| World boss catalog (name, level, drops) | `world_bosses` | `id`, `name`, `level`, `zone_id`, `loot` |

---

## Tables

### D1 `items`

One row per unique item in the IdleMMO catalogue.
Populated in stages by three separate sync jobs.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/items.service.ts`.
Created by D1 migration `d1/migrations/0011_items.sql`. The service falls back to Neon when the D1 binding is unavailable in local Node-based development.
JSON-style columns are stored as text in D1 and as `jsonb` in the existing Neon fallback schema.

| Column | Type | Nullable | Populated by | Notes |
|---|---|---|---|---|
| `hashed_id` | text PK | — | sync-items | IdleMMO item identifier |
| `name` | text | — | sync-items | Display name |
| `type` | text | — | sync-items | Uppercase, e.g. `SWORD`. All 42 types in `docs/game-mechanics/item-types.md` |
| `quality` | text | — | sync-items | Uppercase: `STANDARD` `REFINED` `PREMIUM` `EPIC` `LEGENDARY` `MYTHIC` `UNIQUE` |
| `image_url` | text | ✓ | sync-items | CDN URL |
| `vendor_price` | integer | ✓ | sync-items | NPC buy price in gold |
| `store_price` | integer | ✓ | sync-items | NPC store purchase price in gold (null if not sold in shops) |
| `synced_at` | timestamp | — | sync-items | When the catalog row was last written |
| `first_seen_at` | timestamp | — | sync-items | When this item was first inserted into the database. Set once on insert via DB default; never updated. |
| `recipe_result_hashed_id` | text | ✓ | sync-recipes | **Deprecated** — use `recipe.result.hashed_item_id` |
| `last_sold_price` | integer | ✓ | sync-prices | Latest market sale price at tier 1 |
| `last_sold_at` | timestamp | ✓ | sync-prices | When that sale happened |
| `description` | text | ✓ | sync-inspect | Flavour text |
| `is_tradeable` | boolean | ✓ | sync-inspect | Whether the item can be listed on the market |
| `max_tier` | integer | ✓ | sync-inspect | Highest tier available (1 = no tiers) |
| `requirements` | jsonb | ✓ | sync-inspect | Skill/level gates e.g. `{"strength": 100}` |
| `base_stats` | jsonb | ✓ | sync-inspect | Combat stats at tier 1 e.g. `{"attack_power": 120}` |
| `tier_modifiers` | jsonb | ✓ | sync-inspect | Additive bonus per tier e.g. `{"attack_power": 10}` |
| `effects` | jsonb | ✓ | sync-inspect | Passive bonuses (see `ItemEffect` type in schema) |
| `recipe` | jsonb | ✓ | sync-inspect | Full recipe: skill, level, materials, result (see `ItemRecipe` type) |
| `inspected_at` | timestamp | ✓ | sync-inspect | When inspect data was last synced |

**Drop location data** (enemies, dungeons, world bosses, skill nodes) was previously stored as `where_to_find` on this table. It now lives in the `zones` table — see below.

**Tier stat formula** (client-side):
```
effectiveStat = base_stats[stat] + (tier - 1) × tier_modifiers[stat]
```

**Sync order matters**: `sync-items` must run before `sync-inspect` and `sync-prices`, because those jobs look up `hashed_id` from this table.

---

### D1 `market_price_history`

Append-only price log. One row per unique `(item, tier, sale timestamp)`.
The IdleMMO API only exposes the latest sale; persisting here builds history longer than the game retains.
Unique index: `(item_hashed_id, tier, sold_at)`.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/market-price-history.service.ts`.
Created by D1 migration `d1/migrations/0012_market_price_history.sql`. The service falls back to Neon when the D1 binding is unavailable in local Node-based development.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text PK | — | UUID |
| `item_hashed_id` | text | — | References `items.hashed_id` |
| `tier` | integer | — | 1-based (tier 1 = base). Default 1. The API uses `?tier=0` to mean tier 1 — normalise on write. |
| `price` | integer | — | Gold per single item |
| `quantity` | integer | — | Quantity sold in the transaction. Default 1 |
| `sold_at` | timestamp | — | When the sale happened (from IdleMMO API) |
| `recorded_at` | timestamp | — | When we recorded this row |

**Latest price query pattern:**
```sql
SELECT price, sold_at
FROM market_price_history
WHERE item_hashed_id = $1 AND tier = $2
ORDER BY sold_at DESC
LIMIT 1;
```

---

### D1 `price_tracker`

Per-user list of items the user is watching. Display only — does not drive any sync. This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/price-tracker.service.ts`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text | User id from better-auth. No D1 foreign key while auth remains in Neon |
| `item_hashed_id` | text | Item being tracked |
| `item_name` | text | Denormalised for fast display |
| `item_quality` | text | Denormalised |
| `item_type` | text | Denormalised |
| `image_url` | text | Denormalised |
| `tier` | integer | Which tier the user is tracking. Default 1 |
| `created_at` | timestamp | — |

**Indexes**:
- `price_tracker_user_id_idx` on `user_id`

**D1 migration**: `d1/migrations/0004_price_tracker.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `price_tracker` table when D1 is unavailable in Node-based local development.

---

### D1 `sync_state`

Tracks progress of automated cron jobs and gates downstream syncs. This table now lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/sync-state.service.ts`.

| Column | Type | Notes |
|---|---|---|
| `job` | text PK | `'items'` \| `'recipes'` \| `'inspect'` \| `'prices'` |
| `status` | text | `'idle'` \| `'running'` \| `'done'` \| `'failed'` |
| `current_type_index` | integer | Index into `IDLEMMO_ITEM_TYPES` — prices/inspect only |
| `current_page` | integer | Pagination within the active type — prices only |
| `started_at` | timestamp | When the current run started |
| `completed_at` | timestamp | When the current run finished (null while running) |

**D1 migration**: `d1/migrations/0001_sync_state.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `sync_state` table when D1 is unavailable in Node-based local development.

---

### D1 `sync_job_logs`

Append-only event log for manual admin sync route observability. This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/admin/sync-logs.service.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text PK | - | UUID |
| `job` | text | - | Sync job key, e.g. `items`, `inspect`, `prices`, `recipes`, `dungeons` |
| `status` | text | - | `started`, `progress`, `success`, `failed`, or `skipped` |
| `message` | text | - | Human-readable status summary |
| `details` | text JSON | yes | Counts, paging info, error messages, or route-specific context |
| `user_id` | text | yes | Admin user who started the manual sync. No D1 foreign key while auth remains in Neon |
| `created_at` | timestamp | - | Event creation time |

**Indexes**:
- `sync_job_logs_created_at_idx` on `created_at`
- `sync_job_logs_job_created_at_idx` on `(job, created_at)`

**Service**: `lib/services/admin/sync-logs.service.ts`
**API route**: `GET /api/admin/sync-logs`
**D1 migration**: `d1/migrations/0002_sync_job_logs.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `sync_job_logs` table when D1 is unavailable in Node-based local development.

---

### D1 `api_endpoint_specs`

Editable admin catalog of curated IdleMMO API endpoints that the API Inspector can call.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `key` | text PK | - | Stable endpoint key, e.g. `guild.hall` |
| `label` | text | - | Display label |
| `method` | text | - | Currently `GET` |
| `path_template` | text | - | IdleMMO path with path params, e.g. `/v1/guild/{id}/hall` |
| `config` | jsonb | - | Params, editable test values, default test values, notes |
| `notes` | text | yes | Optional admin notes |
| `created_at` | timestamp | - | Created time |
| `updated_at` | timestamp | - | Last edited time |

**D1 migration**: `d1/migrations/0010_api_inspector.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `api_endpoint_specs` table when D1 is unavailable in Node-based local development.

### D1 `api_response_schemas`

One active typed response schema per API Inspector endpoint.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `endpoint_key` | text PK FK | - | References `api_endpoint_specs.key` |
| `inferred_schema` | jsonb | yes | Most recently saved inferred schema |
| `manual_schema` | jsonb | yes | Admin override schema |
| `active_schema` | jsonb | yes | Current schema used for comparison |
| `deprecated_fields` | jsonb | - | Explicitly marked deprecated field paths |
| `version` | integer | - | Increments on save/merge/override/deprecate |
| `last_seen_at` | timestamp | yes | Last schema update from inspector activity |
| `updated_by_user_id` | text FK | yes | Admin who last changed it |
| `updated_at` | timestamp | - | Last updated time |

**D1 migration**: `d1/migrations/0010_api_inspector.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `api_response_schemas` table when D1 is unavailable in Node-based local development.

### D1 `api_schema_observations`

Derived metadata for each inspector run. Raw responses are not stored; the UI only exposes the latest raw response from the current run.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text PK | - | UUID |
| `endpoint_key` | text FK | - | References `api_endpoint_specs.key` |
| `params` | jsonb | - | Params used for this observation |
| `status_code` | integer | - | IdleMMO HTTP status |
| `duration_ms` | integer | - | Request duration |
| `inferred_schema` | jsonb | - | Typed schema inferred from this response |
| `new_fields` | jsonb | - | Field paths present in this run but absent from active schema |
| `missing_fields` | jsonb | - | Field paths absent in this run but present in active schema |
| `type_conflicts` | jsonb | - | Field paths with conflicting types |
| `created_by_user_id` | text FK | yes | Admin who ran the observation |
| `created_at` | timestamp | - | Observation time |

**Indexes**:
- `api_schema_observations_endpoint_created_idx` on `(endpoint_key, created_at)`
- `api_schema_observations_created_idx` on `created_at`

**Service**: `lib/services/admin/api-inspector.service.ts`
**API routes**: `GET /api/admin/api-inspector`, `POST /api/admin/api-inspector/run`, `PATCH /api/admin/api-inspector/schema`
**D1 migration**: `d1/migrations/0010_api_inspector.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `api_schema_observations` table when D1 is unavailable in Node-based local development.

---

### D1 `gear_presets`

Saved gear loadouts per user. This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/gear-presets.service.ts`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text | User id from better-auth. No D1 foreign key while auth remains in Neon |
| `name` | text | Display name |
| `character_id` | text | Optional — ties preset to a specific character |
| `weapon_style` | text | e.g. `'dual'` / `'single'` |
| `slots` | text JSON | `Record<slotKey, { hashedId: string; tier: number }>` |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

**Indexes**:
- `gear_presets_user_id_idx` on `user_id`

**D1 migration**: `d1/migrations/0005_gear_presets.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `gear_presets` table when D1 is unavailable in Node-based local development.

---

### D1 `user_preferences`

One row per user, keyed by `user_id`. This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/user-preferences.service.ts`.

| Column | Type | Notes |
|---|---|---|
| `user_id` | text PK | User id from better-auth. No D1 foreign key while auth remains in Neon |
| `language` | text | Default `'en'` |
| `dashboard_layout` | text JSON | Array of 6 `DashboardCardType` strings |
| `updated_at` | timestamp | — |

**D1 migration**: `d1/migrations/0003_user_preferences.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `user_preferences` table when D1 is unavailable in Node-based local development.

---

### D1 `characters`

Per-user character roster cache. Populated on first overview load; refreshed when `cached_at` is older than 5 minutes.
Ordered by `idlemmo_id ASC` for a deterministic, game-consistent order.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/character-cache.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `user_id` | text PK (part) | — | User id from better-auth. No D1 foreign key while auth remains in Neon |
| `hashed_id` | text PK (part) | — | IdleMMO character identifier |
| `idlemmo_id` | integer | — | IdleMMO integer ID — used for `ORDER BY idlemmo_id ASC` |
| `name` | text | — | Character display name |
| `class` | text | — | e.g. `LUMBERJACK`, `WARRIOR` |
| `image_url` | text | ✓ | CDN URL |
| `total_level` | integer | — | Sum of all skill levels |
| `location_name` | text | ✓ | Current location — primary character only |
| `current_status` | text | ✓ | `ONLINE` \| `IDLING` \| `OFFLINE` — primary only |
| `is_primary` | boolean | — | True for the token owner's main character |
| `is_member` | boolean | ✓ | Account has active membership — derived from primary `/effects` (source `"membership"`). Null until first effects sync. Shared across all characters for the same `user_id`. |
| `cached_at` | text timestamp | — | When this row was last written |

**Primary key**: `(user_id, hashed_id)` — prevents duplicates on concurrent refresh.
**Index**: `(user_id, idlemmo_id)` for deterministic roster ordering.
**Service**: `lib/services/character-cache.ts` → `getCachedCharacters()`
**D1 migration**: `d1/migrations/0007_characters.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `characters` table when D1 is unavailable in Node-based local development.

---

### D1 `character_pets`

Per-user, per-character saved main-pet stats. One row per `(user_id, character_hashed_id)`.
Upserted each time the user clicks **Sync Current Pet** on the character detail page.
Combat stats synced from API are stored directly; optional stats are entered manually by the user.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/character-pets.service.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text PK | — | UUID |
| `user_id` | text | — | User id from better-auth. No D1 foreign key while auth remains in Neon |
| `character_hashed_id` | text | — | IdleMMO character hashed ID |
| `pet_id` | integer | — | IdleMMO pet-instance integer ID |
| `name` | text | — | Pet base name |
| `custom_name` | text | ✓ | Player-assigned name |
| `image_url` | text | ✓ | CDN URL |
| `level` | integer | — | Current level |
| `quality` | text | — | e.g. `LEGENDARY` |
| `attack_power` | integer | — | Combat stat from API `stats.strength` (direct value) |
| `protection` | integer | — | Combat stat from API `stats.defence` (direct value) |
| `agility` | integer | — | Combat stat from API `stats.speed` (direct value) |
| `accuracy` | integer | ✓ | User-entered accuracy stat |
| `max_stamina` | integer | ✓ | User-entered max stamina |
| `movement_speed` | text | ✓ | User-entered movement speed, serialized as text for D1 |
| `critical_chance` | integer | ✓ | User-entered critical chance |
| `critical_damage` | integer | ✓ | User-entered critical damage |
| `evolution_state` | integer | — | 0–5 |
| `evolution_max` | integer | — | Always 5 |
| `evolution_bonus_per_stage` | integer | — | Always 5 (= 5% per stage) |
| `synced_at` | timestamp | — | When the user last synced |

**Unique index**: `(user_id, character_hashed_id)` — one pet per character.
**API routes**: `POST /api/characters/[id]/sync-pet`, `GET /api/characters/[id]/pet-stats`, `PATCH /api/characters/[id]/pet-stats`
**D1 migration**: `d1/migrations/0006_character_pets.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `character_pets` table when D1 is unavailable in Node-based local development.
**Docs**: `docs/game-mechanics/pets.md`, `docs/api/internal/pet-stats.md`

---

### D1 `dungeons`

Global dungeon catalog. One row per IdleMMO dungeon ID.
Populated by the admin "Sync Dungeons" action (`POST /api/admin/sync-dungeons`).
Not per-user — dungeon data is the same for everyone.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/admin/dungeons.service.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer PK | — | IdleMMO dungeon integer ID |
| `name` | text | — | Display name |
| `image_url` | text | ✓ | CDN URL |
| `zone_id` | integer | ✓ | D1 `zones.id`; set manually by admins. No D1 foreign key so sync preserves assignments. |
| `level_required` | integer | — | Minimum character level. Default 0. |
| `difficulty` | integer | — | Difficulty score used in combat ratio. Default 0 (unknown). |
| `duration_ms` | integer | — | Run duration in milliseconds (`length` field from API). Default 0. |
| `gold_cost` | integer | — | Gold cost to enter. Default 0. |
| `shards` | integer | — | Shard reward. Default 0. |
| `loot` | text JSON | ✓ | Array of `DungeonLootItem` — null until synced. |
| `synced_at` | text timestamp | — | When this row was last written. |

**`DungeonLootItem` shape** (each element in the `loot` array):
```ts
{ hashed_item_id, name, image_url, quality, quantity, chance }
```

**Admin route**: `POST /api/admin/sync-dungeons`
**D1 migration**: `d1/migrations/0009_dungeons.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `dungeons` table when D1 is unavailable in Node-based local development.
**Docs**: `docs/api/internal/dungeons-sync.md`

---

### D1 `zones`

Global zone catalog. One row per game location. Manually maintained — `level_required` is set by admins.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/admin/zones.service.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer PK | — | Auto-increment |
| `name` | text | — | Display name (e.g. "Bluebell Hollow") |
| `level_required` | integer | — | Minimum level to access. Default 0. |
| `enemies` | text JSON | — | Reserved — typed `ZoneEnemy[]` (populated by future sync). Default `[]`. |
| `dungeons` | text JSON | — | Reserved — typed `ZoneDungeon[]` (populated by future sync). Default `[]`. |
| `world_bosses` | text JSON | — | Reserved — typed `ZoneWorldBoss[]` (populated by future sync). Default `[]`. |

**Admin routes**: `GET/POST /api/admin/zones`, `GET/PATCH/DELETE /api/admin/zones/[id]`
**D1 migration**: `d1/migrations/0008_zones.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `zones` table when D1 is unavailable in Node-based local development.

---

### D1 `item_zones`

Many-to-many join table between gathering items and zones. Admin-managed via the market detail panel.
This table lives in Cloudflare D1 database `immo-web-suite-sync` and is accessed through `lib/services/admin/zones.service.ts`.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `item_hashed_id` | text PK (part) | — | Item hash from Neon `items`. No D1 foreign key while catalog remains in Neon |
| `zone_id` | integer PK (part) | — | D1 `zones.id`; related rows are deleted manually by the zone service |

**Admin routes**: `GET /api/items/[id]/zones`, `PUT /api/items/[id]/zones`
**D1 migration**: `d1/migrations/0008_zones.sql`
**Binding**: `IMMO_SYNC_DB`
**Local fallback**: the service falls back to the legacy Neon `item_zones` table when D1 is unavailable in Node-based local development.

---

### `enemies`

Enemy catalog. One row per IdleMMO enemy. Populated by a future admin sync action.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | serial PK | — | Auto-increment |
| `name` | text | — | Display name |
| `level` | integer | — | Enemy level. Default 0. |
| `zone_id` | integer FK → `zones.id` | ✓ | `ON DELETE SET NULL` |
| `image_url` | text | ✓ | CDN URL |
| `loot` | jsonb | ✓ | Array of `{ item_hashed_id, chance }` |
| `synced_at` | timestamp | ✓ | When last synced |

**Admin lifecycle**: table exists for future enemy admin/sync work. There is no current `app/api/admin/enemies` route in this branch.

---

### `world_bosses`

World boss catalog. Same shape as `enemies` — separated because bosses appear on a different schedule and have distinct game mechanics.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | serial PK | — | Auto-increment |
| `name` | text | — | Display name |
| `level` | integer | — | Boss level. Default 0. |
| `zone_id` | integer FK → `zones.id` | ✓ | `ON DELETE SET NULL` |
| `image_url` | text | ✓ | CDN URL |
| `loot` | jsonb | ✓ | Array of `{ item_hashed_id, chance }` |
| `synced_at` | timestamp | ✓ | When last synced |

**Admin lifecycle**: table exists for future world boss admin/sync work. There is no current `app/api/admin/world-bosses` route in this branch.

---

### `zone_resources`

Junction table linking zones to item resources (drop locations).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `zone_id` | integer FK → `zones.id` | — | `ON DELETE CASCADE` |
| `item_hashed_id` | text FK → `items.hashed_id` | — | `ON DELETE CASCADE` |

Composite PK: `(zone_id, item_hashed_id)`

**Admin lifecycle**: table exists for future zone resource admin work. There is no current `app/api/admin/zones/[id]/resources` route in this branch.

---

### D1 Auth tables (`user`, `session`, `account`, `verification`)

Managed by **better-auth** against Cloudflare D1 database `immo-web-suite-sync` in production.
Created by D1 migration `d1/migrations/0013_auth.sql`.
Local Node-based development falls back to the legacy Neon Drizzle adapter when the D1 binding is unavailable.

Do not write to session/account/verification rows directly. Use `auth.api.*` methods.
App-owned user profile fields (`name`, `email`, `role`, `idlemmo_token`, `idlemmo_character_id`) are updated through `lib/services/auth-users.service.ts`.

| Table | Key columns | Notes |
|---|---|---|
| `user` | `id`, `name`, `email`, `email_verified`, `username`, `display_username`, `role`, `idlemmo_token`, `idlemmo_character_id`, `created_at`, `updated_at` | better-auth user row plus app role and IdleMMO token fields |
| `session` | `id`, `token`, `user_id`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at` | better-auth sessions; `user_id` cascades from `user` |
| `account` | `id`, `account_id`, `provider_id`, `user_id`, `password`, token fields, timestamps | better-auth credentials/accounts; `user_id` cascades from `user` |
| `verification` | `id`, `identifier`, `value`, `expires_at`, timestamps | better-auth verification/password reset data |

---

## Sync pipeline

```
sync-items   →  sync-inspect  →  sync-prices
   ↓                 ↓                ↓
items.*          items.base_stats  items.last_sold_price
(catalog)        items.recipe      market_price_history
items.store_price items.effects    (per tier)
                 …

zones.*  (populated separately — not part of the item sync pipeline)
```

- **sync-items**: catalog only (name, type, quality, image, vendor price, store price)
- **sync-inspect**: inspect API — stats, tiers, recipe, effects. Must run after sync-items. Does **not** write `where_to_find` — location data now lives in `zones`.
- **sync-prices**: market-history API — last sold price per tier. Must run after sync-items.

Cron order is enforced via D1 `sync_state`: each job checks the upstream job's status before starting.
