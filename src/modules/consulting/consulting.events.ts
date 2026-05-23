import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { provisioningService } from "./provisioning.service";

const log = logger.child({ module: "consulting.events" });

export const onStageChanged = inngest.createFunction(
  { id: "consulting/on-stage-changed", name: "Handle engagement stage change" },
  { event: "engagement/stage-changed" },
  async ({ event, step }) => {
    const { engagementId, tenantId, fromStage, toStage } = event.data;

    log.info({ engagementId, fromStage, toStage }, "processing stage change");

    if (toStage === "CONTRACTED") {
      // Defensive check: skip if already provisioned
      const engagement = await step.run("check-engagement", async () => {
        const rows = await db
          .select()
          .from(engagements)
          .where(eq(engagements.id, engagementId))
          .limit(1);
        return rows[0] ?? null;
      });

      if (!engagement) {
        log.error({ engagementId }, "Engagement not found for stage transition");
        return { skipped: true, reason: "not_found" };
      }

      if (engagement.clientTenantId) {
        log.info({ engagementId }, "Already provisioned; skipping");
        return { skipped: true, reason: "already_provisioned" };
      }

      const result = await step.run("provision-client-tenant", async () => {
        return provisioningService.provisionClientTenant(engagementId);
      });

      // TODO (Phase 0.1.C): chain seedChartFromTier(engagementId) as next step once onboarding module exists
      // For now, just log so future seedChart trigger can be added without re-touching this file
      log.info(
        { engagementId, tenantId: result.tenantId },
        "Provisioning complete; chart seed deferred to Phase 0.1.C"
      );

      return { provisioned: true, tenantId: result.tenantId };
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
