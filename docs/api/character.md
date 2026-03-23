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
        "id": 100000,
        "hashed_id": "AbCdEfGhIjKlMnOp",
        "name": "ExampleCharacter",
        "class": "SHADOWBLADE",
        "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example-skin.png",
        "background_url": "https://cdn.idle-mmo.com/uploaded/skins/example-bg.jpg",
        "skills": {
            "fishing":            { "experience": 1000000,  "level": 72  },
            "woodcutting":        { "experience": 150,      "level": 2   },
            "mining":             { "experience": 13000,    "level": 26  },
            "alchemy":            { "experience": 6000000,  "level": 90  },
            "smelting":           { "experience": 0,        "level": 1   },
            "cooking":            { "experience": 19000000, "level": 100 },
            "forge":              { "experience": 0,        "level": 1   },
            "shadow-mastery":     { "experience": 2700000,  "level": 80  },
            "bartering":          { "experience": 5500000,  "level": 88  },
            "hunting-mastery":    { "experience": 6000000,  "level": 89  },
            "yule-mastery":       { "experience": 2500000,  "level": 79  },
            "springtide-mastery": { "experience": 0,        "level": 1   },
            "combat":             { "experience": 48000000, "level": 100 },
            "pet-mastery":        { "experience": 55000000, "level": 100 },
            "guild-mastery":      { "experience": 10000000, "level": 95  },
            "lunar-mastery":      { "experience": 580000,   "level": 65  },
            "meditation":         { "experience": 9,        "level": 1   },
            "dungeoneering":      { "experience": 71000000, "level": 100 },
            "construction":       { "experience": 0,        "level": 1   }
        },
        "stats": {
            "strength":  { "experience": 6000000,  "level": 90  },
            "defence":   { "experience": 8000000,  "level": 93  },
            "speed":     { "experience": 16000000, "level": 100 },
            "dexterity": { "experience": 6000000,  "level": 90  }
        },
        "gold": 500000,
        "tokens": 1000,
        "shards": 70000,
        "total_level": 1470,
        "location": {
            "id": 9,
            "name": "Isle of Whispers"
        },
        "equipped_pet": {
            "id": 200000,
            "name": "MyPet",
            "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example-pet.png",
            "level": 100
        },
        "guild": {
            "id": 100,
            "tag": "TAG",
            "experience": 20000000,
            "level": 100,
            "position": "RECRUIT"
        },
        "last_activity": "2025-01-01T00:00:00.000000Z",
        "current_status": "IDLING",
        "created_at": "2025-01-15T12:00:00+00:00"
    },
    "endpoint_updates_at": "2026-01-01T12:00:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `character` | object | Character details |
| `character.id` | integer | Numeric character ID |
| `character.hashed_id` | string | Hashed character ID (used in all API paths) |
| `character.name` | string | Character name |
| `character.class` | string | Character class (e.g. `SHADOWBLADE`, `WARRIOR`, `FORSAKEN`) |
| `character.image_url` | string\|null | Character avatar URL |
| `character.background_url` | string\|null | Character banner/background image URL |
| `character.skills` | object | Map of skill key → `{experience, level}` for all 19 skills (see table below) |
| `character.skills.*.experience` | integer | Total XP accumulated in this skill |
| `character.skills.*.level` | integer | Current skill level (max 100) |
| `character.stats` | object | Map of stat key → `{experience, level}` for 4 primary combat stats: `strength`, `defence`, `speed`, `dexterity` |
| `character.stats.*.experience` | integer | Total XP accumulated in this stat |
| `character.stats.*.level` | integer | Current stat level (max 100) |
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
| `character.guild.experience` | integer | Character's XP contribution to the guild |
| `character.guild.level` | integer | Guild level |
| `character.guild.position` | string | Character's position: `LEADER`, `OFFICER`, `SOLDIER`, or `RECRUIT` |
| `character.last_activity` | string\|null | **Deprecated.** Always returns `2025-01-01T00:00:00.000000Z`. Use `current_status` instead. |
| `character.current_status` | string | `ONLINE` (active within 5 min), `IDLING` (active within 8 hrs with action), or `OFFLINE` |
| `character.created_at` | string | Account creation timestamp (ISO 8601, `+00:00` timezone offset) |
| `endpoint_updates_at` | string | When this endpoint data next refreshes |

**Skills — complete key list (19 skills)**

Skills are returned in `character.skills` keyed by their API name. Mastery skills use hyphenated keys.

