/**
 * Shared game-domain constants used across multiple UI components.
 *
 * Centralised here to avoid duplication and to make it easy for future
 * Claude sessions to find game-display constants without reading every
 * component file. See docs/game-mechanics/ for the underlying formulas.
 */

// ─── Item quality ─────────────────────────────────────────────────────────────

/** Canonical display order for IdleMMO quality tiers (lowest → highest). */
export const QUALITY_ORDER = [
  "STANDARD",
  "REFINED",
  "PREMIUM",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
  "UNIQUE",
] as const;

/**
 * Single source of truth for quality tier colours.
 * All other quality colour maps are derived from these hex values.
 * Change a colour here and it propagates everywhere automatically.
 */
export const QUALITY_HEX: Record<string, string> = {
  STANDARD:  "#f4f4f5",  // zinc-100
  REFINED:   "#60a5fa",  // blue-400
  PREMIUM:   "#4ade80",  // green-400
  EPIC:      "#f87171",  // red-400
  LEGENDARY: "#fb923c",  // orange-400
  MYTHIC:    "#e879f9",  // fuchsia-400
  UNIQUE:    "#a78bfa",  // violet-400
};

/** Tailwind text-colour class for each quality tier. */
export const QUALITY_COLORS: Record<string, string> = {
  STANDARD:  "text-zinc-100",
  REFINED:   "text-blue-400",
  PREMIUM:   "text-green-400",
  EPIC:      "text-red-400",
  LEGENDARY: "text-orange-400",
  MYTHIC:    "text-fuchsia-400",
  UNIQUE:    "text-violet-400",
};

/** Tailwind left-border colour class for each quality tier. */
export const QUALITY_BORDER_COLORS: Record<string, string> = {
  STANDARD:  "border-l-zinc-300",
  REFINED:   "border-l-blue-400",
  PREMIUM:   "border-l-green-400",
  EPIC:      "border-l-red-400",
  LEGENDARY: "border-l-orange-400",
  MYTHIC:    "border-l-fuchsia-400",
  UNIQUE:    "border-l-violet-400",
};

/** CSS rgba border colour for inline-style card borders (e.g. hover effects). */
export const QUALITY_BORDER_CSS: Record<string, string> = {
  STANDARD:  "rgba(244,244,245,0.40)",
  REFINED:   "rgba(96,165,250,0.55)",
  PREMIUM:   "rgba(74,222,128,0.55)",
  EPIC:      "rgba(248,113,113,0.60)",
  LEGENDARY: "rgba(251,146,60,0.60)",
  MYTHIC:    "rgba(232,121,249,0.65)",
  UNIQUE:    "rgba(167,139,250,0.55)",
};

/** CSS rgba glow colour for inline-style box-shadow effects. */
export const QUALITY_GLOW_CSS: Record<string, string> = {
  STANDARD:  "rgba(244,244,245,0.08)",
  REFINED:   "rgba(96,165,250,0.14)",
  PREMIUM:   "rgba(74,222,128,0.14)",
  EPIC:      "rgba(248,113,113,0.16)",
  LEGENDARY: "rgba(251,146,60,0.16)",
  MYTHIC:    "rgba(232,121,249,0.18)",
  UNIQUE:    "rgba(167,139,250,0.14)",
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
