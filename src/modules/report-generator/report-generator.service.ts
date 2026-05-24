import Anthropic from "@anthropic-ai/sdk";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schemas/client-portal.schema";
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
import { ReportPdfDocument } from "./report-pdf-template";
import type { z } from "zod";
import type {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
  triggerGenerateSchema,
  clientGetPublishedReportSchema,
} from "./report-generator.schemas";

const log = logger.child({ module: "report-generator.service" });

// ---------------------------------------------------------------------------
// Anthropic client — singleton, lazy
// ---------------------------------------------------------------------------
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert operations consultant at Ironheart, writing a professional audit report for a small business owner.

Your task: produce a concise, actionable written report based on structured audit data provided by the consultant.

Guidelines:
- Write in clear, plain English — no jargon, no waffle.
- Be direct and specific. SME owners want to know what's wrong and what to do about it.
- Executive summary: 3-5 sentences covering the overall picture, top risks, and the opportunity.
- For each lens section: write 2-3 sentences of narrative that expands on the current state, findings, and recommendations. Don't just repeat the data — add consultant insight.
- Tone: professional but human. Imagine you're presenting this to the owner in person.
- Do NOT invent findings or recommendations not present in the audit data.
- Format your response as structured markdown with these exact section headers:

## Executive Summary
[3-5 sentences]

## Lens Narratives
### [LENS_NAME]
[2-3 sentences per lens, in order they appear in the data]

That is all. Do not add any other sections, preambles, or sign-offs.`;

function buildAuditDataMessage(session: {
  id: string;
  engagementId: string;
  lenses: Array<{
    lens: string;
    ragScore: string | null;
    ragJustification: string | null;
    currentState: string | null;
    findings: Array<{
      finding: string;
      impact: string;
      evidence: string | null;
      priority: number;
      estimatedAnnualWaste: number | null;
    }>;
    recommendations: Array<{
      action: string;
      estimatedEffort: string | null;
      estimatedCost: number | null;
      priority: number;
    }>;
  }>;
  callNotes: Array<{ rawNotes: string; contactUserId?: string }>;
}): string {
  const lines: string[] = [
    `Audit Session ID: ${session.id}`,
    `Engagement ID: ${session.engagementId}`,
    "",
  ];

  if (session.callNotes.length > 0) {
    lines.push("## Call Notes");
    session.callNotes.forEach((n) => lines.push(`- ${n.rawNotes}`));
    lines.push("");
  }

  lines.push("## Lens Analysis");
  session.lenses.forEach((lens) => {
    lines.push(`### ${lens.lens}`);
    lines.push(`RAG: ${lens.ragScore ?? "N/A"} — ${lens.ragJustification ?? ""}`);
    lines.push(`Current State: ${lens.currentState ?? ""}`);

    if (lens.findings.length > 0) {
      lines.push("Findings:");
      lens.findings.forEach((f) => {
        const waste = f.estimatedAnnualWaste != null ? ` (£${f.estimatedAnnualWaste}/yr)` : "";
        lines.push(`  [P${f.priority}] ${f.finding} — ${f.impact} impact${waste}. Evidence: ${f.evidence ?? "N/A"}`);
      });
    }

    if (lens.recommendations.length > 0) {
      lines.push("Recommendations:");
      lens.recommendations.forEach((r) => {
        const cost = r.estimatedCost != null ? `, £${r.estimatedCost}` : "";
        lines.push(`  [P${r.priority}] ${r.action} — effort: ${r.estimatedEffort ?? "N/A"}${cost}`);
      });
    }

    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Very basic markdown→HTML converter for the sections we produce.
 * Handles: h2, h3, paragraphs. No external dependency.
 */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const htmlLines: string[] = [];
  let inParagraph = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      if (inParagraph) { htmlLines.push("</p>"); inParagraph = false; }
      htmlLines.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inParagraph) { htmlLines.push("</p>"); inParagraph = false; }
      htmlLines.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.trim() === "") {
      if (inParagraph) { htmlLines.push("</p>"); inParagraph = false; }
    } else {
      if (!inParagraph) { htmlLines.push("<p>"); inParagraph = true; }
      htmlLines.push(escapeHtml(line));
    }
  }
  if (inParagraph) htmlLines.push("</p>");
  return htmlLines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Parse the model's markdown response into executive summary + per-lens narratives.
 * Returns { executiveSummary, lensNarratives: Record<lens, string> }
 */
