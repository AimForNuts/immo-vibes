import { getD1 } from "@/lib/db/d1";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardCardType,
} from "@/lib/db/schema";

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
  const row = await getD1()
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

export async function saveUserDashboardLayout(input: {
  userId: string;
  language: string;
  dashboardLayout: DashboardCardType[];
}) {
  const updatedAt = new Date();

  await getD1()
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
}

export async function saveUserLanguage(input: {
  userId: string;
  language: string;
}) {
  const updatedAt = new Date();

  await getD1()
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
}
