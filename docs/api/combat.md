# Combat

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/combat/world_bosses/list` — World Bosses List

Retrieve a list of all currently available world bosses including their status, loot drops, and battle schedules.

**Required Scope:** `v1.combat.world_bosses.list`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/combat/world_bosses/list
```

**Example Response**
```json
{
    "world_bosses": [
        {
            "id": 1,
            "name": "Isadora",
            "image_url": "https://cdn.idle-mmo.com/images/isadora.png",
            "level": 50,
            "location": {
                "id": 10,
                "name": "Simpletopia"
            },
            "loot": [
                {
                    "hashed_item_id": "abc123def456",
                    "name": "Fluffy Egg",
                    "image_url": "https://cdn.idle-mmo.com/images/fluffy-egg.png",
                    "quality": "EPIC",
                    "quantity": 1,
                    "chance": 0.5
                },
                {
                    "hashed_item_id": "ghi789jkl012",
                    "name": "Chest of Upgrade Stones",
                    "image_url": "https://cdn.idle-mmo.com/images/chest.png",
                    "quality": "COMMON",
                    "quantity": 2,
                    "chance": 15
                }
            ],
            "status": "READY_FOR_LOBBY",
            "battle_starts_at": "2025-12-21T12:00:00.000000Z",
            "battle_ends_at": "2025-12-21T12:30:00.000000Z"
        }
    ],
    "endpoint_updates_at": "2025-12-21T12:30:05.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `world_bosses` | array | List of world bosses |
| `world_bosses.*.id` | integer | Boss ID |
| `world_bosses.*.name` | string | Boss name |
| `world_bosses.*.image_url` | string | Boss image URL |
| `world_bosses.*.level` | integer | Boss level |
| `world_bosses.*.location.id` | integer | Location ID |
| `world_bosses.*.location.name` | string | Location name |
| `world_bosses.*.loot` | array | List of loot drops |
| `world_bosses.*.loot.*.hashed_item_id` | string | Hashed item ID |
| `world_bosses.*.loot.*.name` | string | Item name |
| `world_bosses.*.loot.*.image_url` | string\|null | Item image URL |
| `world_bosses.*.loot.*.quality` | string | Item quality |
| `world_bosses.*.loot.*.quantity` | integer | Drop quantity |
| `world_bosses.*.loot.*.chance` | float | Drop chance |
| `world_bosses.*.status` | string | `IN_PROGRESS`, `READY_FOR_LOBBY`, or `RESPAWNING` |
| `world_bosses.*.battle_starts_at` | string\|null | Battle start timestamp (ISO 8601) |
| `world_bosses.*.battle_ends_at` | string\|null | Battle end timestamp (ISO 8601) |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/combat/dungeons/list` — Dungeons List

Retrieve a list of all currently available dungeons including their loot drops, experience rewards, and requirements.

