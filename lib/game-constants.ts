/**
 * Shared game-domain constants used across multiple UI components.
 *
 * Centralised here to avoid duplication and to make it easy for future
 * Claude sessions to find game-display constants without reading every
 * component file. See docs/game-mechanics/ for the underlying formulas.
 */

// ─── Item quality ─────────────────────────────────────────────────────────────

/** Tailwind text-colour class for each IdleMMO quality tier. */
export const QUALITY_COLORS: Record<string, string> = {
  STANDARD:  "text-zinc-400",
  REFINED:   "text-green-400",
  PREMIUM:   "text-blue-400",
  EPIC:      "text-purple-400",
  LEGENDARY: "text-yellow-400",
  MYTHIC:    "text-red-400",
};

// ─── Gear slots ───────────────────────────────────────────────────────────────

/** Human-readable labels for gear slot keys returned by the IdleMMO API. */
export const SLOT_LABELS: Record<string, string> = {
  main_hand:  "Main Hand",
  off_hand:   "Off Hand",
  helmet:     "Helmet",
  chestplate: "Chestplate",
  greaves:    "Greaves",
  gauntlets:  "Gauntlets",
  boots:      "Boots",
};

// ─── Character stats → combat stats ──────────────────────────────────────────

/**
 * Maps character stat API keys (e.g. "strength") to their derived combat stat.
 *
 * Multiplier: each skill level contributes ×2.4 to the corresponding combat stat.
 * Source: docs/game-mechanics/combat-stats.md
 *
 * - `key`         — the combat stat key used in calculations ("attack_power" etc.)
 * - `skillLabel`  — display name of the character skill ("Strength", "Defence" …)
 * - `combatLabel` — display name of the derived combat stat ("Attack Power" …)
 * - `multiplier`  — XP per level → combat stat value
 */
export interface CharStatMapping {
  /** Combat stat key used in calculations (e.g. "attack_power") */
  key: string;
  /** Display name of the character skill (e.g. "Strength") */
  skillLabel: string;
  /** Display name of the derived combat stat (e.g. "Attack Power") */
  combatLabel: string;
  /** Stat value per skill level (always 2.4 — see docs/game-mechanics/combat-stats.md) */
  multiplier: number;
}

export const CHAR_STAT_MAP: Record<string, CharStatMapping> = {
  strength:  { key: "attack_power", skillLabel: "Strength",  combatLabel: "Attack Power", multiplier: 2.4 },
  defence:   { key: "protection",   skillLabel: "Defence",   combatLabel: "Protection",   multiplier: 2.4 },
  speed:     { key: "agility",      skillLabel: "Speed",     combatLabel: "Agility",      multiplier: 2.4 },
  dexterity: { key: "accuracy",     skillLabel: "Dexterity", combatLabel: "Accuracy",     multiplier: 2.4 },
};

// ─── Character status ─────────────────────────────────────────────────────────

/** Tailwind bg-colour class for character online-status dot indicators. */
export const STATUS_DOT_COLOR: Record<string, string> = {
  ONLINE:  "bg-emerald-500",
  IDLING:  "bg-yellow-500",
  OFFLINE: "bg-zinc-500",
};

/** Human-readable i18n key suffix for each character status. */
export const STATUS_LABEL_KEY: Record<string, string> = {
  ONLINE:  "online",
  IDLING:  "idling",
  OFFLINE: "offline",
};
