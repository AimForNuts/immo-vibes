# Pets — Combat Contribution

> Sources: https://wiki.idle-mmo.com/pets/overview
> API endpoints: `/v1/character/{id}/information` · `/v1/character/{id}/pets`

---

## Finding the Equipped Pet (Two-Step)

The character info endpoint returns only basic equipped pet data — **not** combat stats.
You must cross-reference with the pets list to get full stats.

### Step 1 — `/v1/character/{id}/information`

Returns `character.equipped_pet`:
```json
{
  "id": 269947,
  "name": "Leovar",
  "image_url": "https://cdn.idle-mmo.com/...",
  "level": 96
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | integer | Character-pet instance ID (matches `id` in the pets list) |
| `name` | string | Pet base name |
| `image_url` | string\|null | Pet image |
| `level` | integer | Current level |

> ⚠️ No `hashed_id`, no `quality`, no combat stats here.

### Step 2 — `/v1/character/{id}/pets`

Returns all pets. Find the equipped one by `equipped: true` (reliable — confirmed matches `character.equipped_pet.id`).
Full stats and evolution info are on this object.

```json
{
  "id": 269947,
  "name": "Leovar",
  "quality": "LEGENDARY",
  "level": 96,
  "equipped": true,
  "stats": { "strength": 45, "defence": 38, "speed": 52 },
  "evolution": {
    "state": 0,
    "max": 5,
    "bonus_per_stage": 5,
    "current_bonus": 0,
    "targets": [
      { "key": "ATTACK_POWER",    "label": "Attack Power" },
      { "key": "PROTECTION",      "label": "Protection" },
      { "key": "AGILITY",         "label": "Agility" },
      { "key": "ACCURACY",        "label": "Accuracy" },
      { "key": "MOVEMENT_SPEED",  "label": "Movement Speed" }
    ]
  }
}
```

---

## Combat Stat Contribution

Only the pet with `equipped: true` contributes to combat stats.

The IdleMMO pets API returns final combat values directly in `stats.*` — no multiplier is applied:

| Pet API field (`stats.*`) | Combat Stat |
|---|---|
| `strength` | Attack Power (direct value) |
| `defence` | Protection (direct value) |
| `speed` | Agility (direct value) |

> These fields are stored as `attack_power`, `protection`, `agility` in `character_pets`.
>
> Pets have no `dexterity` — they do not contribute to Accuracy via the API.
> Accuracy and other stats (Max Stamina, Movement Speed, Critical Chance, Critical Damage)
> are manually entered by the user on the character page.
>
> The Dungeon Explorer reads pet contribution from the DB (`GET /api/characters/[id]/pet-stats`) instead of calling the live API.

---

## Evolution Bonuses

Each evolution stage permanently boosts one chosen combat stat:

| Stage | Bonus |
|---|---|
| 0 | 0% |
| 1–5 | state × 5% (up to 25%) |

The `targets` array lists all possible targets for the pet type — **not** the chosen one.
The chosen target is visible in-game but is not returned by the API.
**Not currently applied in the calculator** — can be added as a manual override if needed.

---

## Pet Mastery Scaling

Pet Mastery skill level scales the equipped pet's contribution up to +20% at level 100.
**Not currently applied in the calculator.**

---

## Implementation in Character API Route

`GET /api/idlemmo/character/[id]` fetches both endpoints in parallel:
1. `getCharacterInfo` → for character stats
2. `getCharacterPets` → find by `equipped: true` for full stats

Returns `equipped_pet: { id, name, level, quality, image_url, stats, evolution }` or `null`.
