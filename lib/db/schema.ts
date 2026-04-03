import { sql } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, jsonb, integer, uniqueIndex, serial, numeric, primaryKey } from "drizzle-orm/pg-core";

// ─── Shared types for JSONB columns ───────────────────────────────────────────

export interface DungeonLootItem {
  hashed_item_id: string;
  name: string;
  image_url: string | null;
  quality: string;
  quantity: number;
  chance: number;
}

export interface ItemEffect {
  attribute:    string;
  target:       string;
  value:        number;
  value_type:   string;
  duration_ms?: number | null;  // null or absent = permanent/passive
}

export interface ItemRecipe {
  skill:           string;
  level_required:  number;
  max_uses:        number;
  materials: Array<{
    hashed_item_id: string;
    item_name:      string;
    quantity:       number;
  }>;
  result: { hashed_item_id: string; item_name: string } | null;
}

export interface ZoneEnemy {
  id:     number;
  name:   string;
  level:  number;
  drops:  string[];  // hashed item ids this enemy drops
}

export interface ZoneDungeon {
  id:     number;
  name:   string;
  drops?: string[];  // hashed item ids obtainable here
}

export interface ZoneWorldBoss {
  id:     number;
  name:   string;
  drops?: string[];  // hashed item ids obtainable here
}

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").notNull().default("user"),
  idlemmoToken: text("idlemmo_token"),
  idlemmoCharacterId: text("idlemmo_character_id"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const items = pgTable("items", {
  // ── Catalog fields (populated by sync-items) ────────────────────────────
  hashedId:             text("hashed_id").primaryKey(),
  name:                 text("name").notNull(),
  type:                 text("type").notNull(),
  quality:              text("quality").notNull(),
  imageUrl:             text("image_url"),
  syncedAt:             timestamp("synced_at").notNull(),
  /** When this item was first inserted into the database. Set once on insert; never updated. */
  firstSeenAt:          timestamp("first_seen_at").notNull().default(sql`now()`),
  /** NPC buy price — stable, set by the game. Populated during catalog sync. */
  vendorPrice:          integer("vendor_price"),
  /**
   * NPC merchant sell price — what a player pays to buy this item from an NPC shop.
   * Distinct from vendorPrice (which is what the NPC pays the player).
   * Null until populated via admin script or inline edit.
   */
  storePrice:           integer("store_price"),

  // ── Inspect fields (populated by sync-inspect) ──────────────────────────
  description:          text("description"),
  isTradeable:          boolean("is_tradeable"),
  /**
   * Maximum tier this item can be upgraded to (1 = no tiers).
   * Stats scale with tier: effectiveStat = baseStat + (tier − 1) × tierModifier
   */
  maxTier:              integer("max_tier"),
  /** Skill/level gates, e.g. { "strength": 100 }. Null for untiered items. */
  requirements:         jsonb("requirements").$type<Record<string, number>>(),
  /**
   * Combat stat values at tier 1, e.g. { "attack_power": 120 }.
   * Apply tierModifiers to compute stats at higher tiers.
   */
  baseStats:            jsonb("base_stats").$type<Record<string, number>>(),
  /**
   * Flat stat bonus added per tier above 1, e.g. { "attack_power": 10 }.
   * effectiveStat = baseStats[stat] + (tier − 1) × tierModifiers[stat]
   */
  tierModifiers:        jsonb("tier_modifiers").$type<Record<string, number>>(),
  /** Passive bonuses (percentage or flat) applied when equipped. */
  effects:              jsonb("effects").$type<ItemEffect[]>(),
  /**
   * Full recipe data for RECIPE-type items.
   * Supersedes recipeResultHashedId — kept for backward compatibility.
   */
  recipe:               jsonb("recipe").$type<ItemRecipe>(),
  /** When inspect data was last synced from the IdleMMO API. */
  inspectedAt:          timestamp("inspected_at"),

  // ── Price fields (populated by sync-prices) ─────────────────────────────
  /**
   * For RECIPE-type items: the hashed_id of the item this recipe produces.
   * @deprecated Use recipe.result.hashed_item_id instead.
   */
  recipeResultHashedId: text("recipe_result_hashed_id"),
  /**
   * Latest known market sale price at tier 1.
   * Per-tier prices are tracked in market_price_history.
   */
  lastSoldPrice:        integer("last_sold_price"),
  /** When the latest known tier-1 sale happened. */
  lastSoldAt:           timestamp("last_sold_at"),
  /**
   * When the cron last fetched a price for this item from the IdleMMO API.
   * The daily sync-prices cron orders by this ASC NULLS FIRST so items never
   * checked (or checked longest ago) are always processed next — cycling
   * through all items over time with a single daily run.
   */
  priceCheckedAt:       timestamp("price_checked_at"),
});

// Card types available in the 3×2 dashboard grid
export type DashboardCardType =
  | "characters"
  | "gear"
  | "skills"
  | "economy"
  | "dungeons"
  | "guild"
  | "empty";

export const DEFAULT_DASHBOARD_LAYOUT: DashboardCardType[] = [
  "characters",
  "gear",
  "empty",
  "empty",
  "empty",
  "empty",
];

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  dashboardLayout: jsonb("dashboard_layout")
    .$type<DashboardCardType[]>()
    .notNull()
    .default(DEFAULT_DASHBOARD_LAYOUT),
  updatedAt: timestamp("updated_at").notNull(),
});

