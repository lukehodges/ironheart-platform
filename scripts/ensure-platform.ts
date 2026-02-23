/**
 * Ensure Platform Modules & Permissions
 *
 * Lightweight, standalone script that ensures the `modules` and `permissions`
 * tables are populated with the rows needed for the platform layer to function.
 *
 * - Seeds all module slugs into the `modules` table (platform + vertical placeholders)
 * - Seeds platform-layer permissions (audit, notifications) into `permissions` table
 * - Assigns new permissions to existing roles (Owner, Admin, Member)
 * - Fully idempotent — safe to run multiple times
 * - Does NOT touch business data (tenants, users, bookings, etc.)
 *
 * Run: npm run db:ensure-platform
 *   or: npx tsx --tsconfig tsconfig.json scripts/ensure-platform.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import { eq, inArray } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// 1. Seed modules catalogue
// ---------------------------------------------------------------------------

async function seedModules() {
  console.log("  → ensuring modules catalogue...");

  const now = new Date();

  // All modules — platform layer is CORE, vertical modules are placeholders
  const catalogue = [
    // Platform layer (isCore: true in manifests)
    { slug: "auth",         name: "Authentication",    category: "CORE" as const, features: { workos: true, sso: true } },
    { slug: "tenant",       name: "Tenant Management", category: "CORE" as const, features: { settings: true, modules: true } },
    { slug: "platform",     name: "Platform Admin",    category: "CORE" as const, features: { tenants: true, provisioning: true } },
    { slug: "analytics",    name: "Analytics",         category: "CORE" as const, features: { dashboard: true, export: true } },
    { slug: "search",       name: "Search",            category: "CORE" as const, features: { fullText: true, filters: true } },
    { slug: "audit",        name: "Audit Log",         category: "CORE" as const, features: { trail: true, export: true } },
    { slug: "notification", name: "Notifications",     category: "CORE" as const, features: { email: true, sms: false, push: false } },
    { slug: "settings",     name: "Settings",          category: "CORE" as const, features: { apiKeys: true, moduleTabs: true } },
    // Vertical modules (disabled in registry, seeded as placeholders)
    { slug: "customer",      name: "Customers",       category: "CORE"    as const, features: { profiles: true, notes: true, gdpr: true } },
    { slug: "booking",       name: "Bookings",        category: "CORE"    as const, features: { create: true, approve: true, cancel: true } },
    { slug: "team",          name: "Team",            category: "CORE"    as const, features: { members: true, availability: true } },
    { slug: "scheduling",    name: "Scheduling",      category: "CORE"    as const, features: { slots: true, availability: true, calendar: true } },
    { slug: "portal",        name: "Booking Portal",  category: "CORE"    as const, features: { publicBooking: true, embed: true } },
    { slug: "staff",         name: "Staff Portal",    category: "CORE"    as const, features: { dashboard: true, schedule: true } },
    { slug: "calendar-sync", name: "Calendar Sync",   category: "PREMIUM" as const, features: { google: true, outlook: true, twoWay: false } },
    { slug: "forms",         name: "Forms",           category: "PREMIUM" as const, features: { builder: true, signatures: true } },
    { slug: "review",        name: "Reviews",         category: "PREMIUM" as const, features: { collection: true, automation: true } },
    { slug: "payment",       name: "Payments",        category: "PREMIUM" as const, features: { stripe: true, invoices: true } },
    { slug: "workflow",      name: "Workflows",       category: "PREMIUM" as const, features: { builder: true, triggers: true, actions: true } },
    { slug: "developer",     name: "Developer Tools", category: "PREMIUM" as const, features: { webhooks: true, api: true } },
  ];

  const existingSlugs = (
    await db.select({ slug: schema.modules.slug }).from(schema.modules)
  ).map((r) => r.slug);

  const toInsert = catalogue.filter((m) => !existingSlugs.includes(m.slug));

  if (toInsert.length > 0) {
    await db.insert(schema.modules).values(
      toInsert.map((m) => ({
        id: uuid(),
        slug: m.slug,
        name: m.name,
        description: null,
        category: m.category,
        icon: null,
        isActive: true,
        setupFee: "0",
        monthlyFee: "0",
        features: m.features,
        createdAt: now,
        updatedAt: now,
      }))
    );
    console.log(`    ✓ inserted ${toInsert.length} modules`);
  } else {
    console.log("    ✓ all modules already present");
  }
}

// ---------------------------------------------------------------------------
// 2. Seed platform-layer permissions
// ---------------------------------------------------------------------------

async function seedPlatformPermissions(): Promise<Record<string, string>> {
  console.log("  → ensuring platform permissions...");

  // Platform-layer permissions that are missing from the original seed
  const platformPerms = [
    // Audit module
    { resource: "audit", action: "read", description: "View audit log entries" },
    { resource: "audit", action: "export", description: "Export audit log as CSV" },
    // Notification module
    { resource: "notifications", action: "read", description: "View notification history" },
    { resource: "notifications", action: "write", description: "Manage notification settings" },
  ];

  // Load ALL existing permissions (including original 20 from seed-demo)
  const existing = await db
    .select({
      id: schema.permissions.id,
      resource: schema.permissions.resource,
      action: schema.permissions.action,
    })
    .from(schema.permissions);

  const permMap = Object.fromEntries(
    existing.map((r) => [`${r.resource}:${r.action}`, r.id])
  );

  const toInsert = platformPerms.filter(
    (p) => !permMap[`${p.resource}:${p.action}`]
  );

  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({
      id: uuid(),
      resource: p.resource,
      action: p.action,
      description: p.description,
    }));
    await db.insert(schema.permissions).values(rows);
    rows.forEach((r) => {
      permMap[`${r.resource}:${r.action}`] = r.id;
    });
    console.log(`    ✓ created ${toInsert.length} permissions`);
  } else {
    console.log("    ✓ platform permissions already present");
  }

  return permMap;
}

// ---------------------------------------------------------------------------
// 3. Assign new permissions to existing roles
// ---------------------------------------------------------------------------

async function assignRolePermissions(permMap: Record<string, string>) {
  console.log("  → assigning platform permissions to roles...");

  // Find all roles across all tenants
  const allRoles = await db
    .select({ id: schema.roles.id, name: schema.roles.name, tenantId: schema.roles.tenantId })
    .from(schema.roles);

  if (allRoles.length === 0) {
    console.log("    ⚠ no roles found — run db:seed first to create tenants and roles");
    return;
  }

  // Platform permission keys to assign
  const platformPermKeys = [
    "audit:read",
    "audit:export",
    "notifications:read",
    "notifications:write",
  ];

  const assignments: Array<{ roleId: string; permissionId: string }> = [];

  for (const role of allRoles) {
    for (const permKey of platformPermKeys) {
      const permId = permMap[permKey];
      if (!permId) continue;

      if (role.name === "Owner") {
        // Owner gets everything
        assignments.push({ roleId: role.id, permissionId: permId });
      } else if (role.name === "Admin") {
        // Admin gets everything except exports (treat as sensitive)
        if (!permKey.endsWith(":export")) {
          assignments.push({ roleId: role.id, permissionId: permId });
        }
      } else if (role.name === "Member") {
        // Member gets read-only
        if (permKey.endsWith(":read")) {
          assignments.push({ roleId: role.id, permissionId: permId });
        }
      }
    }
  }

  if (assignments.length === 0) {
    console.log("    ✓ no new assignments needed");
    return;
  }

  // Check existing assignments
  const roleIds = [...new Set(assignments.map((a) => a.roleId))];
  const existing = await db
    .select({
      roleId: schema.rolePermissions.roleId,
      permissionId: schema.rolePermissions.permissionId,
    })
    .from(schema.rolePermissions)
    .where(inArray(schema.rolePermissions.roleId, roleIds));

  const existingSet = new Set(
    existing.map((r) => `${r.roleId}:${r.permissionId}`)
  );

  const toInsert = assignments.filter(
    (a) => !existingSet.has(`${a.roleId}:${a.permissionId}`)
  );

  if (toInsert.length > 0) {
    await db.insert(schema.rolePermissions).values(toInsert);
    console.log(`    ✓ assigned ${toInsert.length} role-permissions`);
  } else {
    console.log("    ✓ role-permissions already up to date");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🔧 Ensuring platform infrastructure...\n");

  try {
    await seedModules();
    const permMap = await seedPlatformPermissions();
    await assignRolePermissions(permMap);

    console.log("\n✅ Platform infrastructure ready.\n");
  } catch (err) {
    console.error("\n❌ Failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
