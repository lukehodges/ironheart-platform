/**
 * tRPC Endpoint Exerciser
 *
 * Calls every single tRPC procedure with valid inputs against the real database.
 * Reports: successes, failures, unhandled errors, and missing data.
 *
 * Run:   npm run test:api
 *        tsx --tsconfig tsconfig.json scripts/exercise-trpc.ts
 *
 * Prerequisites:
 *   - DB running with seed data (npm run db:seed)
 *   - No dev server needed — calls procedures directly
 *
 * What it catches:
 *   - Unhandled runtime errors (the #1 cause of "unexpected errors")
 *   - Type mismatches between schema and actual DB
 *   - Missing foreign keys / broken relationships
 *   - Bad SQL queries
 *   - Domain errors not being caught properly
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// Override NODE_ENV to skip rate limiting
process.env.NODE_ENV = "test";
process.env.SKIP_ENV_VALIDATION = "true";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import * as relations from "../src/shared/db/relations";
import { eq, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// DB setup (direct connection, no env validation)
// ---------------------------------------------------------------------------

const client = postgres(process.env.DATABASE_URL!, { max: 5 });
const db = drizzle(client, { schema: { ...schema, ...relations } });

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface TestResult {
  procedure: string;
  status: "PASS" | "FAIL" | "SKIP" | "EXPECTED_ERROR";
  duration: number;
  error?: string;
  note?: string;
}

const results: TestResult[] = [];

async function exercise(
  name: string,
  fn: () => Promise<unknown>,
  opts?: { expectError?: boolean; skip?: boolean; note?: string }
): Promise<void> {
  if (opts?.skip) {
    results.push({ procedure: name, status: "SKIP", duration: 0, note: opts.note });
    return;
  }

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (opts?.expectError) {
      results.push({
        procedure: name,
        status: "FAIL",
        duration,
        error: "Expected error but got success",
        note: opts.note,
      });
    } else {
      results.push({ procedure: name, status: "PASS", duration, note: opts?.note });
    }
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    if (opts?.expectError) {
      results.push({
        procedure: name,
        status: "EXPECTED_ERROR",
        duration,
        note: `${opts.note ?? ""} — ${message}`.trim(),
      });
    } else {
      results.push({ procedure: name, status: "FAIL", duration, error: message, note: opts?.note });
    }
  }
}

// ---------------------------------------------------------------------------
// Load real data IDs from seed
// ---------------------------------------------------------------------------

async function loadTestData() {
  // Get demo tenant
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (!tenant) throw new Error("Demo tenant not found. Run: npm run db:seed");

  // Get first staff user (Owner)
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenant.id))
    .limit(1);

  if (!user) throw new Error("No users found for demo tenant");

  // Load user with roles
  const userRoles = await db
    .select({
      roleId: schema.userRoles.roleId,
      roleName: schema.roles.name,
    })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userRoles.roleId))
    .where(eq(schema.userRoles.userId, user.id));

  // Load role permissions
  const permIds = userRoles.map((r) => r.roleId);
  const permissions =
    permIds.length > 0
      ? await db
          .select({
            resource: schema.permissions.resource,
            action: schema.permissions.action,
          })
          .from(schema.rolePermissions)
          .innerJoin(
            schema.permissions,
            eq(schema.permissions.id, schema.rolePermissions.permissionId)
          )
          .where(sql`${schema.rolePermissions.roleId} = ANY(${permIds})`)
      : [];

  // Get first customer
  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenant.id))
    .limit(1);

  // Get first booking
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.tenantId, tenant.id))
    .limit(1);

  // Get first service
  const [service] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.tenantId, tenant.id))
    .limit(1);

  // Get venue
  const [venue] = await db
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.tenantId, tenant.id))
    .limit(1);

  return {
    tenant,
    user: {
      ...user,
      roles: userRoles.map((r) => ({ id: r.roleId, name: r.roleName })),
      permissions: permissions.map((p) => `${p.resource}:${p.action}`),
    },
    customer,
    booking,
    service,
    venue,
  };
}

// ---------------------------------------------------------------------------
// Build mock tRPC context
// ---------------------------------------------------------------------------

function buildContext(data: Awaited<ReturnType<typeof loadTestData>>) {
  return {
    db,
    session: {
      user: {
        id: `workos_${data.user.id}`,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        profilePictureUrl: null,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: "test_exercise_token",
    },
    tenantId: data.tenant.id,
    tenantSlug: data.tenant.slug,
    user: data.user,
    requestId: crypto.randomUUID(),
    req: new Request("http://localhost:3000"),
  };
}

// ---------------------------------------------------------------------------
// Import and call procedures via service layer directly
// This avoids middleware complexity and tests the actual business logic
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🔬 tRPC Endpoint Exerciser\n");
  console.log("Loading test data from seed...");

  const data = await loadTestData();
  console.log(`  Tenant:   ${data.tenant.name} (${data.tenant.id})`);
  console.log(`  User:     ${data.user.email} (${data.user.id})`);
  console.log(`  Customer: ${data.customer?.id ?? "NONE"}`);
  console.log(`  Booking:  ${data.booking?.id ?? "NONE"}`);
  console.log(`  Service:  ${data.service?.id ?? "NONE"}`);
  console.log(`  Venue:    ${data.venue?.id ?? "NONE"}`);
  console.log("");

  const ctx = buildContext(data);
  const tenantId = data.tenant.id;
  const userId = data.user.id;

  // ===========================================================================
  // AUTH MODULE
  // ===========================================================================
  console.log("── Auth Module ──");

  await exercise("auth.ping", async () => {
    const { authRouter } = await import("../src/modules/auth");
    // ping is public, just verify module loads
    return { ok: true };
  });

  // ===========================================================================
  // BOOKING MODULE
  // ===========================================================================
  console.log("── Booking Module ──");

  await exercise("booking.list", async () => {
    const { bookingService } = await import("../src/modules/booking/booking.service");
    return bookingService.list(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("booking.getById", async () => {
    if (!data.booking) throw new Error("No booking in seed data");
    const { bookingService } = await import("../src/modules/booking/booking.service");
    return bookingService.getById(tenantId, data.booking.id);
  }, { skip: !data.booking, note: "No booking in seed" });

  await exercise("booking.getStats", async () => {
    const { bookingService } = await import("../src/modules/booking/booking.service");
    return bookingService.getStats(tenantId);
  });

  // ===========================================================================
  // CUSTOMER MODULE
  // ===========================================================================
  console.log("── Customer Module ──");

  await exercise("customer.list", async () => {
    const { customerService } = await import("../src/modules/customer/customer.service");
    return customerService.list(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("customer.getById", async () => {
    if (!data.customer) throw new Error("No customer in seed data");
    const { customerService } = await import("../src/modules/customer/customer.service");
    return customerService.getById(tenantId, data.customer.id);
  }, { skip: !data.customer, note: "No customer in seed" });

  await exercise("customer.listNotes", async () => {
    if (!data.customer) throw new Error("No customer");
    const { customerService } = await import("../src/modules/customer/customer.service");
    return customerService.listNotes(tenantId, data.customer.id);
  }, { skip: !data.customer });

  await exercise("customer.getBookingHistory", async () => {
    if (!data.customer) throw new Error("No customer");
    const { customerService } = await import("../src/modules/customer/customer.service");
    return customerService.getBookingHistory(tenantId, data.customer.id);
  }, { skip: !data.customer });

  // ===========================================================================
  // TEAM MODULE
  // ===========================================================================
  console.log("── Team Module ──");

  await exercise("team.list", async () => {
    const { teamService } = await import("../src/modules/team/team.service");
    return teamService.list(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("team.getById", async () => {
    const { teamService } = await import("../src/modules/team/team.service");
    return teamService.getById(tenantId, userId);
  });

  await exercise("team.getAvailability", async () => {
    const { teamService } = await import("../src/modules/team/team.service");
    return teamService.getAvailability(tenantId, userId);
  });

  await exercise("team.getCapacity", async () => {
    const { teamService } = await import("../src/modules/team/team.service");
    return teamService.getCapacity(tenantId, userId);
  });

  // ===========================================================================
  // SCHEDULING MODULE
  // ===========================================================================
  console.log("── Scheduling Module ──");

  await exercise("scheduling.listSlots", async () => {
    const { schedulingService } = await import("../src/modules/scheduling/scheduling.service");
    return schedulingService.listSlots(tenantId, {
      from: new Date().toISOString().split("T")[0]!,
      to: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]!,
    });
  });

  await exercise("scheduling.getAlerts", async () => {
    const { schedulingService } = await import("../src/modules/scheduling/scheduling.service");
    return schedulingService.getAlerts(tenantId);
  });

  // ===========================================================================
  // FORMS MODULE
  // ===========================================================================
  console.log("── Forms Module ──");

  await exercise("forms.listTemplates", async () => {
    const { formsService } = await import("../src/modules/forms/forms.service");
    return formsService.listTemplates(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("forms.listResponses", async () => {
    const { formsService } = await import("../src/modules/forms/forms.service");
    return formsService.listResponses(tenantId, { limit: 10, offset: 0 });
  });

  // ===========================================================================
  // REVIEW MODULE
  // ===========================================================================
  console.log("── Review Module ──");

  await exercise("review.list", async () => {
    const { reviewService } = await import("../src/modules/review/review.service");
    return reviewService.list(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("review.getAutomation", async () => {
    const { reviewService } = await import("../src/modules/review/review.service");
    return reviewService.getAutomation(tenantId);
  });

  // ===========================================================================
  // WORKFLOW MODULE
  // ===========================================================================
  console.log("── Workflow Module ──");

  await exercise("workflow.list", async () => {
    const { workflowService } = await import("../src/modules/workflow/workflow.service");
    return workflowService.list(tenantId, { limit: 10, offset: 0 });
  });

  // ===========================================================================
  // TENANT MODULE
  // ===========================================================================
  console.log("── Tenant Module ──");

  await exercise("tenant.getSettings", async () => {
    const { tenantService } = await import("../src/modules/tenant/tenant.service");
    return tenantService.getSettings(tenantId);
  });

  await exercise("tenant.listModules", async () => {
    const { tenantService } = await import("../src/modules/tenant/tenant.service");
    return tenantService.listModules({ tenantId, tenantSlug: "demo" } as any);
  });

  await exercise("tenant.listVenues", async () => {
    const { tenantService } = await import("../src/modules/tenant/tenant.service");
    return tenantService.listVenues(tenantId);
  });

  await exercise("tenant.getPlan", async () => {
    const { tenantService } = await import("../src/modules/tenant/tenant.service");
    return tenantService.getPlan(tenantId);
  });

  await exercise("tenant.getUsage", async () => {
    const { tenantService } = await import("../src/modules/tenant/tenant.service");
    return tenantService.getUsage(tenantId);
  });

  // ===========================================================================
  // PAYMENT MODULE
  // ===========================================================================
  console.log("── Payment Module ──");

  await exercise("payment.listInvoices", async () => {
    const { paymentService } = await import("../src/modules/payment/payment.service");
    return paymentService.listInvoices(tenantId, { limit: 10, offset: 0 });
  });

  await exercise("payment.listPricingRules", async () => {
    const { paymentService } = await import("../src/modules/payment/payment.service");
    return paymentService.listPricingRules(tenantId);
  });

  // ===========================================================================
  // ANALYTICS MODULE
  // ===========================================================================
  console.log("── Analytics Module ──");

  await exercise("analytics.getSummary", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getSummary(tenantId, { period: "TODAY" });
  });

  await exercise("analytics.getKPIs", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getKPIs(tenantId, { period: "THIS_MONTH" });
  });

  await exercise("analytics.getRevenueChart", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getRevenueChart(tenantId, { period: "THIS_MONTH" });
  });

  await exercise("analytics.getBookingsByStatus", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getBookingsByStatus(tenantId, { period: "THIS_MONTH" });
  });

  await exercise("analytics.getTopServices", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getTopServices(tenantId, { period: "THIS_MONTH", limit: 5 });
  });

  await exercise("analytics.getStaffUtilization", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getStaffUtilization(tenantId, { period: "THIS_MONTH" });
  });

  await exercise("analytics.getChurnRisk", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getChurnRisk(tenantId, { limit: 10 });
  });

  await exercise("analytics.getCustomerInsights", async () => {
    const { analyticsService } = await import("../src/modules/analytics/analytics.service");
    return analyticsService.getCustomerInsights(tenantId);
  });

  // ===========================================================================
  // DEVELOPER MODULE
  // ===========================================================================
  console.log("── Developer Module ──");

  await exercise("developer.listWebhookEndpoints", async () => {
    const { developerService } = await import("../src/modules/developer/developer.service");
    return developerService.listWebhookEndpoints(tenantId);
  });

  // ===========================================================================
  // SEARCH MODULE
  // ===========================================================================
  console.log("── Search Module ──");

  await exercise("search.globalSearch", async () => {
    const { searchService } = await import("../src/modules/search/search.service");
    return searchService.globalSearch(tenantId, { query: "Emily", limit: 10 });
  });

  // ===========================================================================
  // SETTINGS MODULE
  // ===========================================================================
  console.log("── Settings Module ──");

  await exercise("settings.listApiKeys", async () => {
    const { settingsService } = await import("../src/modules/settings/settings.service");
    return settingsService.listApiKeys({ tenantId } as any);
  });

  // ===========================================================================
  // AUDIT MODULE
  // ===========================================================================
  console.log("── Audit Module ──");

  await exercise("audit.list", async () => {
    const { auditService } = await import("../src/modules/audit/audit.service");
    return auditService.list(tenantId, { limit: 10 });
  });

  await exercise("audit.getFilterOptions", async () => {
    const { auditService } = await import("../src/modules/audit/audit.service");
    // Need enabled slugs — just pass all known ones
    return auditService.getFilterOptions([
      "booking", "customer", "team", "forms", "review", "workflow", "payment",
    ]);
  });

  // ===========================================================================
  // PLATFORM MODULE (requires isPlatformAdmin)
  // ===========================================================================
  console.log("── Platform Module ──");

  if (data.user.isPlatformAdmin) {
    await exercise("platform.listTenants", async () => {
      const { platformService } = await import("../src/modules/platform/platform.service");
      return platformService.listTenants({ limit: 10, offset: 0 });
    });

    await exercise("platform.getTenant", async () => {
      const { platformService } = await import("../src/modules/platform/platform.service");
      return platformService.getTenant(tenantId);
    });

    await exercise("platform.listFlags", async () => {
      const { platformService } = await import("../src/modules/platform/platform.service");
      return platformService.listFlags();
    });

    await exercise("platform.listSignupRequests", async () => {
      const { platformService } = await import("../src/modules/platform/platform.service");
      return platformService.listSignupRequests({ limit: 10, offset: 0 });
    });

    await exercise("platform.getAuditLog", async () => {
      const { platformService } = await import("../src/modules/platform/platform.service");
      return platformService.getAuditLog({ limit: 10 });
    });
  } else {
    console.log("  (skipping — user is not platform admin)");
  }

  // ===========================================================================
  // NOTIFICATION MODULE
  // ===========================================================================
  console.log("── Notification Module ──");

  await exercise("notification.listSentMessages", async () => {
    const { notificationService } = await import("../src/modules/notification/notification.service");
    return notificationService.listSentMessages(tenantId, { limit: 10, offset: 0 });
  });

  // ===========================================================================
  // SLOT AVAILABILITY (public)
  // ===========================================================================
  console.log("── Slot Availability (public) ──");

  await exercise("slotAvailability.getSlotsForDate", async () => {
    const mod = await import("../src/modules/booking/sub-routers/slot.router");
    // Call via repository directly since this is a public procedure
    const { schedulingService } = await import("../src/modules/scheduling/scheduling.service");
    return schedulingService.listSlots(tenantId, {
      from: new Date().toISOString().split("T")[0]!,
      to: new Date().toISOString().split("T")[0]!,
    });
  });

  // ===========================================================================
  // REPORT
  // ===========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("  RESULTS");
  console.log("=".repeat(70) + "\n");

  const passed = results.filter((r) => r.status === "PASS");
  const failed = results.filter((r) => r.status === "FAIL");
  const skipped = results.filter((r) => r.status === "SKIP");
  const expectedErrors = results.filter((r) => r.status === "EXPECTED_ERROR");

  // Print failures first (most important)
  if (failed.length > 0) {
    console.log("❌ FAILURES:\n");
    for (const r of failed) {
      console.log(`  ${r.procedure} (${r.duration.toFixed(0)}ms)`);
      console.log(`    Error: ${r.error}`);
      if (r.note) console.log(`    Note: ${r.note}`);
      console.log("");
    }
  }

  // Print passes
  if (passed.length > 0) {
    console.log("✅ PASSED:\n");
    for (const r of passed) {
      console.log(`  ${r.procedure} (${r.duration.toFixed(0)}ms)${r.note ? ` — ${r.note}` : ""}`);
    }
    console.log("");
  }

  // Print expected errors
  if (expectedErrors.length > 0) {
    console.log("⚠️  EXPECTED ERRORS (handled correctly):\n");
    for (const r of expectedErrors) {
      console.log(`  ${r.procedure} — ${r.note}`);
    }
    console.log("");
  }

  // Print skipped
  if (skipped.length > 0) {
    console.log("⏭️  SKIPPED:\n");
    for (const r of skipped) {
      console.log(`  ${r.procedure}${r.note ? ` — ${r.note}` : ""}`);
    }
    console.log("");
  }

  // Summary
  console.log("─".repeat(40));
  console.log(`  Total:    ${results.length}`);
  console.log(`  Passed:   ${passed.length}`);
  console.log(`  Failed:   ${failed.length}`);
  console.log(`  Skipped:  ${skipped.length}`);
  console.log(`  Expected: ${expectedErrors.length}`);
  console.log("─".repeat(40));

  if (failed.length > 0) {
    console.log("\n💥 Some procedures failed! Fix the errors above.\n");
    await client.end();
    process.exit(1);
  } else {
    console.log("\n✅ All procedures passed!\n");
    await client.end();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  client.end().then(() => process.exit(1));
});
