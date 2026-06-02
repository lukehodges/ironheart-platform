/**
 * Demo Seed Script
 *
 * Provisions:
 *   1. Platform modules (global catalogue)
 *   2. Platform tenant + platform admin user
 *   3. Demo tenant (Riverside Wellness Clinic) with full data
 *
 * Run: npm run db:seed
 * Idempotent: skips if "demo" slug already exists.
 */

// Load env BEFORE any module that reads process.env
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import * as relations from "../src/shared/db/relations";
import { and, eq, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// DB connection (fresh, avoids importing shared/db.ts which validates env at
// module evaluation time before dotenv has had a chance to run)
// ---------------------------------------------------------------------------

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { ...schema, ...relations } });

// ---------------------------------------------------------------------------
// Schema repair — runs before any seed step.
//
// Drizzle tracks applied migrations by hash. If a migration file's hash is
// already in __drizzle_migrations (e.g. copied from another environment) but
// its SQL never actually ran, drizzle-kit migrate will skip it forever.
//
// This function applies those ALTER TABLE statements idempotently using
// IF NOT EXISTS / IF EXISTS so they are safe to run multiple times.
// ---------------------------------------------------------------------------

async function repairSchema() {
  console.log("  → checking schema integrity...");

  // Migration 0001: confirmationTokenHash on bookings
  await client`
    ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "confirmationTokenHash" text
  `;

  // Migration 0002: workos_user_id on users
  await client`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "workos_user_id" text
  `;
  // Add unique constraint only if it doesn't already exist
  await client`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_workos_user_id_key'
      ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_workos_user_id_key" UNIQUE ("workos_user_id");
      END IF;
    END$$
  `;

  // Migration 0003: outreach_activities missing columns
  await client`
    ALTER TABLE "outreach_activities"
      ADD COLUMN IF NOT EXISTS "performedByUserId" uuid REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL
  `.catch(() => {});
  await client`
    ALTER TABLE "outreach_activities"
      ADD COLUMN IF NOT EXISTS "previousState" jsonb
  `.catch(() => {});

  // Migration 0004: outreach_templates table
  await client`
    CREATE TABLE IF NOT EXISTS "outreach_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      "name" text NOT NULL,
      "category" text NOT NULL,
      "channel" text NOT NULL,
      "subject" text,
      "bodyMarkdown" text NOT NULL,
      "tags" text[],
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS "outreach_templates_tenantId_idx" ON "outreach_templates" ("tenantId")`.catch(() => {});
  await client`CREATE INDEX IF NOT EXISTS "outreach_templates_tenantId_category_idx" ON "outreach_templates" ("tenantId", "category")`.catch(() => {});

  // Migration 0005: outreach_snippets table
  await client`
    CREATE TABLE IF NOT EXISTS "outreach_snippets" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      "name" text NOT NULL,
      "category" text NOT NULL,
      "bodyMarkdown" text NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS "outreach_snippets_tenantId_idx" ON "outreach_snippets" ("tenantId")`.catch(() => {});
  await client`CREATE INDEX IF NOT EXISTS "outreach_snippets_tenantId_category_idx" ON "outreach_snippets" ("tenantId", "category")`.catch(() => {});

  console.log("    ✓ schema integrity verified");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid(): string {
  return crypto.randomUUID();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split("T")[0]!);
}

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

// ---------------------------------------------------------------------------
// 1. Modules (global catalogue — seeded once, shared across all tenants)
// ---------------------------------------------------------------------------

async function seedModules() {
  console.log("  → seeding modules catalogue...");

  // Fix legacy slug mismatches from earlier seed versions
  const slugRenames: Record<string, string> = {
    bookings: "booking",
    customers: "customer",
    payments: "payment",
    workflows: "workflow",
  };
  for (const [oldSlug, newSlug] of Object.entries(slugRenames)) {
    await client`
      UPDATE modules SET slug = ${newSlug}, "updatedAt" = now()
      WHERE slug = ${oldSlug}
        AND NOT EXISTS (SELECT 1 FROM modules m2 WHERE m2.slug = ${newSlug})
    `;
  }

  const now = new Date();
  const catalogue = [
    // Core modules (always enabled)
    { slug: "auth",           name: "Authentication",    category: "CORE"    as const, features: { workos: true, sso: true } },
    { slug: "tenant",         name: "Tenant Management", category: "CORE"    as const, features: { settings: true, modules: true } },
    { slug: "platform",       name: "Platform Admin",    category: "CORE"    as const, features: { tenants: true, provisioning: true } },
    { slug: "analytics",      name: "Analytics",         category: "CORE"    as const, features: { dashboard: true, export: true, insights: false } },
    { slug: "search",         name: "Search",            category: "CORE"    as const, features: { fullText: true, filters: true } },
    // Standard operations
    { slug: "customer",       name: "Customers",         category: "CORE"    as const, features: { profiles: true, notes: true, gdpr: true } },
    { slug: "booking",        name: "Bookings",          category: "CORE"    as const, features: { create: true, approve: true, cancel: true } },
    { slug: "team",           name: "Team",              category: "CORE"    as const, features: { members: true, availability: true } },
    { slug: "scheduling",     name: "Scheduling",        category: "CORE"    as const, features: { slots: true, availability: true, calendar: true } },
    { slug: "portal",         name: "Booking Portal",    category: "CORE"    as const, features: { publicBooking: true, embed: true } },
    { slug: "staff",          name: "Staff Portal",      category: "CORE"    as const, features: { dashboard: true, schedule: true } },
    { slug: "notification",   name: "Notifications",     category: "CORE"    as const, features: { email: true, sms: false, push: false } },
    // Premium / optional
    { slug: "calendar-sync",  name: "Calendar Sync",     category: "PREMIUM" as const, features: { google: true, outlook: true, twoWay: false } },
    { slug: "forms",          name: "Forms",             category: "PREMIUM" as const, features: { builder: true, signatures: true, conditional: false } },
    { slug: "review",         name: "Reviews",           category: "PREMIUM" as const, features: { collection: true, automation: true, public: false } },
    { slug: "payment",        name: "Payments",          category: "PREMIUM" as const, features: { stripe: true, gocardless: false, invoices: true } },
    { slug: "workflow",       name: "Workflows",         category: "PREMIUM" as const, features: { builder: true, triggers: true, actions: true } },
    { slug: "developer",      name: "Developer Tools",   category: "PREMIUM" as const, features: { webhooks: true, api: true } },
    { slug: "ai",              name: "AI Assistant",      category: "PREMIUM" as const, features: { chat: true, tools: true } },
    // Consulting / client-portal modules (required by CLIENT_MODULE_SET in provisioning.service.ts)
    { slug: "client-portal",  name: "Client Portal",     category: "CUSTOM"  as const, features: { portal: true } },
    { slug: "onboarding",     name: "Onboarding",        category: "CUSTOM"  as const, features: { orgChart: true, auditOnboarding: true } },
    { slug: "audit-view",     name: "Audit Findings",    category: "CUSTOM"  as const, features: { readOnly: true, lensAnalysis: true } },
    { slug: "bookings",       name: "Bookings",          category: "CUSTOM"  as const, features: { scheduleSessions: true } },
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
    console.log("    ✓ modules already seeded");
  }
}

// ---------------------------------------------------------------------------
// 2. Platform tenant + admin user
// ---------------------------------------------------------------------------

