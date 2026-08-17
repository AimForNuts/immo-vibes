"use server";

import { cookies } from "next/headers";
import { routing, type Locale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { saveUserLanguage } from "@/lib/services/user-preferences.service";

export async function setLocale(locale: Locale) {
  if (!(routing.locales as readonly string[]).includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  // Persist to DB if logged in
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    await saveUserLanguage({ userId: session.user.id, language: locale });
  }
}
