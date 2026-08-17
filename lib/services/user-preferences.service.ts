import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  userPreferences,
  type DashboardCardType,
} from "@/lib/db/schema";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type UserPreferencesCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type UserPreferencesD1Row = {
  user_id: string;
  language: string;
  dashboard_layout: string;
  updated_at: string;
};

export type UserPreferences = {
  language: string;
  dashboardLayout: DashboardCardType[];
};

function getUserPreferencesD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as UserPreferencesCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function parseDashboardLayout(value: string | null | undefined): DashboardCardType[] {
  if (!value) return DEFAULT_DASHBOARD_LAYOUT;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as DashboardCardType[]) : DEFAULT_DASHBOARD_LAYOUT;
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const d1 = getUserPreferencesD1();
  if (d1) {
    const row = await d1
      .prepare(
        `SELECT user_id, language, dashboard_layout, updated_at
         FROM user_preferences
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<UserPreferencesD1Row>();

    return {
      language: row?.language ?? "en",
      dashboardLayout: parseDashboardLayout(row?.dashboard_layout),
    };
  }

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  return {
    language: prefs?.language ?? "en",
    dashboardLayout: prefs?.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT,
  };
}

export async function saveUserDashboardLayout(input: {
  userId: string;
  language: string;
  dashboardLayout: DashboardCardType[];
}) {
  const d1 = getUserPreferencesD1();
  const updatedAt = new Date();

  if (d1) {
    await d1
      .prepare(
        `INSERT INTO user_preferences (user_id, language, dashboard_layout, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           dashboard_layout = excluded.dashboard_layout,
           updated_at = excluded.updated_at`
      )
      .bind(
        input.userId,
        input.language,
        JSON.stringify(input.dashboardLayout),
        updatedAt.toISOString()
      )
      .run();
    return;
  }

  await db
    .insert(userPreferences)
    .values({
      userId: input.userId,
      language: input.language,
      dashboardLayout: input.dashboardLayout,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { dashboardLayout: input.dashboardLayout, updatedAt },
    });
}

export async function saveUserLanguage(input: {
  userId: string;
  language: string;
}) {
  const d1 = getUserPreferencesD1();
  const updatedAt = new Date();

  if (d1) {
    await d1
      .prepare(
        `INSERT INTO user_preferences (user_id, language, dashboard_layout, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           language = excluded.language,
           updated_at = excluded.updated_at`
      )
      .bind(
        input.userId,
        input.language,
        JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
        updatedAt.toISOString()
      )
      .run();
    return;
  }

  await db
    .insert(userPreferences)
    .values({
      userId: input.userId,
      language: input.language,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { language: input.language, updatedAt },
    });
}
