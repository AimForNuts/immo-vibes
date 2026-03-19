# Pets — Combat Contribution

> Sources: https://wiki.idle-mmo.com/pets/overview · API endpoint `/v1/character/{id}/pets`

---

## Only the Equipped Pet Contributes

Only the pet with `equipped: true` adds to the character's combat stats.
All other pets in the collection have no effect on dungeon readiness.

---

## Pet Skill → Combat Stat Conversion

Pet skills use the **same ×2.4 multiplier** as character skills:

| Pet Stat (`stats.*`) | Combat Stat | Formula |
|---|---|---|
| `strength` | Attack Power | `floor(strength × 2.4)` |
| `defence` | Protection | `floor(defence × 2.4)` |
| `speed` | Agility | `floor(speed × 2.4)` |

> Pets have no `dexterity` stat — they do not contribute to Accuracy directly.

---

## Evolution Bonuses

Pets can evolve up to 5 stages. Each stage permanently boosts one chosen combat stat:

```
bonus = evolution.state × evolution.bonus_per_stage   (bonus_per_stage = 5)
```

| Stage | Bonus |
|---|---|
| 0 | 0% |
| 1 | 5% |
| 2 | 10% |
| 3 | 15% |
| 4 | 20% |
| 5 | 25% |

The bonus applies to one of: `ATTACK_POWER`, `PROTECTION`, `AGILITY`, `ACCURACY`, or `MOVEMENT_SPEED`.
The chosen target is determined during the evolution process and cannot be inferred from the API alone
(the `targets` array lists all possible options, not the chosen one — visible only at state > 0).

**Note:** Our current implementation does not apply evolution bonuses yet, as the chosen target
is not returned by the API. This can be added as a manual override or if the API surface changes.

---

## Pet Mastery Scaling

Your Pet Mastery skill level scales the equipped pet's contribution:

- Mastery 100 → up to **+20% additional stats** from the pet
- Bonus grows faster after Mastery level 70

**Note:** Pet Mastery bonus is not currently applied in the calculator.
Can be added as a manual modifier input if needed.

---

## API Endpoint

`GET /v1/character/{hashed_id}/pets`

Returns all pets on the account. Key fields per pet:

| Field | Type | Description |
|---|---|---|
| `id` | integer | Unique character pet instance ID |
| `name` | string | Pet base name |
| `custom_name` | string\|null | Player-set name (prefer this if set) |
| `level` | integer | Current pet level |
| `quality` | string | STANDARD / REFINED / PREMIUM / EPIC / LEGENDARY / MYTHIC |
| `stats.strength` | integer | Contributes to Attack Power |
| `stats.defence` | integer | Contributes to Protection |
| `stats.speed` | integer | Contributes to Agility |
| `equipped` | boolean | **True = this pet is active and contributing** |
| `evolution.state` | integer | Current evolution stage (0–5) |
| `evolution.current_bonus` | integer | % bonus from evolution (state × 5) |
| `evolution.targets` | array | Possible combat stat targets for evolution |

**Rate limiting:** counts toward the 20 req/min shared limit. Fetch in parallel with `getCharacterInfo`.
