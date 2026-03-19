import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "pt"] as const,
  defaultLocale: "en",
  localePrefix: "never", // locale lives in a cookie, not the URL
});

export type Locale = (typeof routing.locales)[number];
