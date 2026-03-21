import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError, ConflictError } from "@/shared/errors";
import {
  outreachSequences,
  outreachContacts,
  outreachActivities,
  customers,
} from "@/shared/db/schema";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  gte,
  lte,
  or,
  isNull,
} from "drizzle-orm";
import type {
  OutreachSequenceRecord,
  OutreachContactRecord,
  OutreachContactWithDetails,
  OutreachActivityRecord,
  OutreachStep,
  DashboardContact,
  SequencePerformance,
  SectorPerformance,
} from "./outreach.types";

const log = logger.child({ module: "outreach.repository" });

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

type SequenceRow = typeof outreachSequences.$inferSelect;
type ContactRow = typeof outreachContacts.$inferSelect;
type ActivityRow = typeof outreachActivities.$inferSelect;

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function toSequenceRecord(row: SequenceRow): OutreachSequenceRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    sector: row.sector,
    targetIcp: row.targetIcp ?? null,
    isActive: row.isActive,
    abVariant: row.abVariant ?? null,
    pairedSequenceId: row.pairedSequenceId ?? null,
    steps: (row.steps as OutreachStep[]) ?? [],
    archivedAt: row.archivedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toContactRecord(row: ContactRow): OutreachContactRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    sequenceId: row.sequenceId,
    assignedUserId: row.assignedUserId ?? null,
    status: row.status,
    currentStep: row.currentStep,
    nextDueAt: row.nextDueAt ?? null,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt ?? null,
    lastActivityAt: row.lastActivityAt ?? null,
    pipelineMemberId: row.pipelineMemberId ?? null,
    notes: row.notes ?? null,
    sentiment: row.sentiment ?? null,
    replyCategory: row.replyCategory ?? null,
    snoozedUntil: row.snoozedUntil ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toActivityRecord(row: ActivityRow): OutreachActivityRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    contactId: row.contactId,
    sequenceId: row.sequenceId,
    customerId: row.customerId,
    stepPosition: row.stepPosition,
    channel: row.channel,
    activityType: row.activityType,
    deliveredTo: row.deliveredTo ?? null,
    notes: row.notes ?? null,
    performedByUserId: row.performedByUserId ?? null,
    previousState: row.previousState ?? null,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Dashboard contact mapper (shared by getDueContacts, getOverdueContacts, getRecentReplies)
// ---------------------------------------------------------------------------

function toDashboardContact(row: {
  contact: ContactRow;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string | null;
  customerTags: string[] | null;
  sequenceName: string;
  sector: string;
  steps: unknown;
}): DashboardContact {
  const steps = (row.steps as OutreachStep[]) ?? [];
  const currentStepIndex = row.contact.currentStep - 1;
  const currentStep = steps[currentStepIndex] ?? null;

  const tags = row.customerTags ?? [];
  const companyTag = tags.find((t) => t.startsWith("company:"));
  const company = companyTag ? companyTag.slice("company:".length) : null;

  return {
    id: row.contact.id,
    customerId: row.contact.customerId,
    customerName: `${row.customerFirstName} ${row.customerLastName}`.trim(),
    customerEmail: row.customerEmail ?? null,
    company,
    sequenceId: row.contact.sequenceId,
    sequenceName: row.sequenceName,
    sector: row.sector,
    currentStep: row.contact.currentStep,
    totalSteps: steps.length,
    channel: currentStep?.channel ?? "EMAIL",
    subject: currentStep?.subject ?? null,
    nextDueAt: row.contact.nextDueAt ?? null,
    notes: row.contact.notes ?? null,
  };
}

// ===============================================================
// OUTREACH REPOSITORY
// ===============================================================

