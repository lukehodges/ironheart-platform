import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  organizationSettings,
  tenantModules,
  modules,
  venues,
  bookings,
  users,
  staffProfiles,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type {
  OrganizationSettings,
  TenantModule,
  VenueRecord,
} from "./tenant.types";

const log = logger.child({ module: "tenant.repository" });

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapOrgSettings(
  row: typeof organizationSettings.$inferSelect
): OrganizationSettings {
  return {
    id: row.tenantId, // schema uses tenantId as PK, no separate id column
    tenantId: row.tenantId,
    businessName: row.businessName ?? null,
    legalName: row.legalName ?? null,
    registrationNo: row.registrationNo ?? null,
    vatNumber: row.vatNumber ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
    city: row.city ?? null,
    county: row.county ?? null,
    postcode: row.postcode ?? null,
    country: row.country ?? null,
    timezone: row.timezone ?? null,
    currency: row.currency ?? null,
    dateFormat: row.dateFormat ?? null,
    timeFormat: row.timeFormat ?? null,
    weekStartsOn: row.weekStartsOn ?? null,
    logoUrl: row.logoUrl ?? null,
    faviconUrl: row.faviconUrl ?? null,
    primaryColor: row.primaryColor ?? null,
    secondaryColor: row.secondaryColor ?? null,
    accentColor: row.accentColor ?? null,
    fontFamily: row.fontFamily ?? null,
    customCss: row.customCss ?? null,
    senderName: row.senderName ?? null,
    senderEmail: row.senderEmail ?? null,
    replyToEmail: row.replyToEmail ?? null,
    emailFooter: row.emailFooter ?? null,
    smsSignature: row.smsSignature ?? null,
    customerLabel: row.customerLabel ?? null,
    bookingLabel: row.bookingLabel ?? null,
    staffLabel: row.staffLabel ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTenantModule(
  row: typeof tenantModules.$inferSelect & {
    moduleSlug: string;
    moduleName: string;
  }
): TenantModule {
  return {
    id: row.id,
    tenantId: row.tenantId,
    moduleId: row.moduleId,
    moduleSlug: row.moduleSlug,
    moduleName: row.moduleName,
    isEnabled: row.isEnabled,
    config: (row.config as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVenue(row: typeof venues.$inferSelect): VenueRecord {
  const addressParts = [
    row.addressLine1,
    row.addressLine2,
    row.city,
    row.county,
    row.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    address: addressParts || null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    isActive: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===============================================================
// TENANT REPOSITORY
// ===============================================================

export const tenantRepository = {

  // ---- Organization Settings ----

  async getSettings(tenantId: string): Promise<OrganizationSettings | null> {
    log.info({ tenantId }, "getSettings");

    const result = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.tenantId, tenantId))
      .limit(1);

    return result[0] ? mapOrgSettings(result[0]) : null;
  },

  async upsertSettings(
    tenantId: string,
    updates: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    log.info({ tenantId }, "upsertSettings");

    const now = new Date();

    const existing = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.tenantId, tenantId))
      .limit(1);

    if (existing[0]) {
      // Build update data — only include defined fields
      const updateData: Record<string, unknown> = { updatedAt: now };

      const fieldMap: Array<[keyof Partial<OrganizationSettings>, string]> = [
        ["businessName", "businessName"],
        ["legalName", "legalName"],
        ["registrationNo", "registrationNo"],
        ["vatNumber", "vatNumber"],
        ["email", "email"],
        ["phone", "phone"],
        ["website", "website"],
        ["addressLine1", "addressLine1"],
        ["addressLine2", "addressLine2"],
        ["city", "city"],
        ["county", "county"],
        ["postcode", "postcode"],
        ["country", "country"],
        ["timezone", "timezone"],
        ["currency", "currency"],
        ["dateFormat", "dateFormat"],
        ["timeFormat", "timeFormat"],
        ["weekStartsOn", "weekStartsOn"],
        ["logoUrl", "logoUrl"],
        ["faviconUrl", "faviconUrl"],
        ["primaryColor", "primaryColor"],
        ["secondaryColor", "secondaryColor"],
        ["accentColor", "accentColor"],
        ["fontFamily", "fontFamily"],
        ["customCss", "customCss"],
        ["senderName", "senderName"],
        ["senderEmail", "senderEmail"],
        ["replyToEmail", "replyToEmail"],
        ["emailFooter", "emailFooter"],
        ["smsSignature", "smsSignature"],
        ["customerLabel", "customerLabel"],
        ["bookingLabel", "bookingLabel"],
        ["staffLabel", "staffLabel"],
      ];

      for (const [key, dbKey] of fieldMap) {
        if (updates[key] !== undefined) {
          updateData[dbKey] = updates[key];
        }
      }

      const [row] = await db
        .update(organizationSettings)
        .set(updateData as Parameters<typeof db.update>[0] extends infer T
          ? Record<string, unknown>
          : never)
        .where(eq(organizationSettings.tenantId, tenantId))
        .returning();

      return mapOrgSettings(row!);
    }

    // Insert
    const [row] = await db
      .insert(organizationSettings)
      .values({
        tenantId,
        businessName: updates.businessName ?? "My Business",
        legalName: updates.legalName ?? null,
        registrationNo: updates.registrationNo ?? null,
        vatNumber: updates.vatNumber ?? null,
        email: updates.email ?? null,
        phone: updates.phone ?? null,
        website: updates.website ?? null,
        addressLine1: updates.addressLine1 ?? null,
        addressLine2: updates.addressLine2 ?? null,
        city: updates.city ?? null,
        county: updates.county ?? null,
        postcode: updates.postcode ?? null,
        country: updates.country ?? "GB",
        timezone: updates.timezone ?? "Europe/London",
        currency: updates.currency ?? "GBP",
        dateFormat: updates.dateFormat ?? "dd/MM/yyyy",
        timeFormat: updates.timeFormat ?? "HH:mm",
        weekStartsOn: updates.weekStartsOn ?? 1,
        logoUrl: updates.logoUrl ?? null,
        faviconUrl: updates.faviconUrl ?? null,
        primaryColor: updates.primaryColor ?? "#3B82F6",
        secondaryColor: updates.secondaryColor ?? null,
        accentColor: updates.accentColor ?? "#10B981",
        fontFamily: updates.fontFamily ?? null,
        customCss: updates.customCss ?? null,
        senderName: updates.senderName ?? null,
        senderEmail: updates.senderEmail ?? null,
        replyToEmail: updates.replyToEmail ?? null,
        emailFooter: updates.emailFooter ?? null,
        smsSignature: updates.smsSignature ?? null,
        customerLabel: updates.customerLabel ?? "customer",
        bookingLabel: updates.bookingLabel ?? "booking",
        staffLabel: updates.staffLabel ?? "staff",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapOrgSettings(row!);
  },

  // ---- Modules ----

  async listModules(tenantId: string): Promise<TenantModule[]> {
    log.info({ tenantId }, "listModules");

    const rows = await db
      .select({
        id: tenantModules.id,
        tenantId: tenantModules.tenantId,
        moduleId: tenantModules.moduleId,
        isEnabled: tenantModules.isEnabled,
        isCustom: tenantModules.isCustom,
        setupPaid: tenantModules.setupPaid,
        monthlyRate: tenantModules.monthlyRate,
        config: tenantModules.config,
        activatedAt: tenantModules.activatedAt,
        expiresAt: tenantModules.expiresAt,
        createdAt: tenantModules.createdAt,
        updatedAt: tenantModules.updatedAt,
        moduleSlug: modules.slug,
        moduleName: modules.name,
      })
      .from(tenantModules)
      .innerJoin(modules, eq(tenantModules.moduleId, modules.id))
      .where(eq(tenantModules.tenantId, tenantId));

    return rows.map((row) =>
      mapTenantModule({
        ...row,
        isCustom: row.isCustom,
        setupPaid: row.setupPaid,
        monthlyRate: row.monthlyRate ?? null,
        activatedAt: row.activatedAt ?? null,
        expiresAt: row.expiresAt ?? null,
      })
    );
  },

  async toggleModule(
    tenantId: string,
    moduleSlug: string,
    isEnabled: boolean
  ): Promise<void> {
    log.info({ tenantId, moduleSlug, isEnabled }, "toggleModule");

    // Look up the module id by slug
    const moduleResult = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.slug, moduleSlug))
      .limit(1);

    if (!moduleResult[0]) {
      throw new NotFoundError("Module", moduleSlug);
    }

    const moduleId = moduleResult[0].id;
    const now = new Date();

    // Check if tenantModule row exists
    const existing = await db
      .select({ id: tenantModules.id })
      .from(tenantModules)
      .where(
        and(
          eq(tenantModules.tenantId, tenantId),
          eq(tenantModules.moduleId, moduleId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(tenantModules)
        .set({ isEnabled, updatedAt: now })
        .where(
          and(
            eq(tenantModules.tenantId, tenantId),
            eq(tenantModules.moduleId, moduleId)
          )
        );
    } else {
      await db.insert(tenantModules).values({
        id: crypto.randomUUID(),
        tenantId,
        moduleId,
        isEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }
  },

  async isModuleEnabled(tenantId: string, moduleSlug: string): Promise<boolean> {
    log.info({ tenantId, moduleSlug }, "isModuleEnabled");

    const result = await db
      .select({ isEnabled: tenantModules.isEnabled })
      .from(tenantModules)
      .innerJoin(modules, eq(tenantModules.moduleId, modules.id))
      .where(
        and(
          eq(tenantModules.tenantId, tenantId),
          eq(modules.slug, moduleSlug)
        )
      )
      .limit(1);

    return result[0]?.isEnabled ?? false;
  },

  async updateModuleConfig(
    tenantId: string,
    moduleSlug: string,
    config: Record<string, unknown>
  ): Promise<void> {
    log.info({ tenantId, moduleSlug }, "updateModuleConfig");

    const moduleResult = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.slug, moduleSlug))
      .limit(1);

    if (!moduleResult[0]) {
      throw new NotFoundError("Module", moduleSlug);
    }

    const moduleId = moduleResult[0].id;

    await db
      .update(tenantModules)
      .set({ config, updatedAt: new Date() })
      .where(
        and(
          eq(tenantModules.tenantId, tenantId),
          eq(tenantModules.moduleId, moduleId)
        )
      );
  },

  // ---- Venues ----

  async listVenues(tenantId: string): Promise<VenueRecord[]> {
    log.info({ tenantId }, "listVenues");

    const rows = await db
      .select()
      .from(venues)
      .where(eq(venues.tenantId, tenantId));

    return rows.map(mapVenue);
  },

  async createVenue(
    tenantId: string,
    input: Omit<VenueRecord, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<VenueRecord> {
    log.info({ tenantId, name: input.name }, "createVenue");

    const now = new Date();

    // Parse address into components if provided as a combined string
    const [row] = await db
      .insert(venues)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name: input.name,
        addressLine1: input.address ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        active: input.isActive,
        country: "GB",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapVenue(row!);
  },

  async updateVenue(
    tenantId: string,
    venueId: string,
    input: Partial<VenueRecord>
  ): Promise<VenueRecord> {
    log.info({ tenantId, venueId }, "updateVenue");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.address !== undefined) updateData.addressLine1 = input.address;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.isActive !== undefined) updateData.active = input.isActive;

    const [row] = await db
      .update(venues)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T
        ? Record<string, unknown>
        : never)
      .where(and(eq(venues.id, venueId), eq(venues.tenantId, tenantId)))
      .returning();

    if (!row) throw new NotFoundError("Venue", venueId);
    return mapVenue(row);
  },

  async deleteVenue(tenantId: string, venueId: string): Promise<void> {
    log.info({ tenantId, venueId }, "deleteVenue (soft)");

    await db
      .update(venues)
      .set({ active: false, updatedAt: new Date() })
      .where(and(eq(venues.id, venueId), eq(venues.tenantId, tenantId)));
  },

  // ---- Usage Counts ----

  async getUsageCounts(
    tenantId: string
  ): Promise<{ bookingCount: number; staffCount: number }> {
    log.info({ tenantId }, "getUsageCounts");

    const [bookingResult, staffResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(eq(bookings.tenantId, tenantId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(staffProfiles)
        .where(eq(staffProfiles.tenantId, tenantId)),
    ]);

    return {
      bookingCount: Number(bookingResult[0]?.count ?? 0),
      staffCount: Number(staffResult[0]?.count ?? 0),
    };
  },
};
