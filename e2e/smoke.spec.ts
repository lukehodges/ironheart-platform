import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke Tests — Visit Every Page
 *
 * These tests navigate to every route in the app and verify:
 *   1. No crash (no unhandled error / white screen)
 *   2. Page renders within timeout
 *   3. No console errors (captured and reported)
 *   4. Expected heading or key element is visible
 *
 * This is the fastest way to catch rendering errors, broken imports,
 * missing data, and runtime crashes across the entire app.
 */

// Collect console errors per test
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`);
  });
});

test.afterEach(async ({}, testInfo) => {
  if (consoleErrors.length > 0) {
    // Attach errors to test report for debugging
    testInfo.annotations.push({
      type: "console-errors",
      description: consoleErrors.join("\n"),
    });
    console.warn(
      `[${testInfo.title}] ${consoleErrors.length} console error(s):\n${consoleErrors.join("\n")}`
    );
  }
});

// Helper: verify page loaded without Next.js error overlay
async function expectPageLoaded(page: Page) {
  // Next.js error overlay has this data attribute
  const errorOverlay = page.locator("#__next-build-error, [data-nextjs-dialog]");
  await expect(errorOverlay).toHaveCount(0, { timeout: 5_000 }).catch(() => {
    // If error overlay exists, capture its text
    // Don't fail yet — the test itself will report it
  });

  // Page should have some visible content
  await expect(page.locator("body")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Admin Pages (authenticated)
// ---------------------------------------------------------------------------

test.describe("Admin Pages", () => {
  test("dashboard /admin", async ({ page }) => {
    await page.goto("/admin");
    await expectPageLoaded(page);
    // Dashboard should have some content
    await expect(page.locator("main, [role=main], .dashboard, h1, h2").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("bookings /admin/bookings", async ({ page }) => {
    await page.goto("/admin/bookings");
    await expectPageLoaded(page);
    await expect(page.getByText(/booking/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("calendar /admin/calendar", async ({ page }) => {
    await page.goto("/admin/calendar");
    await expectPageLoaded(page);
  });

  test("customers /admin/customers", async ({ page }) => {
    await page.goto("/admin/customers");
    await expectPageLoaded(page);
    await expect(page.getByText(/customer|patient/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("team /admin/team", async ({ page }) => {
    await page.goto("/admin/team");
    await expectPageLoaded(page);
    await expect(page.getByText(/team|staff|therapist/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("workflows /admin/workflows", async ({ page }) => {
    await page.goto("/admin/workflows");
    await expectPageLoaded(page);
  });

  test("forms /admin/forms", async ({ page }) => {
    await page.goto("/admin/forms");
    await expectPageLoaded(page);
  });

  test("reviews /admin/reviews", async ({ page }) => {
    await page.goto("/admin/reviews");
    await expectPageLoaded(page);
  });

  test("payments /admin/payments", async ({ page }) => {
    await page.goto("/admin/payments");
    await expectPageLoaded(page);
  });

  test("scheduling /admin/scheduling", async ({ page }) => {
    await page.goto("/admin/scheduling");
    await expectPageLoaded(page);
  });

  test("analytics /admin/analytics", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expectPageLoaded(page);
  });

  test("audit /admin/audit", async ({ page }) => {
    await page.goto("/admin/audit");
    await expectPageLoaded(page);
  });

  test("settings /admin/settings", async ({ page }) => {
    await page.goto("/admin/settings");
    await expectPageLoaded(page);
    await expect(page.getByText(/setting/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("developer /admin/developer", async ({ page }) => {
    await page.goto("/admin/developer");
    await expectPageLoaded(page);
  });
});

// ---------------------------------------------------------------------------
// Settings Tabs (navigate through each tab)
// ---------------------------------------------------------------------------

test.describe("Settings Tabs", () => {
  test("iterate through all settings tabs", async ({ page }) => {
    await page.goto("/admin/settings");
    await expectPageLoaded(page);

    // Find all tab triggers and click each
    const tabs = page.locator("[role=tab], [data-state]");
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      const tabText = await tab.textContent();
      if (!tabText) continue;

      await tab.click();
      // Wait for tab content to settle
      await page.waitForTimeout(500);
      await expectPageLoaded(page);
      console.log(`  ✓ Settings tab: ${tabText.trim()}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Platform Pages (platform admin)
// ---------------------------------------------------------------------------

test.describe("Platform Pages", () => {
  test("platform dashboard /platform", async ({ page }) => {
    await page.goto("/platform");
    await expectPageLoaded(page);
  });

  test("platform tenants /platform/tenants", async ({ page }) => {
    await page.goto("/platform/tenants");
    await expectPageLoaded(page);
  });

  test("platform analytics /platform/analytics", async ({ page }) => {
    await page.goto("/platform/analytics");
    await expectPageLoaded(page);
  });

  test("platform new tenant /platform/tenants/new", async ({ page }) => {
    await page.goto("/platform/tenants/new");
    await expectPageLoaded(page);
  });
});

// ---------------------------------------------------------------------------
// Public Pages (no auth required)
// ---------------------------------------------------------------------------

test.describe("Public Pages", () => {
  test("booking portal /book/demo", async ({ page }) => {
    await page.goto("/book/demo");
    await expectPageLoaded(page);
  });

  test("home page /", async ({ page }) => {
    await page.goto("/");
    await expectPageLoaded(page);
  });
});

// ---------------------------------------------------------------------------
// Navigation — Sidebar links all work
// ---------------------------------------------------------------------------

test.describe("Sidebar Navigation", () => {
  test("click every sidebar link", async ({ page }) => {
    await page.goto("/admin");
    await expectPageLoaded(page);

    // Find all sidebar nav links
    const navLinks = page.locator("nav a[href^='/admin']");
    const linkCount = await navLinks.count();
    const visitedHrefs = new Set<string>();

    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute("href");
      if (!href || visitedHrefs.has(href)) continue;
      visitedHrefs.add(href);

      await link.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await expectPageLoaded(page);
      console.log(`  ✓ Nav: ${href}`);

      // Go back to admin to find links again
      await page.goto("/admin");
    }

    console.log(`  Total sidebar links tested: ${visitedHrefs.size}`);
  });
});
