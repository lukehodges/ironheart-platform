import { test as setup, expect } from "@playwright/test";

/**
 * Authentication Setup
 *
 * This runs ONCE before all tests and saves the browser's auth state
 * (cookies, localStorage) to e2e/.auth/user.json.
 *
 * All subsequent tests reuse this state — no re-login needed.
 *
 * HOW TO USE:
 *   1. Run: npx playwright test --project=setup
 *   2. A browser opens -> log in via WorkOS as normal
 *   3. Once you land on /admin, the state is saved automatically
 *   4. All future test runs skip login
 *
 * TO REFRESH AUTH:
 *   Delete e2e/.auth/user.json and run setup again.
 */

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // Navigate to admin — this will redirect to WorkOS sign-in
  await page.goto("/admin");

  // Wait for the user to complete the WorkOS login flow.
  // The test pauses here — the browser stays open so you can log in manually.
  // Once you land on the admin dashboard, the state is captured.
  //
  // If you have environment-specific auto-login (e.g., dev mode), this
  // will resolve immediately.
  await page.waitForURL("**/admin**", { timeout: 120_000 });

  // Verify we actually landed on the admin page
  await expect(page.locator("body")).toBeVisible();

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
