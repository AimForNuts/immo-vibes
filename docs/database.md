# Database Schema Reference

Postgres via Neon, managed by Drizzle ORM. Schema source: `lib/db/schema.ts`.
Migrations live in `lib/db/migrations/` and are applied with `drizzle-kit migrate`.

---

## Quick lookup — where to find data

| I need… | Table | Key columns |
|---|---|---|
| Item name, type, quality, image | `items` | `hashed_id`, `name`, `type`, `quality`, `image_url` |
| Item vendor price | `items` | `vendor_price` |
| Item market price (tier 1) | `items` | `last_sold_price`, `last_sold_at` |
| Item market price (any tier) | `market_price_history` | `item_hashed_id`, `tier`, `price`, `sold_at` |
| Item combat stats at tier 1 | `items` | `base_stats` |
| Item combat stats at tier N | compute client-side | `baseStat + (tier-1) × tierModifiers[stat]` |
| Item tier range | `items` | `max_tier` (1 = no tiers) |
| Item effects, requirements | `items` | `effects`, `requirements` |
| Recipe materials for a RECIPE item | `items` | `recipe` (full JSONB) |
| Which recipe produces a given item | `items` | `recipe_result_hashed_id` (deprecated → join on `recipe.result.hashed_item_id`) |
| Item drop locations (enemies, dungeons, world bosses) | `items` | `where_to_find` |
| User settings / dashboard layout | `user_preferences` | `user_id`, `dashboard_layout` |
| User's tracked price alerts | `price_tracker` | `user_id`, `item_hashed_id`, `tier` |
| Historical price series for a chart | `market_price_history` | `item_hashed_id`, `tier`, `sold_at`, `price` |
| Cron sync progress | `sync_state` | `job`, `status`, `current_type_index`, `current_page` |
| Saved gear loadouts | `gear_presets` | `user_id`, `slots` (JSONB map of slot → `{hashedId, tier}`) |
| Cached character roster | `characters` | `user_id`, `hashed_id`, `idlemmo_id` (for ordering), `current_status`, `is_member`, `cached_at` |
| Saved main-pet stats for a character | `character_pets` | `user_id`, `character_hashed_id`, `attack_power`, `protection`, `agility`, `accuracy`, `max_stamina`, `movement_speed`, `critical_chance`, `critical_damage`, `synced_at` |
| Dungeon catalog (difficulty, duration, loot) | `dungeons` | `id`, `name`, `difficulty`, `duration_ms`, `loot` |

---

## Tables

### `items`

One row per unique item in the IdleMMO catalogue.
Populated in stages by three separate sync jobs.

| Column | Type | Nullable | Populated by | Notes |
|---|---|---|---|---|
| `hashed_id` | text PK | — | sync-items | IdleMMO item identifier |
| `name` | text | — | sync-items | Display name |
| `type` | text | — | sync-items | Uppercase, e.g. `SWORD`. All 42 types in `docs/game-mechanics/item-types.md` |
| `quality` | text | — | sync-items | Uppercase: `STANDARD` `REFINED` `PREMIUM` `EPIC` `LEGENDARY` `MYTHIC` `UNIQUE` |
| `image_url` | text | ✓ | sync-items | CDN URL |
| `vendor_price` | integer | ✓ | sync-items | NPC buy price in gold |
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
| `where_to_find` | jsonb | ✓ | sync-inspect | Drop locations: `{ enemies: [{id, name, level}], dungeons: [{id, name}], world_bosses: [{id, name}] }` |

**Tier stat formula** (client-side):
```
effectiveStat = base_stats[stat] + (tier - 1) × tier_modifiers[stat]
```

**Sync order matters**: `sync-items` must run before `sync-inspect` and `sync-prices`, because those jobs look up `hashed_id` from this table.

---

### `market_price_history`

Append-only price log. One row per unique `(item, tier, sale timestamp)`.
The IdleMMO API only exposes the latest sale; persisting here builds history longer than the game retains.
Unique index: `(item_hashed_id, tier, sold_at)`.

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

### `price_tracker`

Per-user list of items the user is watching. Display only — does not drive any sync.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK | → `user.id` |
| `item_hashed_id` | text | Item being tracked |
| `item_name` | text | Denormalised for fast display |
| `item_quality` | text | Denormalised |
| `item_type` | text | Denormalised |
| `image_url` | text | Denormalised |
| `tier` | integer | Which tier the user is tracking. Default 1 |
| `created_at` | timestamp | — |

---

### `sync_state`

Tracks progress of automated cron jobs so each 10-minute Vercel invocation can resume where the last one left off.

| Column | Type | Notes |
|---|---|---|
| `job` | text PK | `'items'` \| `'recipes'` \| `'inspect'` \| `'prices'` |
| `status` | text | `'idle'` \| `'running'` \| `'done'` \| `'failed'` |
| `current_type_index` | integer | Index into `IDLEMMO_ITEM_TYPES` — prices/inspect only |
| `current_page` | integer | Pagination within the active type — prices only |
| `started_at` | timestamp | When the current run started |
| `completed_at` | timestamp | When the current run finished (null while running) |

---

### `gear_presets`

