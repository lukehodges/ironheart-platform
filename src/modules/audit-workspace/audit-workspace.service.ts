import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schemas/client-portal.schema";
import { eq } from "drizzle-orm";
import { auditWorkspaceRepository } from "./audit-workspace.repository";
import { ALL_LENSES, type AuditLens, type AuditValidationResult, type AuditSessionWithLenses } from "./audit-workspace.types";
import type { z } from "zod";
import type {
  createAuditSessionSchema,
  updateCallNotesSchema,
  upsertLensAnalysisSchema,
  createFindingSchema,
  updateFindingSchema,
  createRecommendationSchema,
  updateRecommendationSchema,
  getAuditSessionSchema,
  getByEngagementSchema,
  getOrCreateSessionSchema,
  upsertCallNoteByEngagementSchema,
  upsertLensAnalysisByEngagementSchema,
  reorderFindingsSchema,
  reorderRecommendationsSchema,
} from "./audit-workspace.schemas";

const log = logger.child({ module: "audit-workspace.service" });

export const auditWorkspaceService = {
  async createSession(ctx: Context, input: z.infer<typeof createAuditSessionSchema>) {
    // Check no active session exists
    const existing = await auditWorkspaceRepository.findSessionByEngagement(ctx.tenantId, input.engagementId);
    if (existing && existing.status !== "COMPLETE") {
      throw new BadRequestError("An active audit session already exists for this engagement");
    }

    const session = await auditWorkspaceRepository.createSession(ctx.tenantId, input.engagementId);

    await inngest.send({
      name: "audit-workspace/session-created",
      data: { auditSessionId: session.id, engagementId: input.engagementId, tenantId: ctx.tenantId },
    });

    log.info({ engagementId: input.engagementId, sessionId: session.id }, "audit session created");
    return session;
  },

  async getSession(ctx: Context, input: z.infer<typeof getAuditSessionSchema>) {
    const session = await auditWorkspaceRepository.findSessionById(input.auditSessionId);
    if (!session) throw new NotFoundError("AuditSession", input.auditSessionId);
    return session;
  },

  async getSessionByEngagement(ctx: Context, input: z.infer<typeof getByEngagementSchema>) {
    const session = await auditWorkspaceRepository.findSessionByEngagement(ctx.tenantId, input.engagementId);
    if (!session) throw new NotFoundError("AuditSession for engagement", input.engagementId);
    return session;
  },

  async getFullSession(ctx: Context, input: z.infer<typeof getAuditSessionSchema>): Promise<AuditSessionWithLenses> {
    const session = await auditWorkspaceRepository.findSessionById(input.auditSessionId);
    if (!session) throw new NotFoundError("AuditSession", input.auditSessionId);

    const callNotes = await auditWorkspaceRepository.listCallNotes(input.auditSessionId);
    const lensRows = await auditWorkspaceRepository.listLensAnalysis(input.auditSessionId);

    const lenses = await Promise.all(
      lensRows.map(async (lens) => ({
        ...lens,
        findings: await auditWorkspaceRepository.listFindings(lens.id),
        recommendations: await auditWorkspaceRepository.listRecommendations(lens.id),
      }))
    );

    return { ...session, lenses, callNotes };
  },

  async updateCallNotes(ctx: Context, input: z.infer<typeof updateCallNotesSchema>) {
    return auditWorkspaceRepository.upsertCallNotes(
      input.auditSessionId,
      input.contactUserId,
      input.rawNotes,
      input.callDate,
      input.callDuration,
    );
  },

  async upsertLensAnalysis(ctx: Context, input: z.infer<typeof upsertLensAnalysisSchema>) {
    return auditWorkspaceRepository.upsertLensAnalysis(
      input.auditSessionId,
      input.lens,
      {
        ragScore: input.ragScore,
        ragJustification: input.ragJustification,
        currentState: input.currentState,
      },
    );
  },

  // ── Findings CRUD ──────────────────────────────────────────────────────

  async createFinding(ctx: Context, input: z.infer<typeof createFindingSchema>) {
    return auditWorkspaceRepository.createFinding(input);
  },

  async updateFinding(ctx: Context, input: z.infer<typeof updateFindingSchema>) {
    const { id, ...data } = input;
    return auditWorkspaceRepository.updateFinding(id, data);
  },

  async deleteFinding(ctx: Context, id: string) {
    return auditWorkspaceRepository.deleteFinding(id);
  },

  // ── Recommendations CRUD ───────────────────────────────────────────────

  async createRecommendation(ctx: Context, input: z.infer<typeof createRecommendationSchema>) {
    return auditWorkspaceRepository.createRecommendation(input);
  },

  async updateRecommendation(ctx: Context, input: z.infer<typeof updateRecommendationSchema>) {
    const { id, ...data } = input;
    return auditWorkspaceRepository.updateRecommendation(id, data);
  },

  async deleteRecommendation(ctx: Context, id: string) {
    return auditWorkspaceRepository.deleteRecommendation(id);
  },

  // ── Validation ─────────────────────────────────────────────────────────

  async validateReadiness(sessionId: string): Promise<AuditValidationResult> {
    const lenses = await auditWorkspaceRepository.listLensAnalysis(sessionId);
    const coveredLenses = lenses.map((l) => l.lens as AuditLens);

    const missingLenses = ALL_LENSES.filter((l) => !coveredLenses.includes(l));
    const lensesWithoutRag = lenses.filter((l) => !l.ragScore).map((l) => l.lens as AuditLens);

    const lensesWithoutFindings: AuditLens[] = [];
    for (const lens of lenses) {
      const findings = await auditWorkspaceRepository.listFindings(lens.id);
      if (findings.length === 0) {
        lensesWithoutFindings.push(lens.lens as AuditLens);
      }
    }

    const isReady = missingLenses.length === 0 && lensesWithoutRag.length === 0 && lensesWithoutFindings.length === 0;

    return { isReady, missingLenses, lensesWithoutFindings, lensesWithoutRag };
  },

  async markReadyForReport(ctx: Context, sessionId: string) {
    const validation = await this.validateReadiness(sessionId);
    if (!validation.isReady) {
      throw new BadRequestError(
        `Audit not ready: missing lenses: ${validation.missingLenses.join(", ") || "none"}, ` +
        `no RAG: ${validation.lensesWithoutRag.join(", ") || "none"}, ` +
        `no findings: ${validation.lensesWithoutFindings.join(", ") || "none"}`
      );
    }

    const session = await auditWorkspaceRepository.updateSessionStatus(sessionId, "READY_FOR_REPORT");

    await inngest.send({
      name: "audit-workspace/ready-for-report",
      data: { auditSessionId: sessionId, tenantId: ctx.tenantId },
    });

    log.info({ sessionId }, "audit session marked ready for report");
    return session;
  },

  // ── Consultant-facing helpers (platformAdminProcedure) ─────────────────

  /**
   * Resolve the clientTenantId for an engagement. Throws NotFoundError if
   * the engagement doesn't exist or hasn't been provisioned yet.
   */
  async _resolveEngagementTenantId(engagementId: string): Promise<string> {
    const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) });
    if (!eng) throw new NotFoundError("Engagement", engagementId);
    if (!eng.clientTenantId) throw new NotFoundError("Engagement.clientTenantId", engagementId);
    return eng.clientTenantId;
  },

  /**
   * Idempotent: returns the existing active session or creates one.
   * Also auto-advances the engagement to AUDITING stage if it is currently ONBOARDING.
   * Returns the full session with lenses, findings, recommendations, and call notes.
   */
  async getOrCreateSession(engagementId: string): Promise<AuditSessionWithLenses> {
    const tenantId = await this._resolveEngagementTenantId(engagementId);

    let session = await auditWorkspaceRepository.findSessionByEngagement(tenantId, engagementId);

    if (!session) {
      session = await auditWorkspaceRepository.createSession(tenantId, engagementId);

      // Auto-advance engagement stage ONBOARDING → AUDITING
      const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) });
      if (eng && eng.stage === "ONBOARDING") {
        await db
          .update(engagements)
          .set({ stage: "AUDITING", updatedAt: new Date() })
          .where(eq(engagements.id, engagementId));
        log.info({ engagementId }, "engagement auto-advanced to AUDITING");
      }

      await inngest.send({
        name: "audit-workspace/session-created",
        data: { auditSessionId: session.id, engagementId, tenantId },
      });

      log.info({ engagementId, sessionId: session.id }, "audit session created via getOrCreate");
    }

    const callNotes = await auditWorkspaceRepository.listCallNotes(session.id);
    const lensRows = await auditWorkspaceRepository.listLensAnalysis(session.id);

    const lenses = await Promise.all(
      lensRows.map(async (lens) => ({
        ...lens,
        findings: await auditWorkspaceRepository.listFindings(lens.id),
        recommendations: await auditWorkspaceRepository.listRecommendations(lens.id),
      }))
    );

    return { ...session, lenses, callNotes };
  },

  /**
   * Upsert call note by engagementId (convenience wrapper for consultant UI).
   */
  async upsertCallNoteByEngagement(input: z.infer<typeof upsertCallNoteByEngagementSchema>) {
    const tenantId = await this._resolveEngagementTenantId(input.engagementId);
    const session = await auditWorkspaceRepository.findSessionByEngagement(tenantId, input.engagementId);
    if (!session) throw new NotFoundError("AuditSession for engagement", input.engagementId);
    return auditWorkspaceRepository.upsertCallNotes(
      session.id,
      input.contactUserId,
      input.rawNotes,
      input.callDate,
      input.callDuration,
    );
  },

  /**
   * Upsert lens analysis by engagementId (convenience wrapper for consultant UI).
   */
  async upsertLensAnalysisByEngagement(input: z.infer<typeof upsertLensAnalysisByEngagementSchema>) {
    const tenantId = await this._resolveEngagementTenantId(input.engagementId);
    const session = await auditWorkspaceRepository.findSessionByEngagement(tenantId, input.engagementId);
    if (!session) throw new NotFoundError("AuditSession for engagement", input.engagementId);
    return auditWorkspaceRepository.upsertLensAnalysis(
      session.id,
      input.lens,
      {
        ragScore: input.ragScore,
        ragJustification: input.ragJustification,
        currentState: input.currentState,
      },
    );
  },

  async reorderFindings(input: z.infer<typeof reorderFindingsSchema>) {
    return auditWorkspaceRepository.reorderFindings(input.lensAnalysisId, input.order);
  },

  async reorderRecommendations(input: z.infer<typeof reorderRecommendationsSchema>) {
    return auditWorkspaceRepository.reorderRecommendations(input.lensAnalysisId, input.order);
  },

  /**
   * Validate session by engagementId — looks up session then delegates to validateReadiness.
   */
  async validateByEngagement(engagementId: string): Promise<AuditValidationResult> {
    const tenantId = await this._resolveEngagementTenantId(engagementId);
    const session = await auditWorkspaceRepository.findSessionByEngagement(tenantId, engagementId);
    if (!session) {
      return {
        isReady: false,
        missingLenses: [...ALL_LENSES],
        lensesWithoutFindings: [...ALL_LENSES],
        lensesWithoutRag: [...ALL_LENSES],
      };
    }
    return this.validateReadiness(session.id);
  },

  /**
   * Mark session READY_FOR_REPORT by engagementId — consultant UI convenience.
   */
  async markReadyByEngagement(engagementId: string) {
    const tenantId = await this._resolveEngagementTenantId(engagementId);
    const session = await auditWorkspaceRepository.findSessionByEngagement(tenantId, engagementId);
    if (!session) throw new NotFoundError("AuditSession for engagement", engagementId);
    const validation = await this.validateReadiness(session.id);
    if (!validation.isReady) {
      throw new BadRequestError(
        `Audit not ready: missing lenses: ${validation.missingLenses.join(", ") || "none"}, ` +
        `no RAG: ${validation.lensesWithoutRag.join(", ") || "none"}, ` +
        `no findings: ${validation.lensesWithoutFindings.join(", ") || "none"}`
      );
    }
    const updated = await auditWorkspaceRepository.updateSessionStatus(session.id, "READY_FOR_REPORT");
    await inngest.send({
      name: "audit-workspace/ready-for-report",
      data: { auditSessionId: session.id, tenantId },
    });
    log.info({ sessionId: session.id, engagementId }, "audit session marked ready for report");
    return updated;
  },
};
