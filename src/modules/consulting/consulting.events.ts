import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "consulting.events" });

export const onStageChanged = inngest.createFunction(
  { id: "consulting/on-stage-changed", name: "Handle engagement stage change" },
  { event: "engagement/stage-changed" },
  async ({ event, step }) => {
    const { engagementId, tenantId, fromStage, toStage } = event.data;

    log.info({ engagementId, fromStage, toStage }, "processing stage change");

    if (toStage === "CONTRACTED") {
      await step.run("log-contracted", () => {
        log.info({ engagementId }, "engagement contracted — tenant provisioning will be triggered");
      });
    }

    if (toStage === "CLOSED_LOST") {
      await step.run("log-closed-lost", () => {
        log.info({ engagementId }, "engagement closed lost — follow-up reminder scheduled");
      });
    }

    return { processed: true, engagementId, toStage };
  }
);

export const consultingFunctions = [onStageChanged];
