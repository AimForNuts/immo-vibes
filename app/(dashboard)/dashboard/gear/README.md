# Gear Calculator

Gear set builder with combat stat preview and A/B comparison between two gear configurations.

## Business problem

Lets users build and compare two gear sets slot by slot, compute total combat stats (factoring in character base stats and item tier scaling), and save/load named presets linked to characters.

## Files

### `GearCalculator.tsx`
Root client component. Owns gear set state, preset state, and comparison results. Calls `computeGearStats` and coordinates all sub-components.

### `actions.ts`
Server actions for preset persistence: `savePreset`, `updatePreset`, `deletePreset`. DB writes go here — never in the client component.

### `types.ts`
All TypeScript types: `WeaponStyle`, `SlotKey`, `SlotSelection`, `GearSet`, `CatalogItem`, `InspectEntry`, `ComputedStats`, `SlotStatsMap`.

### `lib/gear-stats.ts`
Pure stat calculation functions (no React, no side effects):
- `applyTier(baseValue, stat, tier, tierMods)` → `number` — applies per-tier addend to a base stat value
- `buildSlotStats(set, inspects)` → `SlotStatsMap` — computes per-slot stat contributions with tier scaling
- `computeGearStats(setA, setB, inspects, charStats)` → `ComputedStats` — totals all slot stats + character base stats for both sets

### `components/GearSetPanel.tsx`
Renders one gear set (A or B): weapon style selector, all slots with thumbnails, tier input, remove button, clear and copy controls.

### `components/ItemPickerModal.tsx`
Search-and-select overlay. Uses `useItemSearch` internally. Calls `onSelect(catalogItem)` when user picks an item.

### `components/StatsPanel.tsx`
Computed stats comparison table. Shows total stats for Set A vs Set B, delta highlighting, and per-slot breakdown.

### `components/PresetManager.tsx`
Save/load/delete presets UI. Reads from and writes to `actions.ts` (server actions).

### `hooks/useCharacterStats.ts`
Fetches character data from `/api/idlemmo/character/[id]` and transforms raw skill levels into combat stat values using `CHAR_STAT_MAP` from `lib/game-constants.ts`.
- Input: `characterId: string`
- Returns: `{ charStats: Record<string, number>, charLoading: boolean }`

### `hooks/useItemSearch.ts`
Debounced item search for the picker modal. Fetches `/api/items` filtered by slot type and quality.
- Returns: `{ results, searching, query, setQuery, qualityFilter, setQualityFilter }`

## Related docs
- `docs/project-map.md` — Gear Calculator section
- `docs/game-mechanics/combat-stats.md` — stat formulas and multipliers
- `lib/game-constants.ts` — SLOT_LABELS, CHAR_STAT_MAP, QUALITY_COLORS
