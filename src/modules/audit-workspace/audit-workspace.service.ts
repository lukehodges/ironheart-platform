import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
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
};
