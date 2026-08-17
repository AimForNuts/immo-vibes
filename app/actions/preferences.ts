"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { type DashboardCardType } from "@/lib/db/schema";
import {
  getUserPreferences,
  saveUserDashboardLayout,
} from "@/lib/services/user-preferences.service";

export async function saveDashboardLayout(layout: DashboardCardType[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthenticated");

  // Preserve existing language — read from cookie so we don't overwrite it
  const currentLocale = (await cookies()).get("locale")?.value ?? "en";

  await saveUserDashboardLayout({
    userId: session.user.id,
    language: currentLocale,
    dashboardLayout: layout,
  });
}

// Accepts an optional userId so callers that already have a session
// can avoid a second auth.api.getSession() call.
export async function getPreferences(userId?: string) {
  const uid = userId ?? (await auth.api.getSession({ headers: await headers() }))?.user?.id;
  if (!uid) return null;

  return getUserPreferences(uid);
}
