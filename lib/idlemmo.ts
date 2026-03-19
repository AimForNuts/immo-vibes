const BASE = "https://api.idle-mmo.com";

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ImmoWebSuite/1.0",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`IdleMMO API returned ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Characters ──────────────────────────────────────────────────────────────

export interface CharacterDetail {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  skills: Record<string, { experience: number; level: number }>;
  stats: Record<string, { experience: number; level: number }>;
  gold: number;
  tokens: number;
  shards: number;
  total_level: number;
  location: { id: number; name: string };
  equipped_pet: { id: number; name: string; image_url: string | null; level: number } | null;
  guild: {
    id: number;
    tag: string;
    experience: number;
    level: number;
    position: string;
  } | null;
  current_status: "ONLINE" | "IDLING" | "OFFLINE";
  created_at: string;
}

export interface AltCharacter {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  total_level: number;
  created_at: string;
}

export async function getCharacterInfo(
  hashedId: string,
  token: string
): Promise<CharacterDetail> {
  const data = await apiFetch<{ character: CharacterDetail }>(
    `/v1/character/${hashedId}/information`,
    token
  );
  return data.character;
}

export async function getAltCharacters(
  hashedId: string,
  token: string
): Promise<AltCharacter[]> {
  const data = await apiFetch<{ characters: AltCharacter[] }>(
    `/v1/character/${hashedId}/characters`,
    token
  );
  return data.characters;
}

// ─── Pets ─────────────────────────────────────────────────────────────────────

export interface CharacterPet {
  id: number;
  name: string;
  custom_name: string | null;
  pet_id: number;
  image_url: string | null;
  level: number;
  quality: string;
  /** Pet skill levels — contribute to combat stats via ×2.4 (same as character skills) */
  stats: {
    strength: number;
    defence: number;
    speed: number;
  };
  equipped: boolean;
  evolution: {
    state: number;          // 0–5
    max: number;            // always 5
    bonus_per_stage: number; // always 5 (= 5% per stage)
    current_bonus: number;  // state × bonus_per_stage
    /** Possible combat stat targets for evolution bonuses */
    targets: Array<{ key: string; label: string }>;
  };
}

export async function getCharacterPets(
  hashedId: string,
  token: string
): Promise<CharacterPet[]> {
  const data = await apiFetch<{ pets: CharacterPet[] }>(
    `/v1/character/${hashedId}/pets`,
    token
  );
  return data.pets;
}

// ─── Item types ──────────────────────────────────────────────────────────────

/** All item types returned by the IdleMMO API. */
export const IDLEMMO_ITEM_TYPES = [
  "BAIT", "BLANK_SCROLL", "BOOTS", "BOW", "CAKE", "CAMPAIGN_ITEM", "CHEST",
  "CHESTPLATE", "COLLECTABLE", "CONSTRUCTION_MATERIAL", "CRAFTING_MATERIAL",
  "DAGGER", "EMPTY_CRYSTAL", "ESSENCE_CRYSTAL", "FELLING_AXE", "FISH",
  "FISHING_ROD", "FOOD", "GAUNTLETS", "GEMSTONE", "GREAVES", "GUIDANCE_SCROLL",
  "HELMET", "LOG", "MEMBERSHIP", "METAL_BAR", "METAMORPHITE", "NAMESTONE",
  "ORE", "PET_EGG", "PICKAXE", "POTION", "RECIPE", "RELIC", "SHIELD", "SKIN",
  "SPECIAL", "SWORD", "TELEPORTATION_STONE", "TOKEN", "UPGRADE_STONE", "VIAL",
] as const;

export type IdlemmoItemType = (typeof IDLEMMO_ITEM_TYPES)[number];

/** Item types that can be equipped as gear. */
export const EQUIPMENT_TYPES = [
  "SWORD", "DAGGER", "BOW", "SHIELD",
  "HELMET", "CHESTPLATE", "GREAVES", "GAUNTLETS", "BOOTS",
] as const satisfies readonly IdlemmoItemType[];

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

// ─── Items ───────────────────────────────────────────────────────────────────

export interface ItemSearchResult {
  hashed_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  type: string;
  quality: string;
  vendor_price: number | null;
}

export interface ItemInspect {
  hashed_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  type: string;
  quality: string;
  vendor_price: number | null;
  max_tier: number;
  requirements: Record<string, number> | null;
  stats: Record<string, number> | null;
  effects: Array<{
    attribute: string;
    target: string;
    value: number;
    value_type: string;
  }> | null;
  tier_modifiers: Record<string, number> | null;
}

/** Fetch all pages of items for a given type. Type is normalized to uppercase. */
export async function searchItemsByType(
  type: string,
  token: string
): Promise<ItemSearchResult[]> {
  const all: ItemSearchResult[] = [];
  let page = 1;
  const normalizedType = type.toUpperCase();

  while (true) {
    const data = await apiFetch<{
      items: ItemSearchResult[];
      pagination: { current_page: number; last_page: number };
    }>(`/v1/item/search?type=${encodeURIComponent(normalizedType)}&page=${page}`, token);

    all.push(...data.items);
    if (data.pagination.current_page >= data.pagination.last_page) break;
    page++;
  }

  return all;
}

export async function inspectItem(
  hashedId: string,
  token: string
): Promise<ItemInspect> {
  const data = await apiFetch<{ item: ItemInspect }>(
    `/v1/item/${hashedId}/inspect`,
    token
  );
  return data.item;
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export interface DungeonInfo {
  id: number;
  name: string;
  difficulty: number;
  level_required: number;
  length: number; // milliseconds
  cost: number;
  location: { id: number; name: string } | null;
  image_url: string | null;
}

export async function getDungeons(token: string): Promise<DungeonInfo[]> {
  const res = await fetch(`${BASE}/v1/combat/dungeons/list`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`IdleMMO /v1/combat/dungeons/list returned HTTP ${res.status}`);
  }

  const raw = await res.json();

  // Handle common API response shapes
  if (Array.isArray(raw)) return raw as DungeonInfo[];
  if (Array.isArray(raw?.data)) return raw.data as DungeonInfo[];
  if (Array.isArray(raw?.dungeons)) return raw.dungeons as DungeonInfo[];

  throw new Error(`[getDungeons] unexpected response shape: ${JSON.stringify(raw).slice(0, 300)}`);
}
