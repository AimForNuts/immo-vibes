"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPreferences, DEFAULT_DASHBOARD_LAYOUT, type DashboardCardType } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function saveDashboardLayout(layout: DashboardCardType[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthenticated");

  // Preserve existing language — read from cookie so we don't overwrite it
  const currentLocale = (await cookies()).get("locale")?.value ?? "en";

  await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      language: currentLocale,
      dashboardLayout: layout,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { dashboardLayout: layout, updatedAt: new Date() },
    });
}

// Accepts an optional userId so callers that already have a session
// can avoid a second auth.api.getSession() call.
export async function getPreferences(userId?: string) {
  const uid = userId ?? (await auth.api.getSession({ headers: await headers() }))?.user?.id;
  if (!uid) return null;

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, uid),
  });

  return {
    language: prefs?.language ?? "en",
    dashboardLayout: prefs?.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT,
  };
}
