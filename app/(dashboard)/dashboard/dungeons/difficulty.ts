import type { DungeonLootItem } from "@/lib/db/schema";

export type { DungeonLootItem };

/**
 * Dungeon difficulty calculations.
 * Source: https://wiki.idle-mmo.com/combat/dungeons
 *         docs/game-mechanics/dungeons.md
 *
 * Combat stats that count: Attack Power + Protection + Agility + Accuracy
 *
 * ratio = totalCombat / dungeonDifficulty
 *
 * Entry:      ratio ≥ 0.70 (−30% of difficulty)
 * HP loss:
 *   0.70 → 1.00  linear 100% → 50%
 *   1.00 → 1.30  linear 50% → 10%
 *   ≥ 1.30       flat 10%
 * Magic Find:
 *   < 1.30       none
 *   1.30 → 1.60  small bonus
 *   ≥ 1.60       max bonus
 */

export const COMBAT_STAT_KEYS = ["attack_power", "protection", "agility", "accuracy"] as const;

export function totalCombatStats(stats: Record<string, number>): number {
  return COMBAT_STAT_KEYS.reduce((sum, key) => sum + (stats[key] ?? 0), 0);
}

export type MFTier = "none" | "small" | "max";

export type DungeonResult =
  | { canEnter: false }
  | { canEnter: true; healthLossPct: number; canChain: boolean; mfTier: MFTier };

export function assessDungeon(combatTotal: number, difficulty: number): DungeonResult {
  if (difficulty <= 0) return { canEnter: false }; // unknown difficulty
  const ratio = combatTotal / difficulty;

  if (ratio < 0.70) return { canEnter: false };

  // HP loss: 100% at 0.70, 50% at 1.00, 10% at 1.30+
  let healthLossPct: number;
  if (ratio < 1.0) {
    healthLossPct = 100 - ((ratio - 0.70) / 0.30) * 50;
  } else if (ratio < 1.30) {
    healthLossPct = 50 - ((ratio - 1.00) / 0.30) * 40;
  } else {
    healthLossPct = 10;
  }

  const healthLossRounded = Math.round(healthLossPct);

  const mfTier: MFTier = ratio >= 1.60 ? "max" : ratio >= 1.30 ? "small" : "none";

  return {
    canEnter: true,
    healthLossPct: healthLossRounded,
    canChain: healthLossRounded <= 50,
    mfTier,
  };
}

/**
 * Static dungeon data from the wiki.
 * `difficulty` is populated from the IdleMMO API at runtime; 0 means unknown.
 */
export interface StaticDungeon {
  name: string;
  minLevel: number;
  location: string;
  goldCost: number;
  durationSec: number;
  difficulty: number; // 0 = unknown, filled by API when available
  loot?: DungeonLootItem[];
}

function dur(h: number, m = 0, s = 0) {
  return h * 3600 + m * 60 + s;
}

export const STATIC_DUNGEONS: StaticDungeon[] = [
  { name: "Millstone Mines",      minLevel: 3,  location: "Bluebell Hollow",               goldCost: 300,    durationSec: dur(2),          difficulty: 0 },
  { name: "Vineyard Labyrinth",   minLevel: 10, location: "Bluebell Hollow",               goldCost: 1200,   durationSec: dur(2, 3, 20),   difficulty: 0 },
  { name: "Verdant Veil",         minLevel: 25, location: "Whispering Woods",              goldCost: 2400,   durationSec: dur(2, 6, 40),   difficulty: 0 },
  { name: "Sylvan Sanctum",       minLevel: 40, location: "Whispering Woods",              goldCost: 3600,   durationSec: dur(2, 10),      difficulty: 0 },
  { name: "Whispering Catacombs", minLevel: 60, location: "Whispering Woods",              goldCost: 4800,   durationSec: dur(2, 13, 20),  difficulty: 0 },
  { name: "Cursed Asylum",        minLevel: 62, location: "Eldoria",                       goldCost: 6000,   durationSec: dur(2, 15, 20),  difficulty: 0 },
  { name: "Forgotten Archives",   minLevel: 65, location: "Eldoria",                       goldCost: 9000,   durationSec: dur(2, 20),      difficulty: 0 },
  { name: "Crystal Forge",        minLevel: 70, location: "Crystal Caverns",               goldCost: 15000,  durationSec: dur(2, 23, 20),  difficulty: 0 },
  { name: "Frostbite Spire",      minLevel: 74, location: "Skyreach Peak",                 goldCost: 18000,  durationSec: dur(2, 26, 40),  difficulty: 0 },
  { name: "Zenith's Sanctum",     minLevel: 76, location: "Skyreach Peak",                 goldCost: 21000,  durationSec: dur(2, 30),      difficulty: 0 },
  { name: "Mirage Citadel",       minLevel: 78, location: "Enchanted Oasis",               goldCost: 24000,  durationSec: dur(2, 33, 20),  difficulty: 0 },
  { name: "Eden's Embrace",       minLevel: 82, location: "Floating Gardens of Aetheria",  goldCost: 27000,  durationSec: dur(2, 36, 40),  difficulty: 0 },
  { name: "Arboreal Labyrinth",   minLevel: 84, location: "Floating Gardens of Aetheria",  goldCost: 30000,  durationSec: dur(2, 40),      difficulty: 0 },
  { name: "Bloodmoon Manor",      minLevel: 86, location: "Celestial Observatory",         goldCost: 33000,  durationSec: dur(2, 43, 20),  difficulty: 0 },
  { name: "Ruins of Old Ranhor",  minLevel: 88, location: "Isle of Whispers",              goldCost: 36000,  durationSec: dur(2, 46, 40),  difficulty: 0 },
  { name: "Volcanic Depths",      minLevel: 90, location: "Isle of Whispers",              goldCost: 39000,  durationSec: dur(2, 50),      difficulty: 0 },
  { name: "Celestial Enclave",    minLevel: 92, location: "The Citadel",                   goldCost: 42000,  durationSec: dur(3),          difficulty: 0 },
  { name: "The Nexus",            minLevel: 95, location: "The Citadel",                   goldCost: 45000,  durationSec: dur(3),          difficulty: 0 },
  // Seasonal
  { name: "Winter Wonderland",    minLevel: 25, location: "Yulewood Glades",               goldCost: 1500,   durationSec: dur(1),          difficulty: 0 },
  { name: "Springtide Keep",      minLevel: 25, location: "Springtide Fair",               goldCost: 1500,   durationSec: dur(1),          difficulty: 0 },
  { name: "Silverleaf Enclave",   minLevel: 25, location: "Moonlit Valley",                goldCost: 1500,   durationSec: dur(1),          difficulty: 0 },
  { name: "Pumpkin Hollow",       minLevel: 25, location: "Wraithwood Forest",             goldCost: 1500,   durationSec: dur(1),          difficulty: 0 },
  { name: "Wickedroot Patch",     minLevel: 50, location: "Wraithwood Forest",             goldCost: 4000,   durationSec: dur(1),          difficulty: 0 },
  { name: "Snowbound Forest",     minLevel: 50, location: "Yulewood Glades",               goldCost: 4000,   durationSec: dur(1),          difficulty: 0 },
  { name: "Garden of Grief",      minLevel: 50, location: "Springtide Fair",               goldCost: 4000,   durationSec: dur(1),          difficulty: 0 },
  { name: "Stone Hollow",         minLevel: 50, location: "Moonlit Valley",                goldCost: 4000,   durationSec: dur(1),          difficulty: 0 },
];

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(" ");
}
