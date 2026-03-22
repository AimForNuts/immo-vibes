# Character

> [Back to Index](../IdleMMOAPI.md)

> **Tip:** To get the `hashed_character_id` needed by all `/v1/character/*` endpoints, call `/v1/auth/check` — the response includes `character.hashed_id`. No need to enable "Show Hashed IDs" in account settings.

---

#### GET `/v1/character/{hashed_character_id}/information` — Character View

Get detailed information about a specific character including skills, stats, currencies, and equipped pet.

**Required Scope:** `v1.character.view`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/information
```

**Example Response**
```json
{
    "character": {
        "id": 67890,
        "hashed_id": "c1234567890",
        "name": "ExampleCharacter",
        "class": "LUMBERJACK",
        "image_url": "https://cdn.idle-mmo.com/images/character.png",
        "background_url": "https://cdn.idle-mmo.com/images/background.png",
        "skills": {
            "woodcutting": { "experience": 15000, "level": 10 },
            "mining": { "experience": 25000, "level": 15 },
            "fishing": { "experience": 5000, "level": 5 },
            "cooking": { "experience": 8000, "level": 7 },
            "alchemy": { "experience": 3000, "level": 4 },
            "farming": { "experience": 12000, "level": 9 },
            "foraging": { "experience": 6000, "level": 6 },
            "hunting": { "experience": 4000, "level": 5 },
            "crafting": { "experience": 9000, "level": 8 },
            "smithing": { "experience": 18000, "level": 12 },
            "tailoring": { "experience": 2000, "level": 3 },
            "enchanting": { "experience": 1000, "level": 2 },
            "fletching": { "experience": 500, "level": 1 },
            "construction": { "experience": 7000, "level": 7 },
            "brewing": { "experience": 4500, "level": 5 },
            "smelting": { "experience": 11000, "level": 9 },
            "weaving": { "experience": 3500, "level": 4 },
            "skinning": { "experience": 2500, "level": 3 },
            "jewelling": { "experience": 1500, "level": 2 }
        },
        "stats": {
            "strength": { "experience": 12000, "level": 15 },
            "defence": { "experience": 8000, "level": 11 },
            "speed": { "experience": 5000, "level": 8 },
            "dexterity": { "experience": 3000, "level": 6 }
        },
        "gold": 50000,
        "tokens": 150,
        "shards": 25,
        "total_level": 250,
        "location": {
            "id": 3,
            "name": "Bluebell Hollow"
        },
        "equipped_pet": {
            "id": 123,
            "name": "Fluffy",
            "image_url": "https://cdn.idle-mmo.com/images/pet-fluffy.png",
            "level": 5
        },
        "guild": {
            "id": 42,
            "tag": "GG",
            "experience": 250000,
            "level": 15,
            "position": "SOLDIER"
        },
        "last_activity": "2025-01-01T00:00:00.000000+00:00",
        "current_status": "ONLINE",
        "created_at": "2024-06-15T08:00:00.000000+00:00"
    },
    "endpoint_updates_at": "2025-12-21T13:00:00.000000+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `character` | object | Character details |
| `character.id` | integer | Character ID |
| `character.hashed_id` | string | Hashed character ID |
| `character.name` | string | Character name |
| `character.class` | string | Character class |
| `character.image_url` | string\|null | Character image URL |
| `character.background_url` | string\|null | Character background image URL |
| `character.skills` | object | Map of skill name → `{experience, level}`. Contains 19 skills: `woodcutting`, `mining`, `fishing`, `cooking`, `alchemy`, `farming`, `foraging`, `hunting`, `crafting`, `smithing`, `tailoring`, `enchanting`, `fletching`, `construction`, `brewing`, `smelting`, `weaving`, `skinning`, `jewelling` |
| `character.skills.*.experience` | integer | Total XP in this skill |
| `character.skills.*.level` | integer | Current skill level |
| `character.stats` | object | Map of stat name → `{experience, level}`. Contains 4 stats: `strength`, `defence`, `speed`, `dexterity` |
| `character.stats.*.experience` | integer | Total XP in this stat |
| `character.stats.*.level` | integer | Current stat level |
| `character.gold` | integer | Current gold balance |
| `character.tokens` | integer | Current token balance |
| `character.shards` | integer | Current shard balance |
| `character.total_level` | integer | Sum of all skill and stat levels |
| `character.location.id` | integer | Current location ID |
| `character.location.name` | string | Current location name |
| `character.equipped_pet` | object\|null | Currently equipped pet, or null |
| `character.equipped_pet.id` | integer | Pet instance ID |
| `character.equipped_pet.name` | string | Pet name |
| `character.equipped_pet.image_url` | string\|null | Pet image URL |
| `character.equipped_pet.level` | integer | Pet level |
| `character.guild` | object\|null | Guild membership details, or null |
| `character.guild.id` | integer | Guild ID |
| `character.guild.tag` | string | Guild tag |
| `character.guild.experience` | integer | Guild XP |
| `character.guild.level` | integer | Guild level |
| `character.guild.position` | string | Character's position in the guild |
| `character.last_activity` | string\|null | **Deprecated.** Always returns `2025-01-01T00:00:00.000000Z`. Use `current_status` instead. |
| `character.current_status` | string | `ONLINE` (active within 5 min), `IDLING` (active within 8 hrs with action), or `OFFLINE` |
| `character.created_at` | string | Account creation timestamp (ISO 8601, `+00:00` timezone offset) |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/character/{hashed_character_id}/metrics` — Character Metrics

Retrieve raw metrics data for a specific character organized by activity type and metric type.

**Required Scope:** `v1.character.metrics`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/metrics
```

**Example Response**
```json
{
    "metrics": {
        "dungeon": {
            "times_completed": 156,
            "gold_spent": 75000
        },
        "battle": {
            "enemies_killed": 2456,
            "times_defeated": 23,
            "enemies_found": 567,
            "food_used": 1234
        },
        "hunt": {
            "enemies_killed": 234,
            "times_defeated": 5,
            "enemies_found": 120
        },
        "market": {
            "items_purchased": 234,
            "items_sold": 189,
            "orders_fulfilled": 45
        },
        "world_boss": {
            "participated": 78
        },
        "guild_raid": {
            "participated": 15
        },
        "guild_challenge": {
            "contributions": 120
        },
        "guild_stockpile": {
            "contributions": 89
        },
        "pet_battle": {
            "times_performed": 89
        },
        "shrine": {
            "gold_contribution": 50000
        },
        "campaign": {
            "rewards_redeemed": 42
        },
        "travel": {
            "times_teleported": 456,
            "teleportation_cost": 34500,
            "total_distance": 987654
        },
        "woodcutting": {
            "items_gathered": 567
        },
        "mining": {
            "items_gathered": 892
        },
        "fishing": {
            "items_gathered": 412
        }
    },
    "endpoint_updates_at": "2025-12-21T13:00:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `metrics` | object | Map of activity type to metric key/value pairs |
| `metrics.*` | object | Activity category (e.g., `dungeon`, `battle`, `market`) |
| `metrics.*.*` | integer | Individual metric value for that activity |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/character/{hashed_character_id}/effects` — Character Effects

Retrieve raw effect data for a specific character including buffs, boosts, and temporary effects.

**Required Scope:** `v1.character.effects`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/effects
```

**Example Response**
```json
{
    "effects": [
        {
            "character_id": 67890,
            "source": "potion",
            "target": "world_boss",
            "attribute": "experience",
            "value": 15,
            "value_type": "percentage",
            "location_id": 5,
            "expire_at": null
        },
        {
            "character_id": 67890,
            "source": "membership",
            "target": "dungeon",
            "attribute": "experience",
            "value": 50,
            "value_type": "percentage",
            "location_id": null,
            "expire_at": "2025-12-25T23:59:59.000000Z"
        }
    ],
    "endpoint_updates_at": "2025-12-21T13:01:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `effects` | array | List of active effects on the character |
| `effects.*.character_id` | integer | Character ID the effect applies to |
| `effects.*.source` | string | Source of the effect (e.g., `potion`, `membership`) |
| `effects.*.target` | string | Activity or target affected (e.g., `dungeon`, `world_boss`) |
| `effects.*.attribute` | string | Affected attribute (e.g., `experience`) |
| `effects.*.value` | integer | Effect magnitude |
| `effects.*.value_type` | string | Value type (e.g., `percentage`) |
| `effects.*.location_id` | integer\|null | Location the effect is limited to, or null for all |
| `effects.*.expire_at` | string\|null | Expiry timestamp (ISO 8601), or null if permanent |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/character/{hashed_character_id}/characters` — Character Alt Characters

Retrieve all alternate characters owned by the same user. Only visible to the authenticated owner or if the character owner has enabled the `show_alt_characters` setting.

**Required Scope:** `v1.character.characters`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/characters
```

**Example Response**
```json
{
    "characters": [
        {
            "id": 12345,
            "hashed_id": "xyz789abc",
            "name": "AltWarrior",
            "class": "WARRIOR",
            "image_url": "https://cdn.idle-mmo.com/images/character-warrior.png",
            "background_url": "https://cdn.idle-mmo.com/images/background-forest.png",
            "total_level": 185,
            "created_at": "2024-03-15T10:30:00.000000Z"
        },
        {
            "id": 12346,
            "hashed_id": "def456ghi",
            "name": "AltMage",
            "class": "FORSAKEN",
            "image_url": "https://cdn.idle-mmo.com/images/character-mage.png",
            "background_url": "https://cdn.idle-mmo.com/images/background-castle.png",
            "total_level": 92,
            "created_at": "2024-06-20T14:45:00.000000Z"
        }
    ],
    "endpoint_updates_at": "2025-12-21T13:00:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `characters` | array | List of alternate characters |
| `characters.*.id` | integer | Character ID |
| `characters.*.hashed_id` | string | Hashed character ID |
| `characters.*.name` | string | Character name |
| `characters.*.class` | string | Character class |
| `characters.*.image_url` | string\|null | Character image URL |
| `characters.*.background_url` | string\|null | Background image URL |
| `characters.*.total_level` | integer | Sum of all skill and stat levels |
| `characters.*.created_at` | string | Character creation timestamp (ISO 8601) |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/character/{hashed_character_id}/museum` — Character Museum

Retrieve a paginated list of museum items collected by a specific character, with optional category filtering.

**Required Scope:** `v1.character.museum`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | integer | No | Page number for pagination (default: `1`) |
| `category` | string | No | Filter by category: `SKINS`, `BACKGROUNDS`, `GUILD_ICONS`, `PETS`, `COLLECTIBLES`, or `BESTIARY` |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/museum
```

**Example Response**
```json
{
    "items": [
        {
            "category": "SKINS",
            "quantity": 1,
            "id": 101,
            "name": "Forest Ranger Outfit",
            "image_url": "https://cdn.idle-mmo.com/images/skins/forest-ranger.png"
        },
        {
            "category": "PETS",
            "quantity": 1,
            "id": 45,
            "name": "Fire Phoenix",
            "image_url": "https://cdn.idle-mmo.com/images/pets/fire-phoenix.png"
        },
        {
            "category": "COLLECTIBLES",
            "quantity": 3,
            "id": "abc123def456",
            "name": "Ancient Coin",
            "image_url": "https://cdn.idle-mmo.com/images/items/ancient-coin.png"
        },
        {
            "category": "BESTIARY",
            "quantity": 1,
            "id": 234,
            "name": "Goblin Warrior",
            "image_url": "https://cdn.idle-mmo.com/images/enemies/goblin-warrior.png"
        }
    ],
    "pagination": {
        "current_page": 1,
        "last_page": 5,
        "per_page": 25,
        "total": 123
    }
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `items` | array | List of collected museum items |
| `items.*.category` | string | Item category (`SKINS`, `BACKGROUNDS`, `GUILD_ICONS`, `PETS`, `COLLECTIBLES`, `BESTIARY`) |
| `items.*.quantity` | integer | Quantity owned |
| `items.*.id` | integer\|string | Item ID (integer for most types, hashed string for collectibles) |
| `items.*.name` | string | Item name |
| `items.*.image_url` | string\|null | Item image URL |
| `pagination.current_page` | integer | Current page number |
| `pagination.last_page` | integer | Last available page |
| `pagination.per_page` | integer | Items per page |
| `pagination.total` | integer | Total collected items |

---

#### GET `/v1/character/{hashed_character_id}/current-action` — Character Current Action

Retrieve the current active action for a character, including battle, skill, or other activities. Only visible to the authenticated owner or if the character owner has enabled the `display_active_action` setting.

> **Experimental** — This endpoint may behave unexpectedly and is subject to breaking changes without notice. Avoid using it for critical systems.

**Required Scope:** `v1.character.current_action`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/current-action
```

**Example Response**
```json
{
    "type": "MINING",
    "item": "Iron Ore",
    "image_url": "https://cdn.idle-mmo.com/images/iron-ore.png",
    "title": "Mining Iron Ore",
    "expires_at": "2025-01-20T14:30:00.000000Z",
    "started_at": "2025-01-20T14:25:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `type` | string\|null | Action type (e.g., `MINING`, `BATTLE`) |
| `image_url` | string\|null | Image representing the current action |
| `title` | string\|null | Human-readable action description |
| `expires_at` | string\|null | When the action completes (ISO 8601) |
| `started_at` | string\|null | When the action started (ISO 8601) |

---

#### GET `/v1/character/{hashed_character_id}/pets` — Character Pets

Retrieve all pets owned by a character, including their stats, battle status, and location.

**Required Scope:** `v1.character.pets`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/character/{hashed_character_id}/pets
```

**Example Response**
```json
{
    "pets": [
        {
            "id": 456,
            "name": "Fluffy",
            "custom_name": "Mr. Fluffington",
            "pet_id": 12,
            "image_url": "https://cdn.idle-mmo.com/images/pet-fire-dragon.png",
            "level": 8,
            "experience": 15000,
            "quality": "EPIC",
            "stats": {
                "strength": 150,
                "defence": 120,
                "speed": 100
            },
            "health": {
                "current": 850,
                "maximum": 1000,
                "percentage": 85
            },
            "happiness": {
                "current": 0,
                "maximum": 0,
                "percentage": 0
            },
            "hunger": {
                "current": 0,
                "maximum": 0,
                "percentage": 0
            },
            "equipped": false,
            "battle": {
                "started_at": "2025-12-21T10:00:00.000000Z",
                "ends_at": "2025-12-21T14:00:00.000000Z"
            },
            "evolution": {
                "state": 1,
                "max": 5,
                "bonus_per_stage": 2,
                "current_bonus": 2,
                "next_bonus": 4,
                "can_evolve": false,
                "targets": [
                    { "key": "STRENGTH", "label": "Strength" },
                    { "key": "DEFENCE", "label": "Defence" }
                ]
            },
            "location": {
                "id": 10,
                "name": "Simpletopia",
                "locked": false
            },
            "created_at": "2024-11-15T08:00:00.000000Z"
        },
        {
            "id": 789,
            "name": "Ollo",
            "custom_name": null,
            "pet_id": 8,
            "image_url": "https://cdn.idle-mmo.com/images/pet-shadow-wolf.png",
            "level": 3,
            "experience": 2500,
            "quality": "RARE",
            "stats": {
                "strength": 80,
                "defence": 60,
                "speed": 120
            },
            "health": {
                "current": 500,
                "maximum": 500,
                "percentage": 100
            },
            "happiness": {
                "current": 100,
                "maximum": 100,
                "percentage": 100
            },
            "hunger": {
                "current": 30,
                "maximum": 100,
                "percentage": 30
            },
            "equipped": true,
            "battle": null,
            "evolution": {
                "state": 0,
                "max": 5,
                "bonus_per_stage": 2,
                "current_bonus": 0,
                "next_bonus": 2,
                "can_evolve": false,
                "targets": [
                    { "key": "SPEED", "label": "Speed" }
                ]
            },
            "location": {
                "id": 10,
                "name": "Simpletopia",
                "locked": false
            },
            "created_at": "2024-12-01T12:00:00.000000Z"
        }
    ],
    "endpoint_updates_at": "2025-12-21T14:05:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `pets` | array | List of character's pets |
| `pets.*.id` | integer | Pet instance ID |
| `pets.*.name` | string | Base pet name |
| `pets.*.custom_name` | string\|null | Player-assigned custom name |
| `pets.*.pet_id` | integer | Base pet type ID |
| `pets.*.image_url` | string | Pet image URL |
| `pets.*.level` | integer | Pet level |
| `pets.*.experience` | integer | Pet total XP |
| `pets.*.quality` | string | Pet quality |
| `pets.*.stats.strength` | integer | Strength stat |
| `pets.*.stats.defence` | integer | Defence stat |
| `pets.*.stats.speed` | integer | Speed stat |
| `pets.*.health.current` | integer | Current HP |
| `pets.*.health.maximum` | integer | Maximum HP |
| `pets.*.health.percentage` | integer | HP percentage |
| `pets.*.happiness.current` | integer | Current happiness |
| `pets.*.happiness.maximum` | integer | Maximum happiness |
| `pets.*.happiness.percentage` | integer | Happiness percentage |
| `pets.*.hunger.current` | integer | Current hunger |
| `pets.*.hunger.maximum` | integer | Maximum hunger |
| `pets.*.hunger.percentage` | integer | Hunger percentage |
| `pets.*.equipped` | boolean | Whether this pet is currently equipped |
| `pets.*.battle` | object\|null | Active battle details, or null |
| `pets.*.battle.started_at` | string | Battle start timestamp (ISO 8601) |
| `pets.*.battle.ends_at` | string | Battle end timestamp (ISO 8601) |
| `pets.*.evolution.state` | integer | Current evolution stage |
| `pets.*.evolution.max` | integer | Maximum evolution stages |
| `pets.*.evolution.bonus_per_stage` | integer | Stat bonus granted per evolution |
| `pets.*.evolution.current_bonus` | integer | Total bonus from current evolutions |
| `pets.*.evolution.next_bonus` | integer | Bonus after next evolution |
| `pets.*.evolution.can_evolve` | boolean | Whether the pet can currently evolve |
| `pets.*.evolution.targets` | array | Stats that benefit from evolution |
| `pets.*.evolution.targets.*.key` | string | Stat key (e.g., `STRENGTH`) |
| `pets.*.evolution.targets.*.label` | string | Stat display label |
| `pets.*.location.id` | integer | Location ID where the pet is stationed |
| `pets.*.location.name` | string | Location name |
| `pets.*.location.locked` | boolean | Whether the location is locked |
| `pets.*.created_at` | string | Pet acquisition timestamp (ISO 8601) |
| `endpoint_updates_at` | string | When this endpoint data next updates |