export const outreachRepository = {
  // -------------------------------------------------------------------
  // SEQUENCES
  // -------------------------------------------------------------------

  async listSequences(
    tenantId: string,
    filters?: { sector?: string; isActive?: boolean },
  ): Promise<OutreachSequenceRecord[]> {
    const conditions = [eq(outreachSequences.tenantId, tenantId)];

    if (filters?.sector) {
      conditions.push(eq(outreachSequences.sector, filters.sector));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(outreachSequences.isActive, filters.isActive));
    }

    const rows = await db
      .select()
      .from(outreachSequences)
      .where(and(...conditions))
      .orderBy(desc(outreachSequences.createdAt));

    return rows.map(toSequenceRecord);
  },

  async findSequenceById(
    tenantId: string,
    sequenceId: string,
  ): Promise<OutreachSequenceRecord> {
    const [row] = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, sequenceId),
          eq(outreachSequences.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachSequence", sequenceId);
    return toSequenceRecord(row);
  },

  async createSequence(
    tenantId: string,
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
    const now = new Date();

    const [row] = await db
      .insert(outreachSequences)
      .values({
        tenantId,
        name: input.name,
        description: input.description ?? null,
        sector: input.sector,
        targetIcp: input.targetIcp ?? null,
        isActive: input.isActive ?? true,
        abVariant: input.abVariant ?? null,
        pairedSequenceId: input.pairedSequenceId ?? null,
        steps: input.steps,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, sequenceId: row!.id }, "Outreach sequence created");
    return toSequenceRecord(row!);
  },

  async updateSequence(
    tenantId: string,
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
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sector !== undefined) updateData.sector = input.sector;
    if (input.targetIcp !== undefined) updateData.targetIcp = input.targetIcp;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.abVariant !== undefined) updateData.abVariant = input.abVariant;
    if (input.pairedSequenceId !== undefined) updateData.pairedSequenceId = input.pairedSequenceId;
    if (input.steps !== undefined) updateData.steps = input.steps;

    const [updated] = await db
      .update(outreachSequences)
      .set(updateData as Partial<typeof outreachSequences.$inferInsert>)
      .where(
        and(
          eq(outreachSequences.id, sequenceId),
          eq(outreachSequences.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachSequence", sequenceId);
    log.info({ tenantId, sequenceId }, "Outreach sequence updated");
    return toSequenceRecord(updated);
  },

  async archiveSequence(tenantId: string, sequenceId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const now = new Date();

      const [updated] = await tx
        .update(outreachSequences)
        .set({
          isActive: false,
          archivedAt: now,
          updatedAt: now,
        } as Partial<typeof outreachSequences.$inferInsert>)
        .where(
          and(
            eq(outreachSequences.id, sequenceId),
            eq(outreachSequences.tenantId, tenantId),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundError("OutreachSequence", sequenceId);

      // Pause all ACTIVE contacts in this sequence
      await tx
        .update(outreachContacts)
        .set({
          status: "PAUSED",
          updatedAt: now,
        } as Partial<typeof outreachContacts.$inferInsert>)
        .where(
          and(
            eq(outreachContacts.sequenceId, sequenceId),
            eq(outreachContacts.tenantId, tenantId),
            eq(outreachContacts.status, "ACTIVE"),
          ),
        );

      log.info({ tenantId, sequenceId }, "Outreach sequence archived and active contacts paused");
    });
  },

  // -------------------------------------------------------------------
  // CONTACTS
  // -------------------------------------------------------------------

  async enrollContact(
    tenantId: string,
    input: {
      customerId: string;
      sequenceId: string;
      assignedUserId?: string | null;
      notes?: string | null;
    },
  ): Promise<OutreachContactRecord> {
    // Get sequence to find first step's delay
    const [sequence] = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, input.sequenceId),
          eq(outreachSequences.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!sequence) throw new NotFoundError("OutreachSequence", input.sequenceId);

    const steps = (sequence.steps as OutreachStep[]) ?? [];
    const firstStep = steps[0];
    const delayMs = firstStep ? firstStep.delayDays * 86400000 : 0;

    const now = new Date();
    const nextDueAt = new Date(now.getTime() + delayMs);

    const [row] = await db
      .insert(outreachContacts)
      .values({
        tenantId,
        customerId: input.customerId,
        sequenceId: input.sequenceId,
        assignedUserId: input.assignedUserId ?? null,
        status: "ACTIVE",
        currentStep: 1,
        nextDueAt,
        enrolledAt: now,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info(
      { tenantId, contactId: row!.id, sequenceId: input.sequenceId, customerId: input.customerId },
      "Contact enrolled in outreach sequence",
    );
    return toContactRecord(row!);
  },

  async findContactById(
    tenantId: string,
    contactId: string,
  ): Promise<OutreachContactRecord> {
    const [row] = await db
      .select()
      .from(outreachContacts)
      .where(
        and(
          eq(outreachContacts.id, contactId),
          eq(outreachContacts.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(row);
  },

  async listContacts(
    tenantId: string,
    filters: {
      sequenceId?: string;
      status?: string;
      assignedUserId?: string;
      search?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<{ rows: OutreachContactWithDetails[]; hasMore: boolean }> {
    const limit = filters.limit ?? 50;
    const conditions = [eq(outreachContacts.tenantId, tenantId)];

    if (filters.sequenceId) {
      conditions.push(eq(outreachContacts.sequenceId, filters.sequenceId));
    }
    if (filters.status) {
      conditions.push(sql`${outreachContacts.status} = ${filters.status}`);
    }
    if (filters.assignedUserId) {
      conditions.push(eq(outreachContacts.assignedUserId, filters.assignedUserId));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        sql`(${customers.firstName} ILIKE ${pattern} OR ${customers.lastName} ILIKE ${pattern})`,
      );
    }
    if (filters.cursor) {
      conditions.push(sql`${outreachContacts.id} > ${filters.cursor}`);
    }

    const rows = await db
      .select({
        contact: outreachContacts,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerTags: customers.tags,
        sequenceName: outreachSequences.name,
        sector: outreachSequences.sector,
        steps: outreachSequences.steps,
      })
      .from(outreachContacts)
      .innerJoin(customers, eq(outreachContacts.customerId, customers.id))
      .innerJoin(outreachSequences, eq(outreachContacts.sequenceId, outreachSequences.id))
      .where(and(...conditions))
      .orderBy(asc(outreachContacts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      rows: resultRows.map((r) => {
        const steps = (r.steps as OutreachStep[]) ?? [];
        const currentStepIndex = r.contact.currentStep - 1;
        const currentStepTemplate = steps[currentStepIndex] ?? null;

        return {
          ...toContactRecord(r.contact),
          customerFirstName: r.customerFirstName,
          customerLastName: r.customerLastName,
          customerEmail: r.customerEmail ?? null,
          customerTags: r.customerTags ?? [],
          sequenceName: r.sequenceName,
          sector: r.sector,
          currentStepTemplate,
        };
      }),
      hasMore,
    };
  },

  async getDueContacts(tenantId: string, asOf: Date): Promise<DashboardContact[]> {
    const rows = await db
      .select({
        contact: outreachContacts,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerTags: customers.tags,
        sequenceName: outreachSequences.name,
        sector: outreachSequences.sector,
        steps: outreachSequences.steps,
      })
      .from(outreachContacts)
      .innerJoin(customers, eq(outreachContacts.customerId, customers.id))
      .innerJoin(outreachSequences, eq(outreachContacts.sequenceId, outreachSequences.id))
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.status, "ACTIVE"),
          lte(outreachContacts.nextDueAt, asOf),
        ),
      )
      .orderBy(asc(outreachContacts.nextDueAt))
      .limit(50);

    return rows.map(toDashboardContact);
  },

  async getOverdueContacts(tenantId: string, asOf: Date): Promise<DashboardContact[]> {
    const startOfToday = new Date(asOf);
    startOfToday.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        contact: outreachContacts,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerTags: customers.tags,
        sequenceName: outreachSequences.name,
        sector: outreachSequences.sector,
        steps: outreachSequences.steps,
      })
      .from(outreachContacts)
      .innerJoin(customers, eq(outreachContacts.customerId, customers.id))
      .innerJoin(outreachSequences, eq(outreachContacts.sequenceId, outreachSequences.id))
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.status, "ACTIVE"),
          sql`${outreachContacts.nextDueAt} < ${startOfToday}`,
        ),
      )
      .orderBy(asc(outreachContacts.nextDueAt))
      .limit(50);

    return rows.map(toDashboardContact);
  },

  async updateContactStatus(
    tenantId: string,
    contactId: string,
    updates: {
      status?: string;
      currentStep?: number;
      nextDueAt?: Date | null;
      completedAt?: Date | null;
      lastActivityAt?: Date | null;
      pipelineMemberId?: string | null;
    },
  ): Promise<OutreachContactRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentStep !== undefined) updateData.currentStep = updates.currentStep;
    if (updates.nextDueAt !== undefined) updateData.nextDueAt = updates.nextDueAt;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;
    if (updates.lastActivityAt !== undefined) updateData.lastActivityAt = updates.lastActivityAt;
    if (updates.pipelineMemberId !== undefined) updateData.pipelineMemberId = updates.pipelineMemberId;

    const [updated] = await db
      .update(outreachContacts)
      .set(updateData as Partial<typeof outreachContacts.$inferInsert>)
      .where(
        and(
          eq(outreachContacts.id, contactId),
          eq(outreachContacts.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(updated);
  },

  async pauseContact(tenantId: string, contactId: string): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        status: "PAUSED",
        updatedAt: new Date(),
      } as Partial<typeof outreachContacts.$inferInsert>)
      .where(
        and(
          eq(outreachContacts.id, contactId),
          eq(outreachContacts.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    log.info({ tenantId, contactId }, "Outreach contact paused");
    return toContactRecord(updated);
  },

  async resumeContact(
    tenantId: string,
    contactId: string,
    nextDueAt: Date,
  ): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        status: "ACTIVE",
        nextDueAt,
        updatedAt: new Date(),
      } as Partial<typeof outreachContacts.$inferInsert>)
      .where(
        and(
          eq(outreachContacts.id, contactId),
          eq(outreachContacts.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    log.info({ tenantId, contactId }, "Outreach contact resumed");
    return toContactRecord(updated);
  },

  // -------------------------------------------------------------------
  // ACTIVITIES
  // -------------------------------------------------------------------

  async logActivity(
    tenantId: string,
    input: {
      contactId: string;
      sequenceId: string;
      customerId: string;
      stepPosition: number;
      channel: string;
      activityType: string;
      deliveredTo?: string | null;
      notes?: string | null;
      performedByUserId?: string | null;
      previousState?: { currentStep: number; status: string; nextDueAt: string | null } | null;
    },
  ): Promise<OutreachActivityRecord> {
    const now = new Date();

    const [row] = await db
      .insert(outreachActivities)
      .values({
        tenantId,
        contactId: input.contactId,
        sequenceId: input.sequenceId,
        customerId: input.customerId,
        stepPosition: input.stepPosition,
        channel: input.channel,
        activityType: input.activityType as "SENT" | "REPLIED" | "BOUNCED" | "OPTED_OUT" | "SKIPPED" | "CALL_COMPLETED" | "MEETING_BOOKED" | "CONVERTED" | "UNDONE",
        deliveredTo: input.deliveredTo ?? null,
        notes: input.notes ?? null,
        performedByUserId: input.performedByUserId ?? null,
        previousState: input.previousState ?? null,
        occurredAt: now,
        createdAt: now,
      })
      .returning();

    log.info(
      { tenantId, contactId: input.contactId, activityType: input.activityType },
      "Outreach activity logged",
    );
    return toActivityRecord(row!);
  },

  async getContactActivities(
    tenantId: string,
    contactId: string,
  ): Promise<OutreachActivityRecord[]> {
    const rows = await db
      .select()
      .from(outreachActivities)
      .where(
        and(
          eq(outreachActivities.tenantId, tenantId),
          eq(outreachActivities.contactId, contactId),
        ),
      )
      .orderBy(desc(outreachActivities.occurredAt));

    return rows.map(toActivityRecord);
  },

  async getTodayStats(
    tenantId: string,
    startOfToday: Date,
  ): Promise<{
    sent: number;
    replied: number;
    bounced: number;
    optedOut: number;
    converted: number;
    callsCompleted: number;
    meetingsBooked: number;
  }> {
    const rows = await db
      .select({
        activityType: outreachActivities.activityType,
        count: count(),
      })
      .from(outreachActivities)
      .where(
        and(
          eq(outreachActivities.tenantId, tenantId),
          gte(outreachActivities.occurredAt, startOfToday),
        ),
      )
      .groupBy(outreachActivities.activityType);

    const stats = {
      sent: 0,
      replied: 0,
      bounced: 0,
      optedOut: 0,
      converted: 0,
      callsCompleted: 0,
      meetingsBooked: 0,
    };

    for (const row of rows) {
      const c = Number(row.count);
      switch (row.activityType) {
        case "SENT":
          stats.sent = c;
          break;
        case "REPLIED":
          stats.replied = c;
          break;
        case "BOUNCED":
          stats.bounced = c;
          break;
        case "OPTED_OUT":
          stats.optedOut = c;
          break;
        case "CONVERTED":
          stats.converted = c;
          break;
        case "CALL_COMPLETED":
          stats.callsCompleted = c;
          break;
        case "MEETING_BOOKED":
          stats.meetingsBooked = c;
          break;
      }
    }

    return stats;
  },

  async getRecentReplies(
    tenantId: string,
    limit?: number,
  ): Promise<DashboardContact[]> {
    const rows = await db
      .select({
        contact: outreachContacts,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerTags: customers.tags,
        sequenceName: outreachSequences.name,
        sector: outreachSequences.sector,
        steps: outreachSequences.steps,
      })
      .from(outreachContacts)
      .innerJoin(customers, eq(outreachContacts.customerId, customers.id))
      .innerJoin(outreachSequences, eq(outreachContacts.sequenceId, outreachSequences.id))
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.status, "REPLIED"),
        ),
      )
      .orderBy(desc(outreachContacts.lastActivityAt))
      .limit(limit ?? 10);

    return rows.map(toDashboardContact);
  },

  async getSequencePerformance(
    tenantId: string,
    filters?: { dateFrom?: Date; dateTo?: Date; sector?: string },
  ): Promise<SequencePerformance[]> {
    const conditions = [eq(outreachActivities.tenantId, tenantId)];

    if (filters?.dateFrom) {
      conditions.push(gte(outreachActivities.occurredAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(outreachActivities.occurredAt, filters.dateTo));
    }
    if (filters?.sector) {
      conditions.push(eq(outreachSequences.sector, filters.sector));
    }

    const rows = await db
      .select({
        sequenceId: outreachActivities.sequenceId,
        sequenceName: outreachSequences.name,
        sector: outreachSequences.sector,
        abVariant: outreachSequences.abVariant,
        pairedSequenceId: outreachSequences.pairedSequenceId,
        activityType: outreachActivities.activityType,
        count: count(),
      })
      .from(outreachActivities)
      .innerJoin(outreachSequences, eq(outreachActivities.sequenceId, outreachSequences.id))
      .where(and(...conditions))
      .groupBy(
        outreachActivities.sequenceId,
        outreachSequences.name,
        outreachSequences.sector,
        outreachSequences.abVariant,
        outreachSequences.pairedSequenceId,
        outreachActivities.activityType,
      );

    // Aggregate per-sequence
    const sequenceMap = new Map<
      string,
      {
        sequenceId: string;
        name: string;
        sector: string;
        abVariant: string | null;
        pairedSequenceId: string | null;
        totalSent: number;
        totalReplied: number;
        totalConverted: number;
      }
    >();

    for (const row of rows) {
      let entry = sequenceMap.get(row.sequenceId);
      if (!entry) {
        entry = {
          sequenceId: row.sequenceId,
          name: row.sequenceName,
          sector: row.sector,
          abVariant: row.abVariant ?? null,
          pairedSequenceId: row.pairedSequenceId ?? null,
          totalSent: 0,
          totalReplied: 0,
          totalConverted: 0,
        };
        sequenceMap.set(row.sequenceId, entry);
      }

      const c = Number(row.count);
      if (row.activityType === "SENT") entry.totalSent += c;
      if (row.activityType === "REPLIED") entry.totalReplied += c;
      if (row.activityType === "CONVERTED") entry.totalConverted += c;
    }

    return Array.from(sequenceMap.values()).map((e) => ({
      sequenceId: e.sequenceId,
      name: e.name,
      sector: e.sector,
      abVariant: e.abVariant,
      pairedSequenceId: e.pairedSequenceId,
      totalSent: e.totalSent,
      totalReplied: e.totalReplied,
      replyRate: e.totalSent > 0 ? e.totalReplied / e.totalSent : 0,
      totalConverted: e.totalConverted,
      conversionRate: e.totalSent > 0 ? e.totalConverted / e.totalSent : 0,
    }));
  },

  async getSectorPerformance(
    tenantId: string,
    filters?: { dateFrom?: Date; dateTo?: Date },
  ): Promise<SectorPerformance[]> {
    const conditions = [eq(outreachActivities.tenantId, tenantId)];

    if (filters?.dateFrom) {
      conditions.push(gte(outreachActivities.occurredAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(outreachActivities.occurredAt, filters.dateTo));
    }

    const rows = await db
      .select({
        sector: outreachSequences.sector,
        activityType: outreachActivities.activityType,
        count: count(),
      })
      .from(outreachActivities)
      .innerJoin(outreachSequences, eq(outreachActivities.sequenceId, outreachSequences.id))
      .where(and(...conditions))
      .groupBy(outreachSequences.sector, outreachActivities.activityType);

    // Aggregate per-sector
    const sectorMap = new Map<
      string,
      { sector: string; totalSent: number; totalReplied: number; totalConverted: number }
    >();

    for (const row of rows) {
      let entry = sectorMap.get(row.sector);
      if (!entry) {
        entry = { sector: row.sector, totalSent: 0, totalReplied: 0, totalConverted: 0 };
        sectorMap.set(row.sector, entry);
      }

      const c = Number(row.count);
      if (row.activityType === "SENT") entry.totalSent += c;
      if (row.activityType === "REPLIED") entry.totalReplied += c;
      if (row.activityType === "CONVERTED") entry.totalConverted += c;
    }

    return Array.from(sectorMap.values()).map((e) => ({
      sector: e.sector,
      totalSent: e.totalSent,
      totalReplied: e.totalReplied,
      replyRate: e.totalSent > 0 ? e.totalReplied / e.totalSent : 0,
      totalConverted: e.totalConverted,
    }));
  },

  async categorizeContact(
    tenantId: string,
    contactId: string,
    replyCategory: string,
    sentiment: string,
  ): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        replyCategory: replyCategory as "INTERESTED" | "NOT_NOW" | "NOT_INTERESTED" | "WRONG_PERSON" | "AUTO_REPLY",
        sentiment: sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_NOW",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.id, contactId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(updated);
  },

  async snoozeContact(
    tenantId: string,
    contactId: string,
    snoozedUntil: Date,
  ): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        snoozedUntil,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.id, contactId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(updated);
  },

  async reactivateSnoozedContacts(): Promise<number> {
    const now = new Date();

    // Find all snoozed contacts ready for reactivation
    const snoozedContacts = await db
      .select()
      .from(outreachContacts)
      .where(
        and(
          eq(outreachContacts.status, "REPLIED"),
          lte(outreachContacts.snoozedUntil, now),
        ),
      );

    // Reactivate each with nextDueAt = now (so they appear in the due queue immediately)
    for (const row of snoozedContacts) {
      await db
        .update(outreachContacts)
        .set({
          status: "ACTIVE",
          snoozedUntil: null,
          nextDueAt: now,
          updatedAt: now,
        })
        .where(eq(outreachContacts.id, row.id));

      log.info({ tenantId: row.tenantId, contactId: row.id }, "Snoozed contact reactivated");
    }

    return snoozedContacts.length;
  },

  async findActivityById(
    tenantId: string,
    activityId: string,
  ): Promise<OutreachActivityRecord> {
    const [row] = await db
      .select()
      .from(outreachActivities)
      .where(
        and(
          eq(outreachActivities.tenantId, tenantId),
          eq(outreachActivities.id, activityId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachActivity", activityId);
    return toActivityRecord(row);
  },
};
