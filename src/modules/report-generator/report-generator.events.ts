import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { reportGeneratorService } from "./report-generator.service";

const log = logger.child({ module: "report-generator.events" });

export const onReportPublished = inngest.createFunction(
  { id: "report-generator/on-report-published", name: "Handle report published" },
  { event: "report-generator/report-published" },
  async ({ event, step }) => {
    const { reportId, engagementId } = event.data;
    log.info({ reportId, engagementId }, "report published — client notification will be sent");
    // Future: send notification to client, update engagement stage to REPORTING
    return { processed: true };
  }
);

/**
 * Async AI draft generator.
 * Triggered by report/generate event — runs Claude claude-opus-4-7 with
 * cached system prompt, produces executive summary + lens narratives.
 * retries: 1 — Claude calls are expensive; one retry on transient failure is enough.
 */
export const handleReportGenerate = inngest.createFunction(
  {
    id: "report-generator/handle-report-generate",
    name: "Generate AI report draft",
    retries: 1,
  },
  { event: "report/generate" },
  async ({ event, step }) => {
    const { engagementId, tenantId, generatedBy } = event.data;

    const report = await step.run("generate-ai-draft", async () => {
      return reportGeneratorService.generateDraft({ engagementId, tenantId, generatedBy });
    });

    log.info({ reportId: report.id, engagementId }, "AI report draft complete");
    return { reportId: report.id, status: report.status };
  }
);

export const reportGeneratorFunctions = [onReportPublished, handleReportGenerate];
