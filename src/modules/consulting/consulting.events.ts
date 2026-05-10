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
      await step.run("handle-contracted", () => {
        log.info({ engagementId }, "engagement contracted — trigger: provision client tenant, create Drive folder, send welcome email");
        // These will be wired to actual service calls:
        // 1. provisioningService.provisionClientTenant()
        // 2. integrationService.createDriveFolder()
        // 3. notificationService.sendWelcomeEmail()
      });
    }

    if (toStage === "ONBOARDING") {
      await step.run("handle-onboarding", () => {
        log.info({ engagementId }, "engagement onboarding — trigger: send questionnaire invites, enable booking window");
      });
    }

    if (toStage === "IMPLEMENTING") {
      await step.run("handle-implementing", () => {
        log.info({ engagementId }, "engagement implementing — trigger: create Plane.so project from audit findings");
      });
    }

    if (toStage === "CLOSED_LOST") {
      await step.run("handle-closed-lost", () => {
        log.info({ engagementId }, "engagement closed lost — trigger: 60-day follow-up reminder");
      });
    }

    if (toStage === "CLOSED_WON") {
      await step.run("handle-closed-won", () => {
        log.info({ engagementId }, "engagement closed won — trigger: offboarding checklist, case study request");
      });
    }

    return { processed: true, engagementId, toStage };
  }
);

export const consultingFunctions = [onStageChanged];
