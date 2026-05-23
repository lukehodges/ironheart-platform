import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { db } from "@/shared/db";
import { tenants } from "@/shared/db/schema";
import { engagements, customers } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
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
    // Resolve the Ironheart tenant server-side — no tenantId in input.
    // D-01: Luke is flat in /platform/* with no tenant switching.
    const ironheartTenantId =
      process.env.IRONHEART_TENANT_ID ??
      (
        await db
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, "ironheart"))
          .limit(1)
      )[0]?.id;

    if (!ironheartTenantId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Ironheart tenant not provisioned; set IRONHEART_TENANT_ID env var or create tenant with slug 'ironheart'",
      });
    }

    const tenantId = ironheartTenantId;

    // Wrap all three writes in a single transaction so that a failure in step 2
    // or 3 does not leave an orphan customer row.
    const { engagementId, customerId } = await db.transaction(async (tx) => {
      // 1. Create the customer record (contact name split to first/last by the repo)
      // TODO TECH-DEBT: companyName lives in customer.notes because customers table
      // has no dedicated companyName column. Add migration to create customers.company_name
      // (nullable text) and update this assignment. Tracked in Phase 0.1.B follow-ups.
      const nameParts = (input.contactName ?? "").trim().split(/\s+/);
      const firstName = nameParts[0] ?? input.contactName ?? "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const now = new Date();

      const [customerRow] = await tx
        .insert(customers)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          firstName,
          lastName,
          email: input.contactEmail,
          phone: input.contactPhone ?? null,
          referralSource: input.source,
          notes: input.companyName,
          tags: [],
          status: "ACTIVE",
          marketingOptIn: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: customers.id });

      const newCustomerId = customerRow!.id;

      // 2. Create the engagement at DISCOVERY stage
      const [engagementRow] = await tx
        .insert(engagements)
        .values({
          tenantId,
          customerId: newCustomerId,
          type: input.engagementType as "PROJECT" | "RETAINER" | "HYBRID",
          title: input.engagementTitle,
          description: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: engagements.id });

      const newEngagementId = engagementRow!.id;

      // 3. Store qualification data via discovery notes
      await tx
        .update(engagements)
        .set({
          discoveryNotes: "",
          qualificationData: {
            industry: input.industry,
            revenue: input.revenue ?? null,
            teamSize: input.teamSize,
            painPoints: input.painPoints,
            decisionMaker: input.decisionMaker,
          } satisfies QualificationData,
          updatedAt: new Date(),
        })
        .where(eq(engagements.id, newEngagementId));

      return { engagementId: newEngagementId, customerId: newCustomerId };
    });

    log.info({ tenantId, engagementId, customerId }, "client engagement created by platform admin");
    return { id: engagementId };
  },
};
