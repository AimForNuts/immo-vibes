/**
 * IdleMMO API client.
 *
 * All functions require a Bearer token (stored per-user in the DB).
 * Base URL: https://api.idle-mmo.com
 * Cache: 60-second ISR revalidation on all requests.
 *
 * Endpoint reference: docs/api/
 * Game mechanic formulas: docs/game-mechanics/
 */

const BASE = "https://api.idle-mmo.com";

/** Internal fetch wrapper — adds auth headers and 60s cache revalidation. */
async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ImmoWebSuite/1.0",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`IdleMMO API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Characters ───────────────────────────────────────────────────────────────

export interface CharacterDetail {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  /** Skill XP and levels (e.g. woodcutting, fishing). Keyed by skill name. */
  skills: Record<string, { experience: number; level: number }>;
  /**
   * Combat-relevant stat levels (strength, defence, speed, dexterity, combat).
   * Each level contributes ×2.4 to the derived combat stat — see docs/game-mechanics/combat-stats.md
   */
  stats: Record<string, { experience: number; level: number }>;
  gold: number;
  tokens: number;
  shards: number;
  total_level: number;
  location: { id: number; name: string };
  /** Basic equipped pet info — no quality or combat stats. Use getCharacterPets() for full data. */
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

/**
 * Fetch full details for a character by hashed ID.
 * Endpoint: GET /v1/character/{hashedId}/information
 */
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

/**
 * Fetch all alt characters on the same account as the given character.
 * Endpoint: GET /v1/character/{hashedId}/characters
 */
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
  /**
   * Pet skill training levels. Each contributes ×2.4 to the derived combat stat,
   * identical to character skills. See docs/game-mechanics/pets.md.
   *
   * ⚠️ Known API bug: these may return 0 even when trained. Use manual inputs as fallback.
   */
  stats: {
    strength: number;  // → Attack Power  (×2.4)
    defence: number;   // → Protection    (×2.4)
    speed: number;     // → Agility       (×2.4)
  };
  /** True for the currently equipped pet. Reliable — use this to identify the active pet. */
  equipped: boolean;
  evolution: {
    state: number;           // 0–5
    max: number;             // always 5
    bonus_per_stage: number; // always 5 (= 5% per stage)
    current_bonus: number;   // state × bonus_per_stage
    /** All possible combat stat targets for this pet type (not which one was chosen). */
    targets: Array<{ key: string; label: string }>;
  };
}

/**
 * Fetch all pets for a character. Find the active one with `.find(p => p.equipped)`.
 * Endpoint: GET /v1/character/{hashedId}/pets
 */
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

// ─── Item types ───────────────────────────────────────────────────────────────

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

/** Subset of item types that occupy gear slots (weapon/armour). */
export const EQUIPMENT_TYPES = [
  "SWORD", "DAGGER", "BOW", "SHIELD",
  "HELMET", "CHESTPLATE", "GREAVES", "GAUNTLETS", "BOOTS",
] as const satisfies readonly IdlemmoItemType[];

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

// ─── Items ────────────────────────────────────────────────────────────────────

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
  is_tradeable: boolean;
  /** Maximum tier this item can be upgraded to. */
  max_tier: number;
  requirements: Record<string, number> | null;
  /** Base combat stat values at tier 1. Apply tier_modifiers for higher tiers. */
  stats: Record<string, number> | null;
  effects: Array<{
    attribute: string;
    target: string;
    value: number;
    value_type: string;
  }> | null;
  /**
   * Additive per-tier stat bonuses.
   * Formula: effectiveStat = baseStat + (tier - 1) × tierModifier[stat]
   * See docs/game-mechanics/items.md
   */
  tier_modifiers: Record<string, number> | null;
  recipe: {
    skill: string;
    level_required: number;
    max_uses: number;
    materials: Array<{ hashed_item_id: string; item_name: string; quantity: number }>;
    result: { hashed_item_id: string; item_name: string } | null;
  } | null;
  where_to_find: {
    enemies: Array<{ id: number; name: string; level: number }>;
    dungeons: Array<{ id: number; name: string }>;
    world_bosses: Array<{ id: number; name: string }>;
  } | null;
}

/**
 * Fetch all pages of items for a given type (auto-paginates).
 * Type is normalised to uppercase before the request.
 * Endpoint: GET /v1/item/search?type={type}&page={n}
 */
