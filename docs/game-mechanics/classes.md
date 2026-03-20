# IdleMMO Character Classes

> Source: https://wiki.idle-mmo.com/character/classes

Classes grant permanent passive bonuses and unlock **Combat Talents** at specific combat levels.
Non-combat and challenge classes have no combat talents.

---

## Combat Classes

### Warrior
**Permanent bonuses**
- +10% Strength EXP
- +5% Battle EXP
- +5% Hunting Efficiency

**Combat Talents**
| Level | Talent | Effect |
|---|---|---|
| 10 | Mighty Strike | +2 base damage |
| 35 | Rampage | +10 critical attack |
| 70 | Shield Wall | **+40 Protection** |

---

### Shadowblade
**Permanent bonuses**
- +5% Speed EXP
- +10% Hunting Efficiency
- +5% Battle EXP

**Combat Talents**
| Level | Talent | Effect |
|---|---|---|
| 10 | Backstab | +2% critical chance |
| 35 | Shadow Piercer | +10% critical damage |
| 70 | Shadow's Veil | **+40 Agility** |

---

### Ranger
**Permanent bonuses**
- +7% Dexterity EXP
- +8% Hunting Efficiency
- +5% Battle EXP

**Combat Talents**
| Level | Talent | Effect |
|---|---|---|
| 10 | Piercing Shot | +2 base damage |
| 35 | Eagles Eye | +3% critical chance |
| 70 | Nature's Aid | +10% critical damage |

---

## Skill Classes (no combat talents)

| Class | Primary Bonus |
|---|---|
| Miner | +10% Mining Efficiency, +10% Mining EXP |
| Angler | +10% Fishing Efficiency, +10% Fishing EXP |
| Chef | +10% Cooking Efficiency, +10% Cooking EXP |
| Lumberjack | +10% Woodcutting Efficiency, +10% Woodcutting EXP |
| Smelter | +10% Smelting Efficiency, +10% Smelting EXP |
| Beastmaster | +10% Pet Mastery EXP, +10% Pet EXP |

---

## Challenge Classes (locked — cannot be freely chosen)

| Class | Restrictions |
|---|---|
| Banished | Restricted trading/market access |
| Forsaken | −50% Skill, Battle, and Dungeon EXP |
| Cursed | −50% Skill, Battle, and Dungeon EXP |

---

## Notes for Dungeon Planner

- **Warrior L70 Shield Wall** adds a flat +40 to Protection — **implemented** in the dungeon planner (applied automatically when `data.stats.combat.level >= 70`).
- **Shadowblade L70 Shadow's Veil** adds a flat +40 to Agility — **implemented** in the dungeon planner.
- Ranger talents only affect critical chance/damage, not the base combat stats used for difficulty checks — **not applied**.
- L10 and L35 talents (base damage, critical) do not affect the 4 combat stat keys (attack_power / protection / agility / accuracy) — **not applied**.
- Class talent levels refer to **combat level** (`data.stats.combat.level`), not total level.