| API key | Display name | Category |
|---|---|---|
| `fishing` | Fishing | Gathering |
| `woodcutting` | Woodcutting | Gathering |
| `mining` | Mining | Gathering |
| `alchemy` | Alchemy | Crafting |
| `smelting` | Smelting | Crafting |
| `cooking` | Cooking | Crafting |
| `forge` | Forge | Crafting |
| `construction` | Construction | Crafting |
| `bartering` | Bartering | Social |
| `meditation` | Meditation | Passive |
| `combat` | Combat | Combat mastery |
| `dungeoneering` | Dungeoneering | Combat mastery |
| `hunting-mastery` | Hunting Mastery | Hunting mastery |
| `pet-mastery` | Pet Mastery | Pet mastery |
| `guild-mastery` | Guild Mastery | Guild mastery |
| `shadow-mastery` | Shadow Mastery | Seasonal mastery |
| `yule-mastery` | Yule Mastery | Seasonal mastery (winter) |
| `springtide-mastery` | Springtide Mastery | Seasonal mastery (spring) |
| `lunar-mastery` | Lunar Mastery | Seasonal mastery |

> **Note:** There is no separate "mastery" data type. Masteries are ordinary skills that return the same `{experience, level}` shape as all other skills. Seasonal masteries (yule, springtide, lunar, shadow) tend to start at level 1 / 0 XP outside their active season.

---

#### GET `/v1/character/{hashed_character_id}/metrics` — Character Metrics

Retrieve raw metrics data for a specific character organised by activity type.

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
        "fishing": {
            "items_gathered": 45000,
            "total_experience": 1000000,
            "total_time": 1000000000
        },
        "woodcutting": {
            "items_gathered": 50,
            "total_experience": 150,
            "total_time": 600000
        },
        "alchemy": {
            "items_gathered": 1800,
            "total_experience": 6000000,
            "total_time": 1900000000
        },
        "shadow-mastery": {
            "items_gathered": 5000,
            "total_experience": 1400000,
            "total_time": 220000000
        },
        "yule-mastery": {
            "items_gathered": 55000,
            "total_experience": 1500000,
            "total_time": 350000000
        },
        "lunar-mastery": {
            "items_gathered": 10000,
            "total_experience": 340000,
            "total_time": 80000000
        },
        "battle": {
            "enemies_killed": 280000,
            "food_used": 58000,
            "times_defeated": 10
        },
        "hunt": {
            "enemies_found": 260000,
            "bonus_enemies": 17000
        },
        "dungeon": {
            "gold_spent": 20000000,
            "times_completed": 1100
        },
        "world_boss": {
            "participated": 480
        },
        "pet_battle": {
            "times_performed": 13000
        },
        "pet_hunt": {
            "enemies_found": 115000
        },
        "market": {
            "items_purchased": 610000,
            "items_sold": 54000,
            "orders_fulfilled": 740
        },
        "direct_trade": {
            "times_completed": 440
        },
        "travel": {
            "times_teleported": 790,
            "teleportation_cost": 630000,
            "total_distance": 5500000
        },
        "shrine": {
            "gold_contribution": 12000
        },
        "campaign": {
            "rewards_redeemed": 180,
            "community_goal_contributions": 510
        },
        "guild_raid": {
            "participated": 400
        },
        "guild_challenge": {
            "contributions": 66000
        },
        "guild_stockpile": {
            "contributions": 200
        },
        "league": {
            "kills_contribution": 24000,
            "experience_contribution": 6000000,
            "winnable_leagues": 1,
            "total_shards_won": 2000
        }
    },
    "endpoint_updates_at": "2026-01-01T12:00:00Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `metrics` | object | Map of activity type to metric key/value pairs |
| `metrics.*` | object | Activity category (see tables below) |
| `metrics.*.*` | integer | Individual metric value |
| `endpoint_updates_at` | string | When this endpoint data next refreshes |

**Gathering skill metric keys** — applies to `fishing`, `woodcutting`, `mining`, `cooking`, `alchemy`, and active mastery skills (e.g. `shadow-mastery`, `yule-mastery`, `lunar-mastery`):

| Key | Type | Description |
|---|---|---|
| `items_gathered` | integer | Total items gathered |
| `total_experience` | integer | Total XP earned via this skill |
| `total_time` | integer | Total time spent (milliseconds) |

> **Note:** Mastery skills only appear in metrics if the character has actively used them. Inactive seasonal masteries may be absent entirely.

**Other activity metric keys**:

