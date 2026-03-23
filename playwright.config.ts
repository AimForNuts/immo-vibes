import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E smoke tests.
 * Tests run against the production deployment — no local server is started.
 * Auth state is saved once in global-setup and reused across tests.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "https://immowebsuite.vercel.app",
    trace: "on-first-retry",
    // Auth state file produced by the auth setup fixture
    storageState: "playwright/.auth/user.json",
  },

  projects: [
    // --- Setup project: log in once and save storage state ---
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { storageState: undefined },
    },

    // --- Smoke tests: run with saved auth state ---
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
