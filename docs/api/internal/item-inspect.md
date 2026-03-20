# GET /api/idlemmo/item/[id]

Fetches full stat and tier data for a single item by its hashed ID. Used by the Gear Calculator when loading a saved preset or when a user selects an item — provides the base stats and per-tier modifiers needed to compute totals.

> Source: `app/api/idlemmo/item/[id]/route.ts`

---

## Authentication

Requires a valid session **and** an IdleMMO API token configured in Settings.

---

## Request

```bash
GET /api/idlemmo/item/abc123def456
```

**Path Parameters**

| Parameter | Description |
|---|---|
| `id` | Hashed item ID (obtained from `/api/items` or the IdleMMO API) |

---

## Response — 200 OK

```json
{
  "item": {
    "hashed_id": "abc123def456",
    "name": "Ashenfire Crown",
    "description": "Forged in the fires of the Ashfields.",
    "image_url": "https://cdn.idle-mmo.com/images/items/ashenfire-crown.png",
    "type": "HELMET",
    "quality": "EPIC",
    "vendor_price": 5000,
    "max_tier": 10,
    "requirements": {
      "defence": 50
    },
    "stats": {
      "protection": 120,
      "agility": 80
    },
    "effects": [
      {
        "attribute": "experience",
        "target": "dungeon",
        "value": 10,
        "value_type": "percentage"
      }
    ],
    "tier_modifiers": {
      "protection": 12,
      "agility": 8
    }
  }
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `item.hashed_id` | string | Item hashed ID |
| `item.name` | string | Item name |
| `item.description` | string\|null | Flavour text |
| `item.image_url` | string\|null | Item image URL |
| `item.type` | string | Item type (e.g. `HELMET`, `SWORD`) |
| `item.quality` | string | Quality tier (e.g. `EPIC`) |
| `item.vendor_price` | integer\|null | Gold vendor price |
| `item.max_tier` | integer | Maximum tier this item can be upgraded to |
| `item.requirements` | object\|null | Skill level requirements to equip (e.g. `{ "defence": 50 }`) |
| `item.stats` | object\|null | Base combat stat values at **tier 1** (e.g. `{ "protection": 120 }`) |
| `item.effects` | array\|null | Passive effects (XP bonuses, etc.) |
| `item.effects[].attribute` | string | Affected attribute (e.g. `experience`) |
| `item.effects[].target` | string | Activity the effect applies to (e.g. `dungeon`) |
| `item.effects[].value` | integer | Effect magnitude |
| `item.effects[].value_type` | string | Value type (`percentage` or `flat`) |
| `item.tier_modifiers` | object\|null | Additive bonus per tier above 1 |

**Tier formula:**
```
effective_stat = base_stat + (tier - 1) × tier_modifier[stat]
```

Example: `protection` with base 120, modifier 12, at tier 5 → `120 + 4 × 12 = 168`

See `docs/game-mechanics/items.md` for full tier formula documentation.

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

## Response — 404 Not Found

```json
{ "error": "IdleMMO API /v1/item/abc123def456/inspect returned 404" }
```

---

## Response — 500 Internal Server Error

```json
{ "error": "IdleMMO API /v1/item/abc123def456/inspect returned 500" }
```

---

## Data Source

Proxies `GET /v1/item/{hashedId}/inspect` from the IdleMMO API. No local caching — each call hits IdleMMO with a 60-second ISR revalidation window.
