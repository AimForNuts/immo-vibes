# Combat Planner

DPS calculator with enemy list and character selector.

## Business problem

Lets users estimate their combat effectiveness against specific enemies by comparing their character stats (AP/Prot/Agi/Acc) to enemy thresholds. Shows enemies-per-hour estimate and highlights stat gaps.

## Files

### `page.tsx`
Server component. Fetches enemies from the IdleMMO API and character list, then renders `CombatPlanner`.

### `CombatPlanner.tsx`
Client component. Owns character selection and stat display.

Key exports:
- `CombatPlanner({ characters, enemies, combatStats })` — root client component
  - `characters` — list of `{ hashed_id, name }` from the API
  - `enemies` — `EnemyInfo[]` from `lib/idlemmo.ts`
  - `combatStats` — `Record<number, EnemyCombatStats>` from `data/enemy-combat-stats.ts`

Key helpers (module-private):
- `scaleStat(base, baseLevel, scaledLevel)` → `number` — scales an enemy stat to a different combat level
- `enemiesPerHour(combatLevel, movementSpeed)` → `number` — estimates hunt rate (see `docs/game-mechanics/combat.md`)

## Related docs
- `docs/project-map.md` — Combat Planner section
- `docs/game-mechanics/combat.md` — hunting formula, stances, XP, food
- `docs/game-mechanics/combat-stats.md` — AP/Prot/Agi/Acc formulas
- `data/enemy-combat-stats.ts` — hardcoded enemy AP/Prot/Agi/Acc (not in API)
