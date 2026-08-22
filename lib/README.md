# Shared Libraries (`lib/`)

Shared modules used across the app. Import from here rather than duplicating logic in feature folders.

## Files

### `lib/db/schema.ts`
Shared TypeScript-only data shapes used by D1 services and UI types.
- Full reference: `docs/database.md`

### `lib/db/d1.ts`
Cloudflare D1 binding helper used by server-side services.
- `getD1()` - returns the required `IMMO_SYNC_DB` binding

### `lib/idlemmo.ts`
IdleMMO external API client. All server-side calls to `api.idle-mmo.com` go through here.

Key exports:
- `getCharacterInfo(hashedId, token)` - full character data including stats, skills, location, guild
- `getAltCharacters(hashedId, token)` - all alts on the same account
- `getCharacterPets(hashedId, token)` - pets with stats and evolution data
- `searchItemsByType(type, token)` - auto-paginated item search by type
- `inspectItem(hashedId, token)` - full item detail including stats, recipe, effects, tier modifiers
- `getEnemies(token)` - enemy list (HP, XP, loot); combat stats live in `data/enemy-combat-stats.ts`
- `getDungeons(token)` - dungeon list with difficulty and length
- `IDLEMMO_ITEM_TYPES` - all 42 item type strings as a const array

### `lib/idlemmo-queue.ts`
Client-side rate-limit-aware fetch queue for browser components that call IdleMMO API proxy routes.

### `lib/game-constants.ts`
Shared game-domain UI constants. Single source of truth for quality colors, slot labels, and character stat mappings.

### `lib/market-config.ts`
Market browser tab definitions. Maps each UI tab to its IdleMMO item types.

### `lib/auth.ts`
better-auth server instance. Import `auth` here; do not create a second instance.
- `auth` - configured with Cloudflare D1, email/password, username plugin, and custom user fields (`role`, `idlemmoToken`, `idlemmoCharacterId`)

### `lib/auth-client.ts`
better-auth browser client. Import for client-side auth actions.

### `lib/utils.ts`
Utility helpers.
- `cn(...inputs)` - Tailwind class name merger (clsx + tailwind-merge)

## Related Docs

- `docs/database.md` - full D1 schema reference
- `docs/api/` - IdleMMO external API endpoint reference
- `docs/game-mechanics/combat-stats.md` - `CHAR_STAT_MAP` multiplier source
