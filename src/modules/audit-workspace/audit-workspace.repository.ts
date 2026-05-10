import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  auditSessions,
  auditCallNotes,
  auditLensAnalysis,
  auditFindings,
  auditRecommendations,
} from "@/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  AuditSessionRecord,
  AuditCallNoteRecord,
  AuditLensAnalysisRecord,
  AuditFindingRecord,
  AuditRecommendationRecord,
  AuditLens,
} from "./audit-workspace.types";

const log = logger.child({ module: "audit-workspace.repository" });

export const auditWorkspaceRepository = {
  // ── Sessions ────────────────────────────────────────────────────────────

  async createSession(tenantId: string, engagementId: string): Promise<AuditSessionRecord> {
    const rows = await db
      .insert(auditSessions)
      .values({ tenantId, engagementId, updatedAt: new Date() })
      .returning();
    log.info({ engagementId }, "audit session created");
    return rows[0] as AuditSessionRecord;
  },

  async findSessionById(sessionId: string): Promise<AuditSessionRecord | null> {
    const rows = await db
      .select()
      .from(auditSessions)
      .where(eq(auditSessions.id, sessionId))
      .limit(1);
    return (rows[0] as AuditSessionRecord) ?? null;
  },

  async findSessionByEngagement(tenantId: string, engagementId: string): Promise<AuditSessionRecord | null> {
    const rows = await db
      .select()
      .from(auditSessions)
      .where(and(eq(auditSessions.tenantId, tenantId), eq(auditSessions.engagementId, engagementId)))
      .orderBy(desc(auditSessions.createdAt))
      .limit(1);
    return (rows[0] as AuditSessionRecord) ?? null;
  },

  async updateSessionStatus(sessionId: string, status: string): Promise<AuditSessionRecord> {
    const rows = await db
      .update(auditSessions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(auditSessions.id, sessionId))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditSession", sessionId);
    return rows[0] as AuditSessionRecord;
  },

  // ── Call Notes ──────────────────────────────────────────────────────────

  async upsertCallNotes(
    sessionId: string,
    contactUserId: string,
    rawNotes: string,
    callDate?: Date | null,
    callDuration?: number | null,
  ): Promise<AuditCallNoteRecord> {
    // Check if notes exist for this contact
    const existing = await db
      .select()
      .from(auditCallNotes)
      .where(and(eq(auditCallNotes.auditSessionId, sessionId), eq(auditCallNotes.contactUserId, contactUserId)))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db
        .update(auditCallNotes)
        .set({ rawNotes, callDate, callDuration, updatedAt: new Date() })
        .where(eq(auditCallNotes.id, existing[0].id))
        .returning();
      return rows[0] as AuditCallNoteRecord;
    }

    const rows = await db
      .insert(auditCallNotes)
      .values({ auditSessionId: sessionId, contactUserId, rawNotes, callDate, callDuration, updatedAt: new Date() })
      .returning();
    return rows[0] as AuditCallNoteRecord;
  },

  async listCallNotes(sessionId: string): Promise<AuditCallNoteRecord[]> {
    const rows = await db
      .select()
      .from(auditCallNotes)
      .where(eq(auditCallNotes.auditSessionId, sessionId));
    return rows as AuditCallNoteRecord[];
  },

  // ── Lens Analysis ──────────────────────────────────────────────────────

  async upsertLensAnalysis(
    sessionId: string,
    lens: AuditLens,
    data: { ragScore?: string | null; ragJustification?: string | null; currentState?: string | null },
  ): Promise<AuditLensAnalysisRecord> {
    const existing = await db
      .select()
      .from(auditLensAnalysis)
      .where(and(eq(auditLensAnalysis.auditSessionId, sessionId), eq(auditLensAnalysis.lens, lens as any)))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db
        .update(auditLensAnalysis)
        .set({ ...data, ragScore: data.ragScore as any, updatedAt: new Date() })
        .where(eq(auditLensAnalysis.id, existing[0].id))
        .returning();
      return rows[0] as AuditLensAnalysisRecord;
    }

    const lensOrder = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"];
    const rows = await db
      .insert(auditLensAnalysis)
      .values({
        auditSessionId: sessionId,
        lens: lens as any,
        ragScore: data.ragScore as any,
        ragJustification: data.ragJustification,
        currentState: data.currentState,
        sortOrder: lensOrder.indexOf(lens),
        updatedAt: new Date(),
      })
      .returning();
    return rows[0] as AuditLensAnalysisRecord;
  },

  async listLensAnalysis(sessionId: string): Promise<AuditLensAnalysisRecord[]> {
    const rows = await db
      .select()
      .from(auditLensAnalysis)
      .where(eq(auditLensAnalysis.auditSessionId, sessionId))
      .orderBy(auditLensAnalysis.sortOrder);
    return rows as AuditLensAnalysisRecord[];
  },

  // ── Findings ───────────────────────────────────────────────────────────

  async createFinding(data: {
    lensAnalysisId: string;
    finding: string;
    impact: string;
    evidence?: string | null;
    priority: number;
    estimatedAnnualWaste?: number | null;
  }): Promise<AuditFindingRecord> {
    const rows = await db
      .insert(auditFindings)
      .values({ ...data, impact: data.impact as any })
      .returning();
    return rows[0] as AuditFindingRecord;
  },

  async updateFinding(id: string, data: Partial<{
    finding: string;
    impact: string;
    evidence: string | null;
    priority: number;
    estimatedAnnualWaste: number | null;
  }>): Promise<AuditFindingRecord> {
    const rows = await db
      .update(auditFindings)
      .set({ ...data, impact: data.impact as any })
      .where(eq(auditFindings.id, id))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditFinding", id);
    return rows[0] as AuditFindingRecord;
  },

  async deleteFinding(id: string): Promise<void> {
    const rows = await db.delete(auditFindings).where(eq(auditFindings.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditFinding", id);
  },

  async listFindings(lensAnalysisId: string): Promise<AuditFindingRecord[]> {
    return db
      .select()
      .from(auditFindings)
      .where(eq(auditFindings.lensAnalysisId, lensAnalysisId))
      .orderBy(auditFindings.priority) as Promise<AuditFindingRecord[]>;
  },

  // ── Recommendations ────────────────────────────────────────────────────

  async createRecommendation(data: {
    lensAnalysisId: string;
    action: string;
    estimatedEffort?: string | null;
    estimatedCost?: number | null;
    priority: number;
  }): Promise<AuditRecommendationRecord> {
    const rows = await db.insert(auditRecommendations).values(data).returning();
    return rows[0] as AuditRecommendationRecord;
  },

  async updateRecommendation(id: string, data: Partial<{
    action: string;
    estimatedEffort: string | null;
    estimatedCost: number | null;
    priority: number;
  }>): Promise<AuditRecommendationRecord> {
    const rows = await db.update(auditRecommendations).set(data).where(eq(auditRecommendations.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditRecommendation", id);
    return rows[0] as AuditRecommendationRecord;
  },

  async deleteRecommendation(id: string): Promise<void> {
    const rows = await db.delete(auditRecommendations).where(eq(auditRecommendations.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditRecommendation", id);
  },

  async listRecommendations(lensAnalysisId: string): Promise<AuditRecommendationRecord[]> {
    return db
      .select()
      .from(auditRecommendations)
      .where(eq(auditRecommendations.lensAnalysisId, lensAnalysisId))
      .orderBy(auditRecommendations.priority) as Promise<AuditRecommendationRecord[]>;
  },
};
