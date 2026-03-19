# Dungeon Mechanics

> Source: https://wiki.idle-mmo.com/combat/dungeons

---

## Run Eligibility (Combat Score vs Difficulty)

`ratio = totalCombatScore / dungeonDifficulty`

| Ratio | Status | HP Loss per Run | Magic Find |
|---|---|---|---|
| < 0.70 (−30%) | **Cannot enter** | — | — |
| 0.70 → 1.00 | Risky | 100% → 50% (linear) | None |
| 1.00 → 1.30 | Normal | 50% → 10% (linear) | None |
| 1.30 → 1.60 (+30% to +60%) | Good | 10% (flat) | Small bonus |
| ≥ 1.60 (+60%) | Excellent | 10% (flat) | Max bonus |

### HP Loss Formula

```
ratio in [0.70, 1.00]:  hpLoss = 100 − ((ratio − 0.70) / 0.30) × 50
ratio in [1.00, 1.30]:  hpLoss = 50  − ((ratio − 1.00) / 0.30) × 40
ratio ≥ 1.30:           hpLoss = 10 (flat)
```

### Chaining

Chaining (running back-to-back without healing) is possible when HP loss per run ≤ 50%.
This corresponds to `ratio ≥ 1.00`.

---

## Difficulty Field in API

The `/v1/combat/dungeons/list` endpoint returns `difficulty` as an integer.
The `length` field is in **milliseconds** (divide by 1000 for seconds, 60000 for minutes).

Seasonal dungeons (Winter Wonderland, Pumpkin Hollow, etc.) are **not** returned by the API — use static data.

---

## Magic Find

- Below 130%: no MF bonus from difficulty
- 130–160%: small MF increase
- ≥ 160%: max MF bonus
- Completing a dungeon the required number of times grants a **permanent +1% MF** (stacks across all dungeons)
