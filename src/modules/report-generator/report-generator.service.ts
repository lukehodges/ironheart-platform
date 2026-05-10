import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { reportGeneratorRepository } from "./report-generator.repository";
import { auditWorkspaceService } from "@/modules/audit-workspace/audit-workspace.service";
import type {
  AuditReportRecord,
  AuditReportStatus,
  ReportContentJson,
  ReportLensSection,
  ReportFinding,
  ReportRecommendation,
  ReportRoadmapPhase,
} from "./report-generator.types";
import type { z } from "zod";
import type {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
} from "./report-generator.schemas";

const log = logger.child({ module: "report-generator.service" });

const VALID_STATUS_TRANSITIONS: Record<string, AuditReportStatus[]> = {
  GENERATING: ["DRAFT"],
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "PUBLISHED"],
  // PUBLISHED is terminal
};

export const reportGeneratorService = {
  /**
   * Generate a report from audit session data.
   * Pulls all structured data from the audit workspace and assembles it
   * into a ReportContentJson structure. AI drafting is stubbed — this
   * produces the data structure that AI (or manual editing) fills in.
   */
  async generateReport(
    ctx: Context,
    input: z.infer<typeof generateReportSchema>
  ): Promise<AuditReportRecord> {
    // Validate audit session is ready
    const validation = await auditWorkspaceService.validateReadiness(input.auditSessionId);
    if (!validation.isReady) {
      throw new BadRequestError("Audit session is not ready for report generation");
    }

    // Pull full audit data
    const fullSession = await auditWorkspaceService.getFullSession(ctx, {
      auditSessionId: input.auditSessionId,
    });

    // Assemble report content from audit data
    const lenses: ReportLensSection[] = fullSession.lenses.map((lens) => ({
      lens: lens.lens,
      ragScore: lens.ragScore ?? "AMBER",
      ragJustification: lens.ragJustification ?? "",
      currentState: lens.currentState ?? "",
      findings: lens.findings.map((f) => ({
        finding: f.finding,
        impact: f.impact,
        evidence: f.evidence ?? "",
        priority: f.priority,
        estimatedAnnualWaste: f.estimatedAnnualWaste,
      })),
      recommendations: lens.recommendations.map((r) => ({
        action: r.action,
        estimatedEffort: r.estimatedEffort ?? "",
        estimatedCost: r.estimatedCost,
        priority: r.priority,
      })),
    }));

    // Calculate total estimated waste
    const totalEstimatedWaste = lenses.reduce(
      (sum, lens) =>
        sum + lens.findings.reduce((s, f) => s + (f.estimatedAnnualWaste ?? 0), 0),
      0
    );

    // Top 3 findings across all lenses, sorted by priority
    const allFindings = lenses.flatMap((l) => l.findings);
    const topFindings = [...allFindings]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);

    // Group recommendations into roadmap phases by priority
    const allRecs = lenses.flatMap((l) => l.recommendations);
    const sortedRecs = [...allRecs].sort((a, b) => a.priority - b.priority);
    const phases: ReportRoadmapPhase[] = [];

    // Phase 1: Quick Wins (priority 1-3), Phase 2: Core Fixes (4-6), Phase 3: Strategic (7+)
    const quickWins = sortedRecs.filter((r) => r.priority <= 3);
    const coreFixes = sortedRecs.filter((r) => r.priority > 3 && r.priority <= 6);
    const strategic = sortedRecs.filter((r) => r.priority > 6);

    if (quickWins.length > 0) {
      phases.push({
        phase: 1,
        name: "Quick Wins",
        description: "High-impact, low-effort changes that deliver immediate value",
        recommendations: quickWins,
        estimatedDuration: "1-2 weeks",
      });
    }
    if (coreFixes.length > 0) {
      phases.push({
        phase: 2,
        name: "Core Fixes",
        description: "Structural improvements to operations and systems",
        recommendations: coreFixes,
        estimatedDuration: "3-6 weeks",
      });
    }
    if (strategic.length > 0) {
      phases.push({
        phase: 3,
        name: "Strategic Changes",
        description: "Long-term optimisations and capability building",
        recommendations: strategic,
        estimatedDuration: "6-12 weeks",
      });
    }

    const contentJson: ReportContentJson = {
      title: "Operational Audit Report",
      clientName: "", // Filled by frontend or AI
      auditDate: new Date().toISOString().split("T")[0],
      executiveSummary: "", // AI fills this
      totalEstimatedWaste,
      topFindings,
      lenses,
      implementationRoadmap: phases,
    };

    // Create report record
    const report = await reportGeneratorRepository.create({
      tenantId: ctx.tenantId,
      engagementId: input.engagementId,
      auditSessionId: input.auditSessionId,
      status: "DRAFT",
      contentJson,
      totalEstimatedWaste,
      generatedBy: "system",
    });

    await inngest.send({
      name: "report-generator/report-created",
      data: {
        reportId: report.id,
        engagementId: input.engagementId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ reportId: report.id, engagementId: input.engagementId }, "report generated from audit data");
    return report;
  },

  async getReport(ctx: Context, input: z.infer<typeof getReportSchema>): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);
    return report;
  },

  async getReportByEngagement(
    ctx: Context,
    input: z.infer<typeof getReportByEngagementSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findByEngagement(ctx.tenantId, input.engagementId);
    if (!report) throw new NotFoundError("AuditReport for engagement", input.engagementId);
    return report;
  },

  async updateContent(
    ctx: Context,
    input: z.infer<typeof updateReportContentSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);

    if (report.status === "PUBLISHED") {
      throw new BadRequestError("Cannot edit a published report");
    }

    return reportGeneratorRepository.updateContent(input.reportId, {
      contentHtml: input.contentHtml,
      contentJson: input.contentJson as unknown as ReportContentJson,
      executiveSummary: input.executiveSummary,
    });
  },

  async transitionStatus(
    ctx: Context,
    input: z.infer<typeof transitionReportStatusSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);

    const allowed = VALID_STATUS_TRANSITIONS[report.status];
    if (!allowed || !allowed.includes(input.targetStatus)) {
      throw new BadRequestError(
        `Cannot transition report from ${report.status} to ${input.targetStatus}`
      );
    }

    const publishedAt = input.targetStatus === "PUBLISHED" ? new Date() : undefined;
    const updated = await reportGeneratorRepository.updateStatus(
      input.reportId,
      input.targetStatus,
      publishedAt
    );

    if (input.targetStatus === "PUBLISHED") {
      await inngest.send({
        name: "report-generator/report-published",
        data: {
          reportId: input.reportId,
          engagementId: report.engagementId,
          tenantId: ctx.tenantId,
        },
      });
      log.info({ reportId: input.reportId }, "report published");
    }

    return updated;
  },
};
