import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

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
  hashedId: text("hashed_id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  quality: text("quality").notNull(),
  imageUrl: text("image_url"),
  syncedAt: timestamp("synced_at").notNull(),
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
