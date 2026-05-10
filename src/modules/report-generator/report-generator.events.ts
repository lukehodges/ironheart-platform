import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

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

export const reportGeneratorFunctions = [onReportPublished];
