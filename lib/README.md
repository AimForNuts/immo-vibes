# Shared Libraries (`lib/`)

Shared modules used across the app. Import from here rather than duplicating logic in feature folders.

## Files

### `lib/db/schema.ts`
All Drizzle table definitions and TypeScript types. This is the schema source of truth.
- Read this before writing any query or migration.
- Full reference: `docs/database.md`

### `lib/db/index.ts`
Exports `db` — the Drizzle client configured for Neon serverless.
- `db` — `NeonHttpDatabase` instance ready to use with the schema

### `lib/idlemmo.ts`
IdleMMO external API client. All server-side calls to `api.idle-mmo.com` go through here.

Key exports:
- `getCharacterInfo(hashedId, token)` → `Promise<CharacterDetail>` — full character data including stats, skills, location, guild
- `getAltCharacters(hashedId, token)` → `Promise<AltCharacter[]>` — all alts on the same account
- `getCharacterPets(hashedId, token)` → `Promise<CharacterPet[]>` — pets with stats and evolution data
- `searchItemsByType(type, token)` → `Promise<ItemSearchResult[]>` — auto-paginated item search by type
- `inspectItem(hashedId, token)` → `Promise<ItemInspect>` — full item detail including stats, recipe, effects, tier modifiers
- `getEnemies(token)` → `Promise<EnemyInfo[]>` — enemy list (HP, XP, loot) — no combat stats; use `data/enemy-combat-stats.ts`
- `getDungeons(token)` → `Promise<DungeonInfo[]>` — dungeon list with difficulty and length
- `IDLEMMO_ITEM_TYPES` — all 42 item type strings as a const array
- Interfaces: `CharacterDetail`, `AltCharacter`, `CharacterPet`, `ItemSearchResult`, `ItemInspect`, `EnemyInfo`, `DungeonInfo`

### `lib/idlemmo-queue.ts`
Client-side rate-limit-aware fetch queue for browser components that call IdleMMO API proxy routes.

Key exports:
- `idleMmoQueue` — singleton `IdleMmoQueue` instance
  - `.fetch(url, tag)` → `Promise<Response>` — enqueues a GET; dispatches one at a time respecting `X-RateLimit-*` headers
  - `.cancelByTag(tag)` — aborts all queued and in-flight requests with the given tag
  - `.getStatus()` → `QueueStatus` — current remaining, resetAt, queueSize, throttled
  - `.onStatusChange` — assign a callback to receive status updates
- `QueueStatus` interface

### `lib/game-constants.ts`
Shared game-domain UI constants. Single source of truth for quality colors, slot labels, and character stat mappings.

Key exports:
- `QUALITY_ORDER` — canonical quality tier order (STANDARD → UNIQUE)
- `QUALITY_HEX` — hex color per quality tier
- `QUALITY_COLORS` — Tailwind text-color class per quality tier
- `QUALITY_BORDER_COLORS` — Tailwind left-border class per quality tier
- `QUALITY_BORDER_CSS` — CSS rgba border color for inline styles
- `QUALITY_GLOW_CSS` — CSS rgba glow color for inline box-shadow
- `SLOT_LABELS` — human-readable labels for gear slot keys
- `CHAR_STAT_MAP` — maps character skill API keys to derived combat stat keys with ×2.4 multiplier
- `STATUS_DOT_COLOR` — Tailwind bg-color for character online-status dots
- `CharStatMapping` interface

### `lib/market-config.ts`
Market browser tab definitions. Maps each UI tab to its IdleMMO item types.

Key exports:
- `MARKET_TABS: MarketTab[]` — ordered list of tabs (all, resources, alchemy, gear, tools, collectables, merchants, event, recipes, legacy)
- `MarketTab` interface — `{ id, label, types }`

### `lib/auth.ts`
better-auth server instance. Import `auth` here — do not create a second instance.
- `auth` — configured with Drizzle adapter, email/password, username plugin, and custom user fields (`role`, `idlemmoToken`, `idlemmoCharacterId`)

### `lib/auth-client.ts`
better-auth browser client. Import for client-side auth actions (sign in, sign out, session).
- `authClient` — configured browser client

### `lib/utils.ts`
Utility helpers.

Key exports:
- `cn(...inputs)` → `string` — Tailwind class name merger (clsx + tailwind-merge)

## Related docs
- `docs/database.md` — full schema reference
- `docs/api/` — IdleMMO external API endpoint reference
- `docs/game-mechanics/combat-stats.md` — CHAR_STAT_MAP multiplier source
