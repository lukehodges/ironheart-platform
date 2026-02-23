import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for Ironheart
 *
 * Setup:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npm run e2e           # headless
 *   npm run e2e:headed    # with browser window
 *   npm run e2e:debug     # step through with inspector
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev
 *   2. DB seeded: npm run db:seed
 *   3. Logged in once (auth state saved): npx playwright test --project=setup
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential so we can observe state changes
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Auth setup — run first to save browser storage state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // Main E2E tests — use saved auth state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Start dev server if not already running
  webServer: process.env.CI
    ? {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
