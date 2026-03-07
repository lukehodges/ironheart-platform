/**
 * Demo Seed Script V2
 * 
 * Seeds ALL modules with realistic demo data for comprehensive testing.
 * Run: npx tsx scripts/seed-demo-v2.ts
 * Idempotent: skips existing data.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import * as relations from "../src/shared/db/relations";
import { eq, and, inArray } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { ...schema, ...relations } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => crypto.randomUUID();
const now = new Date();

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const daysFromNow = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const dateOnly = (d: Date) => new Date(d.toISOString().split("T")[0]!);

const pad = (n: number) => String(n).padStart(3, "0");

const log = (msg: string) => console.log(`  → ${msg}`);

// ---------------------------------------------------------------------------
// 1. Platform Setup (Modules, Tenant, Admin)
// ---------------------------------------------------------------------------

async function seedPlatform() {
  log("seeding platform...");
  
  // Modules
  const modules = [
    { slug: "auth", name: "Authentication", category: "CORE" as const, features: { workos: true, sso: true } },
    { slug: "tenant", name: "Tenant Management", category: "CORE" as const, features: { settings: true, modules: true } },
    { slug: "platform", name: "Platform Admin", category: "CORE" as const, features: { tenants: true, provisioning: true } },
    { slug: "analytics", name: "Analytics", category: "CORE" as const, features: { dashboard: true, export: true } },
    { slug: "search", name: "Search", category: "CORE" as const, features: { fullText: true, filters: true } },
    { slug: "customer", name: "Customers", category: "CORE" as const, features: { profiles: true, notes: true } },
    { slug: "booking", name: "Bookings", category: "CORE" as const, features: { create: true, approve: true, cancel: true } },
    { slug: "team", name: "Team", category: "CORE" as const, features: { members: true, availability: true } },
    { slug: "scheduling", name: "Scheduling", category: "CORE" as const, features: { slots: true, availability: true } },
    { slug: "portal", name: "Booking Portal", category: "CORE" as const, features: { publicBooking: true, embed: true } },
    { slug: "staff", name: "Staff Portal", category: "CORE" as const, features: { dashboard: true, schedule: true } },
    { slug: "notification", name: "Notifications", category: "CORE" as const, features: { email: true, sms: false } },
    { slug: "calendar-sync", name: "Calendar Sync", category: "PREMIUM" as const, features: { google: true, outlook: true } },
    { slug: "forms", name: "Forms", category: "PREMIUM" as const, features: { builder: true, signatures: true } },
    { slug: "review", name: "Reviews", category: "PREMIUM" as const, features: { collection: true, automation: true } },
    { slug: "payment", name: "Payments", category: "PREMIUM" as const, features: { stripe: true, invoices: true } },
    { slug: "workflow", name: "Workflows", category: "PREMIUM" as const, features: { builder: true, triggers: true } },
    { slug: "developer", name: "Developer Tools", category: "PREMIUM" as const, features: { webhooks: true, api: true } },
  ];

  const existingMods = await db.select({ slug: schema.modules.slug }).from(schema.modules);
  const existingSlugs = new Set(existingMods.map(m => m.slug));
  
  const toInsert = modules.filter(m => !existingSlugs.has(m.slug));
  if (toInsert.length > 0) {
    await db.insert(schema.modules).values(toInsert.map(m => ({
      id: uuid(), slug: m.slug, name: m.name, description: null,
      category: m.category, icon: null, isActive: true,
      setupFee: "0", monthlyFee: "0", features: m.features,
      createdAt: now, updatedAt: now,
    })));
    log(`inserted ${toInsert.length} modules`);
  }

  // Platform tenant
  const existingPlat = await db.select({ id: schema.tenants.id }).from(schema.tenants)
    .where(eq(schema.tenants.slug, "platform")).limit(1);
  
  let platId = existingPlat[0]?.id;
  if (!platId) {
    platId = uuid();
    await db.insert(schema.tenants).values({
      id: platId, name: "Ironheart Platform", slug: "platform",
      plan: "CUSTOM", status: "ACTIVE", billingEmail: "platform@ironheart.app",
      maxUsers: 999, maxStaff: 999, maxBookingsMonth: 999999,
      createdAt: now, updatedAt: now,
    });
    await db.insert(schema.organizationSettings).values({
      tenantId: platId, businessName: "Ironheart Platform", email: "platform@ironheart.app",
      timezone: "Europe/London", currency: "GBP", dateFormat: "dd/MM/yyyy",
      timeFormat: "HH:mm", weekStartsOn: 1,
      createdAt: now, updatedAt: now,
    });
  }

  // Platform admin
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL ?? "luke@theironheart.org";
  const existingAdmin = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.email, adminEmail)).limit(1);
  
  if (!existingAdmin[0]) {
    const adminId = uuid();
    await db.insert(schema.users).values({
      id: adminId, tenantId: platId!, email: adminEmail,
      firstName: "Platform", lastName: "Admin", displayName: "Platform Admin",
      type: "OWNER" as const, status: "ACTIVE", emailVerified: now,
      isPlatformAdmin: true, timezone: "Europe/London",
      locale: "en-GB", loginCount: 0, failedLoginAttempts: 0,
      twoFactorEnabled: false, createdAt: now, updatedAt: now,
    });
  }

  return platId!;
}

// ---------------------------------------------------------------------------
// 2. Demo Tenant (Riverside Wellness)
// ---------------------------------------------------------------------------

async function seedDemoTenant() {
  log("seeding demo tenant...");
  
  const existing = await db.select({ id: schema.tenants.id }).from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo")).limit(1);
  
  if (existing[0]) {
    log("demo tenant exists, reusing");
    return existing[0].id;
  }

  const tenantId = uuid();
  await db.insert(schema.tenants).values({
    id: tenantId, name: "Riverside Wellness Clinic", slug: "demo",
    plan: "PROFESSIONAL", status: "ACTIVE", billingEmail: "hello@riverside-wellness.co.uk",
    maxUsers: 50, maxStaff: 20, maxBookingsMonth: 2000,
    createdAt: now, updatedAt: now,
  });

  await db.insert(schema.organizationSettings).values({
    tenantId, businessName: "Riverside Wellness Clinic", legalName: "Riverside Wellness Clinic Ltd",
    email: "hello@riverside-wellness.co.uk", phone: "01865 742 000",
    website: "https://riverside-wellness.co.uk", addressLine1: "12 Thames Street",
    city: "Oxford", county: "Oxfordshire", postcode: "OX1 2AB", country: "GB",
    timezone: "Europe/London", currency: "GBP", dateFormat: "dd/MM/yyyy", timeFormat: "HH:mm",
    weekStartsOn: 1, primaryColor: "#0F766E", accentColor: "#7C3AED",
    customerLabel: "patient", bookingLabel: "appointment", staffLabel: "therapist",
    createdAt: now, updatedAt: now,
  });

  // Enable all modules
  const allMods = await db.select({ id: schema.modules.id, slug: schema.modules.slug }).from(schema.modules);
  if (allMods.length > 0) {
    await db.insert(schema.tenantModules).values(allMods.map(m => ({
      id: uuid(), tenantId, moduleId: m.id, isEnabled: true, isCustom: false,
      setupPaid: false, config: {}, createdAt: now, updatedAt: now,
    })));
  }

  log(`created demo tenant (${tenantId})`);
  return tenantId;
}

// ---------------------------------------------------------------------------
// 3. Roles & Permissions
// ---------------------------------------------------------------------------

async function seedRBAC(tenantId: string) {
  log("seeding RBAC...");
  
  const roles = [
    { name: "Owner", isDefault: false, color: "#7C3AED" },
    { name: "Admin", isDefault: false, color: "#0284C7" },
    { name: "Member", isDefault: true, color: "#059669" },
  ];

  const existingRoles = await db.select({ id: schema.roles.id, name: schema.roles.name })
    .from(schema.roles).where(eq(schema.roles.tenantId, tenantId));
  const roleMap: Record<string, string> = Object.fromEntries(existingRoles.map(r => [r.name, r.id]));

  const toInsertRoles = roles.filter(r => !roleMap[r.name]);
  if (toInsertRoles.length > 0) {
    const rows = toInsertRoles.map(r => ({
      id: uuid(), tenantId, name: r.name, isSystem: true, isDefault: r.isDefault,
      color: r.color, createdAt: now, updatedAt: now,
    }));
    await db.insert(schema.roles).values(rows);
    rows.forEach(r => { roleMap[r.name] = r.id; });
  }

  // Permissions
  const perms = [
    { resource: "bookings", action: "create" }, { resource: "bookings", action: "read" },
    { resource: "bookings", action: "update" }, { resource: "bookings", action: "delete" },
    { resource: "bookings", action: "approve" }, { resource: "bookings", action: "cancel" },
    { resource: "customers", action: "create" }, { resource: "customers", action: "read" },
    { resource: "customers", action: "update" }, { resource: "customers", action: "delete" },
    { resource: "customers", action: "export" }, { resource: "team", action: "read" },
    { resource: "team", action: "manage" }, { resource: "services", action: "read" },
    { resource: "services", action: "manage" }, { resource: "settings", action: "read" },
    { resource: "settings", action: "manage" }, { resource: "analytics", action: "read" },
    { resource: "payments", action: "read" }, { resource: "payments", action: "manage" },
    { resource: "forms", action: "read" }, { resource: "forms", action: "write" },
    { resource: "reviews", action: "read" }, { resource: "reviews", action: "write" },
    { resource: "workflows", action: "read" }, { resource: "workflows", action: "write" },
  ];

  const existingPerms = await db.select({ id: schema.permissions.id, resource: schema.permissions.resource, action: schema.permissions.action })
    .from(schema.permissions);
  const permMap: Record<string, string> = Object.fromEntries(
    existingPerms.map(p => [`${p.resource}:${p.action}`, p.id])
  );

  const toInsertPerms = perms.filter(p => !permMap[`${p.resource}:${p.action}`]);
  if (toInsertPerms.length > 0) {
    const rows = toInsertPerms.map(p => ({ id: uuid(), resource: p.resource, action: p.action }));
    await db.insert(schema.permissions).values(rows);
    rows.forEach(r => { permMap[`${r.resource}:${r.action}`] = r.id; });
  }

  // Role permissions
  const allPermIds = Object.values(permMap);
  const ownerPerms = allPermIds;
  const adminPerms = allPermIds.filter((_, i) => !Object.keys(permMap)[i]?.endsWith(":delete"));
  const memberPerms = allPermIds.filter((_, i) => Object.keys(permMap)[i]?.endsWith(":read") || 
    Object.keys(permMap)[i] === "bookings:create" || Object.keys(permMap)[i] === "bookings:cancel");

  const assignments = [
    ...ownerPerms.map(pid => ({ roleId: roleMap["Owner"], permissionId: pid })),
    ...adminPerms.map(pid => ({ roleId: roleMap["Admin"], permissionId: pid })),
    ...memberPerms.map(pid => ({ roleId: roleMap["Member"], permissionId: pid })),
  ].filter(a => a.roleId);

  const existingRP = await db.select({ roleId: schema.rolePermissions.roleId, permissionId: schema.rolePermissions.permissionId })
    .from(schema.rolePermissions).where(inArray(schema.rolePermissions.roleId, Object.values(roleMap)));
  const existingSet = new Set(existingRP.map(r => `${r.roleId}:${r.permissionId}`));
  const toInsertRP = assignments.filter(a => !existingSet.has(`${a.roleId}:${a.permissionId}`));

  if (toInsertRP.length > 0) {
    await db.insert(schema.rolePermissions).values(toInsertRP);
  }

  return roleMap;
}

// ---------------------------------------------------------------------------
// 4. Staff Users
// ---------------------------------------------------------------------------

async function seedStaff(tenantId: string, roleIds: Record<string, string>) {
  log("seeding staff...");
  
  const staff = [
    { email: "luke@theironheart.org", firstName: "Luke", lastName: "Hodges", jobTitle: "Developer", type: "OWNER" as const, role: "Owner", dayRate: "0", isPlatform: true },
    { email: "sarah.mitchell@riverside-wellness.co.uk", firstName: "Sarah", lastName: "Mitchell", jobTitle: "Lead Physiotherapist", type: "OWNER" as const, role: "Owner", dayRate: "480", isPlatform: false },
    { email: "james.carter@riverside-wellness.co.uk", firstName: "James", lastName: "Carter", jobTitle: "Sports Therapist", type: "MEMBER" as const, role: "Member", dayRate: "360", isPlatform: false },
    { email: "emma.davies@riverside-wellness.co.uk", firstName: "Emma", lastName: "Davies", jobTitle: "Massage Therapist", type: "MEMBER" as const, role: "Admin", dayRate: "280", isPlatform: false },
  ];

  const userIds: string[] = [];
  for (const s of staff) {
    const existing = await db.select({ id: schema.users.id }).from(schema.users)
      .where(eq(schema.users.email, s.email)).limit(1);
    if (existing[0]) {
      userIds.push(existing[0].id);
      continue;
    }
    const userId = uuid();
    await db.insert(schema.users).values({
      id: userId, tenantId, email: s.email, firstName: s.firstName, lastName: s.lastName,
      displayName: `${s.firstName} ${s.lastName}`, type: s.type, status: "ACTIVE" as const,
      emailVerified: now, isPlatformAdmin: s.isPlatform,
      timezone: "Europe/London", locale: "en-GB",
      loginCount: 0, failedLoginAttempts: 0, twoFactorEnabled: false,
      createdAt: now, updatedAt: now,
    });

    // Create staff profile
    await db.insert(schema.staffProfiles).values({
      userId, tenantId,
      jobTitle: s.jobTitle, staffStatus: "ACTIVE",
      startDate: daysAgo(180), dayRate: s.dayRate,
      createdAt: now, updatedAt: now,
    });
    const roleId = roleIds[s.role];
    if (roleId) {
      await db.insert(schema.userRoles).values({ userId, roleId, grantedAt: now }).onConflictDoNothing();
    }
    userIds.push(userId);
  }
  return userIds;
}

// ---------------------------------------------------------------------------
// 5. Services & Venue
// ---------------------------------------------------------------------------

async function seedServices(tenantId: string) {
  log("seeding services & venue...");
  
  // Venue
  let venueId: string;
  const existingVenue = await db.select({ id: schema.venues.id }).from(schema.venues)
    .where(eq(schema.venues.tenantId, tenantId)).limit(1);
  
  if (existingVenue[0]) {
    venueId = existingVenue[0].id;
  } else {
    venueId = uuid();
    await db.insert(schema.venues).values({
      id: venueId, tenantId, name: "Riverside Wellness Clinic",
      addressLine1: "12 Thames Street", city: "Oxford", county: "Oxfordshire",
      postcode: "OX1 2AB", country: "GB", phone: "01865 742 000",
      email: "hello@riverside-wellness.co.uk", isDefault: true, active: true,
      createdAt: now, updatedAt: now,
    });
  }

  // Category
  let catId: string;
  const existingCat = await db.select({ id: schema.serviceCategories.id }).from(schema.serviceCategories)
    .where(eq(schema.serviceCategories.tenantId, tenantId)).limit(1);
  
  if (existingCat[0]) {
    catId = existingCat[0].id;
  } else {
    catId = uuid();
    await db.insert(schema.serviceCategories).values({ id: catId, tenantId, name: "Core Services", sortOrder: 0 });
  }

  // Services
  const services = [
    { name: "Initial Consultation", duration: 60, price: "80", color: "#0F766E" },
    { name: "Follow-up Appointment", duration: 30, price: "45", color: "#0284C7" },
    { name: "Physiotherapy Session", duration: 45, price: "65", color: "#7C3AED" },
    { name: "Sports Massage", duration: 60, price: "55", color: "#D97706" },
    { name: "Wellness Assessment", duration: 90, price: "120", color: "#DC2626" },
  ];

  const existingSvcs = await db.select({ id: schema.services.id }).from(schema.services)
    .where(eq(schema.services.tenantId, tenantId));
  
  const svcIds: string[] = existingSvcs.map(s => s.id);
  if (svcIds.length < services.length) {
    const rows = services.map((s, i) => ({
      id: uuid(), tenantId, name: s.name, durationMinutes: s.duration, bufferMinutes: 15,
      price: s.price, taxRate: "0", requiresDeposit: false, color: s.color, sortOrder: i,
      active: true, visibleInPortal: true, categoryId: catId, requiresApproximateTime: false,
      createdAt: now, updatedAt: now,
    }));
    await db.insert(schema.services).values(rows);
    svcIds.push(...rows.map(r => r.id));
  }

  return { venueId, serviceIds: svcIds };
}

// ---------------------------------------------------------------------------
// 6. Customers
// ---------------------------------------------------------------------------

async function seedCustomers(tenantId: string) {
  log("seeding customers...");
  
  const customers = [
    { firstName: "Emily", lastName: "Thompson", email: "emily.thompson@email.co.uk", phone: "07700 900001" },
    { firstName: "Michael", lastName: "Davies", email: "michael.davies@email.co.uk", phone: "07700 900002" },
    { firstName: "Sophie", lastName: "Williams", email: "sophie.williams@email.co.uk", phone: "07700 900003" },
    { firstName: "James", lastName: "Brown", email: "james.brown@email.co.uk", phone: "07700 900004" },
    { firstName: "Olivia", lastName: "Jones", email: "olivia.jones@email.co.uk", phone: "07700 900005" },
    { firstName: "Harry", lastName: "Wilson", email: "harry.wilson@email.co.uk", phone: "07700 900006" },
    { firstName: "Amelia", lastName: "Taylor", email: "amelia.taylor@email.co.uk", phone: "07700 900007" },
    { firstName: "George", lastName: "Anderson", email: "george.anderson@email.co.uk", phone: "07700 900008" },
    { firstName: "Isabella", lastName: "Martin", email: "isabella.martin@email.co.uk", phone: "07700 900009" },
    { firstName: "Charlie", lastName: "White", email: "charlie.white@email.co.uk", phone: "07700 900010" },
    { firstName: "Mia", lastName: "Johnson", email: "mia.johnson@email.co.uk", phone: "07700 900011" },
    { firstName: "Noah", lastName: "Robinson", email: "noah.robinson@email.co.uk", phone: "07700 900012" },
  ];

  const existingCusts = await db.select({ id: schema.customers.id }).from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId));
  
  const custIds: string[] = existingCusts.map(c => c.id);
  
  if (custIds.length < customers.length) {
    const newCustomers = customers.slice(custIds.length);
    const rows = newCustomers.map(c => ({
      id: uuid(), tenantId, firstName: c.firstName, lastName: c.lastName,
      email: c.email, phone: c.phone, city: "Oxford", county: "Oxfordshire",
      postcode: "OX1 " + Math.floor(Math.random() * 9) + 1 + "AB", country: "GB",
      status: "ACTIVE" as const, marketingOptIn: false, version: 1,
      createdAt: now, updatedAt: now,
    }));
    if (rows.length > 0) {
      await db.insert(schema.customers).values(rows);
      custIds.push(...rows.map(r => r.id));
    }
  }

  return custIds.slice(0, customers.length);
}

// ---------------------------------------------------------------------------
// 7. Bookings
// ---------------------------------------------------------------------------

async function seedBookings(tenantId: string, customerIds: string[], serviceIds: string[], staffIds: string[], venueId: string) {
  log("seeding bookings...");
  
  // Ensure we have enough related records
  if (customerIds.length < 5 || serviceIds.length < 3 || staffIds.length < 2) {
    log("insufficient data for bookings, skipping");
    return;
  }
  
  const bookings = [
    { c: 0, s: 0, st: 0, d: -28, t: "09:00", status: "COMPLETED" as const, p: "80", dur: 60 },
    { c: 1, s: 2, st: 1, d: -21, t: "10:30", status: "COMPLETED" as const, p: "65", dur: 45 },
    { c: 2, s: 3, st: 0, d: -14, t: "14:00", status: "COMPLETED" as const, p: "55", dur: 60 },
    { c: 3, s: 1, st: 1, d: -10, t: "11:00", status: "CANCELLED" as const, p: "45", dur: 30 },
    { c: 4, s: 4, st: 0, d: -7, t: "09:30", status: "CANCELLED" as const, p: "120", dur: 90 },
    { c: 0, s: 0, st: 0, d: 2, t: "10:00", status: "CONFIRMED" as const, p: "80", dur: 60 },
    { c: 1, s: 2, st: 1, d: 3, t: "13:00", status: "CONFIRMED" as const, p: "65", dur: 45 },
    { c: 2, s: 1, st: 0, d: 5, t: "09:00", status: "CONFIRMED" as const, p: "45", dur: 30 },
    { c: 3, s: 3, st: 1, d: 7, t: "11:30", status: "CONFIRMED" as const, p: "55", dur: 60 },
    { c: 4, s: 4, st: 0, d: 10, t: "14:00", status: "CONFIRMED" as const, p: "120", dur: 90 },
  ];

  const existing = await db.select({ id: schema.bookings.id }).from(schema.bookings)
    .where(eq(schema.bookings.tenantId, tenantId));
  
  if (existing.length >= bookings.length) {
    log("bookings already seeded");
    return;
  }

  const rows = bookings.map((b, i) => {
    const schedDate = dateOnly(daysFromNow(b.d));
    const [h, m] = b.t.split(":").map(Number);
    const endMin = h! * 60 + m! + b.dur;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    
    return {
      id: uuid(), tenantId, bookingNumber: `BK-${pad(i + 1)}`,
      customerId: customerIds[b.c]!, serviceId: serviceIds[b.s]!, staffId: staffIds[b.st]!,
      venueId, scheduledDate: schedDate, scheduledTime: b.t, durationMinutes: b.dur,
      endTime, locationType: "VENUE" as const, status: b.status, statusChangedAt: now,
      price: b.p, taxAmount: "0", totalAmount: b.p, depositRequired: "0", depositPaid: "0",
      source: "ADMIN" as const, requiresApproval: false, version: 1,
      createdAt: now, updatedAt: now,
      ...(b.status === "COMPLETED" ? { completedAt: daysAgo(Math.abs(b.d) - 1) } : {}),
      ...(b.status === "CANCELLED" ? { cancelledAt: daysAgo(Math.abs(b.d) - 2), cancellationReason: "Patient request" } : {}),
    };
  });

  await db.insert(schema.bookings).values(rows);
}

// ---------------------------------------------------------------------------
// 8. Availability Slots
// ---------------------------------------------------------------------------

async function seedAvailability(tenantId: string, staffIds: string[]) {
  log("seeding availability...");
  
  const existing = await db.select({ id: schema.availableSlots.id }).from(schema.availableSlots)
    .where(eq(schema.availableSlots.tenantId, tenantId)).limit(1);
  
  if (existing[0]) return;

  const slots = [];
  for (let day = 0; day < 30; day++) {
    const date = dateOnly(daysFromNow(day));
    for (const h of [9, 10, 11, 13, 14, 15, 16]) {
      for (const staffIdx of [0, 1]) {
        slots.push({
          id: uuid(), tenantId, date, time: `${h}:00`,
          available: true, capacity: 1, bookedCount: 0,
          requiresApproval: false, sortOrder: 0, updatedAt: now,
        });
      }
    }
  }

  await db.insert(schema.availableSlots).values(slots);
}

// ---------------------------------------------------------------------------
// 9. Portal
// ---------------------------------------------------------------------------

async function seedPortal(tenantId: string) {
  log("seeding portal...");
  
  // Template
  let templateId: string;
  const existingTpl = await db.select({ id: schema.portalTemplates.id }).from(schema.portalTemplates)
    .where(eq(schema.portalTemplates.slug, "wellness-standard")).limit(1);
  
  if (existingTpl[0]) {
    templateId = existingTpl[0].id;
  } else {
    templateId = uuid();
    await db.insert(schema.portalTemplates).values({
      id: templateId, slug: "wellness-standard", name: "Wellness & Health Standard",
      description: "Clean booking flow for health and wellness clinics", industry: "health",
      colorScheme: { primary: "#0F766E", accent: "#7C3AED", background: "#FAFAFA" },
      stepFlow: ["service", "slot", "details", "confirm"],
      formSchema: {
        fields: [
          { id: "firstName", type: "text", label: "First name", required: true },
          { id: "lastName", type: "text", label: "Last name", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "phone", type: "phone", label: "Phone", required: true },
        ],
      },
      requiresLocation: false, defaultAvailabilityMode: "CALENDAR_BASED",
      requiresApproval: false, reservationMinutes: 15, isActive: true,
      isSystemTemplate: true, sortOrder: 0, skipReservation: false,
      createdAt: now, updatedAt: now,
    });
  }

  // Tenant portal
  const existingPortal = await db.select({ id: schema.tenantPortals.id }).from(schema.tenantPortals)
    .where(eq(schema.tenantPortals.tenantId, tenantId)).limit(1);
  
  if (!existingPortal[0]) {
    await db.insert(schema.tenantPortals).values({
      id: uuid(), tenantId, templateId, urlPath: "/book",
      displayName: "Book an Appointment", requiresLocation: false, travelPadding: 0,
      isActive: true, isDefault: true, sortOrder: 0,
      createdAt: now, updatedAt: now,
    });
  }
}

// ---------------------------------------------------------------------------
// 10. Notifications / Message Templates
// ---------------------------------------------------------------------------

async function seedNotifications(tenantId: string, serviceIds: string[]) {
  log("seeding notifications...");
  
  const existing = await db.select({ id: schema.messageTemplates.id }).from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.tenantId, tenantId));
  
  if (existing.length > 0) return;

  const templates = [
    { name: "Booking Confirmation", trigger: "BOOKING_CREATED" as const, channel: "EMAIL" as const },
    { name: "Booking Reminder 24h", trigger: "BOOKING_REMINDER_24H" as const, channel: "EMAIL" as const },
    { name: "Booking Cancelled", trigger: "BOOKING_CANCELLED" as const, channel: "EMAIL" as const },
  ];

  await db.insert(schema.messageTemplates).values(templates.map(t => ({
    id: uuid(), tenantId, name: t.name, trigger: t.trigger, channel: t.channel,
    body: `Your booking is confirmed for {{date}} at {{time}}.`,
    active: true, isSystem: false, createdAt: now, updatedAt: now,
  })));
}

// ---------------------------------------------------------------------------
// 11. Reviews
// ---------------------------------------------------------------------------

async function seedReviews(tenantId: string, customerIds: string[], staffIds: string[]) {
  log("seeding reviews...");
  
  const existing = await db.select({ id: schema.reviews.id }).from(schema.reviews)
    .where(eq(schema.reviews.tenantId, tenantId));
  
  if (existing.length > 0 || customerIds.length < 3) return;

  const reviews = [
    { customerIdx: 0, rating: 5, comment: "Excellent service, very professional!" },
    { customerIdx: 1, rating: 4, comment: "Great experience, would recommend." },
    { customerIdx: 2, rating: 5, comment: "Sarah was amazing. Highly recommend!" },
  ];

  await db.insert(schema.reviews).values(reviews.map(r => ({
    id: uuid(), tenantId, customerId: customerIds[r.customerIdx]!,
    customerName: "Customer", customerEmail: "customer@email.com",
    rating: r.rating, comment: r.comment, source: "PRIVATE" as const, isPublic: true,
    createdAt: now, updatedAt: now,
  })));
}

// ---------------------------------------------------------------------------
// 12. Projects & Tasks
// ---------------------------------------------------------------------------

async function seedProjects(tenantId: string, userIds: string[]) {
  log("seeding projects...");
  
  const existing = await db.select({ id: schema.projects.id }).from(schema.projects)
    .where(eq(schema.projects.tenantId, tenantId));
  
  if (existing.length > 0) return;

  const projId = uuid();
  await db.insert(schema.projects).values({
    id: projId, tenantId, name: "Clinic Expansion",
    description: "Expand to second location", status: "PLANNING" as const,
    priority: "HIGH" as const, progress: 0, type: "CLIENT" as const,
    isVisible: true, startDate: daysFromNow(7),
    createdAt: now, updatedAt: now,
  });

  await db.insert(schema.projectMembers).values({
    id: uuid(), projectId: projId, userId: userIds[0]!, role: "OWNER" as const,
    status: "ACTIVE" as const, joinedAt: now,
  });

  await db.insert(schema.tasks).values({
    id: uuid(), projectId: projId, tenantId, title: "Find new location",
    description: "Research and visit potential venues", status: "TODO" as const,
    priority: "HIGH" as const, type: "GENERAL" as const, progress: 0,
    assignedTo: userIds[0]!, createdAt: now, updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// 13. Workflows
// ---------------------------------------------------------------------------

async function seedWorkflows(tenantId: string) {
  log("seeding workflows...");
  
  const existing = await db.select({ id: schema.workflows.id }).from(schema.workflows)
    .where(eq(schema.workflows.tenantId, tenantId));
  
  if (existing.length > 0) return;

  const wfId = uuid();
  await db.insert(schema.workflows).values({
    id: wfId, tenantId, name: "Booking Follow-up",
    description: "Send review request after completion", enabled: true, version: 1,
    createdAt: now, updatedAt: now,
  });

  await db.insert(schema.workflowActions).values({
    id: uuid(), workflowId: wfId, actionType: "SEND_EMAIL" as const,
    config: { template: "review_request" }, order: 0, enabled: true,
    createdAt: now, updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// 14. Forms
// ---------------------------------------------------------------------------

async function seedForms(tenantId: string) {
  log("seeding forms...");
  
  const existing = await db.select({ id: schema.formTemplates.id }).from(schema.formTemplates)
    .where(eq(schema.formTemplates.tenantId, tenantId));
  
  if (existing.length > 0) return;

  await db.insert(schema.formTemplates).values({
    id: uuid(), tenantId, name: "Patient Intake Form",
    description: "New patient medical history",
    fields: [
      { id: "medical_conditions", type: "textarea", label: "Medical Conditions", required: true },
      { id: "medications", type: "textarea", label: "Current Medications", required: false },
    ],
    sendTiming: "ON_BOOKING" as const, active: true, sortOrder: 0,
    createdAt: now, updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// 15. Payments / Invoices
// ---------------------------------------------------------------------------

async function seedPayments(tenantId: string, customerIds: string[], staffIds: string[]) {
  log("seeding payments & invoices...");
  
  const existing = await db.select({ id: schema.invoices.id }).from(schema.invoices)
    .where(eq(schema.invoices.tenantId, tenantId));
  
  if (existing.length > 0 || customerIds.length < 1) return;

  const invId = uuid();
  await db.insert(schema.invoices).values({
    id: invId, tenantId, invoiceNumber: "INV-001",
    customerId: customerIds[0]!, subtotal: "80", taxAmount: "0",
    totalAmount: "80", amountDue: "80", amountPaid: "0",
    issueDate: daysAgo(7), dueDate: daysFromNow(7),
    status: "DRAFT" as const, lineItems: [{ description: "Initial Consultation", quantity: 1, unitPrice: "80", total: "80" }],
    version: 1, createdAt: now, updatedAt: now,
  });

  await db.insert(schema.payments).values({
    id: uuid(), tenantId, customerId: customerIds[0]!,
    invoiceId: invId, amount: "80", currency: "GBP",
    type: "PAYMENT" as const, status: "PENDING" as const,
    method: "CARD" as const, createdAt: now, updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// 16. Tax Rules & Discount Codes
// ---------------------------------------------------------------------------

async function seedPricing(tenantId: string) {
  log("seeding pricing rules...");
  
  const existing = await db.select({ id: schema.taxRules.id }).from(schema.taxRules)
    .where(eq(schema.taxRules.tenantId, tenantId));
  
  if (existing.length > 0) return;

  await db.insert(schema.taxRules).values({
    tenantId, name: "UK Standard Rate", rate: "20",
    country: "GB", isDefault: true, appliesTo: "ALL",
    createdAt: now,
  });

  await db.insert(schema.discountCodes).values({
    tenantId, code: "WELCOME10",
    maxUses: 100, currentUses: 0, expiresAt: daysFromNow(90),
    createdAt: now,
  });
}

// ---------------------------------------------------------------------------
// 17. Feature Flags
// ---------------------------------------------------------------------------

async function seedFeatureFlags(tenantId: string) {
  log("seeding feature flags...");
  
  const flags = [
    { key: "beta_calendar_sync", name: "Beta Calendar Sync", defaultValue: true },
    { key: "new_booking_flow", name: "New Booking Flow", defaultValue: false },
  ];

  for (const f of flags) {
    const existing = await db.select({ id: schema.featureFlags.id }).from(schema.featureFlags)
      .where(eq(schema.featureFlags.key, f.key)).limit(1);
    
    if (!existing[0]) {
      const flagId = uuid();
      await db.insert(schema.featureFlags).values({
        id: flagId, key: f.key, name: f.name, defaultValue: f.defaultValue,
        defaultConfig: {}, createdAt: now, updatedAt: now,
      });
      await db.insert(schema.tenantFeatures).values({
        tenantId, featureId: flagId, enabled: f.defaultValue,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 18. Webhooks
// ---------------------------------------------------------------------------

async function seedWebhooks(tenantId: string) {
  log("seeding webhooks...");

  const existing = await db.select({ id: schema.webhookEndpoints.id }).from(schema.webhookEndpoints)
    .where(eq(schema.webhookEndpoints.tenantId, tenantId));

  if (existing.length > 0) return;

  await db.insert(schema.webhookEndpoints).values({
    id: uuid(), tenantId, url: "https://example.com/webhook",
    secret: "whsec_test", events: ["booking.created", "booking.completed"],
    status: "ACTIVE" as const, failureCount: 0,
    createdAt: now, updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// 19. Staff Module — Departments
// ---------------------------------------------------------------------------

async function seedDepartments(tenantId: string, staffIds: string[]) {
  log("seeding departments...");

  // Check for seed-specific marker (not user-created data)
  const existing = await db.select({ id: schema.staffDepartments.id }).from(schema.staffDepartments)
    .where(and(eq(schema.staffDepartments.tenantId, tenantId), eq(schema.staffDepartments.slug, "clinical")));

  if (existing.length > 0) {
    log("seed departments already exist");
    const all = await db.select({ id: schema.staffDepartments.id }).from(schema.staffDepartments)
      .where(eq(schema.staffDepartments.tenantId, tenantId));
    return { deptIds: all.map(d => d.id) };
  }

  // Top-level departments
  const clinicalId = uuid();
  const adminDeptId = uuid();
  const wellnessId = uuid();

  // Sub-departments
  const physioId = uuid();
  const sportsId = uuid();
  const massageId = uuid();

  const depts = [
    { id: clinicalId, name: "Clinical", slug: "clinical", description: "Clinical therapy and patient care", parentId: null, managerId: staffIds[1] ?? null, color: "#0F766E", sortOrder: 0 },
    { id: adminDeptId, name: "Administration", slug: "administration", description: "Office management and operations", parentId: null, managerId: staffIds[0] ?? null, color: "#0284C7", sortOrder: 1 },
    { id: wellnessId, name: "Wellness & Recovery", slug: "wellness-recovery", description: "Holistic wellness programmes", parentId: null, managerId: null, color: "#7C3AED", sortOrder: 2 },
    { id: physioId, name: "Physiotherapy", slug: "physiotherapy", description: "Musculoskeletal and rehabilitation", parentId: clinicalId, managerId: staffIds[1] ?? null, color: "#059669", sortOrder: 0 },
    { id: sportsId, name: "Sports Therapy", slug: "sports-therapy", description: "Sports injury treatment and prevention", parentId: clinicalId, managerId: staffIds[2] ?? null, color: "#D97706", sortOrder: 1 },
    { id: massageId, name: "Massage Therapy", slug: "massage-therapy", description: "Therapeutic and relaxation massage", parentId: wellnessId, managerId: staffIds[3] ?? null, color: "#DC2626", sortOrder: 0 },
  ];

  // Insert parents first, then children (FK constraint)
  const parents = depts.filter(d => !d.parentId);
  const children = depts.filter(d => d.parentId);

  await db.insert(schema.staffDepartments).values(parents.map(d => ({
    ...d, tenantId, isActive: true, createdAt: now, updatedAt: now,
  })));
  await db.insert(schema.staffDepartments).values(children.map(d => ({
    ...d, tenantId, isActive: true, createdAt: now, updatedAt: now,
  })));

  // Department members
  const members = [
    // Sarah Mitchell → Clinical (primary), Physiotherapy
    { userId: staffIds[1]!, departmentId: clinicalId, isPrimary: true },
    { userId: staffIds[1]!, departmentId: physioId, isPrimary: false },
    // James Carter → Sports Therapy (primary), Clinical
    { userId: staffIds[2]!, departmentId: sportsId, isPrimary: true },
    { userId: staffIds[2]!, departmentId: clinicalId, isPrimary: false },
    // Emma Davies → Massage Therapy (primary), Wellness
    { userId: staffIds[3]!, departmentId: massageId, isPrimary: true },
    { userId: staffIds[3]!, departmentId: wellnessId, isPrimary: false },
    // Luke → Administration (primary)
    { userId: staffIds[0]!, departmentId: adminDeptId, isPrimary: true },
  ].filter(m => m.userId);

  if (members.length > 0) {
    await db.insert(schema.staffDepartmentMembers).values(members.map(m => ({
      id: uuid(), tenantId, ...m, joinedAt: now,
    })));
  }

  log(`created ${depts.length} departments, ${members.length} memberships`);
  return { deptIds: depts.map(d => d.id) };
}

// ---------------------------------------------------------------------------
// 20. Staff Module — Enhanced Profiles (employee type, reporting, address, emergency)
// ---------------------------------------------------------------------------

async function seedEnhancedProfiles(tenantId: string, staffIds: string[]) {
  log("seeding enhanced staff profiles...");

  // Update Sarah Mitchell — Lead Physiotherapist
  if (staffIds[1]) {
    await db.update(schema.staffProfiles).set({
      employeeType: "EMPLOYEE" as const,
      reportsTo: staffIds[0]!, // reports to Luke
      bio: "Senior physiotherapist with 12 years of experience specialising in musculoskeletal rehabilitation and post-operative recovery.",
      dateOfBirth: new Date("1988-03-15"),
      taxId: "AB123456C",
      emergencyContactName: "David Mitchell",
      emergencyContactPhone: "07700 800001",
      emergencyContactRelation: "Spouse",
      addressLine1: "42 Woodstock Road",
      addressCity: "Oxford",
      addressPostcode: "OX2 6HT",
      addressCountry: "GB",
      hourlyRate: "60",
      mileageRate: "0.45",
      updatedAt: now,
    }).where(eq(schema.staffProfiles.userId, staffIds[1]));
  }

  // Update James Carter — Sports Therapist
  if (staffIds[2]) {
    await db.update(schema.staffProfiles).set({
      employeeType: "EMPLOYEE" as const,
      reportsTo: staffIds[1]!, // reports to Sarah
      bio: "Certified sports therapist working with amateur and professional athletes. Specialises in soft tissue injury and biomechanical assessment.",
      dateOfBirth: new Date("1992-07-22"),
      taxId: "CD789012E",
      emergencyContactName: "Linda Carter",
      emergencyContactPhone: "07700 800002",
      emergencyContactRelation: "Mother",
      addressLine1: "8 Banbury Road",
      addressLine2: "Flat 3",
      addressCity: "Oxford",
      addressPostcode: "OX2 7BY",
      addressCountry: "GB",
      hourlyRate: "45",
      mileageRate: "0.45",
      updatedAt: now,
    }).where(eq(schema.staffProfiles.userId, staffIds[2]));
  }

  // Update Emma Davies — Massage Therapist (Contractor)
  if (staffIds[3]) {
    await db.update(schema.staffProfiles).set({
      employeeType: "CONTRACTOR" as const,
      reportsTo: staffIds[1]!, // reports to Sarah
      bio: "Experienced massage therapist offering deep tissue, sports, and Swedish massage. ITEC Level 4 qualified.",
      dateOfBirth: new Date("1990-11-08"),
      emergencyContactName: "Tom Davies",
      emergencyContactPhone: "07700 800003",
      emergencyContactRelation: "Brother",
      addressLine1: "15 Iffley Road",
      addressCity: "Oxford",
      addressPostcode: "OX4 1EA",
      addressCountry: "GB",
      hourlyRate: "35",
      updatedAt: now,
    }).where(eq(schema.staffProfiles.userId, staffIds[3]));
  }

  log("updated 3 staff profiles with enhanced data");
}

// ---------------------------------------------------------------------------
// 21. Staff Module — Pay Rates
// ---------------------------------------------------------------------------

async function seedPayRates(tenantId: string, staffIds: string[]) {
  log("seeding pay rates...");

  // Check for seed-specific marker
  const existing = await db.select({ id: schema.staffPayRates.id }).from(schema.staffPayRates)
    .where(and(eq(schema.staffPayRates.tenantId, tenantId), eq(schema.staffPayRates.reason, "Initial contract")));

  if (existing.length > 0) {
    log("seed pay rates already exist");
    return;
  }

  const rates = [
    // Sarah — salary, had a raise 3 months ago
    { userId: staffIds[1]!, rateType: "SALARY" as const, amount: "42000", effectiveFrom: dateOnly(daysAgo(365)), effectiveUntil: dateOnly(daysAgo(91)), reason: "Initial contract", createdBy: staffIds[0]! },
    { userId: staffIds[1]!, rateType: "SALARY" as const, amount: "48000", effectiveFrom: dateOnly(daysAgo(90)), effectiveUntil: null, reason: "Annual review — promoted to Lead", createdBy: staffIds[0]! },
    // James — hourly, recent starter
    { userId: staffIds[2]!, rateType: "HOURLY" as const, amount: "28.50", effectiveFrom: dateOnly(daysAgo(180)), effectiveUntil: null, reason: "Initial contract", createdBy: staffIds[0]! },
    // Emma — daily rate (contractor)
    { userId: staffIds[3]!, rateType: "DAILY" as const, amount: "220", effectiveFrom: dateOnly(daysAgo(270)), effectiveUntil: dateOnly(daysAgo(31)), reason: "Initial contractor rate", createdBy: staffIds[0]! },
    { userId: staffIds[3]!, rateType: "DAILY" as const, amount: "280", effectiveFrom: dateOnly(daysAgo(30)), effectiveUntil: null, reason: "Rate renegotiation", createdBy: staffIds[0]! },
  ].filter(r => r.userId);

  if (rates.length > 0) {
    await db.insert(schema.staffPayRates).values(rates.map(r => ({
      id: uuid(), tenantId, ...r, currency: "GBP", createdAt: now,
    })));
  }

  log(`created ${rates.length} pay rate records`);
}

// ---------------------------------------------------------------------------
// 22. Staff Module — Notes
// ---------------------------------------------------------------------------

async function seedStaffNotes(tenantId: string, staffIds: string[]) {
  log("seeding staff notes...");

  // Check for seed-specific marker
  const existing = await db.select({ id: schema.staffNotes.id }).from(schema.staffNotes)
    .where(and(eq(schema.staffNotes.tenantId, tenantId), eq(schema.staffNotes.content, "Sarah has been exceptional leading the physiotherapy team. Consider for clinic manager role in Q3.")));

  if (existing.length > 0) {
    log("seed staff notes already exist");
    return;
  }

  const notes = [
    // Notes about Sarah
    { userId: staffIds[1]!, authorId: staffIds[0]!, content: "Sarah has been exceptional leading the physiotherapy team. Consider for clinic manager role in Q3.", isPinned: true, createdAt: daysAgo(14) },
    { userId: staffIds[1]!, authorId: staffIds[0]!, content: "Completed advanced manual therapy certification. Updated CPD records.", isPinned: false, createdAt: daysAgo(45) },
    // Notes about James
    { userId: staffIds[2]!, authorId: staffIds[1]!, content: "James is settling in well. His sports rehab knowledge is a great addition to the team.", isPinned: false, createdAt: daysAgo(60) },
    { userId: staffIds[2]!, authorId: staffIds[0]!, content: "Received positive feedback from 3 patients this week. Excellent bedside manner.", isPinned: true, createdAt: daysAgo(7) },
    { userId: staffIds[2]!, authorId: staffIds[1]!, content: "Needs to complete safeguarding refresher before end of month.", isPinned: false, createdAt: daysAgo(3) },
    // Notes about Emma
    { userId: staffIds[3]!, authorId: staffIds[1]!, content: "Emma's contract renewal due in 4 weeks. She's expressed interest in increasing hours from 3 to 4 days per week.", isPinned: true, createdAt: daysAgo(10) },
    { userId: staffIds[3]!, authorId: staffIds[0]!, content: "Insurance documentation verified and filed. Valid until March 2027.", isPinned: false, createdAt: daysAgo(30) },
  ].filter(n => n.userId && n.authorId);

  if (notes.length > 0) {
    await db.insert(schema.staffNotes).values(notes.map(n => ({
      id: uuid(), tenantId, userId: n.userId, authorId: n.authorId,
      content: n.content, isPinned: n.isPinned,
      createdAt: n.createdAt, updatedAt: n.createdAt,
    })));
  }

  log(`created ${notes.length} staff notes`);
}

// ---------------------------------------------------------------------------
// 23. Staff Module — Checklist Templates & Progress
// ---------------------------------------------------------------------------

async function seedChecklists(tenantId: string, staffIds: string[]) {
  log("seeding checklist templates & progress...");

  // Check for seed-specific marker
  const existing = await db.select({ id: schema.staffChecklistTemplates.id }).from(schema.staffChecklistTemplates)
    .where(and(eq(schema.staffChecklistTemplates.tenantId, tenantId), eq(schema.staffChecklistTemplates.name, "Standard Onboarding")));

  if (existing.length > 0) {
    log("seed checklists already exist");
    return;
  }

  // Onboarding template
  const onboardingId = uuid();
  const onboardingItems = [
    { key: "welcome-pack", label: "Send welcome pack", description: "Email starter pack with handbook, policies, and first-day info", isRequired: true, order: 0 },
    { key: "it-setup", label: "IT setup", description: "Create email account, system login, and calendar access", isRequired: true, order: 1 },
    { key: "dbs-check", label: "DBS check submitted", description: "Enhanced DBS check application submitted and reference received", isRequired: true, order: 2 },
    { key: "uniform", label: "Uniform ordered", description: "Order clinic polo shirts and name badge", isRequired: false, order: 3 },
    { key: "health-safety", label: "Health & safety induction", description: "Fire exits, first aid, manual handling awareness", isRequired: true, order: 4 },
    { key: "shadow-session", label: "Shadow session completed", description: "Shadow an experienced team member for one full day", isRequired: true, order: 5 },
    { key: "policies-signed", label: "Policies signed", description: "Confidentiality, data protection, and safeguarding policies signed", isRequired: true, order: 6 },
    { key: "probation-meeting", label: "Probation review scheduled", description: "Book 3-month probation review meeting", isRequired: false, order: 7 },
  ];

  // Offboarding template
  const offboardingId = uuid();
  const offboardingItems = [
    { key: "exit-interview", label: "Exit interview", description: "Schedule and conduct exit interview", isRequired: true, order: 0 },
    { key: "it-access", label: "Revoke IT access", description: "Disable email, system logins, and calendar", isRequired: true, order: 1 },
    { key: "equipment-return", label: "Equipment returned", description: "Collect keys, badge, uniform, and any clinic equipment", isRequired: true, order: 2 },
    { key: "final-pay", label: "Final pay calculated", description: "Calculate outstanding pay, holiday accrual, and expenses", isRequired: true, order: 3 },
    { key: "references", label: "Reference letter prepared", description: "Draft reference letter for departing staff member", isRequired: false, order: 4 },
  ];

  // Contractor onboarding (different process)
  const contractorOnboardingId = uuid();
  const contractorItems = [
    { key: "contract-signed", label: "Contract signed", description: "Signed contractor agreement with rate and terms", isRequired: true, order: 0 },
    { key: "insurance-verified", label: "Insurance verified", description: "Professional indemnity and public liability insurance on file", isRequired: true, order: 1 },
    { key: "qualifications", label: "Qualifications verified", description: "Verify and file professional qualifications and registration", isRequired: true, order: 2 },
    { key: "system-access", label: "System access granted", description: "Booking system and calendar access set up", isRequired: true, order: 3 },
    { key: "orientation", label: "Clinic orientation", description: "Tour of facilities, introduction to team, room allocation", isRequired: false, order: 4 },
  ];

  await db.insert(schema.staffChecklistTemplates).values([
    { id: onboardingId, tenantId, name: "Standard Onboarding", type: "ONBOARDING" as const, employeeType: "EMPLOYEE", items: onboardingItems, isDefault: true, createdAt: now, updatedAt: now },
    { id: offboardingId, tenantId, name: "Standard Offboarding", type: "OFFBOARDING" as const, employeeType: null, items: offboardingItems, isDefault: true, createdAt: now, updatedAt: now },
    { id: contractorOnboardingId, tenantId, name: "Contractor Onboarding", type: "ONBOARDING" as const, employeeType: "CONTRACTOR", items: contractorItems, isDefault: false, createdAt: now, updatedAt: now },
  ]);

  // Progress — James is mid-onboarding, Emma completed contractor onboarding
  if (staffIds[2]) {
    const jamesProgress = onboardingItems.map((item, i) => ({
      ...item,
      completedAt: i < 5 ? daysAgo(180 - i * 2).toISOString() : null,
      completedBy: i < 5 ? (i < 3 ? staffIds[0]! : staffIds[1]!) : null,
    }));

    await db.insert(schema.staffChecklistProgress).values({
      id: uuid(), tenantId, userId: staffIds[2], templateId: onboardingId,
      status: "IN_PROGRESS" as const, items: jamesProgress,
      startedAt: daysAgo(180), completedAt: null,
      createdAt: daysAgo(180), updatedAt: now,
    });
  }

  if (staffIds[3]) {
    const emmaProgress = contractorItems.map((item, i) => ({
      ...item,
      completedAt: daysAgo(270 - i * 3).toISOString(),
      completedBy: staffIds[0]!,
    }));

    await db.insert(schema.staffChecklistProgress).values({
      id: uuid(), tenantId, userId: staffIds[3], templateId: contractorOnboardingId,
      status: "COMPLETED" as const, items: emmaProgress,
      startedAt: daysAgo(270), completedAt: daysAgo(258),
      createdAt: daysAgo(270), updatedAt: daysAgo(258),
    });
  }

  log("created 3 checklist templates, 2 progress records");
}

// ---------------------------------------------------------------------------
// 24. Staff Module — Custom Field Definitions & Values
// ---------------------------------------------------------------------------

async function seedCustomFields(tenantId: string, staffIds: string[]) {
  log("seeding custom field definitions & values...");

  // Check for seed-specific marker
  const existing = await db.select({ id: schema.staffCustomFieldDefinitions.id }).from(schema.staffCustomFieldDefinitions)
    .where(and(eq(schema.staffCustomFieldDefinitions.tenantId, tenantId), eq(schema.staffCustomFieldDefinitions.fieldKey, "ni-number")));

  if (existing.length > 0) {
    log("seed custom fields already exist");
    return;
  }

  const niiId = uuid();
  const specId = uuid();
  const regBodyId = uuid();
  const regNumId = uuid();
  const shirtId = uuid();
  const allergiesId = uuid();
  const vehicleId = uuid();
  const linkedinId = uuid();

  const definitions = [
    { id: niiId, fieldKey: "ni-number", label: "NI Number", fieldType: "TEXT" as const, options: null, isRequired: true, showOnCard: false, showOnProfile: true, sortOrder: 0, groupName: "Employment" },
    { id: specId, fieldKey: "specialisation", label: "Specialisation", fieldType: "SELECT" as const, options: [
      { value: "msk", label: "Musculoskeletal" },
      { value: "neuro", label: "Neurological" },
      { value: "sports", label: "Sports Rehabilitation" },
      { value: "paediatric", label: "Paediatric" },
      { value: "womens-health", label: "Women's Health" },
      { value: "massage", label: "Massage Therapy" },
    ], isRequired: false, showOnCard: true, showOnProfile: true, sortOrder: 1, groupName: "Clinical" },
    { id: regBodyId, fieldKey: "registration-body", label: "Registration Body", fieldType: "SELECT" as const, options: [
      { value: "hcpc", label: "HCPC" },
      { value: "csp", label: "CSP" },
      { value: "cnhc", label: "CNHC" },
      { value: "isrm", label: "ISRM" },
      { value: "other", label: "Other" },
    ], isRequired: false, showOnCard: true, showOnProfile: true, sortOrder: 2, groupName: "Clinical" },
    { id: regNumId, fieldKey: "registration-number", label: "Registration Number", fieldType: "TEXT" as const, options: null, isRequired: false, showOnCard: false, showOnProfile: true, sortOrder: 3, groupName: "Clinical" },
    { id: shirtId, fieldKey: "shirt-size", label: "Shirt Size", fieldType: "SELECT" as const, options: [
      { value: "xs", label: "XS" }, { value: "s", label: "S" }, { value: "m", label: "M" },
      { value: "l", label: "L" }, { value: "xl", label: "XL" }, { value: "xxl", label: "XXL" },
    ], isRequired: false, showOnCard: false, showOnProfile: true, sortOrder: 4, groupName: "Personal" },
    { id: allergiesId, fieldKey: "allergies", label: "Known Allergies", fieldType: "TEXT" as const, options: null, isRequired: false, showOnCard: false, showOnProfile: true, sortOrder: 5, groupName: "Personal" },
    { id: vehicleId, fieldKey: "has-vehicle", label: "Has Vehicle", fieldType: "BOOLEAN" as const, options: null, isRequired: false, showOnCard: false, showOnProfile: true, sortOrder: 6, groupName: "Personal" },
    { id: linkedinId, fieldKey: "linkedin-profile", label: "LinkedIn Profile", fieldType: "URL" as const, options: null, isRequired: false, showOnCard: false, showOnProfile: true, sortOrder: 7, groupName: "Contact" },
  ];

  await db.insert(schema.staffCustomFieldDefinitions).values(definitions.map(d => ({
    ...d, tenantId, createdAt: now, updatedAt: now,
  })));

  // Values for each staff member
  const values = [
    // Sarah Mitchell
    { userId: staffIds[1]!, fieldDefinitionId: niiId, value: "QQ 12 34 56 C" },
    { userId: staffIds[1]!, fieldDefinitionId: specId, value: "msk" },
    { userId: staffIds[1]!, fieldDefinitionId: regBodyId, value: "hcpc" },
    { userId: staffIds[1]!, fieldDefinitionId: regNumId, value: "PH12345" },
    { userId: staffIds[1]!, fieldDefinitionId: shirtId, value: "m" },
    { userId: staffIds[1]!, fieldDefinitionId: vehicleId, value: true },
    { userId: staffIds[1]!, fieldDefinitionId: linkedinId, value: "https://linkedin.com/in/sarah-mitchell-physio" },
    // James Carter
    { userId: staffIds[2]!, fieldDefinitionId: niiId, value: "AB 98 76 54 D" },
    { userId: staffIds[2]!, fieldDefinitionId: specId, value: "sports" },
    { userId: staffIds[2]!, fieldDefinitionId: regBodyId, value: "csp" },
    { userId: staffIds[2]!, fieldDefinitionId: regNumId, value: "ST67890" },
    { userId: staffIds[2]!, fieldDefinitionId: shirtId, value: "l" },
    { userId: staffIds[2]!, fieldDefinitionId: allergiesId, value: "Latex" },
    { userId: staffIds[2]!, fieldDefinitionId: vehicleId, value: true },
    // Emma Davies
    { userId: staffIds[3]!, fieldDefinitionId: specId, value: "massage" },
    { userId: staffIds[3]!, fieldDefinitionId: regBodyId, value: "cnhc" },
    { userId: staffIds[3]!, fieldDefinitionId: regNumId, value: "MT11223" },
    { userId: staffIds[3]!, fieldDefinitionId: shirtId, value: "s" },
    { userId: staffIds[3]!, fieldDefinitionId: vehicleId, value: false },
  ].filter(v => v.userId);

  if (values.length > 0) {
    await db.insert(schema.staffCustomFieldValues).values(values.map(v => ({
      id: uuid(), tenantId, userId: v.userId, fieldDefinitionId: v.fieldDefinitionId,
      value: v.value, createdAt: now, updatedAt: now,
    })));
  }

  log(`created ${definitions.length} custom field definitions, ${values.length} values`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🌱 Ironheart Seed V2\n");

  try {
    const platformId = await seedPlatform();
    const tenantId = await seedDemoTenant();
    const roleIds = await seedRBAC(tenantId);
    const staffIds = await seedStaff(tenantId, roleIds);
    const { venueId, serviceIds } = await seedServices(tenantId);
    const customerIds = await seedCustomers(tenantId);
    await seedBookings(tenantId, customerIds, serviceIds, staffIds, venueId);
    await seedAvailability(tenantId, staffIds);
    await seedPortal(tenantId);
    await seedNotifications(tenantId, serviceIds);
    await seedReviews(tenantId, customerIds, staffIds);
    await seedProjects(tenantId, staffIds);
    await seedWorkflows(tenantId);
    await seedForms(tenantId);
    await seedPayments(tenantId, customerIds, staffIds);
    await seedPricing(tenantId);
    await seedFeatureFlags(tenantId);
    await seedWebhooks(tenantId);

    // Staff module enhancements
    await seedDepartments(tenantId, staffIds);
    await seedEnhancedProfiles(tenantId, staffIds);
    await seedPayRates(tenantId, staffIds);
    await seedStaffNotes(tenantId, staffIds);
    await seedChecklists(tenantId, staffIds);
    await seedCustomFields(tenantId, staffIds);

    console.log("\n✅ Seed V2 complete!\n");
    console.log(`  Platform: ${platformId}`);
    console.log(`  Tenant: ${tenantId}`);
    console.log("  Login: luke@theironheart.org");
  } catch (err) {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
