import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  tenants,
  featureFlags,
  tenantFeatures,
  auditLogs,
  signupRequest,
} from "@/shared/db/schema";
import { eq, and, ilike, lte, sql } from "drizzle-orm";
import type {
  TenantRecord,
  TenantPlan,
  TenantStatus,
  FeatureFlag,
  TenantFeature,
  AuditLogRecord,
  SignupRequest,
  CreateTenantInput,
} from "./platform.types";

const log = logger.child({ module: "platform.repository" });

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapTenant(row: typeof tenants.$inferSelect): TenantRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    plan: row.plan as TenantPlan,
    status: row.status as TenantStatus,
    trialEndsAt: row.trialEndsAt ?? null,
    suspendedAt: null, // schema has no suspendedAt column; tracked via status
    suspendedReason: null, // schema has no suspendedReason column
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFeatureFlag(row: typeof featureFlags.$inferSelect): FeatureFlag {
  return {
    id: row.id,
    slug: row.key, // schema uses `key` column, interface uses `slug`
    name: row.name,
    description: row.description ?? null,
    defaultEnabled: row.defaultValue,
    createdAt: row.createdAt,
  };
}

function mapTenantFeature(
  row: typeof tenantFeatures.$inferSelect
): TenantFeature {
  return {
    id: `${row.tenantId}:${row.featureId}`, // composite PK — construct synthetic id
    tenantId: row.tenantId,
    flagId: row.featureId,
    isEnabled: row.enabled,
    createdAt: row.enabledAt,
    updatedAt: row.enabledAt, // schema has no separate updatedAt
  };
}

function mapAuditLog(row: typeof auditLogs.$inferSelect): AuditLogRecord {
  // Normalize severity: schema has DEBUG/INFO/WARNING/ERROR/CRITICAL
  // interface expects INFO | WARNING | CRITICAL
  let severity: AuditLogRecord["severity"] = "INFO";
  if (row.severity === "WARNING") severity = "WARNING";
  else if (row.severity === "CRITICAL") severity = "CRITICAL";

  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId ?? null,
    action: row.action,
    entityType: row.entityType ?? "",
    entityId: row.entityId ?? null,
    oldValues: (row.oldValues as Record<string, unknown> | null) ?? null,
    newValues: (row.newValues as Record<string, unknown> | null) ?? null,
    severity,
    createdAt: row.createdAt,
  };
}

