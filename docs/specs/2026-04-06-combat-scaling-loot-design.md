# Combat Scaling & Loot MF Calculator — Design Spec

**Date:** 2026-04-06  
**Status:** Approved

---

## Summary

Overhaul the Enemy Scaling control in the Combat Planner to:
1. Replace the broken checkbox + slider with a single slider (default = character's combat level, reset button to restore default)
2. Add a debounced calculation (1.5s) with a loading indicator while the slider is in motion
3. Calculate per-item loot rates adjusted for the Magic Find (MF) bonus that scaling provides

---

## Background

The current scaling slider has a bug: for L80–99 characters, `max` equals `combatLevel`, making `min === max` — the slider cannot move. The UX is also split across a checkbox and a slider, which is unnecessary friction.

Magic Find is a mechanic where scaling enemies above their base level boosts individual item drop rates by 0–40%, based on the level gap. The game UI hides MF-adjusted rates; our calculator should show them.

---

## Architecture

### Files Changed

| File | Change | Server/Client |
|---|---|---|
| `app/(dashboard)/dashboard/combat/hooks/useEnemyScaling.ts` | **New** — scaling state, debounce, MF math | Client |
| `app/(dashboard)/dashboard/combat/CombatPlanner.tsx` | Replace checkbox+slider with hook-driven slider; update loot Per Kill% rendering | Client |

No new API routes. No DB changes. No new pages.

---

## Hook: `useEnemyScaling`

**Location:** `app/(dashboard)/dashboard/combat/hooks/useEnemyScaling.ts`

### Signature

```ts
useEnemyScaling(charCombatLevel: number | null): {
  scaledLevel: number;       // committed level — drives all calculations
  pendingLevel: number;      // live slider value — updates on every tick
  isCalculating: boolean;    // true while pendingLevel !== scaledLevel
  isScaling: boolean;        // true when scaledLevel !== charCombatLevel
  setLevel: (n: number) => void;
  reset: () => void;
}
```

### Behaviour

- `pendingLevel` is updated immediately on every slider `onChange`
- A `useEffect` with a 1.5s timeout commits `pendingLevel` → `scaledLevel` after the user stops dragging
- `isCalculating = pendingLevel !== scaledLevel`
- `reset()` sets both `pendingLevel` and `scaledLevel` to `charCombatLevel`; `isCalculating` becomes false immediately
- When `charCombatLevel` changes (character switch), both levels reset to the new value

### Slider Range

- `min = charCombatLevel` (or 1 as a fallback)
- `max = 150`
- Gated: disabled and visually muted for characters below L80 (game requirement)

---

## MF Loot Calculation

### Formula

```
mfGap   = max(0, scaledLevel - enemy.level)
mfBonus = min(40, (mfGap / 149) * 40)
```

149 = maximum possible gap (enemy L1 scaled to L150 = +40%).

Source: https://wiki.idle-mmo.com/combat/battling#magic-find-calculation

### Applied to loot items

- `enemy.chance_of_loot` — **unchanged** (MF does not affect the drop trigger chance)
- Each `item.chance` is adjusted: `adjustedChance = item.chance × (1 + mfBonus / 100)`
- If the sum of adjusted chances across all loot items exceeds 100%, trim proportionally starting with the most common items (matching stated game behaviour)
- `perKill% = (enemy.chance_of_loot × adjustedChance) / 100`

### Display

| Column | When not scaling | When scaling (MF > 0) |
|---|---|---|
| Roll% | `item.chance` (raw) | `item.chance` (raw — game shows same) |
| Per Kill% | base effective rate | MF-adjusted rate, highlighted emerald |

A `+N% MF` badge appears in the loot sub-row header when MF is non-zero for that enemy.

The zone header already shows an average MF badge — this remains, updated to use the correct per-enemy formula averaged across the zone.

---

## Slider UX

### Control Panel

Replaces the current "checkbox + slider" layout:

- Labeled slider: `L{pendingLevel}` shown in real-time
  - Muted colour at default level; primary (bold) when scaled above default
- `RotateCcw` icon reset button to the right — disabled when already at default
- `Loader2` spinner next to the level label while `isCalculating` is true
- Below L80: slider is disabled with `(L80+ required)` label

### Loot Sub-rows While Calculating

When `isCalculating` is true, the Per Kill% cells in expanded loot rows show in a dimmed/muted state to indicate the value is stale and will update shortly.

---

## Magic Find Formula Reference

From wiki:

> "Magic Find only applies to the loot rates for each item, it does not apply to the chance of obtaining a drop."

> "The magic bonus does not affect the UI in situations where loot chances are visible." (This is about the game's UI — our calculator intentionally shows the adjusted rates.)

> "The system will trim the rates, starting with the most common items" when adjusted rates exceed 100%.

---

## Documentation Updates

After implementation, update:

- `docs/game-mechanics/combat.md` — document the MF formula, wiki source, and loot rate cap/trim behaviour
- `docs/project-map.md` — add `hooks/useEnemyScaling.ts` to the Combat Planner section