| Category | Keys |
|---|---|
| `battle` | `enemies_killed`, `food_used`, `times_defeated` |
| `hunt` | `enemies_found`, `bonus_enemies` |
| `dungeon` | `gold_spent`, `times_completed` |
| `world_boss` | `participated` |
| `pet_battle` | `times_performed` |
| `pet_hunt` | `enemies_found` |
| `market` | `items_purchased`, `items_sold`, `orders_fulfilled` |
| `direct_trade` | `times_completed` |
| `travel` | `times_teleported`, `teleportation_cost`, `total_distance` |
| `shrine` | `gold_contribution` |
| `campaign` | `rewards_redeemed`, `community_goal_contributions` |
| `guild_raid` | `participated` |
| `guild_challenge` | `contributions` |
| `guild_stockpile` | `contributions` |
| `league` | `kills_contribution`, `experience_contribution`, `winnable_leagues`, `total_shards_won` |

---

#### GET `/v1/character/{hashed_character_id}/effects` — Character Effects

Retrieve all active effects on a character — buffs from membership, class, equipment, guild conquest, house components, and daily reward streaks.

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
            "character_id": 100000,
            "source": "membership",
            "target": "primary_skill",
            "attribute": "experience",
            "value": 15,
            "value_type": "percentage",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "membership",
            "target": "primary_skill",
            "attribute": "wait_length",
            "value": 10,
            "value_type": "efficiency",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "class",
            "target": "speed",
            "attribute": "experience",
            "value": 5,
            "value_type": "percentage",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "guild_conquest",
            "target": "dungeon",
            "attribute": "magic_find",
            "value": 15,
            "value_type": "percentage",
            "location_id": 1,
            "expire_at": "2026-05-07T12:30:00+00:00"
        },
        {
            "character_id": 100000,
            "source": "equipment",
            "target": "fishing",
            "attribute": "wait_length",
            "value": 30,
            "value_type": "efficiency",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "equipment",
            "target": "lunar-mastery",
            "attribute": "experience",
            "value": 25,
            "value_type": "percentage",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "house_component",
            "target": "dungeon",
            "attribute": "max_idle_time",
            "value": 7200000,
            "value_type": "fixed",
            "location_id": null,
            "expire_at": null
        },
        {
            "character_id": 100000,
            "source": "daily_reward_streak",
            "target": "dungeon",
            "attribute": "magic_find",
            "value": 10,
            "value_type": "percentage",
            "location_id": null,
            "expire_at": "2026-01-02T12:00:00+00:00"
        }
    ],
    "endpoint_updates_at": "2026-01-01T12:00:00Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `effects` | array | All active effects on the character |
| `effects.*.character_id` | integer | Numeric character ID |
| `effects.*.source` | string | What grants the effect (see source table below) |
| `effects.*.target` | string | What is affected — a skill key, stat key, or activity (e.g. `dungeon`, `primary_skill`, `fishing`, `lunar-mastery`) |
| `effects.*.attribute` | string | Which attribute is modified: `experience`, `wait_length`, `magic_find`, or `max_idle_time` |
| `effects.*.value` | integer | Effect magnitude |
| `effects.*.value_type` | string | How the value is applied: `percentage`, `efficiency`, or `fixed` |
| `effects.*.location_id` | integer\|null | Location the effect is scoped to, or null for all locations |
| `effects.*.expire_at` | string\|null | Expiry timestamp (ISO 8601), or null if permanent |
| `endpoint_updates_at` | string | When this endpoint data next refreshes |

**Known effect sources**

| Source | Description |
|---|---|
| `membership` | Active membership subscription bonuses |
| `class` | Class-specific talent bonuses (e.g. Shadowblade gets speed XP + hunt efficiency) |
| `guild_conquest` | Bonuses from locations controlled by the character's guild. One entry per controlled location — `location_id` identifies which. |
| `equipment` | Bonuses from currently equipped gear. Mastery XP boosts (e.g. `lunar-mastery +25%`) appear here. |
| `house_component` | Bonuses from house upgrades (e.g. extended dungeon idle time via `max_idle_time`) |
| `daily_reward_streak` | Temporary bonuses from daily login streak rewards |

---

#### GET `/v1/character/{hashed_character_id}/characters` — Alt Characters

Retrieve all alternate characters owned by the same account. Only visible to the authenticated owner or if the character owner has enabled the `show_alt_characters` setting.

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
            "id": 100001,
            "hashed_id": "XxXxXxXxXxXxXxXx",
            "name": "AltCharacter",
            "class": "WARRIOR",
            "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example-warrior.png",
            "background_url": "https://cdn.idle-mmo.com/uploaded/skins/example-bg.jpg",
            "total_level": 185,
            "created_at": "2024-03-15T10:30:00.000000Z"
        }
    ],
    "endpoint_updates_at": "2026-01-01T12:00:00Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `characters` | array | List of alternate characters on the same account |
