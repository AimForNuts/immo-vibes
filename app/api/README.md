# Internal API Routes (`app/api/`)

All internal Next.js API routes. Full request/response shapes are documented in `docs/api/internal/`.

## Route groups

### `auth/[...all]/`
better-auth catch-all handler. Handles sign-in, sign-out, session, and registration.
Do not modify — managed by better-auth. See `lib/auth.ts` for config.

### `characters/`
- `GET /api/characters` — returns the primary character and alt list for the authenticated user. Calls `getCharacterInfo` + `getAltCharacters` from `lib/idlemmo.ts`.

### `idlemmo/`
Proxy routes that forward requests to the IdleMMO API and forward rate-limit headers to the browser queue.
- `GET /api/idlemmo/character/[id]` — character stats + skills (used by Gear Calculator and Combat Planner)
- `GET /api/idlemmo/item/[id]` — full item inspect data (used by Gear Calculator)

### `market/`
DB-backed market data routes. No external API calls — all served from the `items` table.
- `GET /api/market` — paginated item list by tab or name search
- `GET /api/market/item/[id]` — full item detail including inspect fields
- `GET /api/market/price/[id]` — latest market price for an item at a given tier
- `GET /api/market/crafted-by/[id]` — finds the RECIPE item that produces the given item

### `investments/`
Price tracker CRUD.
- `GET /api/investments` — list tracked items for the authenticated user
- `POST /api/investments` — add a new tracked item
- `DELETE /api/investments/[id]` — remove a tracked item
- `GET /api/investments/[id]/history` — latest price entry for a tracked item

### `items/`
- `GET /api/items` — item catalog search used by the Gear Calculator picker (filters by type, quality, name)

### `admin/`
Admin-only sync triggers. All routes require `session.user.role === "admin"`.
- `POST /api/admin/sync-items` — syncs item catalog for a given type from the IdleMMO API
- `POST /api/admin/sync-prices` — updates market prices for a batch of items
- `POST /api/admin/sync-recipes` — populates `recipeResultHashedId` for RECIPE items
- `POST /api/admin/sync-inspect` — fetches and stores full inspect data for a batch of items
- `POST /api/admin/market-type-check` — checks market listing counts per item type

### `cron/`
Cron-triggered routes called by Vercel's cron scheduler. Protected by `CRON_SECRET`.
- `GET /api/cron/sync-items` — Monday 00:00 UTC — full item catalog refresh
- `GET /api/cron/sync-recipes` — Monday 02:00 UTC — recipe result ID population
- `GET /api/cron/sync-prices` — Daily 04:00 UTC — price update for 80 items ordered by `priceCheckedAt ASC`

## Related docs
- `docs/api/internal/` — detailed request/response shapes for each route
- `docs/api/` — IdleMMO external API reference
- `docs/database.md` — tables read/written by each route
