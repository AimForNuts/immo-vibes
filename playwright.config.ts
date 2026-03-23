import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E smoke tests.
 *
 * Local:  runs against http://localhost:3000 (start with `npm run dev` first).
 * CI:     runs against the production URL via the BASE_URL env var.
 *
 * Auth state is saved once by auth.setup.ts and reused across all tests.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
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