async function seedPlatformTenant(): Promise<string> {
  console.log("  → seeding platform tenant...");

  const now = new Date();
  const existing = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "platform"))
    .limit(1);

  if (existing[0]) {
    console.log("    ✓ platform tenant already exists");
    return existing[0].id;
  }

  const tenantId = uuid();
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: "Ironheart Platform",
    slug: "platform",
    plan: "CUSTOM",
    status: "ACTIVE",
    billingEmail: "platform@ironheart.app",
    maxUsers: 999,
    maxStaff: 999,
    maxBookingsMonth: 999999,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.organizationSettings).values({
    tenantId,
    businessName: "Ironheart Platform",
    email: "platform@ironheart.app",
    timezone: "Europe/London",
    currency: "GBP",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    weekStartsOn: 1,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`    ✓ platform tenant created (${tenantId})`);
  return tenantId;
}

async function seedPlatformAdmin(platformTenantId: string): Promise<string> {
  console.log("  → seeding platform admin user...");

  const now = new Date();
  const email = process.env.PLATFORM_ADMIN_EMAIL ?? "luke@theironheart.org";

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing[0]) {
    console.log("    ✓ platform admin already exists");
    return existing[0].id;
  }

  const userId = uuid();
  const workosUserId = process.env.WORKOS_ADMIN_USER_ID ?? null;
  await db.insert(schema.users).values({
    id: userId,
    tenantId: platformTenantId,
    email,
    firstName: "Platform",
    lastName: "Admin",
    displayName: "Platform Admin",
    type: "OWNER",
    status: "ACTIVE",
    emailVerified: now,
    isPlatformAdmin: true,
    timezone: "Europe/London",
    locale: "en-GB",
    loginCount: 0,
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
    ...(workosUserId ? { workosUserId } : {}),
    createdAt: now,
    updatedAt: now,
  });

  console.log(`    ✓ platform admin created (${userId})`);
  if (!workosUserId) {
    console.log("    ℹ  Set WORKOS_ADMIN_USER_ID in .env.local to pre-link WorkOS account");
  }
  return userId;
}

// ---------------------------------------------------------------------------
// 3. Demo tenant
// ---------------------------------------------------------------------------

async function seedDemoTenant(): Promise<string> {
  console.log("  → seeding demo tenant...");

  const now = new Date();
  const existing = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (existing[0]) {
    console.log("    ✓ demo tenant already exists");
    return existing[0].id;
  }

  const tenantId = uuid();
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: "Riverside Wellness Clinic",
    slug: "demo",
    plan: "PROFESSIONAL",
    status: "ACTIVE",
    billingEmail: "hello@riverside-wellness.co.uk",
    maxUsers: 50,
    maxStaff: 20,
    maxBookingsMonth: 2000,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`    ✓ demo tenant created (${tenantId})`);
  return tenantId;
}

async function seedOrgSettings(tenantId: string) {
  console.log("  → seeding org settings...");

  const existing = await db
    .select({ tenantId: schema.organizationSettings.tenantId })
    .from(schema.organizationSettings)
    .where(eq(schema.organizationSettings.tenantId, tenantId))
    .limit(1);

  if (existing[0]) {
    console.log("    ✓ org settings already exist");
    return;
  }

  const now = new Date();
  await db.insert(schema.organizationSettings).values({
    tenantId,
    businessName: "Riverside Wellness Clinic",
    legalName: "Riverside Wellness Clinic Ltd",
    email: "hello@riverside-wellness.co.uk",
    phone: "01865 742 000",
    website: "https://riverside-wellness.co.uk",
    addressLine1: "12 Thames Street",
    city: "Oxford",
    county: "Oxfordshire",
    postcode: "OX1 2AB",
    country: "GB",
    timezone: "Europe/London",
    currency: "GBP",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    weekStartsOn: 1,
    logoUrl: null,
    primaryColor: "#0F766E",
    accentColor: "#7C3AED",
    customerLabel: "patient",
    bookingLabel: "appointment",
    staffLabel: "therapist",
    createdAt: now,
    updatedAt: now,
  });

  console.log("    ✓ org settings created");
}

async function seedTenantModules(tenantId: string) {
  console.log("  → enabling tenant modules...");

  // Only enable modules that match our manifest registry (18 known slugs)
  const knownSlugs = new Set([
    "auth", "tenant", "platform", "analytics", "search",
    "customer", "booking", "team", "scheduling", "portal", "staff",
    "notification", "calendar-sync", "forms", "review", "payment",
    "workflow", "developer", "ai", "pipeline", "outreach",
  ]);

  const now = new Date();
  const allModules = await db
    .select({ id: schema.modules.id, slug: schema.modules.slug })
    .from(schema.modules);

  const registryModules = allModules.filter((m) => knownSlugs.has(m.slug));

  const existing = await db
    .select({ moduleId: schema.tenantModules.moduleId })
    .from(schema.tenantModules)
    .where(eq(schema.tenantModules.tenantId, tenantId));

  const existingIds = new Set(existing.map((r) => r.moduleId));
  const toEnable = registryModules.filter((m) => !existingIds.has(m.id));

  if (toEnable.length === 0) {
    console.log("    ✓ tenant modules already enabled");
    return;
  }

  await db.insert(schema.tenantModules).values(
    toEnable.map((m) => ({
      id: uuid(),
      tenantId,
      moduleId: m.id,
      isEnabled: true,
      isCustom: false,
      setupPaid: false,
      config: {},
      createdAt: now,
      updatedAt: now,
    }))
  );

  console.log(`    ✓ enabled ${toEnable.length} modules`);
}

// ---------------------------------------------------------------------------
// 4. Roles + permissions
// ---------------------------------------------------------------------------

async function seedRoles(tenantId: string): Promise<Record<string, string>> {
  console.log("  → seeding roles...");

  const now = new Date();
  const roleDefs = [
    { name: "Owner",  isDefault: false, color: "#7C3AED" },
    { name: "Admin",  isDefault: false, color: "#0284C7" },
    { name: "Member", isDefault: true,  color: "#059669" },
  ];

  const existing = await db
    .select({ id: schema.roles.id, name: schema.roles.name })
    .from(schema.roles)
    .where(eq(schema.roles.tenantId, tenantId));

  const existingMap = Object.fromEntries(existing.map((r) => [r.name, r.id]));
  const roleIds: Record<string, string> = { ...existingMap };

  const toInsert = roleDefs.filter((r) => !existingMap[r.name]);

  if (toInsert.length > 0) {
    const rows = toInsert.map((r) => ({
      id: uuid(),
      tenantId,
      name: r.name,
      isSystem: true,
      isDefault: r.isDefault,
      color: r.color,
      createdAt: now,
      updatedAt: now,
    }));
    await db.insert(schema.roles).values(rows);
    rows.forEach((r) => { roleIds[r.name] = r.id; });
    console.log(`    ✓ created ${toInsert.length} roles`);
  } else {
    console.log("    ✓ roles already seeded");
  }

  return roleIds;
}

async function seedPermissions(): Promise<Record<string, string>> {
  console.log("  → seeding permissions...");

  const permDefs = [
    // Bookings
    { resource: "bookings", action: "create" },
    { resource: "bookings", action: "read" },
    { resource: "bookings", action: "update" },
    { resource: "bookings", action: "delete" },
    { resource: "bookings", action: "approve" },
    { resource: "bookings", action: "cancel" },
    // Customers
    { resource: "customers", action: "create" },
    { resource: "customers", action: "read" },
    { resource: "customers", action: "update" },
    { resource: "customers", action: "delete" },
    { resource: "customers", action: "export" },
    // Staff / Team
    { resource: "team", action: "read" },
    { resource: "team", action: "manage" },
    // Services
    { resource: "services", action: "read" },
    { resource: "services", action: "manage" },
    // Settings
    { resource: "settings", action: "read" },
    { resource: "settings", action: "manage" },
    // Reports / Analytics
    { resource: "analytics", action: "read" },
    // Payments
    { resource: "payments", action: "read" },
    { resource: "payments", action: "manage" },
  ];

  const existing = await db
    .select({ id: schema.permissions.id, resource: schema.permissions.resource, action: schema.permissions.action })
    .from(schema.permissions);

  const existingMap = Object.fromEntries(
    existing.map((r) => [`${r.resource}:${r.action}`, r.id])
  );

  const toInsert = permDefs.filter((p) => !existingMap[`${p.resource}:${p.action}`]);

  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({ id: uuid(), resource: p.resource, action: p.action }));
    await db.insert(schema.permissions).values(rows);
    rows.forEach((r) => { existingMap[`${r.resource}:${r.action}`] = r.id; });
    console.log(`    ✓ created ${toInsert.length} permissions`);
  } else {
    console.log("    ✓ permissions already seeded");
  }

  return existingMap;
}

