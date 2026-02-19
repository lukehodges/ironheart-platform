import { z } from "zod";
import { db } from "@/shared/db";
import {
  tenants,
  organizationSettings,
  modules,
  tenantModules,
} from "@/shared/db/schema";
import { inArray } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import { platformRepository } from "./platform.repository";
import { tenantRepository } from "@/modules/tenant/tenant.repository";
import type {
  TenantRecord,
  FeatureFlag,
  AuditLogRecord,
  SignupRequest,
} from "./platform.types";
import type {
  listTenantsSchema,
  createTenantSchema,
  updateTenantSchema,
  changePlanSchema,
  setFlagSchema,
  setTenantFlagSchema,
  auditLogQuerySchema,
  approveSignupSchema,
  rejectSignupSchema,
} from "./platform.schemas";

const log = logger.child({ module: "platform.service" });

// ---------------------------------------------------------------------------
// Helper — generate a URL-safe slug from a business name
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export const platformService = {

  // ---------------------------------------------------------------------------
  // Tenant management
  // ---------------------------------------------------------------------------

  async listTenants(
    input: z.infer<typeof listTenantsSchema>
  ): Promise<{ rows: TenantRecord[]; hasMore: boolean }> {
    log.info({ input }, "listTenants");
    return platformRepository.listTenants({
      search: input.search,
      plan: input.plan,
      status: input.status,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async getTenant(tenantId: string): Promise<TenantRecord> {
    log.info({ tenantId }, "getTenant");

    const tenant = await platformRepository.getTenant(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant", tenantId);
    }
    return tenant;
  },

  async provisionTenant(
    input: z.infer<typeof createTenantSchema>
  ): Promise<TenantRecord> {
    log.info({ businessName: input.businessName }, "provisionTenant");

    let createdTenant: TenantRecord | undefined;

    await db.transaction(async (tx) => {
      // 1. Create tenant row
      const now = new Date();
      const slug =
        input.slug ??
        input.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
          "-" +
          Math.random().toString(36).slice(2, 7);

      const [tenantRow] = await tx
        .insert(tenants)
        .values({
          id: crypto.randomUUID(),
          name: input.businessName,
          slug,
          billingEmail: input.email,
          plan: (input.plan as typeof tenants.$inferInsert["plan"]) ?? "STARTER",
          status: "ACTIVE",
          trialEndsAt:
            input.plan === "TRIAL"
              ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
              : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!tenantRow) {
        throw new ValidationError("Failed to create tenant");
      }

      // 2. Create organizationSettings row with defaults
      await tx.insert(organizationSettings).values({
        tenantId: tenantRow.id,
        businessName: input.businessName,
        email: input.email,
        timezone: "Europe/London",
        currency: "GBP",
        dateFormat: "dd/MM/yyyy",
        timeFormat: "HH:mm",
        weekStartsOn: 1,
        bookingWindowDays: 90,
        minNoticeHours: 24,
        bufferMinutes: 0,
        allowSameDayBook: false,
        slotDurationMins: 60,
        defaultSlotCapacity: 1,
        availabilityMode: "SLOT_BASED",
        capacityMode: "STAFF_LEVEL",
        createdAt: now,
        updatedAt: now,
      });

      // 3. Enable default modules — must query modules table by slug to get UUIDs
      // tenantModules uses moduleId (UUID FK → modules.id), NOT a text slug column
      const defaultSlugs = ["notification", "calendar-sync", "forms", "review"];
      const moduleRows = await tx
        .select({ id: modules.id, slug: modules.slug })
        .from(modules)
        .where(inArray(modules.slug, defaultSlugs));

      for (const mod of moduleRows) {
        await tx.insert(tenantModules).values({
          id: crypto.randomUUID(),
          tenantId: tenantRow.id,
          moduleId: mod.id,
          isEnabled: true,
          config: {},
          createdAt: now,
          updatedAt: now,
        });
      }

      // Map to TenantRecord
      createdTenant = {
        id: tenantRow.id,
        slug: tenantRow.slug,
        name: tenantRow.name,
        plan: tenantRow.plan as TenantRecord["plan"],
        status: tenantRow.status as TenantRecord["status"],
        trialEndsAt: tenantRow.trialEndsAt ?? null,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: tenantRow.createdAt,
        updatedAt: tenantRow.updatedAt,
      };
    });

    if (!createdTenant) {
      throw new ValidationError("Failed to provision tenant");
    }

    log.info(
      { tenantId: createdTenant.id, businessName: input.businessName },
      "Tenant provisioned"
    );
    return createdTenant;
  },

  async updateTenant(
    tenantId: string,
    input: z.infer<typeof updateTenantSchema>
  ): Promise<TenantRecord> {
    log.info({ tenantId }, "updateTenant");

    const updates: Partial<TenantRecord> = {};
    if (input.businessName !== undefined) updates.name = input.businessName;
    if (input.status !== undefined) updates.status = input.status;

    return platformRepository.updateTenant(tenantId, updates);
  },

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    log.info({ tenantId, reason }, "suspendTenant");

    await platformRepository.suspendTenant(tenantId, reason);

    // Insert audit log
    await platformRepository.insertAuditLog({
      tenantId,
      userId: null,
      action: "TENANT_SUSPENDED",
      entityType: "tenant",
      entityId: tenantId,
      oldValues: null,
      newValues: { reason },
      severity: "WARNING",
    });

    log.info({ tenantId, reason }, "Tenant suspended");
  },

  async activateTenant(tenantId: string): Promise<void> {
    log.info({ tenantId }, "activateTenant");

    await platformRepository.activateTenant(tenantId);

    await platformRepository.insertAuditLog({
      tenantId,
      userId: null,
      action: "TENANT_ACTIVATED",
      entityType: "tenant",
      entityId: tenantId,
      oldValues: null,
      newValues: { status: "ACTIVE" },
      severity: "INFO",
    });

    log.info({ tenantId }, "Tenant activated");
  },

  // ---------------------------------------------------------------------------
  // Plan management
  // ---------------------------------------------------------------------------

  async changePlan(input: z.infer<typeof changePlanSchema>): Promise<void> {
    log.info({ tenantId: input.tenantId, plan: input.plan }, "changePlan");

    await platformRepository.changePlan(input.tenantId, input.plan);

    await platformRepository.insertAuditLog({
      tenantId: input.tenantId,
      userId: null,
      action: "PLAN_CHANGED",
      entityType: "tenant",
      entityId: input.tenantId,
      oldValues: null,
      newValues: { plan: input.plan, reason: input.reason ?? null },
      severity: "INFO",
    });

    log.info(
      { tenantId: input.tenantId, plan: input.plan },
      "Tenant plan changed"
    );
  },

  // ---------------------------------------------------------------------------
  // Feature flags
  // ---------------------------------------------------------------------------

  async listFlags(): Promise<FeatureFlag[]> {
    log.info({}, "listFlags");
    return platformRepository.listFlags();
  },

  async setFlag(input: z.infer<typeof setFlagSchema>): Promise<FeatureFlag> {
    log.info({ flagSlug: input.flagSlug }, "setFlag");
    return platformRepository.upsertFlag(input.flagSlug, {
      defaultEnabled: input.defaultEnabled,
    });
  },

  async setTenantFlag(
    input: z.infer<typeof setTenantFlagSchema>
  ): Promise<void> {
    log.info(
      { tenantId: input.tenantId, flagSlug: input.flagSlug, isEnabled: input.isEnabled },
      "setTenantFlag"
    );
    await platformRepository.setTenantFlag(
      input.tenantId,
      input.flagSlug,
      input.isEnabled
    );
  },

  // ---------------------------------------------------------------------------
  // Signup requests
  // ---------------------------------------------------------------------------

  async listSignupRequests(opts?: { status?: string }): Promise<SignupRequest[]> {
    log.info({ opts }, "listSignupRequests");
    return platformRepository.listSignupRequests(opts);
  },

  async approveSignup(
    input: z.infer<typeof approveSignupSchema>
  ): Promise<void> {
    log.info({ id: input.id }, "approveSignup");

    // Load the signup request
    const requests = await platformRepository.listSignupRequests({ limit: 1 });
    const signupReq = requests.find((r) => r.id === input.id);

    // Update status to APPROVED
    await platformRepository.updateSignupRequest(input.id, {
      status: "APPROVED",
    });

    // If signup request has a tenantId, activate that tenant
    if (signupReq?.tenantId) {
      await platformRepository.activateTenant(signupReq.tenantId);
    }

    log.info({ id: input.id }, "Signup request approved");
  },

  async rejectSignup(
    input: z.infer<typeof rejectSignupSchema>
  ): Promise<void> {
    log.info({ id: input.id, reason: input.reason }, "rejectSignup");

    await platformRepository.updateSignupRequest(input.id, {
      status: "REJECTED",
    });

    log.info({ id: input.id }, "Signup request rejected");
  },

  // ---------------------------------------------------------------------------
  // Audit log
  // ---------------------------------------------------------------------------

  async getAuditLog(
    input: z.infer<typeof auditLogQuerySchema>
  ): Promise<{ rows: AuditLogRecord[]; hasMore: boolean }> {
    log.info({ input }, "getAuditLog");
    return platformRepository.queryAuditLog({
      tenantId: input.tenantId,
      action: input.action,
      entityType: input.entityType,
      severity: input.severity,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};
