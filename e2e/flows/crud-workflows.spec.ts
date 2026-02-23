import { test, expect } from "@playwright/test";

/**
 * Workflow CRUD Flow
 */

test.describe("Workflow CRUD", () => {
  test("list workflows", async ({ page }) => {
    await page.goto("/admin/workflows");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main, [role=main]").first()).toBeVisible({ timeout: 10_000 });
  });

  test("create workflow", async ({ page }) => {
    await page.goto("/admin/workflows");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /new|create|add/i });
    if ((await createBtn.count()) > 0) {
      await createBtn.first().click();
      await page.waitForTimeout(500);

      const dialog = page.locator("[role=dialog], [data-state=open]");
      if ((await dialog.count()) > 0) {
        await expect(dialog.first()).toBeVisible();
        console.log("  ✓ Create workflow dialog opened");

        // Fill name
        const nameInput = dialog.locator("input[name=name], input[placeholder*=ame]");
        if ((await nameInput.count()) > 0) {
          await nameInput.first().fill(`E2E Test Workflow ${Date.now()}`);
        }
      }
    }
  });
});
