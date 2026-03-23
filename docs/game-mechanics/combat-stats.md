# Combat Stats — Formulas

> Source: https://wiki.idle-mmo.com/character/stats + empirical testing

---

## Stat Conversion (Character Skills → Combat Stats)

Each character skill level converts to a combat stat at a fixed rate:

| Skill | Combat Stat | Multiplier |
|---|---|---|
| Strength | Attack Power | × 2.4 per level |
| Defence | Protection | × 2.4 per level |
| Speed | Agility | × 2.4 per level |
| Dexterity | Accuracy | × 2.4 per level |

**Formula:** `combatStat = round(skillLevel × 2.4)`

**Example:** Strength 78 → Attack Power = round(78 × 2.4) = round(187.2) = **187**

> Note: The game uses `round` (half-up), not `floor`. For levels where `level × 2.4` ends in `.6+` the result is 1 higher than `floor`.
> Confirmed empirically: Speed 84 → round(201.6) = 202 (game value), floor(201.6) = 201 (off by 1).

> Note: An earlier estimate used 3.29 (derived from a measurement that unknowingly included gear).
> The wiki-documented value is 2.4.

---

## Gear Contribution (Tier Formula)

Item stats scale additively per tier:

```
effectiveStat = baseStat + (tier - 1) × tierModifier[stat]
```

- `baseStat` — the item's stat at Tier 1 (from `/v1/item/{id}/inspect`, `stats` field)
- `tierModifier[stat]` — flat addend per tier (from `tier_modifiers` field, keyed by stat name)
- Tier 1 = base stats (no modifier applied)
- Tier 5 example: `baseStat + 4 × tierModifier`

---

## Total Combat Score (for Dungeon Difficulty)

```
totalCombat = attackPower + protection + agility + accuracy
```

This sum is compared against the dungeon's difficulty rating.

---

## Class Talent Bonuses (flat, applied after gear)

These are **flat additions** to the final combat stat (not multiplied):

| Class | Level | Bonus |
|---|---|---|
| Warrior | 70 | +40 Protection |
| Shadowblade | 70 | +40 Agility |

See [classes.md](./classes.md) for full talent tables.

---

## API Field Names

The character info endpoint (`/v1/character/{id}/information`) returns:

- `character.stats` — contains `strength`, `defence`, `speed`, `dexterity` (each with `level` and `experience`)
- `character.skills` — contains gathering/crafting skills + `combat`, `dungeoneering`

> There are **no** sub-endpoints for equipment, inventory, stats, or combat-stats.
> All 23 probed paths return 404. Character ID must come from the DB or user settings — there is no `/whoami` endpoint.
