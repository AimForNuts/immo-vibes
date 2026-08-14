# Internal API Routes

These are the Next.js route handlers in `app/api/`. They are **not** the IdleMMO external API — they are the application's own endpoints consumed by frontend components.

All routes require an authenticated session (managed by better-auth) unless stated otherwise.

---

## Route Map

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/characters` | Session | List up to 5 characters for the logged-in user |
| GET | `/api/items` | Session | Search local item database by type/name/quality |
| GET | `/api/idlemmo/character/[id]` | Session + token | Fetch character detail + equipped pet from IdleMMO |
| GET | `/api/idlemmo/dungeons` | Session + token | Fetch dungeon list from IdleMMO |
| GET | `/api/idlemmo/item/[id]` | Session + token | Fetch item stats and tier data from IdleMMO |
| GET | `/api/admin/items` | Admin | List local items for the admin economy table |
| PATCH | `/api/admin/items/[id]/store-price` | Admin | Update an item's manually maintained NPC store price |
| GET | `/api/admin/users` | Admin | List users with cached characters |
| PATCH | `/api/admin/users/[id]` | Admin | Update a user's email and/or password |
| DELETE | `/api/admin/users/[id]` | Admin | Delete a user |
| DELETE | `/api/admin/users/[id]/characters/[charId]` | Admin | Dissociate one cached character from a user |
| GET | `/api/admin/zones` | Admin | List zones or return slim picker options |
| POST | `/api/admin/zones` | Admin | Create a zone |
| GET | `/api/admin/zones/[id]` | Admin | Fetch zone detail |
| PATCH | `/api/admin/zones/[id]` | Admin | Update a zone |
| DELETE | `/api/admin/zones/[id]` | Admin | Delete a zone |
| POST | `/api/admin/sync-items` | Admin + token | Sync one equipment type from IdleMMO into the local DB |
| POST | `/api/admin/sync-inspect` | Admin + token | Sync inspect data for one page of local items |
| POST | `/api/admin/sync-prices` | Admin + token | Sync latest market prices for one page of local items |
| POST | `/api/admin/sync-recipes` | Admin + token | Populate recipe result links for recipe items |
| POST | `/api/admin/sync-dungeons` | Admin + token | Sync the dungeon catalog |
| POST | `/api/cron/sync-items` | Cron secret | Scheduled item catalog sync |
| POST | `/api/cron/sync-recipes` | Cron secret | Scheduled recipe result sync |
| POST | `/api/cron/sync-prices` | Cron secret | Scheduled market price sync |

---

## Auth Model

Two layers of authentication apply:

1. **Session** — a better-auth session cookie. All routes return `401` if the session is missing.
2. **IdleMMO token** — stored per-user in `user.idlemmo_token`. Routes that proxy to IdleMMO return `400` if the token is not set. Users configure this in Settings.

Routes that hit the local database only need (1). Routes that proxy to IdleMMO need both.

---

## Error Shape

All error responses use the same shape:

```json
{ "error": "Human-readable message" }
```

HTTP status codes:

| Code | Meaning |
|---|---|
| 400 | Missing or invalid request parameter |
| 401 | No authenticated session |
| 403 | Session exists but lacks required role (admin routes) |
| 404 | Resource not found |
| 500 | Upstream API error or unexpected server error |

---

## Detailed Docs

- [GET /api/characters](./characters.md)
- [GET /api/items](./items.md)
- [GET /api/idlemmo/character/[id]](./character-detail.md)
- [GET /api/idlemmo/dungeons](./dungeons.md)
- [GET /api/idlemmo/item/[id]](./item-inspect.md)
- [Admin item routes](./admin-items.md)
- [Admin user routes](./admin-users.md)
- [Admin zone routes](./admin-zones.md)
- [POST /api/admin/sync-items](./sync-items.md)
- [Admin dungeon sync](./dungeons-sync.md)
- [Cron sync routes](./cron-sync.md)
