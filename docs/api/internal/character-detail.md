# GET /api/idlemmo/character/[id]

Fetches full character details plus the equipped pet for a given character ID. The primary data source for the Dungeon Planner and Combat Planner — provides skills, stats, and pet combat stats in one call.

> Source: `app/api/idlemmo/character/[id]/route.ts`

---

## Authentication

Requires a valid session **and** an IdleMMO API token configured in Settings.

---

## Request

```bash
GET /api/idlemmo/character/abc123def456
```

**Path Parameters**

| Parameter | Description |
|---|---|
| `id` | Hashed character ID (obtained from `/api/characters`) |

---

## Response — 200 OK

```json
{
  "hashed_id": "abc123def456",
  "name": "Arathiel",
  "class": "WARRIOR",
  "skills": {
    "woodcutting": { "experience": 150000, "level": 25 },
    "mining": { "experience": 80000, "level": 18 },
    "fishing": { "experience": 20000, "level": 10 }
  },
  "stats": {
    "strength": { "experience": 1200000, "level": 85 },
    "defence": { "experience": 950000, "level": 78 },
    "speed": { "experience": 700000, "level": 65 },
    "dexterity": { "experience": 400000, "level": 50 },
    "combat": { "experience": 5000000, "level": 120 }
  },
  "equipped_pet": {
    "id": 456,
    "name": "Mr. Fluffington",
    "level": 8,
    "quality": "EPIC",
    "image_url": "https://cdn.idle-mmo.com/images/pets/fire-dragon.png",
    "stats": {
      "strength": 150,
      "defence": 120,
      "speed": 100
    },
    "evolution": {
      "state": 2,
      "max": 5,
      "bonus_per_stage": 5,
      "current_bonus": 10,
      "targets": [
        { "key": "STRENGTH", "label": "Strength" },
        { "key": "DEFENCE", "label": "Defence" }
      ]
    }
  }
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `hashed_id` | string | Character hashed ID |
| `name` | string | Character name |
| `class` | string | Character class (e.g. `WARRIOR`, `SHADOWBLADE`, `RANGER`) |
| `skills` | object | All non-combat skills keyed by name |
| `skills.*.experience` | integer | Total XP in this skill |
| `skills.*.level` | integer | Current level |
| `stats` | object | Combat-relevant stats keyed by name (`strength`, `defence`, `speed`, `dexterity`, `combat`) |
| `stats.*.experience` | integer | Total XP in this stat |
| `stats.*.level` | integer | Current level — multiply by 2.4 to get the derived combat stat |
| `equipped_pet` | object\|null | Equipped pet with full combat data, or `null` if no pet is equipped |
| `equipped_pet.id` | integer | Pet instance ID |
| `equipped_pet.name` | string | Custom name if set, otherwise base pet name |
| `equipped_pet.level` | integer | Pet level |
| `equipped_pet.quality` | string | Pet quality tier |
| `equipped_pet.image_url` | string\|null | Pet image URL |
| `equipped_pet.stats.strength` | integer | Pet strength → Attack Power (×2.4) |
| `equipped_pet.stats.defence` | integer | Pet defence → Protection (×2.4) |
| `equipped_pet.stats.speed` | integer | Pet speed → Agility (×2.4) |
| `equipped_pet.evolution.state` | integer | Current evolution stage (0–5) |
| `equipped_pet.evolution.max` | integer | Maximum evolution stages (always 5) |
| `equipped_pet.evolution.bonus_per_stage` | integer | Stat bonus per stage (always 5, meaning 5% per stage) |
| `equipped_pet.evolution.current_bonus` | integer | Total current bonus (`state × bonus_per_stage`) |
| `equipped_pet.evolution.targets` | array | Combat stats this pet can boost via evolution |

> **Combat stat derivation:** `stat.level × 2.4 = combat_stat_value`
> See `docs/game-mechanics/combat-stats.md` for full formula.

> **Pet stats API bug:** Pet `stats` (strength/defence/speed) may return 0 even when trained. The Dungeon Planner provides manual override inputs as a fallback.

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
{ "error": "IdleMMO API /v1/character/abc123def456/information returned 429" }
```

---

## Data Source

Makes two IdleMMO API calls in parallel:
- `GET /v1/character/{id}/information` — character skills/stats
- `GET /v1/character/{id}/pets` — all pets; identifies equipped one via `pet.equipped === true`
