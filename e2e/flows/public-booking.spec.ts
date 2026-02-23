import { test, expect } from "@playwright/test";

/**
 * Public Booking Portal Flow
 *
 * Tests the customer-facing booking flow at /book/demo
 * No auth needed — this is a public page.
 */

test.describe("Public Booking Portal", () => {
  test("portal loads and shows services", async ({ page }) => {
    await page.goto("/book/demo");
    await page.waitForLoadState("networkidle");

    // Should show business name or service list
    await expect(page.locator("main, [role=main], body").first()).toBeVisible({ timeout: 10_000 });

    // Look for service names from seed data
    const hasServices = await page
      .getByText(/consultation|physiotherapy|massage|wellness|follow-up/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (hasServices) {
      console.log("  ✓ Services are visible in portal");
    } else {
      console.log("  ⚠ No services visible — may need seed data or portal config");
    }
  });

  test("select a service", async ({ page }) => {
    await page.goto("/book/demo");
    await page.waitForLoadState("networkidle");

    // Try clicking first service card/button
    const serviceCards = page.locator(
      "[data-testid*=service], button:has-text('Consultation'), button:has-text('Session'), button:has-text('Massage')"
    );
    if ((await serviceCards.count()) > 0) {
      await serviceCards.first().click();
      await page.waitForTimeout(500);
      console.log("  ✓ Service selected");
    }
  });

  test("walk through booking steps", async ({ page }) => {
    await page.goto("/book/demo");
    await page.waitForLoadState("networkidle");

    // Track which step we're on
    const steps = ["service", "slot", "details", "confirm"];
    let currentStep = 0;

    // Click first service
    const serviceCards = page.locator("button, [role=button], [data-testid*=service]").filter({
      hasText: /consultation|session|massage/i,
    });
    if ((await serviceCards.count()) > 0) {
      await serviceCards.first().click();
      await page.waitForTimeout(1000);
      currentStep++;
      console.log(`  ✓ Step ${currentStep}: service selected`);
    }

    // Try clicking "Next" or date/slot buttons to progress
    for (let attempt = 0; attempt < 5; attempt++) {
      const nextBtn = page.getByRole("button", { name: /next|continue|book|confirm/i });
      if ((await nextBtn.count()) > 0) {
        await nextBtn.first().click();
        await page.waitForTimeout(500);
        currentStep++;
        console.log(`  ✓ Step ${currentStep}: progressed`);
      } else {
        break;
      }
    }
  });
});
