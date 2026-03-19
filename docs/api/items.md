# Items

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/item/search` — Item Search

Search for items by name. Returns paginated results with basic item information.

**Required Scope:** `v1.item.search`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | string | Conditional | Search query to filter items by name or description. Required if `type` is not provided. |
| `type` | string | Conditional | Filter by item type (e.g., `WEAPON`, `UPGRADE_STONE`). Required if `query` is not provided. |
| `page` | integer | No | Page number for pagination (default: `1`) |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/item/search
```

**Example Response**
```json
{
    "items": [
        {
            "hashed_id": "abc123def456",
            "name": "Iron Sword",
            "description": "A basic iron sword for combat.",
            "image_url": "https://cdn.idle-mmo.com/images/iron-sword.png",
            "type": "weapon",
            "quality": "COMMON",
            "vendor_price": 100
        },
        {
            "hashed_id": "ghi789jkl012",
            "name": "Iron Shield",
            "description": "A sturdy iron shield for defense.",
            "image_url": "https://cdn.idle-mmo.com/images/iron-shield.png",
            "type": "SHIELD",
            "quality": "COMMON",
            "vendor_price": 150
        }
    ],
    "pagination": {
        "current_page": 1,
        "last_page": 3,
        "per_page": 20,
        "total": 45,
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
| `items.*.type` | string | Item type |
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

**Example Response**
```json
{
    "item": {
        "hashed_id": "abc123def456",
        "name": "Bow",
        "description": "A sturdy bow made from ancient wood",
        "image_url": "https://cdn.idle-mmo.com/images/bow.png",
        "type": "WEAPON",
        "quality": "COMMON",
        "vendor_price": 100,
        "is_tradeable": true,
        "max_tier": 5,
        "requirements": {
            "level": 10,
            "strength": 15
        },
        "stats": {
            "damage": 10,
            "accuracy": 5
        },
        "effects": [
            {
                "attribute": "experience",
                "target": "dungeon",
                "value": 5,
                "value_type": "percentage"
            }
        ],
        "tier_modifiers": {
            "2": 1.2,
            "3": 1.4,
            "4": 1.6,
            "5": 1.8
        },
        "upgrade_requirements": [
            {
                "item_id": 123,
                "quantity": 2
            }
        ],
        "health_restore": null,
        "hunger_restore": null,
        "recipe": {
            "skill": "Crafting",
            "level_required": 10,
            "max_uses": 5,
            "experience": {
                "skills": {
                    "forge": 500
                },
                "stats": {
                    "strength": 20
                }
            },
            "materials": [
                {
                    "hashed_item_id": "xyz789abc123",
                    "item_name": "Oak Wood",
                    "quantity": 3
                }
            ],
            "result": {
                "hashed_item_id": "result123",
                "item_name": "Refined Bow"
            }
        },
        "chest_drops": [
            {
                "hashed_item_id": "l43p249",
                "item_name": "Coin",
                "quantity": 100,
                "chance": 25.5
            },
            {
                "hashed_item_id": "hj324lu2",
                "item_name": "Gem",
                "quantity": 1,
                "chance": 5
            }
        ],
        "pet": {
            "id": 15,
            "hashed_id": "pet789xyz",
            "name": "Fire Dragon",
            "description": "A majestic dragon with blazing scales",
            "image_url": "https://cdn.idle-mmo.com/images/pets/fire-dragon.png"
        },
        "where_to_find": {
            "enemies": [
                {
                    "id": 123,
                    "name": "Goblin",
                    "level": 8
                }
            ],
            "dungeons": [
                {
                    "id": 456,
                    "name": "Vineyard Labyrinth"
                }
            ],
            "world_bosses": [
                {
                    "id": 789,
                    "name": "Isadora"
                }
            ]
        }
    },
    "endpoint_updates_at": "2025-12-21T13:30:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `item` | object | Item details |
| `item.hashed_id` | string | Hashed item ID |
| `item.name` | string | Item name |
| `item.description` | string | Item description |
| `item.image_url` | string | Item image URL |
| `item.type` | string | Item type |
| `item.quality` | string | Item quality |
| `item.vendor_price` | integer | Vendor sell price |
| `item.is_tradeable` | boolean | Whether the item can be traded |
| `item.max_tier` | integer | Maximum upgrade tier |
| `item.requirements` | object\|null | Stat/level requirements to equip |
| `item.stats` | object\|null | Combat or skill stats granted |
| `item.effects` | array\|null | Special effects granted by the item |
| `item.effects.*.attribute` | string | Affected attribute |
| `item.effects.*.target` | string | Target of the effect |
| `item.effects.*.value` | integer\|float | Effect magnitude |
| `item.effects.*.value_type` | string | Value type (e.g., `percentage`) |
| `item.tier_modifiers` | object\|null | Stat multipliers per tier |
| `item.upgrade_requirements` | array\|null | Materials needed to upgrade |
| `item.upgrade_requirements.*.item_id` | integer | Required item ID |
| `item.upgrade_requirements.*.quantity` | integer | Required quantity |
| `item.health_restore` | integer\|null | HP restored on use |
| `item.hunger_restore` | integer\|null | Hunger restored on use |
| `item.recipe` | object\|null | Crafting recipe details |
| `item.recipe.skill` | string | Skill used to craft |
| `item.recipe.level_required` | integer | Skill level required |
| `item.recipe.max_uses` | integer | Max recipe uses |
| `item.recipe.experience` | object | XP awarded on craft |
| `item.recipe.experience.skills` | object | Skill XP map |
| `item.recipe.experience.stats` | object | Stat XP map |
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
| `item.pet` | object\|null | Pet associated with this item |
| `item.pet.id` | integer | Pet ID |
| `item.pet.hashed_id` | string | Pet hashed ID |
| `item.pet.name` | string | Pet name |
| `item.pet.description` | string | Pet description |
| `item.pet.image_url` | string | Pet image URL |
| `item.where_to_find` | object\|null | Sources where this item can be obtained |
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
| `tier` | integer | Yes | The tier of the item (`0` for base tier) |
| `type` | string | Yes | Type of market data: `listings` or `orders` |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/item/{hashed_item_id}/market-history
```

**Example Response**
```json
{
    "history_data": [
        {
            "date": "2025-01-15T00:00:00.000000Z",
            "total_sold": 1250,
            "average_price": 100
        },
        {
            "date": "2025-01-16T00:00:00.000000Z",
            "total_sold": 1250,
            "average_price": 100
        }
    ],
    "latest_sold": [
        {
            "item": {
                "hashed_id": "abc123def456",
                "name": "Iron Sword",
                "image_url": "https://cdn.idle-mmo.com/images/iron-sword.png"
            },
            "tier": 3,
            "quantity": 5,
            "price_per_item": 1350,
            "total_price": 6750,
            "sold_at": "2025-01-16T14:30:00.000000Z"
        },
        {
            "item": {
                "hashed_id": "abc123def456",
                "name": "Iron Sword",
                "image_url": "https://cdn.idle-mmo.com/images/iron-sword.png"
            },
            "tier": 2,
            "quantity": 1,
            "price_per_item": 1200,
            "total_price": 1200,
            "sold_at": "2025-01-16T14:25:00.000000Z"
        }
    ],
    "type": "listings",
    "endpoint_updates_at": "2025-01-16T15:00:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `history_data` | array | Daily aggregated price history |
| `history_data.*.date` | string | Date of the data point (ISO 8601) |
| `history_data.*.average_price` | integer | Average sale price for that day |
| `history_data.*.total_sold` | integer | Total units sold that day |
| `latest_sold` | array | Most recent individual transactions |
| `latest_sold.*.item.hashed_id` | string | Item hashed ID |
| `latest_sold.*.item.name` | string | Item name |
| `latest_sold.*.item.image_url` | string | Item image URL |
| `latest_sold.*.tier` | integer | Item tier sold |
| `latest_sold.*.quantity` | integer | Quantity sold |
| `latest_sold.*.price_per_item` | integer | Price per unit |
| `latest_sold.*.total_price` | integer | Total transaction price |
| `latest_sold.*.sold_at` | string | Transaction timestamp (ISO 8601) |
| `type` | string | Market data type returned (`listings` or `orders`) |
| `endpoint_updates_at` | string | When this endpoint data next updates |
