"use server";

import { cookies } from "next/headers";
import { routing, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function setLocale(locale: Locale) {
  if (!(routing.locales as readonly string[]).includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  // Persist to DB if logged in
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    await db
      .insert(userPreferences)
      .values({
        userId: session.user.id,
        language: locale,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { language: locale, updatedAt: new Date() },
      });
  }
}
