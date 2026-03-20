# GET /api/idlemmo/dungeons

Proxies the IdleMMO dungeon list to the frontend. Used by the Dungeon Planner to populate the dungeon selector and calculate difficulty ratios.

> Source: `app/api/idlemmo/dungeons/route.ts`

---

## Authentication

Requires a valid session **and** an IdleMMO API token configured in Settings.

---

## Request

No parameters.

```bash
GET /api/idlemmo/dungeons
```

---

## Response — 200 OK

```json
{
  "dungeons": [
    {
      "id": 1,
      "name": "Forsaken Dungeon",
      "difficulty": 1500,
      "level_required": 10,
      "length": 900000,
      "cost": 50,
      "location": { "id": 1, "name": "Bluebell Hollow" },
      "image_url": "https://cdn.idle-mmo.com/images/dungeons/forsaken.png"
    },
    {
      "id": 2,
      "name": "Darkwood Dungeon",
      "difficulty": 4200,
      "level_required": 25,
      "length": 1800000,
      "cost": 100,
      "location": { "id": 3, "name": "Darkwood" },
      "image_url": null
    }
  ]
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `dungeons` | array | All available dungeons |
| `dungeons[].id` | integer | Dungeon ID |
| `dungeons[].name` | string | Dungeon name |
| `dungeons[].difficulty` | integer | Dungeon difficulty score — compare against player's total combat stats to determine HP loss. See `docs/game-mechanics/dungeons.md`. |
| `dungeons[].level_required` | integer | Minimum character level to enter |
| `dungeons[].length` | integer | Run duration in **milliseconds** (divide by 60000 for minutes) |
| `dungeons[].cost` | integer | Gold cost to enter |
| `dungeons[].location` | object\|null | Location the dungeon is associated with |
| `dungeons[].location.id` | integer | Location ID |
| `dungeons[].location.name` | string | Location name |
| `dungeons[].image_url` | string\|null | Dungeon image URL |

> **Seasonal dungeons** are not returned by this endpoint. They are defined statically in `app/(dashboard)/dashboard/dungeons/difficulty.ts` as `STATIC_DUNGEONS`.

---

## Response — 400 Bad Request

```json
{ "error": "No API token" }
```

---

## Response — 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

## Response — 500 Internal Server Error

```json
{ "error": "IdleMMO /v1/combat/dungeons/list returned HTTP 503" }
```

---

## Data Source

Calls `GET /v1/combat/dungeons/list` on the IdleMMO API. The upstream response is a raw array (not wrapped); `getDungeons()` in `lib/idlemmo.ts` handles multiple known response shapes for compatibility across API versions.