function parseReportSections(markdown: string): {
  executiveSummary: string;
  lensNarratives: Record<string, string>;
} {
  const execMatch = markdown.match(/## Executive Summary\s*([\s\S]*?)(?=## Lens Narratives|$)/i);
  const executiveSummary = execMatch ? execMatch[1].trim() : "";

  const lensNarratives: Record<string, string> = {};
  const lensSection = markdown.match(/## Lens Narratives\s*([\s\S]*?)$/i);
  if (lensSection) {
    const lensBlocks = lensSection[1].matchAll(/### ([A-Z_]+)\s*([\s\S]*?)(?=### [A-Z_]+|$)/gi);
    for (const block of lensBlocks) {
      lensNarratives[block[1].toUpperCase()] = block[2].trim();
    }
  }

  return { executiveSummary, lensNarratives };
}

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
  ): Promise<AuditReportRecord | null> {
    // Reports are owned by the engagement's tenant (set at insert), not the
    // caller's ctx.tenantId — platform admin's ctx.tenantId may be a different
    // tenant than the report's. Resolve via engagement, then look up.
    const eng = await db.query.engagements.findFirst({
      where: eq(engagements.id, input.engagementId),
      columns: { tenantId: true },
    });
    if (!eng) return null;
    const report = await reportGeneratorRepository.findByEngagement(eng.tenantId, input.engagementId);
    return report ?? null; // UI uses null to render the empty state
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

  /**
   * Emit the report/generate Inngest event, triggering async AI draft generation.
   * Returns immediately — the caller should poll getReportByEngagement for status.
   */
  async triggerGenerate(
    ctx: Context,
    input: z.infer<typeof triggerGenerateSchema>
  ): Promise<{ queued: true; engagementId: string }> {
    // Resolve tenantId from engagement, not ctx — platform admin's ctx.tenantId
    // may be a different tenant than the engagement's home tenant.
    const eng = await db.query.engagements.findFirst({
      where: eq(engagements.id, input.engagementId),
      columns: { tenantId: true },
    });
    if (!eng) throw new NotFoundError("Engagement", input.engagementId);
    await inngest.send({
      name: "report/generate",
      data: {
        engagementId: input.engagementId,
        tenantId: eng.tenantId,
        generatedBy: "ai",
      },
    });
    log.info({ engagementId: input.engagementId }, "report/generate event emitted");
    return { queued: true, engagementId: input.engagementId };
  },

  /**
   * AI-powered report draft generation.
   * Called by the Inngest handler — NOT directly from the router.
   *
   * Flow:
   *   1. Validate audit session readiness
   *   2. Insert report row with status GENERATING
   *   3. Call Claude claude-opus-4-7 with cached system prompt + audit data
   *   4. Parse response → executive summary + per-lens narratives
   *   5. Merge narratives into contentJson
   *   6. Update row to DRAFT with contentHtml + contentJson
   */
  async generateDraft({
    engagementId,
    tenantId,
    generatedBy,
  }: {
    engagementId: string;
    tenantId: string;
    generatedBy: "ai" | "manual";
  }): Promise<AuditReportRecord> {
    // 1. Validate
    const validation = await auditWorkspaceService.validateByEngagement(engagementId);
    if (!validation.isReady) {
      const missing = [
        ...validation.missingLenses.map((l) => `missing:${l}`),
        ...validation.lensesWithoutRag.map((l) => `no-rag:${l}`),
        ...validation.lensesWithoutFindings.map((l) => `no-findings:${l}`),
      ].join(", ");
      throw new BadRequestError(`Audit session not ready for report generation. Issues: ${missing}`);
    }

    // 2. Get full session (getOrCreateSession already returns lenses + callNotes)
    const fullSession = await auditWorkspaceService.getOrCreateSession(engagementId);
    if (!fullSession) {
      throw new BadRequestError(`No audit session found for engagement ${engagementId}`);
    }

    // 3. Assemble structured contentJson (same logic as generateReport)
    const lenses: ReportLensSection[] = fullSession.lenses.map((lens) => ({
      lens: lens.lens,
      ragScore: lens.ragScore ?? "AMBER",
      ragJustification: lens.ragJustification ?? "",
      currentState: lens.currentState ?? "",
      narrative: "", // filled below after Claude call
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

    const totalEstimatedWaste = lenses.reduce(
      (sum, lens) =>
        sum + lens.findings.reduce((s, f) => s + (f.estimatedAnnualWaste ?? 0), 0),
      0
    );

    const allFindings = lenses.flatMap((l) => l.findings);
    const topFindings = [...allFindings].sort((a, b) => a.priority - b.priority).slice(0, 3);

    const allRecs = lenses.flatMap((l) => l.recommendations);
    const sortedRecs = [...allRecs].sort((a, b) => a.priority - b.priority);
    const phases: ReportRoadmapPhase[] = [];
    const quickWins = sortedRecs.filter((r) => r.priority <= 3);
    const coreFixes = sortedRecs.filter((r) => r.priority > 3 && r.priority <= 6);
    const strategic = sortedRecs.filter((r) => r.priority > 6);
    if (quickWins.length > 0) phases.push({ phase: 1, name: "Quick Wins", description: "High-impact, low-effort changes that deliver immediate value", recommendations: quickWins, estimatedDuration: "1-2 weeks" });
    if (coreFixes.length > 0) phases.push({ phase: 2, name: "Core Fixes", description: "Structural improvements to operations and systems", recommendations: coreFixes, estimatedDuration: "3-6 weeks" });
    if (strategic.length > 0) phases.push({ phase: 3, name: "Strategic Changes", description: "Long-term optimisations and capability building", recommendations: strategic, estimatedDuration: "6-12 weeks" });

    const contentJson: ReportContentJson = {
      title: "Operational Audit Report",
      clientName: "",
      auditDate: new Date().toISOString().split("T")[0],
      executiveSummary: "",
      totalEstimatedWaste,
      topFindings,
      lenses,
      implementationRoadmap: phases,
    };

    // 4. Insert row with GENERATING status
    const report = await reportGeneratorRepository.create({
      tenantId,
      engagementId,
      auditSessionId: fullSession.id,
      status: "GENERATING",
      contentJson,
      totalEstimatedWaste,
      generatedBy,
    });

    log.info({ reportId: report.id, engagementId }, "report row created with GENERATING status, calling Claude");

    try {
      // 5. Call Claude with cached system prompt
      const anthropic = getAnthropic();
      const auditMessage = buildAuditDataMessage(fullSession);

      const response = await anthropic.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Please write the audit report narrative for the following audit data:\n\n${auditMessage}`,
          },
        ],
      });

      log.info(
        {
          reportId: report.id,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheCreation: (response.usage as any).cache_creation_input_tokens ?? 0,
          cacheRead: (response.usage as any).cache_read_input_tokens ?? 0,
        },
        "Claude response received"
      );

      const rawText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // 6. Parse sections and merge narratives into contentJson
      const { executiveSummary, lensNarratives } = parseReportSections(rawText);

      const enrichedLenses = lenses.map((lens) => ({
        ...lens,
        narrative: lensNarratives[lens.lens] ?? "",
      }));

      const enrichedContentJson: ReportContentJson = {
        ...contentJson,
        executiveSummary,
        lenses: enrichedLenses,
      };

      const contentHtml = markdownToHtml(rawText);

      // 7. Transition to DRAFT
      const updated = await reportGeneratorRepository.updateContent(report.id, {
        contentHtml,
        contentJson: enrichedContentJson,
        executiveSummary,
      });
      const finalReport = await reportGeneratorRepository.updateStatus(report.id, "DRAFT");

      await inngest.send({
        name: "report-generator/report-created",
        data: { reportId: report.id, engagementId, tenantId },
      });

      log.info({ reportId: report.id }, "AI draft generation complete — status DRAFT");
      return finalReport;
    } catch (err) {
      // On Claude error, flip back to DRAFT with empty content so user can retry
      await reportGeneratorRepository.updateStatus(report.id, "DRAFT");
      log.error({ reportId: report.id, err }, "Claude draft generation failed — report set to DRAFT for manual edit");
      throw err;
    }
  },

  /**
   * Retrieve the published report for a client tenant view.
   * Only returns PUBLISHED reports.
   */
  async clientGetPublishedReport(
    ctx: Context,
    input: z.infer<typeof clientGetPublishedReportSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findByEngagement(ctx.tenantId, input.engagementId);
    if (!report) throw new NotFoundError("AuditReport for engagement", input.engagementId);
    if (report.status !== "PUBLISHED") {
      throw new BadRequestError("Report is not yet published");
    }
    return report;
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
      // Auto-export PDF on publish so the client URL is ready before portal (0.5) surfaces it.
      // Fire-and-forget with a logged error on failure — PDF render failing should not block publish.
      reportGeneratorService
        .exportPdf(updated, report.contentJson?.clientName ?? "", report.contentJson?.title ?? "Operational Audit Report")
        .catch((err) => {
          log.error({ reportId: input.reportId, err }, "PDF export on publish failed — non-blocking");
        });

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

  /**
   * Render a PDF buffer from a report record.
   *
   * Pure function — does not touch the database. Returns the raw bytes so
   * they can be streamed (API route) or uploaded (exportPdf).
   *
   * Storage note (0.4): No blob storage is configured. PDFs are rendered
   * on-demand at GET /api/reports/[reportId]/pdf. When @vercel/blob is
   * available, exportPdf below will persist the bytes and store the URL.
   */
  async renderPdf(
    report: AuditReportRecord,
    customerName: string,
    engagementTitle: string,
  ): Promise<Buffer> {
    const content = report.contentJson as ReportContentJson;

    const element = React.createElement(ReportPdfDocument, {
      content,
      customerName,
      engagementTitle,
      publishedDate: report.publishedAt?.toISOString(),
    }) as Parameters<typeof renderToBuffer>[0];

    const buffer = await renderToBuffer(element);
    return Buffer.from(buffer);
  },

  /**
   * Render + optionally persist PDF, then update the report row.
   *
   * In 0.4, without blob storage, we render on-demand and store a
   * /api/... path as the "url" so the portal can link to it in 0.5.
   *
   * When BLOB_READ_WRITE_TOKEN is present (future), swap in @vercel/blob
   * upload here and store the returned URL + key on the row.
   */
  async exportPdf(
    report: AuditReportRecord,
    customerName: string,
    engagementTitle: string,
  ): Promise<{ url: string; storageKey: string }> {
    // Render the PDF (validates it renders without error)
    await reportGeneratorService.renderPdf(report, customerName, engagementTitle);

    // On-demand path (no blob storage configured in 0.4)
    const storageKey = `reports/${report.id}/audit-report.pdf`;
    const url = `/api/reports/${report.id}/pdf`;

    // Persist key + url on the row so portal can surface a download link in 0.5
    await reportGeneratorRepository.setPdfStorage(report.id, {
      pdfStorageKey: storageKey,
      pdfStorageUrl: url,
    });

    log.info({ reportId: report.id, storageKey }, "PDF export recorded on report row");
    return { url, storageKey };
  },
};