| `characters.*.id` | integer | Numeric character ID |
| `characters.*.hashed_id` | string | Hashed character ID |
| `characters.*.name` | string | Character name |
| `characters.*.class` | string | Character class |
| `characters.*.image_url` | string\|null | Character avatar URL |
| `characters.*.background_url` | string\|null | Character background image URL |
| `characters.*.total_level` | integer | Sum of all skill and stat levels |
| `characters.*.created_at` | string | Character creation timestamp (ISO 8601) |
| `endpoint_updates_at` | string | When this endpoint data next refreshes |

---

#### GET `/v1/character/{hashed_character_id}/museum` — Museum

Retrieve a paginated list of museum items collected by the character.

**Required Scope:** `v1.character.museum`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | integer | No | Page number (default: `1`) |
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
            "category": "COLLECTIBLES",
            "quantity": 3,
            "id": "abc123def456",
            "name": "Ancient Coin",
            "image_url": "https://cdn.idle-mmo.com/images/items/ancient-coin.png"
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
| `items.*.category` | string | `SKINS`, `BACKGROUNDS`, `GUILD_ICONS`, `PETS`, `COLLECTIBLES`, or `BESTIARY` |
| `items.*.quantity` | integer | Quantity owned |
| `items.*.id` | integer\|string | Item ID (integer for most types; hashed string for collectibles) |
| `items.*.name` | string | Item name |
| `items.*.image_url` | string\|null | Item image URL |
| `pagination.current_page` | integer | Current page |
| `pagination.last_page` | integer | Last available page |
| `pagination.per_page` | integer | Items per page |
| `pagination.total` | integer | Total collected items |

---

#### GET `/v1/character/{hashed_character_id}/current-action` — Current Action

Retrieve the character's current active action.

> **Experimental** — Subject to breaking changes without notice.

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
    "type": "HUNTING",
    "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example-hunting.png",
    "title": "Hunting",
    "expires_at": "2026-01-01T14:30:00+00:00",
    "started_at": "2026-01-01T14:25:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `type` | string\|null | Action type (e.g. `HUNTING`, `MINING`, `BATTLE`) |
| `image_url` | string\|null | Image representing the current action |
| `title` | string\|null | Human-readable action description |
| `expires_at` | string\|null | When the action completes (ISO 8601) |
| `started_at` | string\|null | When the action started (ISO 8601) |

---

#### GET `/v1/character/{hashed_character_id}/pets` — Character Pets

Retrieve all pets owned by a character, including stats, battle status, and location.

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
            "id": 200001,
            "name": "Dragon",
            "custom_name": "My Dragon",
            "pet_id": 12,
            "image_url": "https://cdn.idle-mmo.com/uploaded/skins/example-dragon.png",
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
                "started_at": "2026-01-01T10:00:00+00:00",
                "ends_at": "2026-01-01T14:00:00+00:00"
            },
            "evolution": {
                "state": 1,
                "max": 5,
                "bonus_per_stage": 2,
                "current_bonus": 2,
                "next_bonus": 4,
                "can_evolve": false,
                "targets": [
                    { "key": "STRENGTH", "label": "Strength" }
                ]
            },
            "location": {
                "id": 10,
                "name": "Simpletopia",
                "locked": false
            },
            "created_at": "2024-11-15T08:00:00+00:00"
        }
    ],
    "endpoint_updates_at": "2026-01-01T12:00:00Z"
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
| `pets.*.quality` | string | Pet quality tier |
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
| `pets.*.battle` | object\|null | Active battle details, or null if not in battle |
| `pets.*.battle.started_at` | string | Battle start timestamp (ISO 8601) |
| `pets.*.battle.ends_at` | string | Battle end timestamp (ISO 8601) |
| `pets.*.evolution.state` | integer | Current evolution stage |
| `pets.*.evolution.max` | integer | Maximum evolution stages |
| `pets.*.evolution.bonus_per_stage` | integer | Stat bonus granted per evolution |
| `pets.*.evolution.current_bonus` | integer | Total bonus from current evolutions |
| `pets.*.evolution.next_bonus` | integer | Bonus after next evolution |
| `pets.*.evolution.can_evolve` | boolean | Whether the pet can currently evolve |
| `pets.*.evolution.targets` | array | Stats that benefit from evolution |
| `pets.*.evolution.targets.*.key` | string | Stat key (e.g. `STRENGTH`) |
| `pets.*.evolution.targets.*.label` | string | Stat display label |
| `pets.*.location.id` | integer | Location ID where the pet is stationed |
| `pets.*.location.name` | string | Location name |
| `pets.*.location.locked` | boolean | Whether the location is locked |
| `pets.*.created_at` | string | Pet acquisition timestamp (ISO 8601) |
| `endpoint_updates_at` | string | When this endpoint data next refreshes |
