# Items

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/item/search` — Item Search

Search for items by name or type. Returns paginated results with basic item information.

**Required Scope:** `v1.item.search`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | Conditional | Search query to filter items by name or description. Required if `type` is not provided. |
| `type` | string | Conditional | Filter by item type (e.g., `SWORD`, `UPGRADE_STONE`). Required if `query` is not provided. |
| `page` | integer | No | Page number for pagination (default: `1`) |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/item/search?query=sword
```

**Example Response**
```json
{
    "items": [
        {
            "hashed_id": "abc123def456",
            "name": "Copper Sword",
            "description": null,
            "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example.png",
            "type": "SWORD",
            "quality": "STANDARD",
            "vendor_price": 30
        },
        {
            "hashed_id": "ghi789jkl012",
            "name": "Iron Sword",
            "description": null,
            "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example2.png",
            "type": "SWORD",
            "quality": "REFINED",
            "vendor_price": 35
        }
    ],
    "pagination": {
        "current_page": 1,
        "last_page": 2,
        "per_page": 20,
        "total": 23,
        "from": 1,
        "to": 20
    }
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `items` | array | List of matching items |
| `items.*.hashed_id` | string | Hashed item ID |
| `items.*.name` | string | Item name |
| `items.*.description` | string\|null | Item description |
| `items.*.image_url` | string | Item image URL |
| `items.*.type` | string | Item type (uppercase, e.g. `SWORD`, `RECIPE`, `CHEST`) |
| `items.*.quality` | string | Item quality |
| `items.*.vendor_price` | integer\|null | Vendor sell price |
| `pagination.current_page` | integer | Current page number |
| `pagination.last_page` | integer | Last available page |
| `pagination.per_page` | integer | Items per page |
| `pagination.total` | integer | Total matching items |
| `pagination.from` | integer\|null | Index of first item on this page |
| `pagination.to` | integer\|null | Index of last item on this page |

---

#### GET `/v1/item/{hashed_item_id}/inspect` — Item Inspection

Get detailed information about a specific item including stats, effects, requirements, and more.

> To obtain the `hashed_item_id`, enable **Show Hashed IDs** in your account settings. The `hashed_item_id` can be found on the item inspection page in-game.

**Required Scope:** `v1.item.inspect`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/item/{hashed_item_id}/inspect
```

**Example Response (weapon)**
```json
{
    "item": {
        "hashed_id": "abc123def456",
        "name": "Copper Sword",
        "description": null,
        "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example.png",
        "type": "SWORD",
        "quality": "STANDARD",
        "vendor_price": 30,
        "is_tradeable": true,
        "max_tier": 5,
        "requirements": {
            "combat": 5,
            "strength": 3
        },
        "stats": {
            "attack_power": 6
        },
        "effects": null,
        "tier_modifiers": {
            "attack_power": 1
        },
        "upgrade_requirements": [
            {
                "hashed_item_id": "xyz789abc123",
                "item_name": "Weapon Upgrade Stone",
                "quantity": 1
            }
        ],
        "health_restore": null,
        "hunger_restore": null,
        "recipe": null,
        "chest_drops": null,
        "pet": null,
        "where_to_find": []
    },
    "endpoint_updates_at": "2026-03-23T19:00:00+00:00"
}
```

