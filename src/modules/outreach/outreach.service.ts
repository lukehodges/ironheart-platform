import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { customers } from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { outreachRepository } from "./outreach.repository";
import { pipelineService } from "@/modules/pipeline";
import { deriveSentiment } from "./outreach.types";
import type {
  OutreachSequenceRecord,
  OutreachContactRecord,
  OutreachContactWithDetails,
  OutreachActivityRecord,
  OutreachStep,
  DashboardContact,
  DailyDashboard,
  SequencePerformance,
  SectorPerformance,
  RenderedTemplate,
  OutreachActivityType,
  OutreachReplyCategory,
} from "./outreach.types";

const log = logger.child({ module: "outreach.service" });

// ===============================================================
// OUTREACH SERVICE
// ===============================================================

export const outreachService = {
  // -------------------------------------------------------------------
  // SEQUENCES
  // -------------------------------------------------------------------

  async listSequences(
    ctx: Context,
    filters?: { sector?: string; isActive?: boolean },
  ): Promise<OutreachSequenceRecord[]> {
    return outreachRepository.listSequences(ctx.tenantId, filters);
  },

  async getSequenceById(ctx: Context, sequenceId: string): Promise<OutreachSequenceRecord> {
    return outreachRepository.findSequenceById(ctx.tenantId, sequenceId);
  },

  async createSequence(
    ctx: Context,
    input: {
      name: string;
      description?: string | null;
      sector: string;
      targetIcp?: string | null;
      isActive?: boolean;
      abVariant?: string | null;
      pairedSequenceId?: string | null;
      steps: OutreachStep[];
    },
  ): Promise<OutreachSequenceRecord> {
    const sequence = await outreachRepository.createSequence(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, sequenceId: sequence.id }, "Outreach sequence created");
    return sequence;
  },

  async updateSequence(
    ctx: Context,
    sequenceId: string,
    input: Partial<{
      name: string;
      description: string | null;
      sector: string;
      targetIcp: string | null;
      isActive: boolean;
      abVariant: string | null;
      pairedSequenceId: string | null;
      steps: OutreachStep[];
    }>,
  ): Promise<OutreachSequenceRecord> {
    return outreachRepository.updateSequence(ctx.tenantId, sequenceId, input);
  },

  async archiveSequence(ctx: Context, sequenceId: string): Promise<void> {
    await outreachRepository.archiveSequence(ctx.tenantId, sequenceId);
    log.info({ tenantId: ctx.tenantId, sequenceId }, "Outreach sequence archived");
  },

  // -------------------------------------------------------------------
  // CONTACTS
  // -------------------------------------------------------------------

  async listContacts(
    ctx: Context,
    filters: {
      sequenceId?: string;
      status?: string;
      assignedUserId?: string;
      search?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<{ rows: OutreachContactWithDetails[]; hasMore: boolean }> {
    return outreachRepository.listContacts(ctx.tenantId, filters);
  },

  async getContactById(ctx: Context, contactId: string): Promise<OutreachContactRecord> {
    return outreachRepository.findContactById(ctx.tenantId, contactId);
  },

  async getContactActivities(
    ctx: Context,
    contactId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<{ activities: OutreachActivityRecord[]; hasMore: boolean }> {
    // Validate contact exists and belongs to tenant
    await outreachRepository.findContactById(ctx.tenantId, contactId);
    const activities = await outreachRepository.getContactActivities(ctx.tenantId, contactId);

    // Apply cursor pagination
    let filtered = activities;
    if (pagination.cursor) {
      const cursorIdx = filtered.findIndex((a) => a.id === pagination.cursor);
      if (cursorIdx >= 0) {
        filtered = filtered.slice(cursorIdx + 1);
      }
    }

    const hasMore = filtered.length > pagination.limit;
    return {
      activities: filtered.slice(0, pagination.limit),
      hasMore,
    };
  },

  async enrollContact(
    ctx: Context,
    input: {
      customerId: string;
      sequenceId: string;
      assignedUserId?: string | null;
      notes?: string | null;
    },
  ): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.enrollContact(ctx.tenantId, input);

    await inngest.send({
      name: "outreach/contact.enrolled",
      data: {
        contactId: contact.id,
        customerId: input.customerId,
        sequenceId: input.sequenceId,
        tenantId: ctx.tenantId,
      },
    });

    log.info(
      { tenantId: ctx.tenantId, contactId: contact.id, sequenceId: input.sequenceId },
      "Contact enrolled in outreach sequence",
    );
    return contact;
  },

  async logActivity(
    ctx: Context,
    input: {
      contactId: string;
      activityType: OutreachActivityType;
      notes?: string | null;
      deliveredTo?: string | null;
    },
  ): Promise<OutreachContactRecord> {
    const now = new Date();

    // 1. Get contact and validate state
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status === "BOUNCED" || contact.status === "OPTED_OUT") {
      throw new BadRequestError(
        `Cannot log activity for contact with status ${contact.status}`,
      );
    }

    // 2. Get sequence for steps
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);
    const steps = sequence.steps ?? [];

    // 3. Determine current step info
    const stepPosition = contact.currentStep;
    const currentStepDef = steps[stepPosition - 1];
    const channel = currentStepDef?.channel ?? "EMAIL";

    // Capture previous state for undo support
    const previousState = {
      currentStep: contact.currentStep,
      status: contact.status,
      nextDueAt: contact.nextDueAt?.toISOString() ?? null,
    };

    // 4. Insert activity
    await outreachRepository.logActivity(ctx.tenantId, {
      contactId: contact.id,
      sequenceId: contact.sequenceId,
      customerId: contact.customerId,
      stepPosition,
      channel,
      activityType: input.activityType,
      deliveredTo: input.deliveredTo,
      notes: input.notes,
      performedByUserId: ctx.user?.id ?? null,
      previousState,
    });

    // 5. State transitions
    const updatePayload: {
      status?: string;
      currentStep?: number;
      nextDueAt?: Date | null;
      completedAt?: Date | null;
      lastActivityAt?: Date | null;
    } = {
      lastActivityAt: now,
    };

    switch (input.activityType) {
      case "SENT":
      case "CALL_COMPLETED":
      case "SKIPPED": {
        // Advance to next step
        const nextStepIndex = stepPosition; // steps[stepPosition] is the next one (0-based)
        const nextStep = steps[nextStepIndex];

        if (nextStep) {
          const nextDueAt = new Date(now.getTime() + nextStep.delayDays * 86400000);
          updatePayload.currentStep = stepPosition + 1;
          updatePayload.nextDueAt = nextDueAt;
        } else {
          // No more steps — sequence completed
          updatePayload.status = "COMPLETED";
          updatePayload.completedAt = now;
          updatePayload.nextDueAt = null;
        }
        break;
      }

      case "REPLIED":
      case "MEETING_BOOKED": {
        updatePayload.status = "REPLIED";
        updatePayload.nextDueAt = null;
        break;
      }

      case "BOUNCED": {
        updatePayload.status = "BOUNCED";
        updatePayload.nextDueAt = null;
        updatePayload.completedAt = now;
        break;
      }

      case "OPTED_OUT": {
        updatePayload.status = "OPTED_OUT";
        updatePayload.nextDueAt = null;
        updatePayload.completedAt = now;
        break;
      }
    }

    // 6. Update contact
    const updated = await outreachRepository.updateContactStatus(
      ctx.tenantId,
      contact.id,
      updatePayload,
    );

    // 7. Emit event
    await inngest.send({
      name: "outreach/activity.logged",
      data: {
        contactId: contact.id,
        sequenceId: contact.sequenceId,
        customerId: contact.customerId,
        activityType: input.activityType,
        sector: sequence.sector,
        tenantId: ctx.tenantId,
      },
    });

    log.info(
      { tenantId: ctx.tenantId, contactId: contact.id, activityType: input.activityType },
      "Outreach activity logged",
    );

    return updated;
  },

  async getBodyForStep(
    ctx: Context,
    input: { contactId: string; stepPosition?: number },
  ): Promise<RenderedTemplate> {
    // 1. Get contact + sequence
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);

    // 2. Determine step position
    const position = input.stepPosition ?? contact.currentStep;
    const step = sequence.steps[position - 1];

    if (!step) {
      throw new BadRequestError(`Step at position ${position} does not exist in sequence`);
    }

    // 3. Get customer record
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, contact.customerId),
          eq(customers.tenantId, ctx.tenantId),
        ),
      )
      .limit(1);

    if (!customer) throw new NotFoundError("Customer", contact.customerId);

    // 4. Extract company from tags
    const tags = customer.tags ?? [];
    const companyTag = tags.find((t) => t.startsWith("company:"));
    const company = companyTag ? companyTag.slice("company:".length) : "";

    // 5. Build replacements
    const replacements: Record<string, string> = {
      "{{firstName}}": customer.firstName ?? "",
      "{{lastName}}": customer.lastName ?? "",
      "{{company}}": company,
      "{{sector}}": sequence.sector ?? "",
    };

    // 6. Replace placeholders with sanitised values
    function replaceTemplate(template: string): string {
      let result = template;
      for (const [placeholder, value] of Object.entries(replacements)) {
        // Sanitise: replace {{ and }} in resolved values to prevent injection
        const sanitised = value.replace(/\{\{/g, "{ {").replace(/\}\}/g, "} }");
        result = result.replaceAll(placeholder, sanitised);
      }
      return result;
    }

    const body = replaceTemplate(step.bodyMarkdown);
    const subject = step.subject ? replaceTemplate(step.subject) : null;

    return {
      subject,
      body,
      channel: step.channel,
      stepNotes: step.notes ?? null,
    };
  },

  async convertContact(
    ctx: Context,
    input: {
      contactId: string;
      pipelineId: string;
      stageId: string;
      dealValue?: number | null;
    },
  ): Promise<OutreachContactRecord> {
    const now = new Date();

    // 1. Get contact and validate status
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status !== "REPLIED") {
      throw new BadRequestError(
        `Cannot convert contact with status ${contact.status}. Contact must be in REPLIED status.`,
      );
    }

    // 2. Add to pipeline
    const member = await pipelineService.addMember(ctx, {
      pipelineId: input.pipelineId,
      customerId: contact.customerId,
      stageId: input.stageId,
      dealValue: input.dealValue,
      metadata: { source: "outreach", sequenceId: contact.sequenceId },
    });

    // 3. Update contact status
    const updated = await outreachRepository.updateContactStatus(
      ctx.tenantId,
      contact.id,
      {
        status: "CONVERTED",
        pipelineMemberId: member.id,
        completedAt: now,
      },
    );

    // 4. Log CONVERTED activity
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);
    const currentStep = sequence.steps[contact.currentStep - 1];

    await outreachRepository.logActivity(ctx.tenantId, {
      contactId: contact.id,
      sequenceId: contact.sequenceId,
      customerId: contact.customerId,
      stepPosition: contact.currentStep,
      channel: currentStep?.channel ?? "EMAIL",
      activityType: "CONVERTED",
      notes: `Converted to pipeline ${input.pipelineId}`,
    });

    // 5. Emit event
    await inngest.send({
      name: "outreach/contact.converted",
      data: {
        contactId: contact.id,
        customerId: contact.customerId,
        sequenceId: contact.sequenceId,
        pipelineId: input.pipelineId,
        pipelineMemberId: member.id,
        tenantId: ctx.tenantId,
      },
    });

    log.info(
      { tenantId: ctx.tenantId, contactId: contact.id, pipelineMemberId: member.id },
      "Outreach contact converted to pipeline member",
    );

    return updated;
  },

  async pauseContact(ctx: Context, contactId: string): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, contactId);

    if (contact.status !== "ACTIVE") {
      throw new BadRequestError(
        `Cannot pause contact with status ${contact.status}. Contact must be ACTIVE.`,
      );
    }

    return outreachRepository.pauseContact(ctx.tenantId, contactId);
  },

  async resumeContact(ctx: Context, contactId: string): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, contactId);

    if (contact.status !== "PAUSED") {
      throw new BadRequestError(
        `Cannot resume contact with status ${contact.status}. Contact must be PAUSED.`,
      );
    }

    // Get sequence to compute new nextDueAt
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);
    const currentStepDef = sequence.steps[contact.currentStep - 1];
    const delayMs = currentStepDef ? currentStepDef.delayDays * 86400000 : 0;
    const nextDueAt = new Date(Date.now() + delayMs);

    return outreachRepository.resumeContact(ctx.tenantId, contactId, nextDueAt);
  },

  async categorizeContact(
    ctx: Context,
    input: { contactId: string; replyCategory: OutreachReplyCategory },
  ): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status !== "REPLIED") {
      throw new BadRequestError(
        `Cannot categorize contact with status ${contact.status}. Contact must be REPLIED.`,
      );
    }

    const sentiment = deriveSentiment(input.replyCategory);
    const updated = await outreachRepository.categorizeContact(
      ctx.tenantId,
      input.contactId,
      input.replyCategory,
      sentiment,
    );

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, replyCategory: input.replyCategory, sentiment },
      "Outreach contact categorized",
    );

    return updated;
  },

  async snoozeContact(
    ctx: Context,
    input: { contactId: string; snoozedUntil: Date },
  ): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status !== "REPLIED") {
      throw new BadRequestError(
        `Cannot snooze contact with status ${contact.status}. Contact must be REPLIED.`,
      );
    }

    const updated = await outreachRepository.snoozeContact(
      ctx.tenantId,
      input.contactId,
      input.snoozedUntil,
    );

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, snoozedUntil: input.snoozedUntil },
      "Outreach contact snoozed",
    );

    return updated;
  },

  async undoActivity(
    ctx: Context,
    input: { contactId: string; activityId: string },
  ): Promise<OutreachContactRecord> {
    const activity = await outreachRepository.findActivityById(ctx.tenantId, input.activityId);

    // Validate activity belongs to the specified contact
    if (activity.contactId !== input.contactId) {
      throw new BadRequestError("Activity does not belong to this contact.");
    }

    // Validate time window (30 seconds server-side)
    const elapsed = Date.now() - activity.occurredAt.getTime();
    if (elapsed > 30_000) {
      throw new BadRequestError("Undo window has expired (30 seconds maximum).");
    }

    if (!activity.previousState) {
      throw new BadRequestError("This activity cannot be undone — no previous state recorded.");
    }

    // Revert contact state
    const updated = await outreachRepository.updateContactStatus(
      ctx.tenantId,
      input.contactId,
      {
        currentStep: activity.previousState.currentStep,
        status: activity.previousState.status,
        nextDueAt: activity.previousState.nextDueAt ? new Date(activity.previousState.nextDueAt) : null,
        lastActivityAt: new Date(),
      },
    );

    // Log compensating UNDONE activity
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);
    const step = sequence.steps[activity.previousState.currentStep - 1];

    await outreachRepository.logActivity(ctx.tenantId, {
      contactId: input.contactId,
      sequenceId: contact.sequenceId,
      customerId: contact.customerId,
      stepPosition: activity.previousState.currentStep,
      channel: step?.channel ?? "EMAIL",
      activityType: "UNDONE",
      notes: `Undo of ${activity.activityType} at step ${activity.stepPosition}`,
    });

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, activityId: input.activityId },
      "Outreach activity undone",
    );

    return updated;
  },

  async batchLogActivity(
    ctx: Context,
    input: { contactIds: string[]; activityType: "SENT" | "SKIPPED"; notes?: string },
  ): Promise<{ succeeded: number; failed: number; errors: Array<{ contactId: string; error: string }> }> {
    const results = { succeeded: 0, failed: 0, errors: [] as Array<{ contactId: string; error: string }> };

    for (const contactId of input.contactIds) {
      try {
        await this.logActivity(ctx, {
          contactId,
          activityType: input.activityType,
          notes: input.notes,
        });
        results.succeeded++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          contactId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    log.info(
      { tenantId: ctx.tenantId, succeeded: results.succeeded, failed: results.failed },
      "Batch outreach activity logged",
    );

    return results;
  },

  async reactivateSnoozedContacts(): Promise<number> {
    const count = await outreachRepository.reactivateSnoozedContacts();
    log.info({ count }, "Reactivated snoozed outreach contacts");
    return count;
  },

  // -------------------------------------------------------------------
  // DASHBOARD
  // -------------------------------------------------------------------

  async getDashboard(ctx: Context): Promise<DailyDashboard> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [dueNow, overdue, recentReplies, todayStats] = await Promise.all([
      outreachRepository.getDueContacts(ctx.tenantId, now),
      outreachRepository.getOverdueContacts(ctx.tenantId, now),
      outreachRepository.getRecentReplies(ctx.tenantId),
      outreachRepository.getTodayStats(ctx.tenantId, startOfToday),
    ]);

    return {
      dueNow,
      overdue,
      recentReplies,
      todayStats,
    };
  },

  // -------------------------------------------------------------------
  // ANALYTICS
  // -------------------------------------------------------------------

  async getSequenceAnalytics(
    ctx: Context,
    filters?: { dateFrom?: Date; dateTo?: Date; sector?: string },
  ): Promise<SequencePerformance[]> {
    return outreachRepository.getSequencePerformance(ctx.tenantId, filters);
  },

  async getSectorAnalytics(
    ctx: Context,
    filters?: { dateFrom?: Date; dateTo?: Date },
  ): Promise<SectorPerformance[]> {
    return outreachRepository.getSectorPerformance(ctx.tenantId, filters);
  },
};
