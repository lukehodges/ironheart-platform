import { z } from "zod";
import { db } from "@/shared/db";
import {
  tenants,
  organizationSettings,
  modules,
  tenantModules,
  impersonationSessions,
  users,
} from "@/shared/db/schema";
import { inArray, eq } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { NotFoundError, ValidationError, ForbiddenError } from "@/shared/errors";
import type { Context } from "@/shared/trpc";
import { platformRepository } from "./platform.repository";
import { tenantRepository } from "@/modules/tenant/tenant.repository";
import { redis } from "@/shared/redis";
import type {
  TenantRecord,
  FeatureFlag,
  TenantFeature,
  TenantModule,
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
  setTenantModuleSchema,
  auditLogQuerySchema,
  approveSignupSchema,
  rejectSignupSchema,
} from "./platform.schemas";

const log = logger.child({ module: "platform.service" });

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
      // Platform layer modules are all isCore: true and don't need tenantModules rows.
      // Vertical modules will be re-enabled here once the platform layer is solid.
      const defaultSlugs: string[] = [];
      const moduleRows = defaultSlugs.length > 0
        ? await tx
            .select({ id: modules.id, slug: modules.slug })
            .from(modules)
            .where(inArray(modules.slug, defaultSlugs))
        : [];

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
  // Tenant flags (read per-tenant overrides)
  // ---------------------------------------------------------------------------

  async listTenantFlags(tenantId: string): Promise<TenantFeature[]> {
    log.info({ tenantId }, "listTenantFlags");
    return platformRepository.listTenantFlags(tenantId);
  },

  // ---------------------------------------------------------------------------
  // Tenant modules
  // ---------------------------------------------------------------------------

  async listTenantModules(tenantId: string): Promise<TenantModule[]> {
    log.info({ tenantId }, "listTenantModules");
    return platformRepository.listTenantModules(tenantId);
  },

  async setTenantModule(
    input: z.infer<typeof setTenantModuleSchema>
  ): Promise<TenantModule> {
    log.info({ tenantId: input.tenantId, moduleId: input.moduleId, isEnabled: input.isEnabled }, "setTenantModule");

    const result = await platformRepository.setTenantModule(
      input.tenantId,
      input.moduleId,
      input.isEnabled,
      input.monthlyRate
    );

    await platformRepository.insertAuditLog({
      tenantId: input.tenantId,
      userId: null,
      action: input.isEnabled ? "MODULE_ENABLED" : "MODULE_DISABLED",
      entityType: "tenantModule",
      entityId: result.id,
      oldValues: null,
      newValues: { moduleId: input.moduleId, isEnabled: input.isEnabled, monthlyRate: input.monthlyRate ?? null },
      severity: "INFO",
    });

    return result;
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

    // Load the signup request by ID
    const signupReq = await platformRepository.findSignupRequestById(input.id);
    if (!signupReq) {
      throw new NotFoundError("SignupRequest", input.id);
    }

    // Update status to APPROVED
    await platformRepository.updateSignupRequest(input.id, {
      status: "APPROVED",
    });

    // If signup request has a tenantId, activate that tenant
    if (signupReq.tenantId) {
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

  // ---------------------------------------------------------------------------
  // Impersonation
  // ---------------------------------------------------------------------------

  async startImpersonation(
    ctx: Context,
    tenantId: string
  ): Promise<{ sessionId: string; tenantId: string; tenantName: string }> {
    if (!ctx.session?.user) {
      throw new ForbiddenError("Platform admin session required");
    }

    const platformAdminId = ctx.session.user.id;
    const platformAdminEmail = ctx.session.user.email;

    log.info({ platformAdminId, tenantId }, "startImpersonation");

    // 1. Verify tenant exists and is active
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { id: true, name: true, status: true },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant", tenantId);
    }

    if (tenant.status === "SUSPENDED") {
      throw new ForbiddenError("Cannot impersonate suspended tenant");
    }

    // 2. Get platform admin user record
    const platformAdmin = await db.query.users.findFirst({
      where: eq(users.workosUserId, platformAdminId),
      columns: { id: true },
    });

    if (!platformAdmin) {
      throw new NotFoundError("Platform admin user", platformAdminId);
    }

    // 3. Get IP and User-Agent from request
    const ipAddress = ctx.req.headers.get("x-forwarded-for") ??
                      ctx.req.headers.get("x-real-ip") ??
                      null;
    const userAgent = ctx.req.headers.get("user-agent") ?? null;

    // 4. Create impersonation session in database
    const [session] = await db
      .insert(impersonationSessions)
      .values({
        id: crypto.randomUUID(),
        platformAdminId: platformAdmin.id,
        tenantId,
        targetTenantUserId: null,
        ipAddress,
        userAgent,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
      })
      .returning();

    if (!session) {
      throw new ValidationError("Failed to create impersonation session");
    }

    // 5. Store session in Redis with 24-hour TTL
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const redisKey = `impersonate:${platformAdminId}`;
    const sessionData = {
      sessionId: session.id,
      tenantId,
      platformAdminEmail,
      startedAt: Date.now(),
      expiresAt,
    };

    await redis.setex(redisKey, 86400, sessionData); // 24 hours in seconds

    // 6. Create audit log entry
    await platformRepository.insertAuditLog({
      tenantId,
      userId: platformAdmin.id,
      action: "IMPERSONATE_START",
      entityType: "tenant",
      entityId: tenantId,
      oldValues: null,
      newValues: {
        platformAdminId: platformAdmin.id,
        platformAdminEmail,
        sessionId: session.id,
      },
      ipAddress,
      userAgent,
      severity: "WARNING",
      metadata: {
        sessionId: session.id,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    });

    log.info(
      { sessionId: session.id, platformAdminId, tenantId },
      "Impersonation session started"
    );

    return {
      sessionId: session.id,
      tenantId,
      tenantName: tenant.name,
    };
  },

  async endImpersonation(ctx: Context): Promise<void> {
    if (!ctx.session?.user) {
      throw new ForbiddenError("Platform admin session required");
    }

    const platformAdminId = ctx.session.user.id;
    log.info({ platformAdminId }, "endImpersonation");

    // 1. Get session from Redis
    const redisKey = `impersonate:${platformAdminId}`;
    const cached = await redis.get(redisKey);

    if (!cached) {
      log.warn({ platformAdminId }, "No active impersonation session found");
      return;
    }

    // Upstash Redis auto-deserializes JSON
    const sessionData = cached as {
      sessionId: string;
      tenantId: string;
      platformAdminEmail: string;
    };

    // 2. Update impersonation_sessions.endedAt in database
    await db
      .update(impersonationSessions)
      .set({ endedAt: new Date() })
      .where(eq(impersonationSessions.id, sessionData.sessionId));

    // 3. Delete from Redis
    await redis.del(redisKey);

    // 4. Get platform admin user record for audit log
    const platformAdmin = await db.query.users.findFirst({
      where: eq(users.workosUserId, platformAdminId),
      columns: { id: true },
    });

    // 5. Create audit log entry
    if (platformAdmin) {
      await platformRepository.insertAuditLog({
        tenantId: sessionData.tenantId,
        userId: platformAdmin.id,
        action: "IMPERSONATE_END",
        entityType: "tenant",
        entityId: sessionData.tenantId,
        oldValues: null,
        newValues: {
          sessionId: sessionData.sessionId,
        },
        severity: "INFO",
        metadata: {
          sessionId: sessionData.sessionId,
        },
      });
    }

    log.info(
      { sessionId: sessionData.sessionId, platformAdminId, tenantId: sessionData.tenantId },
      "Impersonation session ended"
    );
  },

  async getActiveImpersonation(
    ctx: Context
  ): Promise<{ tenantId: string; tenantName: string; sessionId: string } | null> {
    if (!ctx.session?.user) {
      return null;
    }

    const platformAdminId = ctx.session.user.id;
    const redisKey = `impersonate:${platformAdminId}`;

    // Check Redis for active session
    const cached = await redis.get(redisKey);
    if (!cached) {
      return null;
    }

    // Upstash Redis auto-deserializes JSON, so cached is already an object
    const sessionData = cached as {
      sessionId: string;
      tenantId: string;
      expiresAt: number;
    };

    // Check if expired
    if (sessionData.expiresAt < Date.now()) {
      await redis.del(redisKey);
      return null;
    }

    // Get tenant name
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, sessionData.tenantId),
      columns: { name: true },
    });

    if (!tenant) {
      await redis.del(redisKey);
      return null;
    }

    return {
      tenantId: sessionData.tenantId,
      tenantName: tenant.name,
      sessionId: sessionData.sessionId,
    };
  },
};
