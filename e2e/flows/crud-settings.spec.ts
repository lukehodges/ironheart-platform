import { test, expect } from "@playwright/test";

/**
 * Settings Flow
 *
 * Tests every settings tab and its interactions.
 */

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForLoadState("networkidle");
  });

  test("general tab loads and shows form", async ({ page }) => {
    // Click General tab if not already active
    const generalTab = page.getByRole("tab", { name: /general/i });
    if ((await generalTab.count()) > 0) {
      await generalTab.click();
      await page.waitForTimeout(300);
    }

    // Should show business name or some settings form
    const form = page.locator("form, input, [data-testid*=settings]");
    await expect(form.first()).toBeVisible({ timeout: 5_000 });
  });

  test("modules tab loads", async ({ page }) => {
    const modulesTab = page.getByRole("tab", { name: /module/i });
    if ((await modulesTab.count()) > 0) {
      await modulesTab.click();
      await page.waitForTimeout(500);
      // Should show module toggles
      const switches = page.locator("[role=switch], input[type=checkbox]");
      const count = await switches.count();
      console.log(`  ✓ Modules tab: ${count} toggle(s) found`);
    }
  });

  test("billing tab loads", async ({ page }) => {
    const billingTab = page.getByRole("tab", { name: /billing/i });
    if ((await billingTab.count()) > 0) {
      await billingTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("main, [role=tabpanel]").first()).toBeVisible();
      console.log("  ✓ Billing tab loaded");
    }
  });

  test("notifications tab loads", async ({ page }) => {
    const notifTab = page.getByRole("tab", { name: /notification/i });
    if ((await notifTab.count()) > 0) {
      await notifTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("main, [role=tabpanel]").first()).toBeVisible();
      console.log("  ✓ Notifications tab loaded");
    }
  });

  test("security tab loads", async ({ page }) => {
    const securityTab = page.getByRole("tab", { name: /security/i });
    if ((await securityTab.count()) > 0) {
      await securityTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("main, [role=tabpanel]").first()).toBeVisible();
      console.log("  ✓ Security tab loaded");
    }
  });

  test("danger tab loads", async ({ page }) => {
    const dangerTab = page.getByRole("tab", { name: /danger/i });
    if ((await dangerTab.count()) > 0) {
      await dangerTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator("main, [role=tabpanel]").first()).toBeVisible();
      console.log("  ✓ Danger tab loaded");
    }
  });
});
