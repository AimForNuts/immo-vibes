# PATCH /api/admin/items/[id]/store-price

Sets the NPC store purchase price for an item. Admin-only.

> Source: `app/api/admin/items/[id]/store-price/route.ts`

---

## Authentication

Requires a valid session with `role === "admin"`.

---

## Request

```bash
PATCH /api/admin/items/<hashed_id>/store-price
Content-Type: application/json

{ "store_price": 5000 }
```

| Body field | Type | Description |
|---|---|---|
| `store_price` | `number \| null` | Price in gold (≥ 0), or `null` to clear |

---

## Response

```json
{ "store_price": 5000 }
```

---

## Error responses

| Status | Condition |
|---|---|
| 400 | Invalid JSON or `store_price` is not a number ≥ 0 or null |
| 401 | No valid session |
| 403 | Session exists but user is not admin |
| 404 | Item not found |
