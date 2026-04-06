/**
 * Pure functions for combat enemy scaling and Magic Find loot adjustment.
 *
 * Formulas sourced from:
 * https://wiki.idle-mmo.com/combat/battling#magic-find-calculation
 *
 * MF applies to individual item roll % only — not to chance_of_loot (the drop trigger).
 * The game UI does not show MF-adjusted rates; this calculator intentionally does.
 */

/**
 * Returns the Magic Find bonus (0–40%) earned by scaling an enemy above its base level.
 *
 * Formula: mfBonus = min(40, (gap / 149) × 40)
 * where gap = max(0, scaledLevel − enemyBaseLevel)
 * and 149 is the maximum possible gap (L1 enemy scaled to L150).
 */
export function computeMfBonus(enemyBaseLevel: number, scaledLevel: number): number {
  const gap = Math.max(0, scaledLevel - enemyBaseLevel);
  return Math.min(40, (gap / 149) * 40);
}

/**
 * Applies a Magic Find bonus to a list of loot items by multiplying each item's
 * chance by (1 + mfBonus / 100).
 *
 * If the sum of adjusted chances exceeds 100%, excess is trimmed starting from
 * the most common items (highest chance first), matching game behaviour.
 *
 * Returns the original array unchanged when mfBonus is 0 or items is empty.
 * Never mutates the input array or its items.
 */
export function applyMfToLoot<T extends { chance: number }>(items: T[], mfBonus: number): T[] {
  if (mfBonus === 0 || items.length === 0) return items;

  const chances = items.map((item) => item.chance * (1 + mfBonus / 100));
  const total = chances.reduce((s, c) => s + c, 0);

  if (total <= 100) {
    return items.map((item, i) => ({ ...item, chance: chances[i] }));
  }

  // Sort indices by adjusted chance descending — trim most common first
  const order = chances
    .map((_, i) => i)
    .sort((a, b) => chances[b] - chances[a]);

  let excess = total - 100;
  for (const idx of order) {
    if (excess <= 0) break;
    const reduction = Math.min(chances[idx], excess);
    chances[idx] -= reduction;
    excess -= reduction;
  }

  return items.map((item, i) => ({ ...item, chance: chances[i] }));
}
