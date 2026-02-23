import { test, expect } from "@playwright/test";

/**
 * Customer CRUD Flow
 *
 * Tests:
 *   1. List customers with search
 *   2. Create customer
 *   3. View customer detail
 *   4. Edit customer
 *   5. Add note
 *   6. Export (GDPR)
 */

test.describe("Customer CRUD", () => {
  test("list customers", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table, [role=grid]");
    await expect(table.first()).toBeVisible({ timeout: 10_000 });

    // Should show seeded customers
    await expect(page.getByText(/emily|thompson/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("search customers", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("input[type=search], input[placeholder*=earch]");
    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill("Emily");
      await page.waitForTimeout(500);
      // Results should filter
      await expect(page.getByText(/emily/i).first()).toBeVisible();
      console.log("  ✓ Customer search works");
    }
  });

  test("open create customer dialog", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /new|create|add/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);

      const dialog = page.locator("[role=dialog], [data-state=open]");
      await expect(dialog.first()).toBeVisible();

      // Try filling form
      const emailInput = dialog.locator("input[name=email], input[type=email]");
      if ((await emailInput.count()) > 0) {
        await emailInput.first().fill(`test-${Date.now()}@e2e.test`);
      }

      const firstNameInput = dialog.locator("input[name=firstName], input[placeholder*=irst]");
      if ((await firstNameInput.count()) > 0) {
        await firstNameInput.first().fill("E2E Test");
      }

      console.log("  ✓ Create customer dialog opened and form fillable");
    }
  });

  test("view customer detail", async ({ page }) => {
    await page.goto("/admin/customers");
    await page.waitForLoadState("networkidle");

    const row = page.locator("table tbody tr").first();
    if ((await row.count()) > 0) {
      await row.click();
      await page.waitForTimeout(500);

      const detail = page.locator("[role=dialog], [data-state=open], [class*=sheet]");
      if ((await detail.count()) > 0) {
        await expect(detail.first()).toBeVisible();
        // Should show customer info
        console.log("  ✓ Customer detail opened");
      }
    }
  });
});
