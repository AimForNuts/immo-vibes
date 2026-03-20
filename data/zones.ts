/**
 * Static zone and enemy data for the Combat Planner.
 *
 * Source: in-game observation / user-provided empirical data.
 * See docs/game-mechanics/combat.md for the data model and scaling formula.
 *
 * TO ADD DATA: Fill in baseXP, baseHP, and stats for each enemy.
 * Stats at other levels scale as: scaled_stat = base_stat × (scaled_level / baseLevel)
 */

export interface Enemy {
  id: string;
  name: string;
  baseLevel: number;
  /** XP awarded per kill at baseLevel. Fill in from in-game observation. */
  baseXP: number | null;
  /** HP at baseLevel. Fill in from in-game observation. */
  baseHP: number | null;
  /** Combat stats at baseLevel. null = not yet observed. */
  stats: {
    attack_power: number | null;
    protection: number | null;
    agility: number | null;
    accuracy: number | null;
  };
}

export interface Zone {
  id: string;
  name: string;
  /** Minimum combat level required to hunt here */
  minLevel: number;
  enemies: Enemy[];
}

// ─── Zones ────────────────────────────────────────────────────────────────────
// Add zones and enemies as data becomes available.

export const ZONES: Zone[] = [
  {
    id: "starter_field",
    name: "Starter Field",
    minLevel: 1,
    enemies: [
      {
        id: "slime",
        name: "Slime",
        baseLevel: 1,
        baseXP: null,
        baseHP: null,
        stats: { attack_power: null, protection: null, agility: null, accuracy: null },
      },
    ],
  },
  // Add more zones here as data is gathered
];