async function seedRolePermissions(
  roleIds: Record<string, string>,
  permMap: Record<string, string>
) {
  console.log("  → seeding role permissions...");

  // Owner gets everything
  const ownerPerms = Object.values(permMap);
  // Admin gets most (not delete)
  const adminPerms = Object.entries(permMap)
    .filter(([k]) => !k.endsWith(":delete"))
    .map(([, id]) => id);
  // Member gets read + booking create
  const memberPerms = Object.entries(permMap)
    .filter(([k]) => k.endsWith(":read") || k === "bookings:create" || k === "bookings:cancel")
    .map(([, id]) => id);

  const assignments: Array<{ roleId: string; permissionId: string }> = [
    ...ownerPerms.map((pid) => ({ roleId: roleIds["Owner"]!, permissionId: pid })),
    ...adminPerms.map((pid) => ({ roleId: roleIds["Admin"]!, permissionId: pid })),
    ...memberPerms.map((pid) => ({ roleId: roleIds["Member"]!, permissionId: pid })),
  ];

  // Check existing
  const existing = await db
    .select({ roleId: schema.rolePermissions.roleId, permissionId: schema.rolePermissions.permissionId })
    .from(schema.rolePermissions)
    .where(inArray(schema.rolePermissions.roleId, Object.values(roleIds)));

  const existingSet = new Set(existing.map((r) => `${r.roleId}:${r.permissionId}`));
  const toInsert = assignments.filter(
    (a) => !existingSet.has(`${a.roleId}:${a.permissionId}`)
  );

  if (toInsert.length > 0) {
    await db.insert(schema.rolePermissions).values(toInsert);
    console.log(`    ✓ assigned ${toInsert.length} role-permissions`);
  } else {
    console.log("    ✓ role-permissions already seeded");
  }
}

// ---------------------------------------------------------------------------
// 5. Staff users
// ---------------------------------------------------------------------------

