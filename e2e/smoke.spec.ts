import { test, expect } from "@playwright/test";

/**
 * Smoke tests — verify key pages load without a 500 error.
 *
 * Two concerns only:
 *   1. Unauthenticated visitors are redirected to /login.
 *   2. Authenticated users can reach each key page (no 5xx, no redirect to /login).
 *
 * Auth setup (auth.setup.ts) logs in once; storage state is applied via
 * playwright.config.ts so every test in this file runs authenticated.
 */

// ---------------------------------------------------------------------------
// Unauthenticated redirect
// ---------------------------------------------------------------------------

test.describe("unauthenticated redirects", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visiting /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("#username")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Authenticated smoke — all key pages
// ---------------------------------------------------------------------------

const KEY_PAGES = [
  { path: "/dashboard", label: "Dashboard home" },
  { path: "/dashboard/market", label: "Market" },
  { path: "/dashboard/characters", label: "Characters" },
  { path: "/dashboard/gear", label: "Gear Calculator" },
  { path: "/dashboard/dungeons", label: "Dungeons" },
  { path: "/dashboard/investments", label: "Investments" },
  { path: "/dashboard/settings", label: "Settings" },
] as const;

test.describe("authenticated page loads", () => {
  for (const { path, label } of KEY_PAGES) {
    test(`${label} (${path}) loads without error`, async ({ page }) => {
      const response = await page.goto(path);

      // Null response means navigation failed outright — treat as an error.
      if (!response) throw new Error(`Navigation to ${path} returned no response`);
      expect(response.status()).toBeLessThan(500);

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    });
  }
});
