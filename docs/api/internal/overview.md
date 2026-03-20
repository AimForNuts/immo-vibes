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
| POST | `/api/admin/sync-items` | Admin + token | Sync one equipment type from IdleMMO into the local DB |

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
- [POST /api/admin/sync-items](./sync-items.md)
