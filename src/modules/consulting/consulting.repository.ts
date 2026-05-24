import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { engagements, customers } from "@/shared/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import type { EngagementStage, QualificationData } from "./consulting.types";

const log = logger.child({ module: "consulting.repository" });

export const consultingRepository = {
  async findEngagementById(tenantId: string, engagementId: string) {
    const rows = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async updateStage(tenantId: string, engagementId: string, stage: EngagementStage, closedReason?: string) {
    const rows = await db
      .update(engagements)
      .set({
        stage,
        closedReason: closedReason ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    log.info({ engagementId, stage }, "engagement stage updated");
    return rows[0];
  },

  async setAuditWindow(tenantId: string, engagementId: string, startDate: Date, endDate: Date) {
    const rows = await db
      .update(engagements)
      .set({
        auditWindowStart: startDate,
        auditWindowEnd: endDate,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    log.info({ engagementId, startDate, endDate }, "audit window set");
    return rows[0];
  },

  async setClientTenantId(tenantId: string, engagementId: string, clientTenantId: string) {
    const rows = await db
      .update(engagements)
      .set({ clientTenantId, updatedAt: new Date() })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async setExternalIds(tenantId: string, engagementId: string, ids: { planeProjectId?: string; driveFolderId?: string }) {
    const rows = await db
      .update(engagements)
      .set({ ...ids, updatedAt: new Date() })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async updateDiscoveryNotes(tenantId: string, engagementId: string, notes: string, qualificationData?: QualificationData) {
    const set: Record<string, unknown> = { discoveryNotes: notes, updatedAt: new Date() };
    if (qualificationData) set.qualificationData = qualificationData;
    const rows = await db
      .update(engagements)
      .set(set)
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async listByStage(tenantId: string, stage?: EngagementStage, limit = 50, cursor?: string) {
    const condition = stage
      ? and(eq(engagements.tenantId, tenantId), eq(engagements.stage, stage))
      : eq(engagements.tenantId, tenantId);
    const rows = await db
      .select()
      .from(engagements)
      .where(condition)
      .orderBy(desc(engagements.updatedAt))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { rows, hasMore };
  },

  async listAllAcrossTenants(stage?: EngagementStage, limit = 50) {
    const condition = stage ? eq(engagements.stage, stage) : undefined;
    const rows = await db
      .select()
      .from(engagements)
      .where(condition)
      .orderBy(desc(engagements.updatedAt))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { rows, hasMore };
  },

  /** Platform list — engagements on Ironheart's own tenant, with customer join.
   *  Used by /platform/clients to render the consultants-side clients list. */
  async listForPlatform(opts: {
    tenantId: string;
    stage?: EngagementStage;
    search?: string;
    limit?: number;
  }) {
    const { tenantId, stage, search, limit = 50 } = opts;

    const conditions = [eq(engagements.tenantId, tenantId)];
    if (stage) conditions.push(eq(engagements.stage, stage));
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(engagements.title, q),
          ilike(customers.firstName, q),
          ilike(customers.lastName, q),
          ilike(customers.notes, q), // notes holds companyName per tech-debt comment
        )!
      );
    }

    const rows = await db
      .select({
        engagement: engagements,
        customer: {
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          notes: customers.notes,
        },
      })
      .from(engagements)
      .innerJoin(customers, eq(engagements.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(engagements.updatedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { rows, hasMore };
  },

  /** Count engagements per stage for segment rail badges. */
  async countByStage(tenantId: string) {
    const rows = await db
      .select({ stage: engagements.stage })
      .from(engagements)
      .where(eq(engagements.tenantId, tenantId));
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.stage) counts[r.stage] = (counts[r.stage] ?? 0) + 1;
    }
    return counts;
  },
};
