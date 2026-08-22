# Admin Item Routes

Admin-only endpoints for listing local items and editing manually maintained item metadata.
Item catalog persistence is Cloudflare D1-backed through `lib/services/items.service.ts`.

Sources:
- `app/api/admin/items/route.ts`
- `app/api/admin/items/[id]/store-price/route.ts`
- `lib/services/admin/items.service.ts`
- `lib/services/items.service.ts`

All routes require an authenticated session with `session.user.role === "admin"`.

---

## GET /api/admin/items

Returns a paginated item list for the admin economy table.

### Query Parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | number | `1` | Values below 1 become 1. Invalid numbers become 1. |
| `pageSize` | number | `50` | Clamped to 1-100. Invalid numbers become 50. |
| `name` | string | none | Case-insensitive partial match on `items.name`. |
| `type` | string | none | Exact match on `items.type`. |
| `quality` | string | none | Exact match on `items.quality`. |

### 200 OK

```json
{
  "data": [
    {
      "hashedId": "abc123",
      "name": "Iron Sword",
      "type": "SWORD",
      "quality": "STANDARD",
      "syncedAt": "2026-08-14T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |

---

## PATCH /api/admin/items/[id]/store-price

Updates the manually maintained NPC store price for one item.

`id` is the `items.hashed_id` value.

### Request Body

```json
{ "store_price": 1250 }
```

`store_price` must be a finite number greater than or equal to 0, or `null` to clear the value.

### 200 OK

```json
{ "store_price": 1250 }
```

### Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "store_price must be a number >= 0 or null" }` | `store_price` was missing, non-numeric, negative, infinite, or otherwise invalid. |
| 401 | `{ "error": "Unauthorized" }` | No authenticated session. |
| 403 | `{ "error": "Forbidden" }` | Authenticated user is not an admin. |
| 404 | `{ "error": "Item not found" }` | No item exists for the path `id`. |

### Side Effects

Updates only D1 `items.store_price`. Catalog sync jobs do not clear or overwrite this field.

