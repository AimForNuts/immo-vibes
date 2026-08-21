# Internal API — Investments

Authenticated endpoints for user-tracked market items.
Tracked items are stored in Cloudflare D1 table `price_tracker` through `lib/services/price-tracker.service.ts`; price history is read from D1 `market_price_history` through `lib/services/market-price-history.service.ts`. Local Node development falls back to the legacy Neon tables when D1 is unavailable.

Sources:
- `app/api/investments/route.ts`
- `app/api/investments/[id]/route.ts`
- `app/api/investments/[id]/history/route.ts`
- `lib/services/price-tracker.service.ts`
- `lib/services/market-price-history.service.ts`

---

## GET `/api/investments`

Returns the current user's tracked items.

**Auth:** Required.

**Response 200:** `{ "items": [] }`

---

## POST `/api/investments`

Adds an item to the current user's tracker.

**Auth:** Required.

**Request body:**

```json
{
  "itemHashedId": "abc123",
  "itemName": "Iron Sword",
  "itemQuality": "STANDARD",
  "itemType": "SWORD",
  "imageUrl": "https://...",
  "tier": 1
}
```

`itemHashedId`, `itemName`, `itemQuality`, and `itemType` are required non-empty strings.
`imageUrl` is optional. `tier` is optional and must be a positive integer when present.

**Response 200:** `{ "item": { ... } }`

**Errors:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "JSON body must be an object" }` | Request JSON was not an object. |
| 400 | `{ "error": "<field> is required" }` | Required field was missing or blank. |
| 400 | `{ "error": "<field> must be a string" }` | String field had the wrong type. |
| 400 | `{ "error": "tier must be a positive integer" }` | `tier` had the wrong type or was below 1. |
| 401 | `{ "error": "Unauthorized" }` | No authenticated session. |

---

## DELETE `/api/investments/[id]`

Removes a tracked item owned by the current user.

**Auth:** Required.

**Response 200:** `{ "ok": true }`

---

## GET `/api/investments/[id]/history`

Returns recent locally recorded market listings for a tracked item.

**Auth:** Required.

**Response 200:** `{ "history": [] }`

**Errors:** Returns `404` when the tracked item does not exist for the user and `500` on unexpected read failures.
