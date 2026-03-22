export type WeaponStyle = "DUAL_DAGGER" | "SWORD_SHIELD" | "BOW";

export type SlotKey =
  | "main_hand"
  | "off_hand"
  | "helmet"
  | "chestplate"
  | "greaves"
  | "gauntlets"
  | "boots";

export interface SlotSelection {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
  tier: number;
  maxTier: number | null;
}

export interface GearSet {
  weaponStyle: WeaponStyle;
  slots: Partial<Record<SlotKey, SlotSelection>>;
}

export interface CatalogItem {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
}

export type InspectEntry = {
  stats: Record<string, number> | null;
  tier_modifiers: Record<string, number> | null;
  max_tier?: number;
};

export interface ComputedStats {
  setA: Record<string, number>;
  setB: Record<string, number>;
}

/** Per-slot item stat contributions, populated after Compare */
export type SlotStatsMap = Partial<Record<SlotKey, Record<string, number>>>;
