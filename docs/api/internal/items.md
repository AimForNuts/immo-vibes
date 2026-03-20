# GET /api/items

Searches the **local item database** (not IdleMMO directly) by equipment type, with optional name and quality filters. Used by the Gear Calculator's item picker.

> Source: `app/api/items/route.ts`

---

## Authentication

Requires a valid session. Returns `401` if unauthenticated.

---

## Request

```bash
GET /api/items?type=SWORD
GET /api/items?type=HELMET&q=ashen&quality=EPIC
```

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Equipment type (case-insensitive). Must match one of the 9 equipment types. |
| `q` | string | No | Name search substring (case-insensitive, `ILIKE %q%`). |
| `quality` | string | No | Exact quality filter (case-insensitive). One of: `STANDARD`, `REFINED`, `PREMIUM`, `EPIC`, `LEGENDARY`, `MYTHIC`. |

**Valid `type` values:** `SWORD`, `DAGGER`, `BOW`, `SHIELD`, `HELMET`, `CHESTPLATE`, `GREAVES`, `GAUNTLETS`, `BOOTS`

---

## Response — 200 OK

```json
{
  "items": [
    {
      "hashedId": "abc123def456",
      "name": "Ashenfire Crown",
      "type": "HELMET",
      "quality": "EPIC",
      "imageUrl": "https://cdn.idle-mmo.com/images/items/ashenfire-crown.png",
      "syncedAt": "2026-03-19T10:00:00.000Z"
    }
  ]
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `items` | array | Up to 30 matching items, sorted by name |
| `items[].hashedId` | string | Item hashed ID — use this to call `/api/idlemmo/item/[id]` for full stats |
| `items[].name` | string | Item name |
| `items[].type` | string | Equipment type (uppercase) |
| `items[].quality` | string | Item quality tier (uppercase) |
| `items[].imageUrl` | string\|null | Item image URL from IdleMMO CDN |
| `items[].syncedAt` | string | Timestamp of the last admin sync for this item (ISO 8601) |

> **Note:** Results are capped at 30. This endpoint does not paginate. If you need all items of a type, trigger a sync first via `POST /api/admin/sync-items`.

---

## Response — 400 Bad Request

```json
{ "error": "type is required" }
```

---

## Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## Data Source

Reads from the local `items` table (Neon Postgres). Data is populated by the admin sync endpoint. Does **not** call the IdleMMO API at request time.

**Database table:** `items` (`hashed_id`, `name`, `type`, `quality`, `image_url`, `synced_at`)