async function seedStaff(
  tenantId: string,
  roleIds: Record<string, string>,
): Promise<string[]> {
  console.log("  → seeding staff users...");

  const now = new Date();
  const staffDefs = [
    {
      email: "luke@theironheart.org",
      firstName: "Luke",
      lastName: "Hodges",
      jobTitle: "Developer",
      type: "OWNER" as const,
      roleName: "Owner",
      dayRate: "0.00",
      isPlatformAdmin: true,
      workosUserId: process.env.WORKOS_ADMIN_USER_ID ?? null,
    },
    {
      email: "luke.hodges.dev@gmail.com",
      firstName: "Luke",
      lastName: "Hodges",
      jobTitle: "Tenant Admin",
      type: "OWNER" as const,
      roleName: "Owner",
      dayRate: "0.00",
      isPlatformAdmin: false,
      workosUserId: process.env.WORKOS_DEV_USER_ID ?? null,
    },
    {
      email: "sarah.mitchell@riverside-wellness.co.uk",
      firstName: "Sarah",
      lastName: "Mitchell",
      jobTitle: "Lead Physiotherapist",
      type: "OWNER" as const,
      roleName: "Owner",
      dayRate: "480.00",
      isPlatformAdmin: false,
      workosUserId: null,
    },
    {
      email: "james.carter@riverside-wellness.co.uk",
      firstName: "James",
      lastName: "Carter",
      jobTitle: "Sports Therapist",
      type: "MEMBER" as const,
      roleName: "Member",
      dayRate: "360.00",
      isPlatformAdmin: false,
      workosUserId: null,
    },
  ];

  const userIds: string[] = [];

  for (const s of staffDefs) {
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.email, s.email), eq(schema.users.tenantId, tenantId)))
      .limit(1);

    if (existing[0]) {
      userIds.push(existing[0].id);
      continue;
    }

    const userId = uuid();
    await db.insert(schema.users).values({
      id: userId,
      tenantId,
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      displayName: `${s.firstName} ${s.lastName}`,
      type: s.type,
      status: "ACTIVE",
      emailVerified: now,
      isPlatformAdmin: s.isPlatformAdmin ?? false,
      timezone: "Europe/London",
      locale: "en-GB",
      loginCount: 0,
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      ...(s.workosUserId ? { workosUserId: s.workosUserId } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // Create staff profile
    await db.insert(schema.staffProfiles).values({
      userId,
      tenantId,
      jobTitle: s.jobTitle,
      staffStatus: "ACTIVE",
      startDate: daysAgo(180),
      dayRate: s.dayRate,
      createdAt: now,
      updatedAt: now,
    });

    // Assign role
    const roleId = roleIds[s.roleName];
    if (roleId) {
      await db.insert(schema.userRoles).values({
        userId,
        roleId,
        grantedAt: now,
      }).onConflictDoNothing();
    }

    userIds.push(userId);
  }

  console.log(`    ✓ ${userIds.length} staff users ready`);
  return userIds;
}

// ---------------------------------------------------------------------------
// 6. Venue
// ---------------------------------------------------------------------------

async function seedVenue(tenantId: string): Promise<string> {
  console.log("  → seeding venue...");

  const now = new Date();
  const existing = await db
    .select({ id: schema.venues.id })
    .from(schema.venues)
    .where(eq(schema.venues.tenantId, tenantId))
    .limit(1);

  if (existing[0]) {
    console.log("    ✓ venue already exists");
    return existing[0].id;
  }

  const venueId = uuid();
  await db.insert(schema.venues).values({
    id: venueId,
    tenantId,
    name: "Riverside Wellness Clinic",
    addressLine1: "12 Thames Street",
    city: "Oxford",
    county: "Oxfordshire",
    postcode: "OX1 2AB",
    country: "GB",
    phone: "01865 742 000",
    email: "hello@riverside-wellness.co.uk",
    isDefault: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  console.log("    ✓ venue created");
  return venueId;
}

// ---------------------------------------------------------------------------
// 7. Service category + services
// ---------------------------------------------------------------------------

async function seedServices(tenantId: string): Promise<string[]> {
  console.log("  → seeding services...");

  const now = new Date();

  // Category
  let categoryId: string;
  const existingCat = await db
    .select({ id: schema.serviceCategories.id })
    .from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.tenantId, tenantId))
    .limit(1);

  if (existingCat[0]) {
    categoryId = existingCat[0].id;
  } else {
    categoryId = uuid();
    await db.insert(schema.serviceCategories).values({
      id: categoryId,
      tenantId,
      name: "Core Services",
      sortOrder: 0,
    });
  }

  const serviceDefs = [
    { name: "Initial Consultation",    duration: 60, price: "80.00",  color: "#0F766E", sortOrder: 0 },
    { name: "Follow-up Appointment",   duration: 30, price: "45.00",  color: "#0284C7", sortOrder: 1 },
    { name: "Physiotherapy Session",   duration: 45, price: "65.00",  color: "#7C3AED", sortOrder: 2 },
    { name: "Sports Massage",          duration: 60, price: "55.00",  color: "#D97706", sortOrder: 3 },
    { name: "Wellness Assessment",     duration: 90, price: "120.00", color: "#DC2626", sortOrder: 4 },
  ];

  const existing = await db
    .select({ id: schema.services.id })
    .from(schema.services)
    .where(eq(schema.services.tenantId, tenantId));

  if (existing.length >= serviceDefs.length) {
    console.log("    ✓ services already seeded");
    return existing.map((s) => s.id);
  }

  const rows = serviceDefs.map((s) => ({
    id: uuid(),
    tenantId,
    name: s.name,
    durationMinutes: s.duration,
    bufferMinutes: 15,
    price: s.price,
    taxRate: "0",
    requiresDeposit: false,
    color: s.color,
    sortOrder: s.sortOrder,
    active: true,
    visibleInPortal: true,
    categoryId,
    requiresApproximateTime: false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(schema.services).values(rows);
  console.log(`    ✓ created ${rows.length} services`);
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// 8. Customers
// ---------------------------------------------------------------------------

async function seedCustomers(tenantId: string): Promise<string[]> {
  console.log("  → seeding customers...");

  const existing = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId));

  if (existing.length >= 10) {
    console.log("    ✓ customers already seeded");
    return existing.map((c) => c.id);
  }

  const now = new Date();
  const customerDefs = [
    { firstName: "Emily",   lastName: "Thompson", email: "emily.thompson@email.co.uk",    phone: "07700 900001", postcode: "OX1 4AB" },
    { firstName: "Michael", lastName: "Davies",   email: "michael.davies@email.co.uk",    phone: "07700 900002", postcode: "OX2 6QY" },
    { firstName: "Sophie",  lastName: "Williams", email: "sophie.williams@email.co.uk",   phone: "07700 900003", postcode: "OX3 7PL" },
    { firstName: "James",   lastName: "Brown",    email: "james.brown@email.co.uk",       phone: "07700 900004", postcode: "OX4 3RG" },
    { firstName: "Olivia",  lastName: "Jones",    email: "olivia.jones@email.co.uk",      phone: "07700 900005", postcode: "OX1 1NF" },
    { firstName: "Harry",   lastName: "Wilson",   email: "harry.wilson@email.co.uk",      phone: "07700 900006", postcode: "OX2 9TH" },
    { firstName: "Amelia",  lastName: "Taylor",   email: "amelia.taylor@email.co.uk",     phone: "07700 900007", postcode: "OX3 8SL" },
    { firstName: "George",  lastName: "Anderson", email: "george.anderson@email.co.uk",   phone: "07700 900008", postcode: "OX4 2BW" },
    { firstName: "Isabella", lastName: "Martin",  email: "isabella.martin@email.co.uk",   phone: "07700 900009", postcode: "OX1 3DK" },
    { firstName: "Charlie", lastName: "White",    email: "charlie.white@email.co.uk",     phone: "07700 900010", postcode: "OX2 0HE" },
  ];

  const rows = customerDefs.map((c) => ({
    id: uuid(),
    tenantId,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    city: "Oxford",
    county: "Oxfordshire",
    postcode: c.postcode,
    country: "GB",
    status: "ACTIVE" as const,
    marketingOptIn: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(schema.customers).values(rows).onConflictDoNothing();
  console.log(`    ✓ created ${rows.length} customers`);
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// 9. Bookings
// ---------------------------------------------------------------------------

async function seedBookings(
  tenantId: string,
  customerIds: string[],
  serviceIds: string[],
  staffIds: string[],
  venueId: string
) {
  console.log("  → seeding bookings...");

  const existing = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.tenantId, tenantId));

  if (existing.length >= 10) {
    console.log("    ✓ bookings already seeded");
    return;
  }

  const now = new Date();

  const bookingDefs: Array<{
    customerIndex: number;
    serviceIndex: number;
    staffIndex: number;
    daysOffset: number;
    time: string;
    status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
    price: string;
    duration: number;
  }> = [
    { customerIndex: 0, serviceIndex: 0, staffIndex: 0, daysOffset: -28, time: "09:00", status: "COMPLETED",  price: "80.00",  duration: 60 },
    { customerIndex: 1, serviceIndex: 2, staffIndex: 1, daysOffset: -21, time: "10:30", status: "COMPLETED",  price: "65.00",  duration: 45 },
    { customerIndex: 2, serviceIndex: 3, staffIndex: 0, daysOffset: -14, time: "14:00", status: "COMPLETED",  price: "55.00",  duration: 60 },
    { customerIndex: 3, serviceIndex: 1, staffIndex: 1, daysOffset: -10, time: "11:00", status: "CANCELLED",  price: "45.00",  duration: 30 },
    { customerIndex: 4, serviceIndex: 4, staffIndex: 0, daysOffset: -7,  time: "09:30", status: "CANCELLED",  price: "120.00", duration: 90 },
    { customerIndex: 5, serviceIndex: 0, staffIndex: 0, daysOffset: 2,   time: "10:00", status: "CONFIRMED",  price: "80.00",  duration: 60 },
    { customerIndex: 6, serviceIndex: 2, staffIndex: 1, daysOffset: 3,   time: "13:00", status: "CONFIRMED",  price: "65.00",  duration: 45 },
    { customerIndex: 7, serviceIndex: 1, staffIndex: 0, daysOffset: 5,   time: "09:00", status: "CONFIRMED",  price: "45.00",  duration: 30 },
    { customerIndex: 8, serviceIndex: 3, staffIndex: 1, daysOffset: 7,   time: "11:30", status: "CONFIRMED",  price: "55.00",  duration: 60 },
    { customerIndex: 9, serviceIndex: 4, staffIndex: 0, daysOffset: 10,  time: "14:00", status: "CONFIRMED",  price: "120.00", duration: 90 },
  ];

  const rows = bookingDefs.map((b, i) => {
    const scheduledDate = dateOnly(daysFromNow(b.daysOffset));
    const [h, m] = b.time.split(":").map(Number);
    const endH = Math.floor((h! * 60 + m! + b.duration) / 60);
    const endM = (h! * 60 + m! + b.duration) % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    return {
      id: uuid(),
      tenantId,
      bookingNumber: `BK-${pad(i + 1)}`,
      customerId: customerIds[b.customerIndex]!,
      serviceId: serviceIds[b.serviceIndex]!,
      staffId: staffIds[b.staffIndex]!,
      venueId,
      scheduledDate,
      scheduledTime: b.time,
      durationMinutes: b.duration,
      endTime,
      locationType: "VENUE" as const,
      status: b.status,
      statusChangedAt: now,
      price: b.price,
      taxAmount: "0.00",
      totalAmount: b.price,
      depositRequired: "0.00",
      depositPaid: "0.00",
      source: "ADMIN" as const,
      requiresApproval: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...(b.status === "COMPLETED" ? { completedAt: daysAgo(Math.abs(b.daysOffset) - 1) } : {}),
      ...(b.status === "CANCELLED" ? { cancelledAt: daysAgo(Math.abs(b.daysOffset) - 2), cancellationReason: "Patient request" } : {}),
    };
  });

  await db.insert(schema.bookings).values(rows);
  console.log(`    ✓ created ${rows.length} bookings`);
}

// ---------------------------------------------------------------------------
// 10. Portal template + tenant portal
// ---------------------------------------------------------------------------

async function seedPortal(tenantId: string) {
  console.log("  → seeding portal...");

  const now = new Date();

  // Portal template (global)
  let templateId: string;
  const existingTemplate = await db
    .select({ id: schema.portalTemplates.id })
    .from(schema.portalTemplates)
    .where(eq(schema.portalTemplates.slug, "wellness-standard"))
    .limit(1);

  if (existingTemplate[0]) {
    templateId = existingTemplate[0].id;
  } else {
    templateId = uuid();
    await db.insert(schema.portalTemplates).values({
      id: templateId,
      slug: "wellness-standard",
      name: "Wellness & Health Standard",
      description: "Clean booking flow for health and wellness clinics",
      industry: "health",
      colorScheme: { primary: "#0F766E", accent: "#7C3AED", background: "#FAFAFA" },
      stepFlow: ["service", "slot", "details", "confirm"],
      formSchema: {
        fields: [
          { id: "firstName", type: "text", label: "First name", required: true },
          { id: "lastName",  type: "text", label: "Last name",  required: true },
          { id: "email",     type: "email", label: "Email",     required: true },
          { id: "phone",     type: "phone", label: "Phone",     required: true },
          { id: "notes",     type: "textarea", label: "Any notes for your therapist?", required: false },
        ],
      },
      requiresLocation: false,
      defaultAvailabilityMode: "CALENDAR_BASED",
      requiresApproval: false,
      reservationMinutes: 15,
      isActive: true,
      isSystemTemplate: true,
      sortOrder: 0,
      skipReservation: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log("    ✓ portal template created");
  }

  // Tenant portal
  const existingPortal = await db
    .select({ id: schema.tenantPortals.id })
    .from(schema.tenantPortals)
    .where(eq(schema.tenantPortals.tenantId, tenantId))
    .limit(1);

  if (!existingPortal[0]) {
    await db.insert(schema.tenantPortals).values({
      id: uuid(),
      tenantId,
      templateId,
      urlPath: "/book",
      displayName: "Book an Appointment",
      requiresLocation: false,
      travelPadding: 0,
      isActive: true,
      isDefault: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log("    ✓ tenant portal created");
  } else {
    console.log("    ✓ tenant portal already exists");
  }
}

// ---------------------------------------------------------------------------
// 11. Resource Pool (skills, capacities, assignments for demo staff)
// ---------------------------------------------------------------------------

async function seedResourcePool(tenantId: string, staffIds: string[]) {
  console.log("  → seeding resource pool...");

  const now = new Date();

  // Check if already seeded
  const existingSkills = await db
    .select({ id: schema.resourceSkills.id })
    .from(schema.resourceSkills)
    .where(eq(schema.resourceSkills.tenantId, tenantId))
    .limit(1);

  if (existingSkills[0]) {
    console.log("    ✓ resource pool already seeded");
    return;
  }

  // Skills for each staff member
  const skillDefs = [
    // Sarah Mitchell — Lead Physiotherapist
    { userId: staffIds[2]!, skillType: "SERVICE" as const, skillId: "physiotherapy", skillName: "Physiotherapy", proficiency: "EXPERT" as const },
    { userId: staffIds[2]!, skillType: "SERVICE" as const, skillId: "sports-massage", skillName: "Sports Massage", proficiency: "ADVANCED" as const },
    { userId: staffIds[2]!, skillType: "CERTIFICATION" as const, skillId: "hcpc-reg", skillName: "HCPC Registration", proficiency: "EXPERT" as const, expiresAt: daysFromNow(180) },
    { userId: staffIds[2]!, skillType: "CERTIFICATION" as const, skillId: "first-aid", skillName: "First Aid Level 3", proficiency: "ADVANCED" as const, expiresAt: daysFromNow(365) },
    { userId: staffIds[2]!, skillType: "LANGUAGE" as const, skillId: "en", skillName: "English", proficiency: "EXPERT" as const },
    // James Carter — Sports Therapist
    { userId: staffIds[3]!, skillType: "SERVICE" as const, skillId: "sports-massage", skillName: "Sports Massage", proficiency: "EXPERT" as const },
    { userId: staffIds[3]!, skillType: "SERVICE" as const, skillId: "wellness-assess", skillName: "Wellness Assessment", proficiency: "INTERMEDIATE" as const },
    { userId: staffIds[3]!, skillType: "CERTIFICATION" as const, skillId: "first-aid", skillName: "First Aid Level 3", proficiency: "ADVANCED" as const, expiresAt: daysFromNow(90) },
    { userId: staffIds[3]!, skillType: "EQUIPMENT" as const, skillId: "ultrasound", skillName: "Therapeutic Ultrasound", proficiency: "INTERMEDIATE" as const },
    { userId: staffIds[3]!, skillType: "LANGUAGE" as const, skillId: "en", skillName: "English", proficiency: "EXPERT" as const },
  ];

  await db.insert(schema.resourceSkills).values(
    skillDefs.map((s) => ({
      id: uuid(),
      tenantId,
      userId: s.userId,
      skillType: s.skillType,
      skillId: s.skillId,
      skillName: s.skillName,
      proficiency: s.proficiency,
      expiresAt: (s as any).expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    }))
  );
  console.log(`    ✓ created ${skillDefs.length} resource skills`);

  // Capacities for staff
  const today = dateOnly(new Date());
  const capacityDefs = [
    { userId: staffIds[2]!, capacityType: "bookings", maxDaily: 8, maxConcurrent: 1, maxWeekly: 35 },
    { userId: staffIds[3]!, capacityType: "bookings", maxDaily: 6, maxConcurrent: 1, maxWeekly: 28 },
  ];

  await db.insert(schema.resourceCapacities).values(
    capacityDefs.map((c) => ({
      id: uuid(),
      tenantId,
      userId: c.userId,
      capacityType: c.capacityType,
      maxDaily: c.maxDaily,
      maxConcurrent: c.maxConcurrent,
      maxWeekly: c.maxWeekly,
      unit: "COUNT" as const,
      effectiveFrom: today,
      createdAt: now,
      updatedAt: now,
    }))
  );
  console.log(`    ✓ created ${capacityDefs.length} resource capacities`);
}

// ---------------------------------------------------------------------------
// 12. Module settings (sync manifest settingsDefinitions to DB)
// ---------------------------------------------------------------------------

async function seedModuleSettingsFromManifests() {
  console.log("  → seeding module settings from manifests...");

  // Import all manifests that have settingsDefinitions
  const { bookingManifest } = await import("../src/modules/booking/booking.manifest");
  const { notificationManifest } = await import("../src/modules/notification/notification.manifest");
  const { auditManifest } = await import("../src/modules/audit/audit.manifest");
  const { analyticsManifest } = await import("../src/modules/analytics/analytics.manifest");
  const { searchManifest } = await import("../src/modules/search/search.manifest");

  const manifests = [
    notificationManifest,
    auditManifest,
    analyticsManifest,
    searchManifest,
    bookingManifest,
  ];

  for (const manifest of manifests) {
    if (!manifest.settingsDefinitions?.length) continue;

    const [mod] = await db
      .select({ id: schema.modules.id })
      .from(schema.modules)
      .where(eq(schema.modules.slug, manifest.slug))
      .limit(1);

    if (!mod) {
      console.log(`    ⚠ module '${manifest.slug}' not found in modules table, skipping`);
      continue;
    }

    let inserted = 0;
    for (const def of manifest.settingsDefinitions) {
      const existing = await db
        .select({ id: schema.moduleSettings.id })
        .from(schema.moduleSettings)
        .where(
          and(
            eq(schema.moduleSettings.moduleId, mod.id),
            eq(schema.moduleSettings.key, def.key)
          )
        )
        .limit(1);

      if (existing[0]) continue;

      await db.insert(schema.moduleSettings).values({
        id: uuid(),
        moduleId: mod.id,
        key: def.key,
        label: def.label,
        type: def.type.toUpperCase() as any,
        defaultValue: def.defaultValue,
        options: def.options ?? null,
        validation: def.validation ?? null,
        category: def.category ?? null,
        order: def.order ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    }

    console.log(`    ✓ ${manifest.slug}: ${inserted} settings inserted (${manifest.settingsDefinitions.length - inserted} already existed)`);
  }
}

// ---------------------------------------------------------------------------
// 12. Outreach (companies / contacts / campaigns / templates / touches /
//               replies / dnc_list — new schema, post-event-framework rewrite)
// ---------------------------------------------------------------------------

interface SeededOutreach {
  companyIds: string[];
  contactIds: string[];
  touchIds: string[];
}

async function seedOutreach(tenantId: string, _staffIds: string[]): Promise<SeededOutreach> {
  console.log("  → seeding outreach data...");

  // Skip if already seeded (companies is the new top-level table)
  const existingCompanies = await db
    .select({ id: schema.companies.id })
    .from(schema.companies)
    .where(eq(schema.companies.tenantId, tenantId));

  if (existingCompanies.length > 0) {
    console.log("    ✓ outreach already seeded");
    // Hydrate IDs so downstream (pipeline) can still link
    const contactsExisting = await db
      .select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(eq(schema.contacts.tenantId, tenantId));
    const touchesExisting = await db
      .select({ id: schema.touches.id })
      .from(schema.touches)
      .where(eq(schema.touches.tenantId, tenantId));
    return {
      companyIds: existingCompanies.map((c) => c.id),
      contactIds: contactsExisting.map((c) => c.id),
      touchIds: touchesExisting.map((t) => t.id),
    };
  }

  const now = new Date();

  // --- Companies -----------------------------------------------------------
  // 10 UK SME prospects in the events / hospitality space — the kind of
  // companies Luke would actually prospect for Crescent Moon / Ironheart.

  const companyDefs: Array<{
    name: string;
    domain: string | null;
    industry: string;
    city: string;
    employeeBand: "1-2" | "3-15" | "15-50" | "50+";
    ownerLed: boolean;
  }> = [
    { name: "Westgate Marquees", domain: "westgatemarquees.co.uk", industry: "Marquee hire", city: "Bath", employeeBand: "3-15", ownerLed: true },
    { name: "Lansdown Lighting & AV", domain: "lansdown-av.co.uk", industry: "Event AV", city: "Bath", employeeBand: "3-15", ownerLed: true },
    { name: "Pulteney Catering Co.", domain: "pulteneycatering.co.uk", industry: "Event catering", city: "Bath", employeeBand: "15-50", ownerLed: false },
    { name: "Harbourside Venues Ltd", domain: "harboursidevenues.co.uk", industry: "Event venue", city: "Bristol", employeeBand: "15-50", ownerLed: true },
    { name: "Stokes Croft Production", domain: "stokescroftprod.co.uk", industry: "Event production", city: "Bristol", employeeBand: "3-15", ownerLed: true },
    { name: "Clifton Wedding Planners", domain: "cliftonweddings.co.uk", industry: "Wedding planning", city: "Bristol", employeeBand: "3-15", ownerLed: true },
    { name: "Shoreditch Stage Hire", domain: "shoreditchstage.co.uk", industry: "Staging / rigging", city: "London", employeeBand: "15-50", ownerLed: false },
    { name: "Bermondsey Bar Hire", domain: "bermondseybars.co.uk", industry: "Mobile bar", city: "London", employeeBand: "3-15", ownerLed: true },
    { name: "Camden Lights Collective", domain: "camdenlights.co.uk", industry: "Lighting hire", city: "London", employeeBand: "3-15", ownerLed: true },
    { name: "Mayfair Floral Studio", domain: "mayfairfloral.co.uk", industry: "Event florals", city: "London", employeeBand: "1-2", ownerLed: true },
  ];

  const companyIds: string[] = [];
  for (const c of companyDefs) {
    const id = uuid();
    companyIds.push(id);
    await db.insert(schema.companies).values({
      id,
      tenantId,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      city: c.city,
      country: "GB",
      employeeBand: c.employeeBand,
      ownerLed: c.ownerLed,
      source: "cold",
      doNotContact: false,
      enrichment: {},
      createdAt: daysAgo(40 + Math.floor(Math.random() * 30)),
      updatedAt: now,
    });
  }
  console.log(`    ✓ created ${companyDefs.length} companies`);

  // --- Contacts ------------------------------------------------------------
  // ~2 contacts per company on average — mostly owners, some ops managers.

  const contactDefs: Array<{
    companyIndex: number;
    fullName: string;
    role: string;
    emailLocal: string;
    isOwner: boolean;
    isDecisionMaker: boolean;
  }> = [
    { companyIndex: 0, fullName: "Tom Westgate",       role: "Owner",          emailLocal: "tom",       isOwner: true,  isDecisionMaker: true },
    { companyIndex: 0, fullName: "Hannah Westgate",    role: "Ops Manager",    emailLocal: "hannah",    isOwner: false, isDecisionMaker: true },
    { companyIndex: 1, fullName: "Dan Lansdown",       role: "Founder",        emailLocal: "dan",       isOwner: true,  isDecisionMaker: true },
    { companyIndex: 1, fullName: "Priya Shah",         role: "Operations Lead", emailLocal: "priya",    isOwner: false, isDecisionMaker: false },
    { companyIndex: 2, fullName: "Marie Pulteney",     role: "Managing Director", emailLocal: "marie",  isOwner: false, isDecisionMaker: true },
    { companyIndex: 2, fullName: "Greg Henson",        role: "Operations Manager", emailLocal: "greg",  isOwner: false, isDecisionMaker: false },
    { companyIndex: 3, fullName: "Ella Hargreaves",    role: "Owner",          emailLocal: "ella",      isOwner: true,  isDecisionMaker: true },
    { companyIndex: 3, fullName: "Marcus Riley",       role: "GM",             emailLocal: "marcus",    isOwner: false, isDecisionMaker: true },
    { companyIndex: 4, fullName: "Joe Stokes",         role: "Owner / Producer", emailLocal: "joe",     isOwner: true,  isDecisionMaker: true },
    { companyIndex: 5, fullName: "Olivia Clifton",     role: "Founder",        emailLocal: "olivia",    isOwner: true,  isDecisionMaker: true },
    { companyIndex: 5, fullName: "Beth Clifton",       role: "Coordinator",    emailLocal: "beth",      isOwner: false, isDecisionMaker: false },
    { companyIndex: 6, fullName: "Adrian Mehta",       role: "Head of Ops",    emailLocal: "adrian",    isOwner: false, isDecisionMaker: true },
    { companyIndex: 6, fullName: "Suki Tanaka",        role: "Production Manager", emailLocal: "suki",  isOwner: false, isDecisionMaker: false },
    { companyIndex: 7, fullName: "Lewis Bermondsey",   role: "Owner",          emailLocal: "lewis",     isOwner: true,  isDecisionMaker: true },
    { companyIndex: 7, fullName: "Sara Khan",          role: "Bar Manager",    emailLocal: "sara",      isOwner: false, isDecisionMaker: false },
    { companyIndex: 8, fullName: "Camille Roux",       role: "Owner",          emailLocal: "camille",   isOwner: true,  isDecisionMaker: true },
    { companyIndex: 8, fullName: "Ben Carter",         role: "Logistics",      emailLocal: "ben",       isOwner: false, isDecisionMaker: false },
    { companyIndex: 9, fullName: "Isla Mayfair",       role: "Founder",        emailLocal: "isla",      isOwner: true,  isDecisionMaker: true },
    { companyIndex: 2, fullName: "Tony Pulteney",      role: "Director",       emailLocal: "tony",      isOwner: false, isDecisionMaker: true },
    { companyIndex: 4, fullName: "Rachel Stokes",      role: "Ops Lead",       emailLocal: "rachel",    isOwner: false, isDecisionMaker: false },
  ];

  const contactIds: string[] = [];
  for (const c of contactDefs) {
    const id = uuid();
    contactIds.push(id);
    const domain = companyDefs[c.companyIndex]!.domain ?? "example.co.uk";
    await db.insert(schema.contacts).values({
      id,
      tenantId,
      companyId: companyIds[c.companyIndex]!,
      fullName: c.fullName,
      role: c.role,
      email: `${c.emailLocal}@${domain}`,
      isOwner: c.isOwner,
      isDecisionMaker: c.isDecisionMaker,
      bounced: false,
      doNotContact: false,
      createdAt: daysAgo(30 + Math.floor(Math.random() * 20)),
      updatedAt: now,
    });
  }
  console.log(`    ✓ created ${contactDefs.length} contacts`);

  // --- Campaigns -----------------------------------------------------------

  const campBath = uuid();
  const campBristol = uuid();

  await db.insert(schema.campaigns).values([
    {
      id: campBath,
      tenantId,
      name: "Bath Wave 1",
      channel: "email",
      city: "Bath",
      industryFocus: "events",
      status: "active",
      startedAt: daysAgo(30),
      createdAt: daysAgo(35),
    },
    {
      id: campBristol,
      tenantId,
      name: "Bristol Wave 1",
      channel: "email",
      city: "Bristol",
      industryFocus: "events",
      status: "active",
      startedAt: daysAgo(20),
      createdAt: daysAgo(25),
    },
  ]);
  console.log("    ✓ created 2 campaigns");

  // --- Templates -----------------------------------------------------------
  // Variables: { city, observation } — matches the wave 1 outreach style
  // Luke uses (one operational observation, one city anchor).

  const tplOpenerId = uuid();
  const tplFollowUpId = uuid();
  const tplBreakupId = uuid();

  await db.insert(schema.templates).values([
    {
      id: tplOpenerId,
      tenantId,
      name: "Cold Opener — Events SME (Wave 1)",
      channel: "email",
      subject: "{{city}} events — quick thought",
      body: "Hi {{firstName}},\n\nI'm in {{city}} and noticed {{observation}}.\n\nWe help event ops teams cut admin and chaos with a 2-week build sprint — no platform lock-in. Open to a 15-min call next week?\n\nBest,\nLuke",
      variables: { city: "Bath", observation: "your crew rota lives in a shared Excel" },
      active: true,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(7),
    },
    {
      id: tplFollowUpId,
      tenantId,
      name: "Follow-up — Wave 1",
      channel: "email",
      parentId: tplOpenerId,
      subject: "Re: {{city}} events — quick thought",
      body: "Hi {{firstName}},\n\nBumping this up — happy to make it 10 mins. The Excel-for-crew problem is the one we see most in {{city}}.\n\nLuke",
      variables: { city: "Bath", observation: "" },
      active: true,
      createdAt: daysAgo(35),
      updatedAt: daysAgo(5),
    },
    {
      id: tplBreakupId,
      tenantId,
      name: "Break-up — Wave 1",
      channel: "email",
      parentId: tplOpenerId,
      subject: "Last note, {{firstName}}",
      body: "Hi {{firstName}},\n\nI'll close the loop here. If the {{observation}} ever becomes a real problem, my line's open.\n\nLuke",
      variables: { city: "Bath", observation: "rota chaos" },
      active: true,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(3),
    },
  ]);
  console.log("    ✓ created 3 templates");

  // --- Touches -------------------------------------------------------------
  // ~30 touches split across contacts + campaigns. Most replyStatus = 'none',
  // a handful positive / ooo / negative.

  const touchDefs: Array<{
    contactIndex: number;
    campaignId: string;
    templateId: string;
    daysAgoSent: number;
    deliveryStatus: "queued" | "sent" | "delivered" | "bounced" | "failed";
    replyStatus: "none" | "positive" | "negative" | "ooo" | "converter" | "wrong_person" | "auto_reply";
    replySummary?: string;
  }> = [
    // --- Bath wave: contacts 0-5 ---
    { contactIndex: 0, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 28, deliveryStatus: "delivered", replyStatus: "positive", replySummary: "Interested — asked for a call next Tuesday" },
    { contactIndex: 0, campaignId: campBath, templateId: tplFollowUpId, daysAgoSent: 24, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 1, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 28, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 2, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 27, deliveryStatus: "delivered", replyStatus: "ooo",      replySummary: "OOO until next week — auto-reply" },
    { contactIndex: 3, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 27, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 3, campaignId: campBath, templateId: tplFollowUpId, daysAgoSent: 23, deliveryStatus: "delivered", replyStatus: "negative", replySummary: "Not interested, please remove" },
    { contactIndex: 4, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 26, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 4, campaignId: campBath, templateId: tplFollowUpId, daysAgoSent: 22, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 4, campaignId: campBath, templateId: tplBreakupId,  daysAgoSent: 18, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 5, campaignId: campBath, templateId: tplOpenerId,   daysAgoSent: 26, deliveryStatus: "bounced",   replyStatus: "none" },

    // --- Bristol wave: contacts 6-12 ---
    { contactIndex: 6, campaignId: campBristol, templateId: tplOpenerId,   daysAgoSent: 18, deliveryStatus: "delivered", replyStatus: "positive", replySummary: "Yes — book me in" },
    { contactIndex: 7, campaignId: campBristol, templateId: tplOpenerId,   daysAgoSent: 18, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 7, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 14, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 8, campaignId: campBristol, templateId: tplOpenerId,   daysAgoSent: 18, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 8, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 14, deliveryStatus: "delivered", replyStatus: "auto_reply", replySummary: "Generic auto-reply, no human" },
    { contactIndex: 9, campaignId: campBristol, templateId: tplOpenerId,   daysAgoSent: 17, deliveryStatus: "delivered", replyStatus: "positive", replySummary: "Crew rota is the issue — yes call please" },
    { contactIndex: 10, campaignId: campBristol, templateId: tplOpenerId,  daysAgoSent: 17, deliveryStatus: "delivered", replyStatus: "wrong_person", replySummary: "Not me — try Olivia" },
    { contactIndex: 11, campaignId: campBristol, templateId: tplOpenerId,  daysAgoSent: 16, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 12, campaignId: campBristol, templateId: tplOpenerId,  daysAgoSent: 16, deliveryStatus: "delivered", replyStatus: "none" },

    // --- London (no campaign — direct touches, contacts 13-19) ---
    { contactIndex: 13, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 12, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 13, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 8, deliveryStatus: "delivered", replyStatus: "negative", replySummary: "Not now" },
    { contactIndex: 14, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 12, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 15, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 11, deliveryStatus: "delivered", replyStatus: "positive", replySummary: "Camille interested, asked for proposal" },
    { contactIndex: 15, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 7, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 16, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 11, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 17, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 10, deliveryStatus: "delivered", replyStatus: "ooo", replySummary: "On leave until next month" },
    { contactIndex: 17, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 6, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 18, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 9, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 19, campaignId: campBristol, templateId: tplOpenerId, daysAgoSent: 9, deliveryStatus: "delivered", replyStatus: "none" },
    { contactIndex: 12, campaignId: campBristol, templateId: tplFollowUpId, daysAgoSent: 12, deliveryStatus: "delivered", replyStatus: "positive", replySummary: "Adrian — let's talk Friday" },
  ];

  const touchIds: string[] = [];
  for (const t of touchDefs) {
    const id = uuid();
    touchIds.push(id);
    const sentAt = daysAgo(t.daysAgoSent);
    await db.insert(schema.touches).values({
      id,
      tenantId,
      campaignId: t.campaignId,
      contactId: contactIds[t.contactIndex]!,
      templateId: t.templateId,
      channel: "email",
      sentAt,
      subjectRendered: `(rendered) ${companyDefs[contactDefs[t.contactIndex]!.companyIndex]!.city} events — quick thought`,
      bodyRendered: "(rendered body — see template)",
      deliveryStatus: t.deliveryStatus,
      replyStatus: t.replyStatus,
      replyAt: t.replyStatus !== "none" ? daysAgo(Math.max(0, t.daysAgoSent - 2)) : null,
      replySummary: t.replySummary ?? null,
      createdAt: sentAt,
      updatedAt: now,
    });
  }
  console.log(`    ✓ created ${touchDefs.length} touches`);

  // --- Replies -------------------------------------------------------------
  // One reply row for each touch where reply_status != 'none'. Mix of
  // classifiers (rule vs claude) and review/handled state.

  type Classifier = "claude" | "luke" | "rule";

  let replyCount = 0;
  for (let i = 0; i < touchDefs.length; i++) {
    const t = touchDefs[i]!;
    if (t.replyStatus === "none") continue;
    const classifier: Classifier = i % 2 === 0 ? "rule" : "claude";
    const receivedAt = daysAgo(Math.max(0, t.daysAgoSent - 2));
    await db.insert(schema.replies).values({
      id: uuid(),
      tenantId,
      touchId: touchIds[i]!,
      contactId: contactIds[t.contactIndex]!,
      receivedAt,
      subject: `Re: ${companyDefs[contactDefs[t.contactIndex]!.companyIndex]!.city} events — quick thought`,
      body: t.replySummary ?? "(reply body)",
      classifiedAs: t.replyStatus,
      classifiedBy: classifier,
      classificationConfidence: classifier === "claude" ? "0.8500" : "1.0000",
      needsReview: classifier === "claude" && t.replyStatus !== "ooo" && t.replyStatus !== "auto_reply",
      handled: t.replyStatus === "negative" || t.replyStatus === "wrong_person",
      handledAt: t.replyStatus === "negative" || t.replyStatus === "wrong_person" ? daysAgo(Math.max(0, t.daysAgoSent - 1)) : null,
      createdAt: receivedAt,
    });
    replyCount++;
  }
  console.log(`    ✓ created ${replyCount} replies`);

  // --- DNC list ------------------------------------------------------------

  await db.insert(schema.dncList).values([
    { id: uuid(), tenantId, email: "complaints@oldlead.co.uk",   domain: null,                reason: "Hard bounce + complaint", addedAt: daysAgo(120), addedBy: "system" },
    { id: uuid(), tenantId, email: "do-not-email@biggroup.com",  domain: null,                reason: "Direct request",          addedAt: daysAgo(60),  addedBy: "luke" },
    { id: uuid(), tenantId, email: null,                         domain: "competitor.co.uk",  reason: "Competitor — never email", addedAt: daysAgo(200), addedBy: "luke" },
    { id: uuid(), tenantId, email: null,                         domain: "ex-client.co.uk",   reason: "Off-boarded client",      addedAt: daysAgo(45),  addedBy: "luke" },
    { id: uuid(), tenantId, email: "legal@enterprise.com",       domain: null,                reason: "Legal request",           addedAt: daysAgo(15),  addedBy: "luke" },
  ]);
  console.log("    ✓ created 5 dnc_list rows");

  return { companyIds, contactIds, touchIds };
}


// ---------------------------------------------------------------------------
// Database Reset (optional — run with --reset flag)
// ---------------------------------------------------------------------------

async function resetDemoData() {
  console.log("  → resetting demo tenant data...");

  // Find demo tenant
  const demoTenant = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (!demoTenant[0]) {
    console.log("    ℹ  no demo tenant found, nothing to reset");
    return;
  }

  const tenantId = demoTenant[0].id;

  // Delete in reverse dependency order (tables may not exist on fresh DBs)
  // New schema: pipeline + outreach + event-framework
  for (const tbl of [
    "deal_events", "deals",
    "replies", "touches", "templates", "campaigns", "contacts", "companies", "dnc_list",
    // Legacy table names — only present on older DBs, ignore if missing
    "outreach_activities", "outreach_contacts", "outreach_sequences",
    "outreach_templates", "outreach_snippets",
    "pipeline_stage_history", "pipeline_members", "pipeline_stages", "pipelines",
  ]) {
    await client.unsafe(`DELETE FROM "${tbl}" WHERE "tenantId" = $1`, [tenantId]).catch(() => {});
  }
  await client`DELETE FROM resource_assignments WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM resource_capacities WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM resource_skills WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM bookings WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM customers WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM user_roles WHERE "userId" IN (SELECT id FROM users WHERE "tenantId" = ${tenantId})`;
  await client`DELETE FROM users WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM services WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM service_categories WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM venues WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM tenant_portals WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM tenant_module_settings WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM tenant_modules WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM roles WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM staff_profiles WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM organization_settings WHERE "tenantId" = ${tenantId}`;
  await client`DELETE FROM module_settings WHERE TRUE`;
  await client`DELETE FROM tenants WHERE id = ${tenantId}`;

  console.log("    ✓ demo tenant data cleared");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🌱 Ironheart Seed Script\n");

  const shouldReset = process.argv.includes("--reset");

  try {
    if (shouldReset) {
      console.log("── Step -1: Reset demo data");
      await resetDemoData();
      console.log("");
    }

    console.log("── Step 0: Schema repair");
    await repairSchema();

    console.log("\n── Step 1: Global modules");
    await seedModules();

    console.log("\n── Step 2: Platform tenant");
    const platformTenantId = await seedPlatformTenant();
    await seedPlatformAdmin(platformTenantId);

    console.log("\n── Step 3: Demo tenant");
    const demoTenantId = await seedDemoTenant();
    await seedOrgSettings(demoTenantId);
    await seedTenantModules(demoTenantId);

    console.log("\n── Step 4: Roles & permissions");
    const roleIds = await seedRoles(demoTenantId);
    const permMap = await seedPermissions();
    await seedRolePermissions(roleIds, permMap);

    console.log("\n── Step 5: Services & venue");
    const venueId = await seedVenue(demoTenantId);
    const serviceIds = await seedServices(demoTenantId);

    console.log("\n── Step 6: Staff");
    const staffIds = await seedStaff(demoTenantId, roleIds);

    console.log("\n── Step 7: Customers");
    const customerIds = await seedCustomers(demoTenantId);

    console.log("\n── Step 8: Bookings");
    await seedBookings(demoTenantId, customerIds, serviceIds, staffIds, venueId);

    console.log("\n── Step 9: Portal");
    await seedPortal(demoTenantId);

    console.log("\n── Step 10: Resource Pool");
    await seedResourcePool(demoTenantId, staffIds);

    console.log("\n── Step 11: Module Settings");
    await seedModuleSettingsFromManifests();

    console.log("\n── Step 12: Outreach");
    const { companyIds: outreachCompanyIds, contactIds: outreachContactIds, touchIds: outreachTouchIds } =
      await seedOutreach(demoTenantId, staffIds);

    console.log("\n── Step 13: Pipeline (deals + deal events)");
    const { seedPipelineDeals } = await import("../src/modules/pipeline/pipeline.seed");
    const seededDeals = await seedPipelineDeals(demoTenantId, {
      companyIds: outreachCompanyIds,
      contactIds: outreachContactIds,
      touchIds: outreachTouchIds,
    });
    console.log(`    ✓ seeded ${seededDeals.length} deals`);
    // customerIds intentionally still seeded earlier — used by the rest of the
    // demo (bookings etc). The outreach module now has its own contacts table.
    void customerIds;

    console.log("\n✅ Seed complete!\n");
    console.log("  Platform admin:  luke@theironheart.org  (platform-wide access)");
    console.log("  Demo tenant:     demo.localhost:3000   or  ?tenant=demo");
    console.log("  Your login:      luke@theironheart.org  (Owner - platform admin access)");
    console.log("  Staff login 1:   sarah.mitchell@riverside-wellness.co.uk  (Owner)");
    console.log("  Staff login 2:   james.carter@riverside-wellness.co.uk  (Member)");
    console.log("");
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
