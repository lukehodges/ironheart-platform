import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { engagements } from "@/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
};