Saved gear loadouts per user.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK | → `user.id` |
| `name` | text | Display name |
| `character_id` | text | Optional — ties preset to a specific character |
| `weapon_style` | text | e.g. `'dual'` / `'single'` |
| `slots` | jsonb | `Record<slotKey, { hashedId: string; tier: number }>` |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

---

### `user_preferences`

One row per user, keyed by `user_id`.

| Column | Type | Notes |
|---|---|---|
| `user_id` | text PK FK | → `user.id` |
| `language` | text | Default `'en'` |
| `dashboard_layout` | jsonb | Array of 6 `DashboardCardType` strings |
| `updated_at` | timestamp | — |

---

### `characters`

Per-user character roster cache. Populated on first overview load; refreshed when `cached_at` is older than 5 minutes.
Ordered by `idlemmo_id ASC` for a deterministic, game-consistent order.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | serial PK | — | Auto-increment |
| `user_id` | text FK | — | → `user.id` (cascade delete) |
| `hashed_id` | text | — | IdleMMO character identifier |
| `idlemmo_id` | integer | — | IdleMMO integer ID — used for `ORDER BY idlemmo_id ASC` |
| `name` | text | — | Character display name |
| `class` | text | — | e.g. `LUMBERJACK`, `WARRIOR` |
| `image_url` | text | ✓ | CDN URL |
| `total_level` | integer | — | Sum of all skill levels |
| `location_name` | text | ✓ | Current location — primary character only |
| `current_status` | text | ✓ | `ONLINE` \| `IDLING` \| `OFFLINE` — primary only |
| `is_primary` | boolean | — | True for the token owner's main character |
| `is_member` | boolean | ✓ | Account has active membership — derived from primary `/effects` (source `"membership"`). Null until first effects sync. Shared across all characters for the same `user_id`. |
| `cached_at` | timestamp | — | When this row was last written |

**Unique index**: `(user_id, hashed_id)` — prevents duplicates on concurrent refresh.
**Service**: `lib/services/character-cache.ts` → `getCachedCharacters()`

---

### `character_pets`

Per-user, per-character saved main-pet stats. One row per `(user_id, character_hashed_id)`.
Upserted each time the user clicks **Sync Current Pet** on the character detail page.
Combat stats synced from API are stored directly; optional stats are entered manually by the user.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | text PK | — | UUID |
| `user_id` | text FK | — | → `user.id` (cascade delete) |
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
| `movement_speed` | numeric(6,1) | ✓ | User-entered movement speed |
| `critical_chance` | integer | ✓ | User-entered critical chance |
| `critical_damage` | integer | ✓ | User-entered critical damage |
| `evolution_state` | integer | — | 0–5 |
| `evolution_max` | integer | — | Always 5 |
| `evolution_bonus_per_stage` | integer | — | Always 5 (= 5% per stage) |
| `synced_at` | timestamp | — | When the user last synced |

**Unique index**: `(user_id, character_hashed_id)` — one pet per character.
**API routes**: `POST /api/characters/[id]/sync-pet`, `GET /api/characters/[id]/pet-stats`, `PATCH /api/characters/[id]/pet-stats`
**Docs**: `docs/game-mechanics/pets.md`, `docs/api/internal/pet-stats.md`

---

### `dungeons`

Global dungeon catalog. One row per IdleMMO dungeon ID.
Populated by the admin "Sync Dungeons" action (`POST /api/admin/sync-dungeons`).
Not per-user — dungeon data is the same for everyone.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | integer PK | — | IdleMMO dungeon integer ID |
| `name` | text | — | Display name |
| `image_url` | text | ✓ | CDN URL |
| `location` | text | ✓ | `location.name` from the IdleMMO API |
| `level_required` | integer | — | Minimum character level. Default 0. |
| `difficulty` | integer | — | Difficulty score used in combat ratio. Default 0 (unknown). |
| `duration_ms` | integer | — | Run duration in milliseconds (`length` field from API). Default 0. |
| `gold_cost` | integer | — | Gold cost to enter. Default 0. |
| `shards` | integer | — | Shard reward. Default 0. |
| `loot` | jsonb | ✓ | Array of `DungeonLootItem` — null until synced. |
| `synced_at` | timestamp | — | When this row was last written. |

**`DungeonLootItem` shape** (each element in the `loot` array):
```ts
{ hashed_item_id, name, image_url, quality, quantity, chance }
```

**Admin route**: `POST /api/admin/sync-dungeons`
**Docs**: `docs/api/internal/dungeons-sync.md`

---

### Auth tables (`user`, `session`, `account`, `verification`)

Managed by **better-auth**. Do not write to these directly — use `auth.api.*` methods.

---

## Sync pipeline

```
sync-items   →  sync-inspect  →  sync-prices
   ↓                 ↓                ↓
items.*          items.base_stats  items.last_sold_price
(catalog)        items.recipe      market_price_history
                 items.effects     (per tier)
                 …
```

- **sync-items**: catalog only (name, type, quality, image, vendor price)
- **sync-inspect**: inspect API — stats, tiers, recipe, effects. Must run after sync-items.
- **sync-prices**: market-history API — last sold price per tier. Must run after sync-items.

Cron order is enforced via `sync_state`: each job checks the upstream job's status before starting.
