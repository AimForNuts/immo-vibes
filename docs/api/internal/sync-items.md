# POST /api/admin/sync-items

Syncs all items of a given equipment type from the IdleMMO API into the local database. Must be run before the Gear Calculator can display items for a slot — the local `items` table is the source of truth for item search.

> Source: `app/api/admin/sync-items/route.ts`

---

## Authentication

Requires a valid session with `role = "admin"` **and** an IdleMMO API token configured in Settings. Returns `403` for non-admin sessions.

---

## Request

```bash
POST /api/admin/sync-items?type=SWORD
POST /api/admin/sync-items?type=HELMET
```

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Equipment type to sync (case-insensitive). Must be one of the 9 valid equipment types. |

**Valid `type` values:** `SWORD`, `DAGGER`, `BOW`, `SHIELD`, `HELMET`, `CHESTPLATE`, `GREAVES`, `GAUNTLETS`, `BOOTS`

No request body required.

---

## Response — 200 OK

```json
{ "type": "SWORD", "synced": 34, "page": 1, "totalPages": 2, "remaining": 14, "resetAt": 1711490000 }
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `type` | string | Equipment type that was synced (uppercased) |
| `synced` | integer | Number of items upserted into the local database |
| `page` | integer | Page number that was synced |
| `totalPages` | integer | Total pages for this type |
| `remaining` | integer \| null | IdleMMO API requests remaining in the current window (`null` if header absent) |
| `resetAt` | integer | Unix timestamp (seconds) when the rate-limit window resets (`0` if header absent) |

---

## Response — 400 Bad Request — Missing or invalid type

```json
{ "error": "Invalid type. Must be one of: SWORD, DAGGER, BOW, SHIELD, HELMET, CHESTPLATE, GREAVES, GAUNTLETS, BOOTS" }
```

```json
{ "error": "No IdleMMO API token configured" }
```

---

## Response — 403 Forbidden

```json
{ "error": "Forbidden" }
```

---

## Response — 429 Too Many Requests

Returned when the IdleMMO API is rate-limiting this request. The client should wait `retryAfterMs` milliseconds before retrying the same page.

```json
{ "retryAfterMs": 57500 }
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `retryAfterMs` | integer | Milliseconds to wait before retrying. Based on `x-ratelimit-reset` header + 500ms buffer, minimum 1000ms |

---

## Behaviour

1. Calls `searchItemsByType(type, token)` in `lib/idlemmo.ts`, which auto-paginates all pages from `GET /v1/item/search`.
2. Upserts every result into the local `items` table using `hashed_id` as the conflict target.
3. On conflict (item already exists), updates `name`, `type`, `quality`, `image_url`, and `synced_at`.

**Upsert — what updates vs. what doesn't:**

| Column | On insert | On conflict (update) |
|---|---|---|
| `hashed_id` | Set | — (primary key, unchanged) |
| `name` | Set | Updated |
| `type` | Set | Updated |
| `quality` | Set | Updated |
| `image_url` | Set | Updated |
| `synced_at` | Set to now | Updated to now |

---

## Rate Limit Sensitivity

The admin UI handles rate limiting automatically: it reads `remaining` and `resetAt` from each response, waits proactively when the limit is low, and retries transparently on 429. No manual spacing is needed when using the Admin page buttons.

Direct API callers should still space calls — see `docs/api/rate-limiting.md` for the rate-limit protocol.

---

## Admin UI

This endpoint is triggered from the Admin page (`/dashboard/admin`), which provides a per-slot sync button. You should not need to call this directly.