**Required Scope:** `v1.combat.dungeons.list`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/combat/dungeons/list
```

**Example Response**
```json
{
    "dungeons": [
        {
            "id": 1,
            "name": "Crystal Caverns",
            "description": "A mysterious cavern filled with glowing crystals and dangerous creatures.",
            "image_url": "https://cdn.idle-mmo.com/images/crystal-caverns.png",
            "level_required": 1,
            "difficulty": 100,
            "length": 60000,
            "cost": 100,
            "shards": 5,
            "completion_requirement": 10,
            "location": {
                "id": 1,
                "name": "Simpletopia"
            },
            "loot": [
                {
                    "hashed_item_id": "abc123def456",
                    "name": "Crystal Shard",
                    "image_url": "https://cdn.idle-mmo.com/images/crystal-shard.png",
                    "quality": "COMMON",
                    "quantity": 1,
                    "chance": 25
                },
                {
                    "hashed_item_id": "ghi789jkl012",
                    "name": "Ancient Rune",
                    "image_url": "https://cdn.idle-mmo.com/images/ancient-rune.png",
                    "quality": "EPIC",
                    "quantity": 1,
                    "chance": 5
                }
            ],
            "experience": {
                "skills": {
                    "combat": 100,
                    "dungeoneering": 50
                }
            }
        }
    ],
    "endpoint_updates_at": "2025-12-21T13:00:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `dungeons` | array | List of dungeons |
| `dungeons.*.id` | integer | Dungeon ID |
| `dungeons.*.name` | string | Dungeon name |
| `dungeons.*.description` | string\|null | Dungeon description |
| `dungeons.*.image_url` | string | Dungeon image URL |
| `dungeons.*.level_required` | integer | Minimum character level required |
| `dungeons.*.difficulty` | integer | Difficulty rating |
| `dungeons.*.length` | integer | Duration in milliseconds |
| `dungeons.*.cost` | integer | Entry cost |
| `dungeons.*.shards` | integer | Shards awarded |
| `dungeons.*.completion_requirement` | integer | Completions required to unlock next tier |
| `dungeons.*.location.id` | integer | Location ID |
| `dungeons.*.location.name` | string | Location name |
| `dungeons.*.loot` | array | List of loot drops |
| `dungeons.*.loot.*.hashed_item_id` | string | Hashed item ID |
| `dungeons.*.loot.*.name` | string | Item name |
| `dungeons.*.loot.*.image_url` | string\|null | Item image URL |
| `dungeons.*.loot.*.quality` | string | Item quality |
| `dungeons.*.loot.*.quantity` | integer | Drop quantity |
| `dungeons.*.loot.*.chance` | float | Drop chance |
| `dungeons.*.experience.skills` | object | Map of skill name to XP awarded |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/combat/enemies/list` — Enemies List

Retrieve a list of all enemies across all available locations including their stats, loot drops, and location information.

**Required Scope:** `v1.combat.enemies.list`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/combat/enemies/list
```

**Example Response**
```json
{
    "enemies": [
        {
            "id": 1,
            "name": "Goblin",
            "image_url": "https://cdn.idle-mmo.com/images/goblin.png",
            "level": 5,
            "experience": 50,
            "health": 100,
            "chance_of_loot": 25,
            "location": {
                "id": 1,
                "name": "Simpletopia"
            },
            "loot": [
                {
                    "hashed_item_id": "abc123def456",
                    "name": "Lucky Rabbit Foot",
                    "image_url": "https://cdn.idle-mmo.com/images/foot.png",
                    "quality": "COMMON",
                    "quantity": 1,
                    "chance": 15
                },
                {
                    "hashed_item_id": "ghi789jkl012",
                    "name": "Blue Scroll",
                    "image_url": "https://cdn.idle-mmo.com/images/blue-scroll.png",
                    "quality": "COMMON",
                    "quantity": 2,
                    "chance": 8.5
                }
            ]
        }
    ],
    "endpoint_updates_at": "2025-12-21T13:30:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `enemies` | array | List of enemies |
| `enemies.*.id` | integer | Enemy ID |
| `enemies.*.name` | string | Enemy name |
| `enemies.*.image_url` | string | Enemy image URL |
| `enemies.*.level` | integer | Enemy level |
| `enemies.*.experience` | integer | XP awarded on kill |
| `enemies.*.health` | integer | Enemy health points |
| `enemies.*.chance_of_loot` | integer | Base chance (%) of dropping loot |
| `enemies.*.location.id` | integer | Location ID |
| `enemies.*.location.name` | string | Location name |
| `enemies.*.loot` | array | List of loot drops |
| `enemies.*.loot.*.hashed_item_id` | string | Hashed item ID |
| `enemies.*.loot.*.name` | string | Item name |
| `enemies.*.loot.*.image_url` | string\|null | Item image URL |
| `enemies.*.loot.*.quality` | string | Item quality |
| `enemies.*.loot.*.quantity` | integer | Drop quantity |
| `enemies.*.loot.*.chance` | float | Drop chance |
| `endpoint_updates_at` | string | When this endpoint data next updates |
