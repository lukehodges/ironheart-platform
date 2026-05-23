import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { provisioningService } from "./provisioning.service";
import { onboardingService } from "@/modules/onboarding";

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

      const chartResult = await step.run("seed-org-chart", async () => {
        // provisioning just set engagement.clientTenantId — re-fetch fresh
        const provisionedEng = await db.query.engagements.findFirst({
          where: eq(engagements.id, engagementId),
        });
        if (!provisionedEng?.clientTenantId) {
          log.warn({ engagementId }, "Chart seed skipped — clientTenantId not set after provisioning");
          return { skipped: true, reason: "no_client_tenant_id" };
        }
        return await onboardingService.seedChartFromTier({
          tenantId: provisionedEng.clientTenantId,
          engagementId,
          actorName: "Provisioning Bot",
        });
      });

      return { provisioned: true, tenantId: result.tenantId, chartResult };
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