function mapSignupRequest(
  row: typeof signupRequest.$inferSelect
): SignupRequest {
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    name: row.contactName,
    email: row.email,
    businessName: row.businessName,
    status: row.status as SignupRequest["status"],
    reason: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===============================================================
// PLATFORM REPOSITORY
// ===============================================================

export const platformRepository = {

  // ---- Tenants ----

  async listTenants(opts: {
    search?: string;
    plan?: TenantPlan;
    status?: TenantStatus;
    limit: number;
    cursor?: string;
  }): Promise<{ rows: TenantRecord[]; hasMore: boolean }> {
    log.info({ opts }, "listTenants");

    const conditions = [sql`1=1`];

    if (opts.search) {
      conditions.push(
        ilike(tenants.name, `%${opts.search}%`)
      );
    }
    if (opts.plan) {
      conditions.push(sql`${tenants.plan} = ${opts.plan}`);
    }
    if (opts.status) {
      conditions.push(sql`${tenants.status} = ${opts.status}`);
    }
    if (opts.cursor) {
      conditions.push(lte(tenants.createdAt, new Date(opts.cursor)));
    }

    const rows = await db
      .select()
      .from(tenants)
      .where(and(...conditions))
      .orderBy(tenants.createdAt)
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(mapTenant),
      hasMore,
    };
  },

  async getTenant(tenantId: string): Promise<TenantRecord | null> {
    log.info({ tenantId }, "getTenant");

    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return result[0] ? mapTenant(result[0]) : null;
  },

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    log.info({ businessName: input.businessName }, "createTenant");

    const now = new Date();
    const slug =
      input.slug ??
      input.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 7);

    const [row] = await db
      .insert(tenants)
      .values({
        id: crypto.randomUUID(),
        name: input.businessName,
        slug,
        billingEmail: input.email,
        plan: (input.plan as typeof tenants.$inferInsert["plan"]) ?? "STARTER",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapTenant(row!);
  },

  async updateTenant(
    tenantId: string,
    updates: Partial<TenantRecord>
  ): Promise<TenantRecord> {
    log.info({ tenantId }, "updateTenant");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.plan !== undefined) updateData.plan = updates.plan;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.trialEndsAt !== undefined) updateData.trialEndsAt = updates.trialEndsAt;

    const [row] = await db
      .update(tenants)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T
        ? Record<string, unknown>
        : never)
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!row) throw new NotFoundError("Tenant", tenantId);
    return mapTenant(row);
  },

  async changePlan(tenantId: string, plan: TenantPlan): Promise<void> {
    log.info({ tenantId, plan }, "changePlan");

    await db
      .update(tenants)
      .set({
        plan: plan as typeof tenants.$inferInsert["plan"],
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  },

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    log.info({ tenantId, reason }, "suspendTenant");

    // Schema has no suspendedAt / suspendedReason columns — store in metadata
    // We set status to SUSPENDED; reason is recorded in audit log by service
    await db
      .update(tenants)
      .set({
        status: "SUSPENDED",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  },

  async activateTenant(tenantId: string): Promise<void> {
    log.info({ tenantId }, "activateTenant");

    await db
      .update(tenants)
      .set({
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
  },

  // ---- Feature Flags ----

  async listFlags(): Promise<FeatureFlag[]> {
    log.info({}, "listFlags");

    const rows = await db.select().from(featureFlags);
    return rows.map(mapFeatureFlag);
  },

  async getFlag(slug: string): Promise<FeatureFlag | null> {
    log.info({ slug }, "getFlag");

    const result = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, slug))
      .limit(1);

    return result[0] ? mapFeatureFlag(result[0]) : null;
  },

  async upsertFlag(
    slug: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag> {
    log.info({ slug }, "upsertFlag");

    const now = new Date();

    const existing = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, slug))
      .limit(1);

    if (existing[0]) {
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.defaultEnabled !== undefined) updateData.defaultValue = updates.defaultEnabled;

      const [row] = await db
        .update(featureFlags)
        .set(updateData as Parameters<typeof db.update>[0] extends infer T
          ? Record<string, unknown>
          : never)
        .where(eq(featureFlags.key, slug))
        .returning();

      return mapFeatureFlag(row!);
    }

    const [row] = await db
      .insert(featureFlags)
      .values({
        id: crypto.randomUUID(),
        key: slug,
        name: updates.name ?? slug,
        description: updates.description ?? null,
        defaultValue: updates.defaultEnabled ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return mapFeatureFlag(row!);
  },

  async setTenantFlag(
    tenantId: string,
    flagSlug: string,
    isEnabled: boolean
  ): Promise<void> {
    log.info({ tenantId, flagSlug, isEnabled }, "setTenantFlag");

    // Look up featureFlags.id by key (slug)
    const flagResult = await db
      .select({ id: featureFlags.id })
      .from(featureFlags)
      .where(eq(featureFlags.key, flagSlug))
      .limit(1);

    if (!flagResult[0]) {
      throw new NotFoundError("FeatureFlag", flagSlug);
    }

    const featureId = flagResult[0].id;
    const now = new Date();

    // Check if row exists
    const existing = await db
      .select({ tenantId: tenantFeatures.tenantId })
      .from(tenantFeatures)
      .where(
        and(
          eq(tenantFeatures.tenantId, tenantId),
          eq(tenantFeatures.featureId, featureId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(tenantFeatures)
        .set({ enabled: isEnabled })
        .where(
          and(
            eq(tenantFeatures.tenantId, tenantId),
            eq(tenantFeatures.featureId, featureId)
          )
        );
    } else {
      await db.insert(tenantFeatures).values({
        tenantId,
        featureId,
        enabled: isEnabled,
        enabledAt: now,
      });
    }
  },

  async listTenantFlags(tenantId: string): Promise<TenantFeature[]> {
    log.info({ tenantId }, "listTenantFlags");

    const rows = await db
      .select()
      .from(tenantFeatures)
      .where(eq(tenantFeatures.tenantId, tenantId));

    return rows.map(mapTenantFeature);
  },

  // ---- Audit Log ----

  async insertAuditLog(
    input: Omit<AuditLogRecord, "id" | "createdAt">
  ): Promise<void> {
    log.info(
      { tenantId: input.tenantId, action: input.action },
      "insertAuditLog"
    );

    // Map interface severity to schema severity enum
    // Interface: INFO | WARNING | CRITICAL; Schema: DEBUG | INFO | WARNING | ERROR | CRITICAL
    const severityMap: Record<
      AuditLogRecord["severity"],
      typeof auditLogs.$inferInsert["severity"]
    > = {
      INFO: "INFO",
      WARNING: "WARNING",
      CRITICAL: "CRITICAL",
    };

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      severity: severityMap[input.severity] ?? "INFO",
      createdAt: new Date(),
    });
  },

  async queryAuditLog(opts: {
    tenantId?: string;
    action?: string;
    entityType?: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    limit: number;
    cursor?: string;
  }): Promise<{ rows: AuditLogRecord[]; hasMore: boolean }> {
    log.info({ opts }, "queryAuditLog");

    const conditions = [sql`1=1`];

    if (opts.tenantId) conditions.push(eq(auditLogs.tenantId, opts.tenantId));
    if (opts.action) conditions.push(eq(auditLogs.action, opts.action));
    if (opts.entityType) conditions.push(eq(auditLogs.entityType, opts.entityType));
    if (opts.severity) {
      conditions.push(sql`${auditLogs.severity} = ${opts.severity}`);
    }
    if (opts.cursor) {
      conditions.push(lte(auditLogs.createdAt, new Date(opts.cursor)));
    }

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(auditLogs.createdAt)
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(mapAuditLog),
      hasMore,
    };
  },

  // ---- Signup Requests ----

  async listSignupRequests(opts?: {
    status?: string;
    limit?: number;
  }): Promise<SignupRequest[]> {
    log.info({ opts }, "listSignupRequests");

    const limit = opts?.limit ?? 50;
    const conditions = [sql`1=1`];

    if (opts?.status) {
      conditions.push(eq(signupRequest.status, opts.status));
    }

    const rows = await db
      .select()
      .from(signupRequest)
      .where(and(...conditions))
      .orderBy(signupRequest.createdAt)
      .limit(limit);

    return rows.map(mapSignupRequest);
  },

  async updateSignupRequest(
    id: string,
    updates: Partial<SignupRequest>
  ): Promise<void> {
    log.info({ id }, "updateSignupRequest");

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tenantId !== undefined) updateData.tenantId = updates.tenantId;
    if (updates.name !== undefined) updateData.contactName = updates.name;

    await db
      .update(signupRequest)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T
        ? Record<string, unknown>
        : never)
      .where(eq(signupRequest.id, id));
  },
};
