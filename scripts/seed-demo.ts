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
    "workflow", "developer", "ai",
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

  // Delete in reverse dependency order
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
