# Guilds

> [Back to Index](../IdleMMOAPI.md)

---

#### GET `/v1/guild/{id}/information` — Guild Information

Retrieve detailed information about a guild including level, experience, members, and season position.

**Required Scope:** `v1.guild.information`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/guild/{id}/information
```

**Example Response**
```json
{
    "guild": {
        "id": 42,
        "name": "Elite Warriors",
        "tag": "ELT",
        "description": "Welcome to Elite Warriors! We are a friendly and active guild focused on progression and teamwork.",
        "experience": 5000000,
        "level": 25,
        "icon_url": "https://cdn.idle-mmo.com/images/guild-icon-flame.png",
        "background_url": "https://cdn.idle-mmo.com/images/guild-bg-castle.png",
        "member_count": 45,
        "season_position": 12,
        "marks": 15000
    },
    "endpoint_updates_at": "2025-12-21T14:05:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `guild` | object | Guild details |
| `guild.id` | integer | Guild ID |
| `guild.name` | string | Guild name |
| `guild.tag` | string | Guild tag |
| `guild.description` | string\|null | Guild description |
| `guild.experience` | integer | Total guild XP |
| `guild.level` | integer | Guild level |
| `guild.icon_url` | string\|null | Guild icon image URL |
| `guild.background_url` | string\|null | Guild background image URL |
| `guild.member_count` | integer | Number of members |
| `guild.season_position` | integer\|null | Current season leaderboard position |
| `guild.marks` | integer | Guild marks balance |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/guild/{id}/members` — Guild Members

Retrieve a concise overview of every member in a guild including their rank, portrait, and total level.

**Required Scope:** `v1.guild.members`

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/guild/{id}/members
```

**Example Response**
```json
{
    "guild": {
        "id": 815,
        "name": "Idle Legion",
        "member_count": 3
    },
    "members": [
        {
            "name": "Arthur",
            "position": "LEADER",
            "avatar_url": "https://cdn.idle-mmo.com/images/characters/arthur.png",
            "background_url": "https://cdn.idle-mmo.com/images/backgrounds/arthur-backround.png",
            "total_level": 245
        },
        {
            "name": "Lancelot",
            "position": "OFFICER",
            "avatar_url": "https://cdn.idle-mmo.com/images/characters/lancelot.png",
            "background_url": "https://cdn.idle-mmo.com/images/backgrounds/lancelot-backgound.png",
            "total_level": 180
        }
    ],
    "endpoint_updates_at": "2025-06-01T12:00:00.000000Z"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `guild` | object | Guild summary |
| `guild.id` | integer | Guild ID |
| `guild.name` | string | Guild name |
| `guild.member_count` | integer | Total member count |
| `members` | array | List of guild members |
| `members.*.name` | string | Member character name |
| `members.*.position` | string | Guild position (e.g., `LEADER`, `OFFICER`, `SOLDIER`) |
| `members.*.avatar_url` | string\|null | Character avatar image URL |
| `members.*.background_url` | string\|null | Character background image URL |
| `members.*.total_level` | integer | Sum of all skill and stat levels |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/guild/conquest/view` — Guild Conquest

Retrieve current guild conquest data showing zone control, guild rankings, and active assaults.

**Required Scope:** `v1.guild.conquest.view`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `season_number` | integer | No | Season number for historical data. Defaults to current season. |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/guild/conquest/view
```

**Example Response**
```json
{
    "zones": {
        "bluebell-hollow": {
            "location": {
                "id": 1,
                "key": "bluebell-hollow",
                "name": "Bluebell Hollow",
                "image_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=400/uploaded/skins/location.png"
            },
            "contributions": null,
            "status": "DOMINATED",
            "colour": "#00ff00",
            "kills": 111090,
            "experience": 182564,
            "guilds_count": 2,
            "active_assaults": [
                {
                    "guild": {
                        "id": 123,
                        "name": "Assault Force",
                        "tag": "AST",
                        "icon_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/uploaded/skins/assault-icon.png"
                    },
                    "kills": 1500,
                    "experience": 7500,
                    "starts_at": "2025-01-01T10:00:00+00:00",
                    "ends_at": "2025-01-01T14:00:00+00:00"
                }
            ],
            "guilds": [
                {
                    "id": 19434,
                    "position": 1,
                    "kills": "108,076",
                    "experience": "177,834",
                    "contributions": null,
                    "guild": {
                        "id": 618,
                        "name": "Idle Legion",
                        "tag": "IDL",
                        "icon_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/uploaded/skins/guild-icon.png",
                        "background_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=500,height=500/skins/backgrounds/default.jpg"
                    }
                },
                {
                    "id": 20105,
                    "position": 2,
                    "kills": "3,014",
                    "experience": "4,730",
                    "contributions": null,
                    "guild": {
                        "id": 810,
                        "name": "Shadow Hunters",
                        "tag": "SHD",
                        "icon_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/uploaded/skins/guild-icon-2.png",
                        "background_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=500,height=500/skins/backgrounds/default.jpg"
                    }
                }
            ]
        }
    },
    "endpoint_updates_at": "2025-01-01T12:05:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `zones` | object | Map of location key to zone data |
| `zones.{key}.location.id` | integer | Location ID |
| `zones.{key}.location.key` | string | Location slug key |
| `zones.{key}.location.name` | string | Location display name |
| `zones.{key}.location.image_url` | string | Location image URL |
| `zones.{key}.contributions` | null | Always null in this endpoint (see Zone Inspect for contributions) |
| `zones.{key}.status` | string | Zone control status (e.g., `DOMINATED`) |
| `zones.{key}.colour` | string\|null | Hex colour of the controlling guild |
| `zones.{key}.kills` | integer | Total kills in this zone |
| `zones.{key}.experience` | integer | Total XP earned in this zone |
| `zones.{key}.guilds_count` | integer | Number of guilds active in this zone |
| `zones.{key}.active_assaults` | array | Guilds currently assaulting this zone |
| `zones.{key}.active_assaults[].guild.id` | integer | Assaulting guild ID |
| `zones.{key}.active_assaults[].guild.name` | string | Assaulting guild name |
| `zones.{key}.active_assaults[].guild.tag` | string\|null | Assaulting guild tag |
| `zones.{key}.active_assaults[].guild.icon_url` | string | Assaulting guild icon URL |
| `zones.{key}.active_assaults[].kills` | integer | Kills by assaulting guild |
| `zones.{key}.active_assaults[].experience` | integer | XP earned by assaulting guild |
| `zones.{key}.active_assaults[].starts_at` | string | Assault start timestamp (ISO 8601) |
| `zones.{key}.active_assaults[].ends_at` | string | Assault end timestamp (ISO 8601) |
| `zones.{key}.guilds` | array | Guild rankings for this zone |
| `zones.{key}.guilds[].id` | integer | Guild conquest progress record ID |
| `zones.{key}.guilds[].position` | integer | Guild rank in this zone |
| `zones.{key}.guilds[].kills` | string | Formatted kill count |
| `zones.{key}.guilds[].experience` | string | Formatted XP count |
| `zones.{key}.guilds[].contributions` | null | Always null in this endpoint |
| `zones.{key}.guilds[].guild.id` | integer | Guild ID |
| `zones.{key}.guilds[].guild.name` | string | Guild name |
| `zones.{key}.guilds[].guild.tag` | string\|null | Guild tag |
| `zones.{key}.guilds[].guild.icon_url` | string | Guild icon URL |
| `zones.{key}.guilds[].guild.background_url` | string | Guild background URL |
| `endpoint_updates_at` | string | When this endpoint data next updates |

---

#### GET `/v1/guild/conquest/zone/{zone_id}/inspect` — Guild Conquest Zone Inspection

Retrieve detailed information about a specific conquest zone including character contributions.

**Required Scope:** `v1.guild.conquest.zone.inspect`

**Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `zone_id` | integer | Yes | The ID of the zone (location) to inspect |
| `season_number` | integer | No | Season number for historical data. Defaults to current season. |

**Example Request**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "User-Agent: YourApp/1.0" \
     https://api.idle-mmo.com/v1/guild/conquest/zone/{zone_id}/inspect
```

**Example Response**
```json
{
    "zone": {
        "location": {
            "id": 1,
            "key": "bluebell-hollow",
            "name": "Bluebell Hollow",
            "image_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=400/uploaded/skins/location.png"
        },
        "contributions": [
            {
                "id": 12345,
                "guild_conquest_progress_id": 19434,
                "character": {
                    "id": 67890,
                    "hashed_id": "3345pdg56h7890",
                    "name": "WarriorKing",
                    "total_level": 1250,
                    "image_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/avatars/warrior.png",
                    "background_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/backgrounds/epic.png"
                },
                "kills": 15234,
                "experience": 45678
            }
        ],
        "status": "DOMINATED",
        "colour": "#00ff00",
        "kills": 111090,
        "experience": 182564,
        "guilds_count": 2,
        "active_assaults": [
            {
                "guild": {
                    "id": 123,
                    "name": "Assault Force",
                    "tag": "AST",
                    "icon_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/uploaded/skins/assault-icon.png"
                },
                "kills": 1500,
                "experience": 7500,
                "starts_at": "2025-01-01T10:00:00+00:00",
                "ends_at": "2025-01-01T14:00:00+00:00"
            }
        ],
        "guilds": [
            {
                "id": 19434,
                "position": 1,
                "kills": "108,076",
                "experience": "177,834",
                "contributions": [
                    {
                        "id": 12345,
                        "guild_conquest_progress_id": 19434,
                        "character": {
                            "id": 67890,
                            "hashed_id": "c1234567890",
                            "name": "WarriorKing",
                            "total_level": 1250,
                            "image_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/avatars/warrior.png",
                            "background_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/backgrounds/epic.png"
                        },
                        "kills": 15234,
                        "experience": 45678
                    }
                ],
                "guild": {
                    "id": 618,
                    "name": "Idle Legion",
                    "tag": "IDL",
                    "icon_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=100,height=100/uploaded/skins/guild-icon.png",
                    "background_url": "https://cdn.idle-mmo.com/cdn-cgi/image/width=500,height=500/skins/backgrounds/default.jpg"
                }
            }
        ]
    },
    "endpoint_updates_at": "2025-01-01T12:05:00+00:00"
}
```

**Response Fields**

| Field | Type | Description |
|---|---|---|
| `zone` | object | Zone details |
| `zone.location.id` | integer | Location ID |
| `zone.location.key` | string | Location slug key |
| `zone.location.name` | string | Location display name |
| `zone.location.image_url` | string | Location image URL |
| `zone.contributions` | array | All character contributions across all guilds in this zone |
| `zone.contributions[].id` | integer | Contribution record ID |
| `zone.contributions[].guild_conquest_progress_id` | integer | Parent guild progress record ID |
| `zone.contributions[].character.id` | integer | Character ID |
| `zone.contributions[].character.hashed_id` | string | Hashed character ID |
| `zone.contributions[].character.name` | string | Character name |
| `zone.contributions[].character.total_level` | integer | Character total level |
| `zone.contributions[].character.image_url` | string | Character avatar URL |
| `zone.contributions[].character.background_url` | string | Character background URL |
| `zone.contributions[].kills` | string | Kill count for this contribution |
| `zone.contributions[].experience` | string | XP earned for this contribution |
| `zone.status` | string | Zone control status (e.g., `DOMINATED`) |
| `zone.colour` | string\|null | Hex colour of the controlling guild |
| `zone.kills` | integer | Total kills in this zone |
| `zone.experience` | integer | Total XP earned in this zone |
| `zone.guilds_count` | integer | Number of guilds active in this zone |
| `zone.active_assaults` | array | Guilds currently assaulting this zone |
| `zone.active_assaults[].guild.id` | integer | Assaulting guild ID |
| `zone.active_assaults[].guild.name` | string | Assaulting guild name |
| `zone.active_assaults[].guild.tag` | string\|null | Assaulting guild tag |
| `zone.active_assaults[].guild.icon_url` | string | Assaulting guild icon URL |
| `zone.active_assaults[].kills` | integer | Kills by assaulting guild |
| `zone.active_assaults[].experience` | integer | XP earned by assaulting guild |
| `zone.active_assaults[].starts_at` | string | Assault start timestamp (ISO 8601) |
| `zone.active_assaults[].ends_at` | string | Assault end timestamp (ISO 8601) |
| `zone.guilds` | array | Guild rankings with per-character contributions |
| `zone.guilds[].id` | integer | Guild conquest progress record ID |
| `zone.guilds[].position` | integer | Guild rank in this zone |
| `zone.guilds[].kills` | string | Formatted kill count |
| `zone.guilds[].experience` | string | Formatted XP count |
| `zone.guilds[].contributions` | array | Per-character contributions for this guild |
| `zone.guilds[].contributions[].id` | integer | Contribution record ID |
| `zone.guilds[].contributions[].guild_conquest_progress_id` | integer | Parent guild progress record ID |
| `zone.guilds[].contributions[].character.id` | integer | Character ID |
| `zone.guilds[].contributions[].character.hashed_id` | string | Hashed character ID |
| `zone.guilds[].contributions[].character.name` | string | Character name |
| `zone.guilds[].contributions[].character.total_level` | integer | Character total level |
| `zone.guilds[].contributions[].character.image_url` | string | Character avatar URL |
| `zone.guilds[].contributions[].character.background_url` | string | Character background URL |
| `zone.guilds[].contributions[].kills` | string | Kill count for this contribution |
| `zone.guilds[].contributions[].experience` | string | XP earned for this contribution |
| `zone.guilds[].guild.id` | integer | Guild ID |
| `zone.guilds[].guild.name` | string | Guild name |
| `zone.guilds[].guild.tag` | string\|null | Guild tag |
| `zone.guilds[].guild.icon_url` | string | Guild icon URL |
| `zone.guilds[].guild.background_url` | string | Guild background URL |
| `endpoint_updates_at` | string | When this endpoint data next updates |
