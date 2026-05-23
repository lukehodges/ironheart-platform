import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { consultingRepository } from "./consulting.repository";
import { clientPortalRepository } from "@/modules/client-portal/client-portal.repository";
import { customerRepository } from "@/modules/customer/customer.repository";
import type { EngagementStage, QualificationData } from "./consulting.types";
import type { z } from "zod";
import type {
  stageTransitionSchema,
  setAuditWindowSchema,
  updateDiscoveryNotesSchema,
  listEngagementsByStageSchema,
  createClientEngagementSchema,
} from "./consulting.schemas";

const log = logger.child({ module: "consulting.service" });

const VALID_TRANSITIONS: Record<string, EngagementStage[]> = {
  DISCOVERY: ["PROPOSAL", "CLOSED_LOST"],
  PROPOSAL: ["CONTRACTED", "CLOSED_LOST"],
  CONTRACTED: ["ONBOARDING", "CLOSED_LOST"],
  ONBOARDING: ["AUDITING", "CLOSED_LOST"],
  AUDITING: ["REPORTING", "CLOSED_LOST"],
  REPORTING: ["IMPLEMENTING", "CLOSED_WON", "CLOSED_LOST"],
  IMPLEMENTING: ["RETAINER", "CLOSED_WON", "CLOSED_LOST"],
  RETAINER: ["CLOSED_WON", "CLOSED_LOST"],
};

export const consultingService = {
  async transitionStage(ctx: Context, input: z.infer<typeof stageTransitionSchema>) {
    const engagement = await consultingRepository.findEngagementById(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const currentStage = (engagement.stage ?? "DISCOVERY") as string;
    const allowed = VALID_TRANSITIONS[currentStage];
    if (!allowed || !allowed.includes(input.targetStage)) {
      throw new BadRequestError(`Cannot transition from ${currentStage} to ${input.targetStage}`);
    }

    const updated = await consultingRepository.updateStage(
      ctx.tenantId, input.engagementId, input.targetStage,
      input.targetStage === "CLOSED_LOST" ? input.notes : undefined
    );

    await inngest.send({
      name: "engagement/stage-changed",
      data: {
        engagementId: input.engagementId,
        tenantId: ctx.tenantId,
        fromStage: currentStage,
        toStage: input.targetStage,
      },
    });

    log.info({ engagementId: input.engagementId, from: currentStage, to: input.targetStage }, "engagement stage transitioned");
    return updated;
  },

  async setAuditWindow(ctx: Context, input: z.infer<typeof setAuditWindowSchema>) {
    return consultingRepository.setAuditWindow(ctx.tenantId, input.engagementId, new Date(input.startDate), new Date(input.endDate));
  },

  async updateDiscoveryNotes(ctx: Context, input: z.infer<typeof updateDiscoveryNotesSchema>) {
    return consultingRepository.updateDiscoveryNotes(
      ctx.tenantId, input.engagementId, input.notes,
      input.qualificationData as QualificationData | undefined
    );
  },

  async listEngagements(ctx: Context, input: z.infer<typeof listEngagementsByStageSchema>) {
    return consultingRepository.listByStage(ctx.tenantId, input.stage, input.limit, input.cursor);
  },

  async listAllEngagements(input: z.infer<typeof listEngagementsByStageSchema>) {
    return consultingRepository.listAllAcrossTenants(input.stage, input.limit);
  },

  async createClientEngagement(input: z.infer<typeof createClientEngagementSchema>) {
    const { tenantId } = input;

    // 1. Create the customer record (contact name split to first/last)
    const customer = await customerRepository.create(tenantId, {
      name: input.contactName,
      email: input.contactEmail,
      phone: input.contactPhone ?? null,
      referralSource: input.source,
      notes: input.companyName,
    });

    // 2. Create the engagement at DISCOVERY stage
    const engagement = await clientPortalRepository.createEngagement(tenantId, {
      customerId: customer.id,
      type: input.engagementType,
      title: input.engagementTitle,
      description: null,
    });

    // 3. Store qualification data via discovery notes
    await consultingRepository.updateDiscoveryNotes(
      tenantId,
      engagement.id,
      "",
      {
        industry: input.industry,
        revenue: input.revenue ?? null,
        teamSize: input.teamSize,
        painPoints: input.painPoints,
        decisionMaker: input.decisionMaker,
      } satisfies QualificationData
    );

    log.info({ tenantId, engagementId: engagement.id, customerId: customer.id }, "client engagement created by platform admin");
    return { id: engagement.id };
  },
};