export const priceTracker = pgTable("price_tracker", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  itemHashedId: text("item_hashed_id").notNull(),
  itemName: text("item_name").notNull(),
  itemQuality: text("item_quality").notNull(),
  itemType: text("item_type").notNull(),
  imageUrl: text("image_url"),
  tier: integer("tier").notNull().default(1),
  createdAt: timestamp("created_at").notNull(),
});

/**
 * One row per unique (item, soldAt) pair.
 * The IdleMMO API only exposes the latest_sold entry; we persist them here
 * so we build a longer price history than the game retains.
 * Not per-user — market prices are global.
 */
export const marketPriceHistory = pgTable(
  "market_price_history",
  {
    id:           text("id").primaryKey(),
    itemHashedId: text("item_hashed_id").notNull(),
    /**
     * Item tier this sale was for (1-based, matching the in-game display).
     * The IdleMMO API uses tier=0 to mean "base/tier 1" — normalise to 1 on write.
     */
    tier:         integer("tier").notNull().default(1),
    /** Price per single item at the time of the sale. */
    price:        integer("price").notNull(),
    quantity:     integer("quantity").notNull().default(1),
    /** When the sale happened (from IdleMMO API). */
    soldAt:       timestamp("sold_at").notNull(),
    /** When we recorded this entry. */
    recordedAt:   timestamp("recorded_at").notNull(),
  },
  (t) => [uniqueIndex("market_price_history_uniq").on(t.itemHashedId, t.tier, t.soldAt)]
);

/**
 * Tracks the last run status of each automated cron sync job.
 * Used by downstream crons to gate on upstream completion
 * (e.g. sync-recipes waits for sync-items to finish today).
 *
 * currentTypeIndex / currentPage are unused legacy columns kept for
 * backward compatibility — prices pagination is now handled via
 * items.price_checked_at ordering instead.
 */
export const syncState = pgTable("sync_state", {
  /** 'items' | 'recipes' | 'prices' */
  job:              text("job").primaryKey(),
  /** 'idle' | 'running' | 'done' | 'failed' */
  status:           text("status").notNull().default("idle"),
  /** @deprecated Unused — prices pagination is handled by priceCheckedAt ordering. */
  currentTypeIndex: integer("current_type_index").notNull().default(0),
  /** @deprecated Unused — prices pagination is handled by priceCheckedAt ordering. */
  currentPage:      integer("current_page").notNull().default(1),
  /** When the current run started (UTC). */
  startedAt:        timestamp("started_at"),
  /** When the current run completed (UTC). Null while running. */
  completedAt:      timestamp("completed_at"),
});

/**
 * Cached character roster per user — populated on first overview load and
 * refreshed when the cache is older than CACHE_TTL_MS (5 minutes).
 * Ordered by idlemmoId ASC so the roster is deterministic.
 *
 * Primary character: isPrimary = true, locationName + currentStatus populated.
 * Alt characters:    isPrimary = false, locationName + currentStatus = null.
 */
export const characters = pgTable(
  "characters",
  {
    id:            serial("id").primaryKey(),
    userId:        text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    hashedId:      text("hashed_id").notNull(),
    /** IdleMMO integer ID — used for deterministic ordering. */
    idlemmoId:     integer("idlemmo_id").notNull(),
    name:          text("name").notNull(),
    class:         text("class").notNull(),
    imageUrl:      text("image_url"),
    totalLevel:    integer("total_level").notNull().default(0),
    /** Populated for primary character only. */
    locationName:  text("location_name"),
    /** ONLINE | IDLING | OFFLINE — populated for primary only. */
    currentStatus: text("current_status"),
    isPrimary:     boolean("is_primary").notNull().default(false),
    /**
     * Whether the account has an active membership.
     * Derived from the /effects endpoint: any effect with source === "membership".
     * Null until the first effects sync completes.
     * Shared across all characters in the same user account.
     */
    isMember:      boolean("is_member"),
    cachedAt:      timestamp("cached_at").notNull(),
  },
  (t) => [uniqueIndex("characters_user_hashed_uniq").on(t.userId, t.hashedId)]
);

/**
 * Saved equipped-pet stats per character, synced by the user via "Sync Current Pet".
 * One row per (user, character). Direct combat stat values are stored from the API.
 */