**Example Response (recipe item)**
```json
{
    "item": {
        "hashed_id": "def456ghi789",
        "name": "Bloodmoon Sword Recipe",
        "description": "Used to forge a legendary Bloodmoon (Sword)",
        "image_url": "https://cdn.idle-mmo.com/uploaded/skins/recipe.png",
        "type": "RECIPE",
        "quality": "LEGENDARY",
        "vendor_price": 4000,
        "is_tradeable": true,
        "max_tier": 1,
        "requirements": null,
        "stats": null,
        "effects": null,
        "tier_modifiers": null,
        "upgrade_requirements": null,
        "health_restore": null,
        "hunger_restore": null,
        "recipe": {
            "skill": "Forge",
            "level_required": 78,
            "max_uses": 1,
            "experience": 1,
            "materials": [
                {
                    "hashed_item_id": "mat123",
                    "item_name": "Slime Extract",
                    "quantity": 45
                },
                {
                    "hashed_item_id": "mat456",
                    "item_name": "Lobster",
                    "quantity": 500
                }
            ],
            "result": {
                "hashed_item_id": "lrx463VdQgr7L5w1zWKP",
                "item_name": "Bloodmoon Sword"
            }
        },
        "chest_drops": null,
        "pet": null,
        "where_to_find": {
            "dungeons": [
                {
                    "id": 8,
                    "name": "Crystal Forge"
                }
            ]
        }
    },
    "endpoint_updates_at": "2026-03-23T19:00:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `item` | object | Item details |
| `item.hashed_id` | string | Hashed item ID |
| `item.name` | string | Item name |
| `item.description` | string\|null | Item description |
| `item.image_url` | string | Item image URL |
| `item.type` | string | Item type (uppercase) |
| `item.quality` | string | Item quality |
| `item.vendor_price` | integer\|null | Vendor sell price |
| `item.is_tradeable` | boolean | Whether the item can be traded |
| `item.max_tier` | integer | Maximum upgrade tier |
| `item.requirements` | object\|null | Stat/level requirements to equip (keys are stat names, e.g. `combat`, `strength`) |
| `item.stats` | object\|null | Stats granted by the item (keys are stat names, e.g. `attack_power`) |
| `item.effects` | array\|null | Special effects granted by the item |
| `item.effects.*.attribute` | string | Affected attribute (e.g. `experience`) |
| `item.effects.*.target` | string | Target of the effect (e.g. `dungeon`) |
| `item.effects.*.value` | integer\|float | Effect magnitude |
| `item.effects.*.value_type` | string | Value type (e.g., `percentage`) |
| `item.tier_modifiers` | object\|null | Bonus stat added per tier level above 1 (keys are stat names matching `stats` keys, value is the bonus added per tier) |
| `item.upgrade_requirements` | array\|null | Materials needed to upgrade the item |
| `item.upgrade_requirements.*.hashed_item_id` | string | Required item hashed ID |
| `item.upgrade_requirements.*.item_name` | string | Required item name |
| `item.upgrade_requirements.*.quantity` | integer | Required quantity |
| `item.health_restore` | integer\|null | HP restored on use |
| `item.hunger_restore` | integer\|null | Hunger restored on use |
| `item.recipe` | object\|null | Crafting recipe details (present on `RECIPE`-type items) |
| `item.recipe.skill` | string | Skill used to craft (e.g. `Forge`) |
| `item.recipe.level_required` | integer | Skill level required to use the recipe |
| `item.recipe.max_uses` | integer | Max number of times this recipe can be used |
| `item.recipe.experience` | integer | XP awarded per craft |
| `item.recipe.materials` | array | Required crafting materials |
| `item.recipe.materials.*.hashed_item_id` | string | Material hashed item ID |
| `item.recipe.materials.*.item_name` | string | Material name |
| `item.recipe.materials.*.quantity` | integer | Material quantity required |
| `item.recipe.result` | object | Crafting output |
| `item.recipe.result.hashed_item_id` | string | Result item hashed ID |
| `item.recipe.result.item_name` | string | Result item name |
| `item.chest_drops` | array\|null | Items dropped when this chest is opened |
| `item.chest_drops.*.hashed_item_id` | string | Drop item hashed ID |
| `item.chest_drops.*.item_name` | string | Drop item name |
| `item.chest_drops.*.quantity` | integer | Drop quantity |
| `item.chest_drops.*.chance` | float\|null | Drop chance |
| `item.pet` | object\|null | Pet associated with this item (for pet egg items) |
| `item.pet.id` | integer | Pet ID |
| `item.pet.hashed_id` | string | Pet hashed ID |
| `item.pet.name` | string | Pet name |
| `item.pet.description` | string\|null | Pet description |
| `item.pet.image_url` | string | Pet image URL |
| `item.where_to_find` | array\|object | Sources where this item can be obtained. Returns `[]` when no sources exist; otherwise an object with any combination of the optional keys below. |
| `item.where_to_find.enemies` | array | Enemies that drop this item |
| `item.where_to_find.enemies.*.id` | integer | Enemy ID |
| `item.where_to_find.enemies.*.name` | string | Enemy name |
| `item.where_to_find.enemies.*.level` | integer | Enemy level |
| `item.where_to_find.dungeons` | array | Dungeons that drop this item |
| `item.where_to_find.dungeons.*.id` | integer | Dungeon ID |
| `item.where_to_find.dungeons.*.name` | string | Dungeon name |
| `item.where_to_find.world_bosses` | array | World bosses that drop this item |
| `item.where_to_find.world_bosses.*.id` | integer | World boss ID |
| `item.where_to_find.world_bosses.*.name` | string | World boss name |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/item/{hashed_item_id}/market-history` — Item Market History

Get historical market data for an item including price trends and recent transactions.

> To obtain the `hashed_item_id`, enable **Show Hashed IDs** in your account settings. The `hashed_item_id` can be found on the item inspection page in-game.

**Required Scope:** `v1.item.market_history`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tier` | integer | Yes | Required by the API but does not filter results — all tiers are always returned. Pass `0` as a safe default. |
| `type` | string | Yes | Type of market data: `listings` (completed sales) or `orders` (buy orders) |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     "https://api.idle-mmo.com/v1/item/{hashed_item_id}/market-history?tier=0&type=listings"
```

**Example Response**
```json
{
    "history_data": [
        {
            "date": "2026-02-22T00:00:00+00:00",
            "average_price": 43,
            "total_sold": 129
        },
        {
            "date": "2026-03-01T00:00:00+00:00",
            "average_price": 40,
            "total_sold": 95
        }
    ],
    "latest_sold": [
        {
            "item": {
                "hashed_id": "abc123def456",
                "name": "Copper Sword",
                "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example.png"
            },
            "tier": 1,
            "quantity": 1,
            "price_per_item": 36,
            "total_price": 36,
            "sold_at": "2026-03-23T19:20:36+00:00"
        }
    ],
    "type": "listings",
    "endpoint_updates_at": "2026-03-23T20:00:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `history_data` | array | Daily aggregated price history (all tiers combined) |
| `history_data.*.date` | string | Date of the data point (ISO 8601) |
| `history_data.*.average_price` | integer | Average sale price for that day |
| `history_data.*.total_sold` | integer | Total units sold that day |
| `latest_sold` | array | Most recent individual transactions (all tiers) |
| `latest_sold.*.id` | integer | Transaction ID (only present when `type=orders`) |
| `latest_sold.*.item.hashed_id` | string | Item hashed ID |
| `latest_sold.*.item.name` | string | Item name |
| `latest_sold.*.item.image_url` | string | Item image URL |
| `latest_sold.*.tier` | integer | Item tier of this transaction |
| `latest_sold.*.quantity` | integer | Quantity sold |
| `latest_sold.*.price_per_item` | integer | Price per unit |
| `latest_sold.*.total_price` | integer | Total transaction price |
| `latest_sold.*.sold_at` | string | Transaction timestamp (ISO 8601) |
| `type` | string | Market data type returned (`listings` or `orders`) |
| `endpoint_updates_at` | string | When this endpoint data next updates |
