import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value ?? "";
  const locale: Locale = (routing.locales as readonly string[]).includes(raw)
    ? (raw as Locale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