export const characterPets = pgTable(
  "character_pets",
  {
    id:                   text("id").primaryKey(),
    userId:               text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    characterHashedId:    text("character_hashed_id").notNull(),
    /** IdleMMO integer pet-instance ID — matches `equipped_pet.id` in character info. */
    petId:                integer("pet_id").notNull(),
    name:                 text("name").notNull(),
    customName:           text("custom_name"),
    imageUrl:             text("image_url"),
    level:                integer("level").notNull(),
    quality:              text("quality").notNull(),
    /** Direct combat stat values from the IdleMMO pets API (no ×2.4 multiplier). */
    attackPower:          integer("attack_power").notNull().default(0),
    protection:           integer("protection").notNull().default(0),
    agility:              integer("agility").notNull().default(0),
    /** Manually entered combat stats — null until the user saves them. */
    accuracy:             integer("accuracy"),
    maxStamina:           integer("max_stamina"),
    movementSpeed:        numeric("movement_speed", { precision: 6, scale: 1 }),
    criticalChance:       integer("critical_chance"),
    criticalDamage:       integer("critical_damage"),
    evolutionState:       integer("evolution_state").notNull().default(0),
    evolutionMax:         integer("evolution_max").notNull().default(5),
    evolutionBonusPerStage: integer("evolution_bonus_per_stage").notNull().default(5),
    syncedAt:             timestamp("synced_at").notNull(),
  },
  (t) => [uniqueIndex("character_pets_user_char_uniq").on(t.userId, t.characterHashedId)]
);

export const gearPresets = pgTable("gear_presets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  characterId: text("character_id"),
  weaponStyle: text("weapon_style").notNull(),
  slots: jsonb("slots")
    .$type<Record<string, { hashedId: string; tier: number }>>()
    .notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/**
 * Cached dungeon catalog from the IdleMMO API.
 * Populated by the admin "Sync Dungeons" action.
 * One row per dungeon ID.
 */
export const dungeons = pgTable("dungeons", {
  /** IdleMMO dungeon integer ID */
  id:            integer("id").primaryKey(),
  name:          text("name").notNull(),
  imageUrl:      text("image_url"),
  /** Zone this dungeon belongs to — set manually by admins. Null until assigned. */
  zoneId:        integer("zone_id").references((): any => zones.id, { onDelete: "set null" }),
  levelRequired: integer("level_required").notNull().default(0),
  difficulty:    integer("difficulty").notNull().default(0),
  /** Run duration in milliseconds (the "length" field from the API) */
  durationMs:    integer("duration_ms").notNull().default(0),
  goldCost:      integer("gold_cost").notNull().default(0),
  shards:        integer("shards").notNull().default(0),
  /** Full loot array from the API */
  loot:          jsonb("loot").$type<DungeonLootItem[]>(),
  syncedAt:      timestamp("synced_at").notNull(),
});

/**
 * Geographic zones — manually curated.
 * Each zone groups enemies, dungeons, world bosses, and gatherable resources.
 * Replaces the per-item `where_to_find` JSONB column as the location source of truth.
 */
export const zones = pgTable("zones", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  /** Combat and pet-battle level requirement for this zone. */
  levelRequired: integer("level_required").notNull().default(0),
  /** Enemies in this zone; each carries the items they drop. */
  enemies:       jsonb("enemies").$type<ZoneEnemy[]>().default(sql`'[]'::jsonb`),
  /** Dungeons located in this zone. */
  dungeons:      jsonb("dungeons").$type<ZoneDungeon[]>().default(sql`'[]'::jsonb`),
  /** World bosses in this zone. */
  worldBosses:   jsonb("world_bosses").$type<ZoneWorldBoss[]>().default(sql`'[]'::jsonb`),
});

/**
 * Many-to-many between gathering items (ORE, LOG, FISH) and zones.
 * Managed by admins via the market detail panel.
 */
export const itemZones = pgTable(
  "item_zones",
  {
    itemHashedId: text("item_hashed_id")
      .notNull()
      .references(() => items.hashedId, { onDelete: "cascade" }),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemHashedId, t.zoneId] })]
);

/**
 * Enemy catalog. One row per IdleMMO enemy.
 * Populated by a future admin sync action.
 */
export const enemies = pgTable("enemies", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  level:     integer("level").notNull().default(0),
  /** Zone this enemy appears in. Null until assigned or if zone is deleted. */
  zoneId:    integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  imageUrl:  text("image_url"),
  /** Array of { item_hashed_id, chance } drop entries. */
  loot:      jsonb("loot").$type<Array<{ item_hashed_id: string; chance: number }>>(),
  syncedAt:  timestamp("synced_at"),
});

/**
 * World boss catalog. Same shape as enemies — separated because bosses
 * appear on a different schedule and have distinct game mechanics.
 */
export const worldBosses = pgTable("world_bosses", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  level:     integer("level").notNull().default(0),
  /** Zone this world boss spawns in. Null until assigned or if zone is deleted. */
  zoneId:    integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
  imageUrl:  text("image_url"),
  /** Array of { item_hashed_id, chance } drop entries. */
  loot:      jsonb("loot").$type<Array<{ item_hashed_id: string; chance: number }>>(),
  syncedAt:  timestamp("synced_at"),
});
