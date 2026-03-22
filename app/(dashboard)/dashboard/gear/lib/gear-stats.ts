/**
 * Pure stat calculation functions for the Gear Calculator.
 *
 * No React dependencies, no side effects. All functions take plain data
 * and return derived values. This module can be imported from both client
 * and server contexts.
 *
 * Source formulas: docs/game-mechanics/combat-stats.md
 */

import type { GearSet, SlotKey, SlotStatsMap, ComputedStats, InspectEntry } from "../types";

/**
 * Apply per-tier scaling to a base stat value.
 *
 * tier_modifiers stores the addend per additional tier above 1.
 * Tier 1 = base value, each additional tier adds the modifier once.
 *
 * @param baseValue  - The base stat value at tier 1
 * @param stat       - The stat key (used to look up the per-tier addend)
 * @param tier       - The current item tier (>= 1)
 * @param tierMods   - Map of stat key → addend per tier, or null
 * @returns          The scaled stat value rounded to the nearest integer
 */
export function applyTier(
  baseValue: number,
  stat: string,
  tier: number,
  tierMods: Record<string, number> | null
): number {
  const addend = tierMods?.[stat] ?? 0;
  return Math.round(baseValue + (tier - 1) * addend);
}

/**
 * Compute per-slot stat contributions for a gear set.
 *
 * For each filled slot, looks up the item's inspect data and applies
 * tier scaling to each stat. Slots with no item or no inspect data are
 * omitted from the result.
 *
 * @param set      - The gear set to compute stats for
 * @param inspects - Map of hashedId → inspect data fetched from the API
 * @returns        A partial map of slot key → { statKey: scaledValue }
 */
export function buildSlotStats(
  set: GearSet,
  inspects: Record<string, InspectEntry>
): SlotStatsMap {
  const result: SlotStatsMap = {};
  for (const [slot, item] of Object.entries(set.slots)) {
    if (!item) continue;
    const inspect = inspects[item.hashedId];
    if (!inspect?.stats) continue;
    const stats: Record<string, number> = {};
    for (const [stat, value] of Object.entries(inspect.stats)) {
      stats[stat] = applyTier(value, stat, item.tier, inspect.tier_modifiers);
    }
    result[slot as SlotKey] = stats;
  }
  return result;
}

/**
 * Compute total combat stats for both gear sets, including character base stats.
 *
 * Iterates over all filled slots in each set, sums tier-scaled item stats,
 * then adds the character's base combat stats as the starting totals.
 *
 * @param setA      - First gear set
 * @param setB      - Second gear set
 * @param inspects  - Map of hashedId → inspect data for all items in both sets
 * @param charStats - Character base combat stats (from useCharacterStats)
 * @returns         Object with `setA` and `setB` total stat maps
 */
export function computeGearStats(
  setA: GearSet,
  setB: GearSet,
  inspects: Record<string, InspectEntry>,
  charStats: Record<string, number>
): ComputedStats {
  function computeStats(set: GearSet, base: Record<string, number>): Record<string, number> {
    const totals = { ...base };
    for (const item of Object.values(set.slots)) {
      if (!item) continue;
      const inspect = inspects[item.hashedId];
      if (!inspect?.stats) continue;
      for (const [stat, value] of Object.entries(inspect.stats)) {
        totals[stat] = (totals[stat] ?? 0) + applyTier(value, stat, item.tier, inspect.tier_modifiers);
      }
    }
    return totals;
  }

  return {
    setA: computeStats(setA, charStats),
    setB: computeStats(setB, charStats),
  };
}
