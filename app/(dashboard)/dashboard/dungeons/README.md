# Dungeons Explorer

Dungeon difficulty calculator with character stat comparison.

## Business problem

Lets users check whether their character (plus optional gear preset) meets a dungeon's entry threshold, and previews expected HP loss and Magic Find tier if they enter.

## Files

### `page.tsx`
Server component. Fetches dungeon list from the IdleMMO API, reads saved gear presets from the DB, and renders `DungeonExplorer`.

### `DungeonExplorer.tsx`
Client component. Owns character selection, preset selection, and dungeon assessment display.

Key exports:
- `DungeonExplorer({ dungeons, presets, itemsMap, characters, hasDifficultyData })` — root client component

### `difficulty.ts`
Pure calculation module (no React). Implements dungeon combat threshold math from `docs/game-mechanics/dungeons.md`.

Key exports:
- `COMBAT_STAT_KEYS` — `readonly string[]` — the four stats that count toward dungeon entry
- `totalCombatStats(stats)` → `number` — sums AP + Prot + Agi + Acc
- `formatDuration(seconds)` → `string` — human-readable time string
- `assessDungeon(totalStats, dungeon)` → `DungeonResult` — returns entry status, HP loss %, and MF tier
- `type StaticDungeon` — dungeon data shape (name, difficulty, etc.)
- `type MFTier` — `"none" | "small" | "max"`
- `type DungeonResult` — union: `{ canEnter: false }` | `{ canEnter: true; hpLossPct: number; mfTier: MFTier }`

## Related docs
- `docs/project-map.md` — Dungeons Explorer section
- `docs/game-mechanics/dungeons.md` — thresholds, HP loss formula, MF tiers
- `docs/game-mechanics/combat-stats.md` — stat formulas
