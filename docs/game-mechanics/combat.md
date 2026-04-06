# Combat Mechanics

> Sources: https://wiki.idle-mmo.com/combat/battling · https://wiki.idle-mmo.com/combat/hunting · https://wiki.idle-mmo.com/character/stats

---

## Combat Stats (How They Work)

| Stat | Derived From | Per Level | Effect |
|---|---|---|---|
| Attack Power | Strength × 2.4 | +2.4 | Damage dealt to enemy |
| Protection | Defence × 2.4 | +2.4 | Damage absorbed per hit (flat) |
| Agility | Speed × 2.4 | +2.4 | Reduces enemy's hit chance |
| Accuracy | Dexterity × 2.4 | +2.4 | Increases your hit chance |

Class L70 talents add flat bonuses on top (see `classes.md`).

> **Note:** Exact hit-chance and damage formulas are not disclosed by the wiki. The community understanding is:
> - Net damage per hit ≈ enemy_AP − player_Protection (min 1)
> - Hit chance is a function of Accuracy vs enemy Agility (formula opaque)

---

## Health & Food

```
Effective HP = base_HP + Σ(food_quantity × food_HP_value)
```

- The system uses **weakest food first** (not guaranteed under all conditions)
- Unused food returns to inventory when the battle ends early
- **Minimum 1 damage taken** per battle regardless of Protection

Base HP is not level-scaled by a documented formula — treat it as fixed at 100 until confirmed otherwise.

---

## Combat Stances

| Stance | EXP Goes To |
|---|---|
| Balanced | All four stats equally |
| Offensive | Strength only |
| Defensive | Defence only |
| Agile | Speed only |
| Dexterous | Dexterity only |

**EXP rounding note:** "25 EXP from an enemy" → each of 4 stats gets 6 EXP = 24 total (1 lost to rounding in Balanced). Combat Level EXP is separate and always added.

---

## Enemy Scaling (Membership — Combat L80+)

| Character Level | Scaling Option | MF Bonus |
|---|---|---|
| 80–99 | Toggle: scale to current level | 0–40% (based on level gap) |
| 100+ | Slider: scale to any level up to 150 | 0–40% (based on level gap) |

- XP rewards scale proportionally to the chosen level (not the enemy's base level)
- MF bonus applies to **loot rates per item**, not drop chance
- Food/HP consumption increases with scaled enemies (magnitude undocumented — needs empirical data)

### Magic Find (MF) Formula

Scaling enemies above their base level grants a Magic Find bonus (0–40%) that increases individual item roll rates:

```
mfBonus = min(40, (gap / 149) × 40)
gap     = max(0, scaledLevel − enemyBaseLevel)
```

Where 149 is the maximum possible gap (L1 enemy scaled to L150 = +40%).

**Important constraints (wiki):**
- MF applies to **item roll %** only — `chance_of_loot` (the drop trigger) is unaffected
- If adjusted item chances sum to > 100%, the game trims from the most common items first
- The game UI does not display MF-adjusted rates; ImmoWeb Suite shows the calculated values

Source: https://wiki.idle-mmo.com/combat/battling#magic-find-calculation

---

## Hunting Speed Formula

How many enemies are found per second while hunting:

```
enemies_per_second = 0.03 × (1 + level_norm + speed_norm)

level_norm  = combat_level / 100        (max 1.0 at L100)
speed_norm  = movement_speed / 50       (max 1.0 at 50 m/s)
```

| Scenario | Movement Speed | Enemies/sec | Per 8h Hunt |
|---|---|---|---|
| Early game | 8 m/s | ~0.034 | ~987 |
| Mid game | 20 m/s | ~0.056 | ~1,627 |
| End game | 40 m/s | ~0.083 | ~2,416 |

**Enemy decay:** Found enemies flee over time. At Hunting Mastery 1: 10% flee per 4h. At Mastery 100: 2.5% flee per 4h.

---

## XP Per Hour Estimate

```
xp_per_hour = enemies_per_hour × xp_per_kill_at_scaled_level
enemies_per_hour = enemies_per_second × 3600
```

XP per kill at scaled level is proportional to level — empirical base values needed per zone (see `data/zones.ts`).

---

## Enemy Data — API (`/v1/combat/enemies/list`)

Returns 47 enemies. Response shape: `{ enemies: EnemyInfo[], endpoint_updates_at: string }`.

Each enemy object:
```json
{
  "id": 1,
  "name": "Rabbit",
  "image_url": "https://cdn.idle-mmo.com/...",
  "level": 1,
  "experience": 3,
  "health": 23,
  "chance_of_loot": 30,
  "location": { "id": 1, "name": "Bluebell Hollow" },
  "loot": [{ "hashed_item_id": "...", "name": "...", "quality": "PREMIUM", "quantity": 1, "chance": 20 }]
}
```

**Available from API:** `name`, `level`, `health` (HP), `experience` (XP/kill), `location` (zone), `chance_of_loot`, loot table.

**NOT in API:** `attack_power`, `protection`, `agility`, `accuracy` — stored in `data/enemy-combat-stats.ts`, keyed by enemy `id`.

### 10 Zones (confirmed)

| Zone | Level Range | Enemy Count |
|---|---|---|
| Bluebell Hollow | L1–L6 | 4 |
| Whispering Woods | L8–L16 | 5 |
| Eldoria | L18–L28 | 6 |
| Crystal Caverns | L32–L42 | 5 |
| Skyreach Peak | L48–L58 | 4 |
| Enchanted Oasis | L60–L69 | 5 |
| Floating Gardens of Aetheria | L70–L76 | 4 |
| Celestial Observatory | L78–L89 | 5 |
| Isle of Whispers | L92–L99 | 4 |
| The Citadel | L100 | 5 |

### Scaling formula (assumption — validate against in-game)

```
scaled_stat = round(base_stat × (scaled_level / base_level))
scaled_hp   = round(base_hp   × (scaled_level / base_level))
scaled_xp   = round(base_xp   × (scaled_level / base_level))
```

---

## Implementation Status

| Feature | Status |
|---|---|
| Combat stats formula (×2.4) | ✅ Implemented in gear calc + dungeon planner |
| Class L70 talent bonuses | ✅ Implemented in dungeon planner |
| Enemy zone table (static data) | 🔲 Data to be populated by user |
| Scaling toggle/slider | ✅ Implemented — debounced slider with reset button (L80+) |
| MF loot rate calculation | ✅ Implemented — Per Kill% shows MF-adjusted rates in loot view |
| XP/hour estimate | 🔲 Planned — needs base XP per enemy |
| Food consumption estimate | 🔲 Planned — needs damage formula confirmation |
