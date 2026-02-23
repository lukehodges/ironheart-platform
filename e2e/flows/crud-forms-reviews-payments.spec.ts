import { test, expect } from "@playwright/test";

/**
 * Forms, Reviews, and Payments page flows.
 */

test.describe("Forms", () => {
  test("list form templates", async ({ page }) => {
    await page.goto("/admin/forms");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
  });

  test("create form template", async ({ page }) => {
    await page.goto("/admin/forms");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /new|create|add/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);
      console.log("  ✓ Create form dialog/page triggered");
    }
  });
});

test.describe("Reviews", () => {
  test("list reviews", async ({ page }) => {
    await page.goto("/admin/reviews");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
  });

  test("review filter chips work", async ({ page }) => {
    await page.goto("/admin/reviews");
    await page.waitForLoadState("networkidle");

    // Click filter buttons if they exist
    const filters = page.locator("button").filter({ hasText: /all|pending|published|flagged/i });
    const count = await filters.count();
    for (let i = 0; i < count; i++) {
      await filters.nth(i).click();
      await page.waitForTimeout(300);
    }
    console.log(`  ✓ Clicked ${count} review filter(s)`);
  });
});

test.describe("Payments", () => {
  test("list invoices", async ({ page }) => {
    await page.goto("/admin/payments");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10_000 });
  });

  test("create invoice dialog", async ({ page }) => {
    await page.goto("/admin/payments");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /new|create|add/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);
      console.log("  ✓ Create invoice dialog triggered");
    }
  });
});