export async function searchItemsByType(
  type: string,
  token: string
): Promise<ItemSearchResult[]> {
  const all: ItemSearchResult[] = [];
  let page = 1;
  const normalizedType = type.toUpperCase();
  const headers = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };

  let rlRemaining: number | null = null;
  let rlResetAt = 0;

  while (true) {
    const url = `${BASE}/v1/item/search?type=${encodeURIComponent(normalizedType)}&page=${page}`;

    // Wait if the API told us we're out of requests
    if (rlRemaining !== null && rlRemaining <= 0) {
      const waitMs = Math.max(1000, rlResetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const res = await fetch(url, { headers, cache: "no-store" });

    // Always read what the API reports
    const rem = res.headers.get("x-ratelimit-remaining");
    const rst = res.headers.get("x-ratelimit-reset");
    if (rem !== null) rlRemaining = parseInt(rem, 10);
    if (rst !== null) rlResetAt   = parseInt(rst, 10);

    if (res.status === 429) {
      rlRemaining = 0;
      const waitMs = Math.max(1000, rlResetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
      continue; // retry same page
    }

    if (!res.ok) throw new Error(`IdleMMO API /v1/item/search?type=${normalizedType} returned ${res.status}`);

    const data = await res.json() as {
      items: ItemSearchResult[];
      pagination: { current_page: number; last_page: number };
    };

    all.push(...data.items);
    if (data.pagination.current_page >= data.pagination.last_page) break;
    page++;
  }

  return all;
}

/**
 * Fetch full stats and tier modifiers for a single item.
 * Endpoint: GET /v1/item/{hashedId}/inspect
 */
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

// ─── Enemies ──────────────────────────────────────────────────────────────────

export interface EnemyInfo {
  id: number;
  name: string;
  image_url: string | null;
  level: number;
  /** XP awarded per kill at this enemy's base level. Scales linearly when enemy scaling is active. */
  experience: number;
  /** HP at base level. Scales linearly when enemy scaling is active. */
  health: number;
  /** Percentage chance that a loot roll occurs when this enemy is defeated. */
  chance_of_loot: number;
  location: { id: number; name: string };
  loot: Array<{
    hashed_item_id: string;
    name: string;
    image_url: string | null;
    quality: string;
    quantity: number;
    /** Percentage chance of this item within a successful loot roll. */
    chance: number;
  }>;
}

/**
 * Fetch the full enemy list (47 enemies across 10 zones).
 * Response includes HP, XP, location, and loot tables — but NOT combat stats.
 * Combat stats (AP/Prot/Agi/Acc) are stored locally in data/enemy-combat-stats.ts.
 * Endpoint: GET /v1/combat/enemies/list
 */
export async function getEnemies(token: string): Promise<EnemyInfo[]> {
  const data = await apiFetch<{ enemies: EnemyInfo[] }>(
    "/v1/combat/enemies/list",
    token
  );
  return data.enemies;
}

// ─── Dungeons ─────────────────────────────────────────────────────────────────

export interface DungeonInfo {
  id: number;
  name: string;
  difficulty: number;
  level_required: number;
  /** Run duration in milliseconds. Divide by 1000 for seconds, 60000 for minutes. */
  length: number;
  cost: number;
  location: { id: number; name: string } | null;
  image_url: string | null;
}

/**
 * Fetch the list of available dungeons.
 * Note: the API response is a raw array (not wrapped in an object), so this
 * function cannot use apiFetch() — it handles the response shape directly.
 * Seasonal dungeons are not returned; use STATIC_DUNGEONS from difficulty.ts for those.
 * Endpoint: GET /v1/combat/dungeons/list
 */
export async function getDungeons(token: string): Promise<DungeonInfo[]> {
  const res = await fetch(`${BASE}/v1/combat/dungeons/list`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`IdleMMO /v1/combat/dungeons/list returned HTTP ${res.status}`);
  }

  const raw = await res.json();

  // The API has returned different shapes across versions — handle all known forms.
  if (Array.isArray(raw))           return raw as DungeonInfo[];
  if (Array.isArray(raw?.data))     return raw.data as DungeonInfo[];
  if (Array.isArray(raw?.dungeons)) return raw.dungeons as DungeonInfo[];

  throw new Error(`getDungeons: unexpected response shape`);
}
