import { test as setup } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

/**
 * Log in once and persist the storage state (cookies/localStorage) so all
 * smoke tests can reuse the authenticated session without repeating login.
 *
 * Credentials are read from environment variables:
 *   E2E_EMAIL    — username (the app uses "username" field, not email)
 *   E2E_PASSWORD — password
 */
setup("authenticate", async ({ page }) => {
  const username = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD environment variables must be set for authentication setup."
    );
  }

  await page.goto("/login");

  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
