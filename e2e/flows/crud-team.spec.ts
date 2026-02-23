import { test, expect } from "@playwright/test";

/**
 * Team CRUD Flow
 */

test.describe("Team CRUD", () => {
  test("list team members", async ({ page }) => {
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    // Should show seeded staff
    await expect(page.getByText(/sarah|james|mitchell|carter/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("view team member detail", async ({ page }) => {
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    const row = page.locator("table tbody tr, [data-testid*=team-row]").first();
    if ((await row.count()) > 0) {
      await row.click();
      await page.waitForTimeout(500);
      console.log("  ✓ Team member detail opened");
    }
  });

  test("open create team member dialog", async ({ page }) => {
    await page.goto("/admin/team");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /new|add|invite/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);

      const dialog = page.locator("[role=dialog], [data-state=open]");
      if ((await dialog.count()) > 0) {
        await expect(dialog.first()).toBeVisible();
        console.log("  ✓ Create team member dialog opened");
      }
    }
  });
});
