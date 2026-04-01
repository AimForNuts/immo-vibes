# GET /api/market/zones

Returns the zones in which a given item can be found, by scanning the `zones` table.

> Source: `app/api/market/zones/route.ts`

---

## Authentication

Requires a valid session.

---

## Request

```bash
GET /api/market/zones?itemId=<hashed_id>
```

| Param | Required | Description |
|---|---|---|
| `itemId` | yes | The item's `hashed_id` |

---

## Response

```json
{
  "zones": [
    {
      "id": 1,
      "name": "Whispering Woods",
      "level_required": 5,
      "skill": "woodcutting",
      "enemies": [{ "name": "Forest Wolf", "level": 8 }],
      "dungeons": [{ "name": "Dark Cavern" }],
      "world_bosses": [{ "name": "Ancient Oak" }]
    }
  ]
}
```

Each zone only includes the arrays that matched the item. A zone can match via multiple arrays simultaneously (e.g. both `skill` and `enemies`).

---

## Error responses

| Status | Condition |
|---|---|
| 400 | `itemId` param missing |
| 401 | No valid session |
