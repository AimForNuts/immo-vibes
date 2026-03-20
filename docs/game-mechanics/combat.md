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

## Enemy Data Model

Each enemy has:
- `name` — display name
- `zone` — which area they belong to
- `baseLevel` — their default level
- `baseXP` — XP at base level (to be confirmed empirically)
- `baseHP` — HP at base level
- `stats` — `{ attack_power, protection, agility, accuracy }` at base level

All values scale linearly with level when enemy scaling is applied:
```
scaled_stat = base_stat × (scaled_level / base_level)
```

> ⚠️ Scaling formula is an assumption — needs validation against in-game numbers.

---

## Implementation Status

| Feature | Status |
|---|---|
| Combat stats formula (×2.4) | ✅ Implemented in gear calc + dungeon planner |
| Class L70 talent bonuses | ✅ Implemented in dungeon planner |
| Enemy zone table (static data) | 🔲 Data to be populated by user |
| Scaling toggle/slider | 🔲 Planned in combat planner |
| XP/hour estimate | 🔲 Planned — needs base XP per enemy |
| Food consumption estimate | 🔲 Planned — needs damage formula confirmation |
