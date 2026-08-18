# Internal API — Item Zone Associations

Admin-only endpoints for associating gatherable items with zones.

Source:
- `app/api/items/[id]/zones/route.ts`
- `lib/services/admin/zones.service.ts`

Zone associations live in Cloudflare D1 table `item_zones` through `lib/services/admin/zones.service.ts`, with a Neon fallback for local Node development.

---

## GET `/api/items/[id]/zones`

Returns zone IDs currently associated with an item.

**Auth:** Admin session required.

**Response 200:**

```json
{ "zone_ids": [1, 2] }
```

---

## PUT `/api/items/[id]/zones`

Replaces all zone associations for an item.

**Auth:** Admin session required.

**Request body:**

```json
{ "zone_ids": [1, 2] }
```

`zone_ids` must be an array of positive integers. Invalid entries are rejected; they are not silently filtered.

**Response 200:**

```json
{ "zone_ids": [1, 2] }
```

**Errors:**

| Status | Body | Cause |
|---|---|---|
| 400 | `{ "error": "Invalid JSON body" }` | Request body could not be parsed as JSON. |
| 400 | `{ "error": "JSON body must be an object" }` | Request JSON was not an object. |
| 400 | `{ "error": "zone_ids must be an array of positive integers" }` | `zone_ids` was missing, not an array, or contained an invalid value. |
| 403 | `{ "error": "Forbidden" }` | Missing session or non-admin user. |
| 404 | `{ "error": "Item not found" }` | No item exists for the path `id`. |
