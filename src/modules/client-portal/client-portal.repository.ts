// src/modules/client-portal/client-portal.repository.ts
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  engagements,
  proposals,
  engagementMilestones,
  deliverables,
  approvalRequests,
  portalInvoices,
  portalCredentials,
  portalSessions,
  customers,
  proposalSections,
  proposalItems,
  paymentRules,
} from "@/shared/db/schema";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import type {
  EngagementRecord,
  EngagementWithCustomer,
  ProposalRecord,
  ProposalSectionRecord,
  ProposalItemRecord,
  PaymentRuleRecord,
  MilestoneRecord,
  DeliverableRecord,
  ApprovalRequestRecord,
  PortalInvoiceRecord,
  PortalSessionRecord,
  ProposalDeliverable,
  PaymentScheduleItem,
} from "./client-portal.types";

const log = logger.child({ module: "client-portal.repository" });

// ── Mappers ──────────────────────────────────────────────────────────────

type EngagementRow = typeof engagements.$inferSelect;
type ProposalRow = typeof proposals.$inferSelect;
type MilestoneRow = typeof engagementMilestones.$inferSelect;
type DeliverableRow = typeof deliverables.$inferSelect;
type ApprovalRow = typeof approvalRequests.$inferSelect;
type InvoiceRow = typeof portalInvoices.$inferSelect;
type SessionRow = typeof portalSessions.$inferSelect;

function toEngagement(row: EngagementRow): EngagementRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    activeProposalId: row.activeProposalId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toProposal(row: ProposalRow): ProposalRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    status: row.status,
    scope: row.scope,
    deliverables: (row.deliverables ?? []) as ProposalDeliverable[],
    price: row.price,
    paymentSchedule: (row.paymentSchedule ?? []) as PaymentScheduleItem[],
    terms: row.terms ?? null,
    token: row.token,
    tokenExpiresAt: row.tokenExpiresAt,
    sentAt: row.sentAt ?? null,
    approvedAt: row.approvedAt ?? null,
    declinedAt: row.declinedAt ?? null,
    version: row.version,
    revisionOf: row.revisionOf ?? null,
    problemStatement: row.problemStatement ?? null,
    exclusions: (row.exclusions ?? []) as string[],
    requirements: (row.requirements ?? []) as string[],
    roiData: (row.roiData ?? null) as import("./client-portal.types").RoiData | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMilestone(row: MilestoneRow): MilestoneRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    sortOrder: row.sortOrder,
    dueDate: row.dueDate ?? null,
    completedAt: row.completedAt ?? null,
    sourceSectionId: row.sourceSectionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDeliverable(row: DeliverableRow): DeliverableRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    milestoneId: row.milestoneId ?? null,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    fileUrl: row.fileUrl ?? null,
    fileName: row.fileName ?? null,
    fileSize: row.fileSize ?? null,
    deliveredAt: row.deliveredAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    sourceProposalItemId: row.sourceProposalItemId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toApproval(row: ApprovalRow): ApprovalRequestRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    deliverableId: row.deliverableId ?? null,
    milestoneId: row.milestoneId ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    clientComment: row.clientComment ?? null,
    respondedAt: row.respondedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInvoice(row: InvoiceRow): PortalInvoiceRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    milestoneId: row.milestoneId ?? null,
    proposalPaymentIndex: row.proposalPaymentIndex ?? null,
    amount: row.amount,
    description: row.description,
    status: row.status,
    dueDate: row.dueDate,
    paidAt: row.paidAt ?? null,
    paymentMethod: row.paymentMethod ?? null,
    paymentReference: row.paymentReference ?? null,
    token: row.token,
    sentAt: row.sentAt ?? null,
    sourcePaymentRuleId: row.sourcePaymentRuleId ?? null,
    stripePaymentIntentId: row.stripePaymentIntentId ?? null,
    stripePaymentUrl: row.stripePaymentUrl ?? null,
    invoiceNumber: row.invoiceNumber ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSession(row: SessionRow): PortalSessionRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    token: row.token,
    tokenExpiresAt: row.tokenExpiresAt,
    sessionToken: row.sessionToken ?? null,
    sessionExpiresAt: row.sessionExpiresAt ?? null,
    lastAccessedAt: row.lastAccessedAt,
    createdAt: row.createdAt,
  };
}

type SectionRow = typeof proposalSections.$inferSelect;
type ItemRow = typeof proposalItems.$inferSelect;
type RuleRow = typeof paymentRules.$inferSelect;

function toSection(row: SectionRow): ProposalSectionRecord {
  return {
    id: row.id,
    proposalId: row.proposalId,
    title: row.title,
    description: row.description ?? null,
    type: row.type,
    sortOrder: row.sortOrder,
    estimatedDuration: row.estimatedDuration ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItem(row: ItemRow): ProposalItemRecord {
  return {
    id: row.id,
    sectionId: row.sectionId,
    proposalId: row.proposalId,
    title: row.title,
    description: row.description ?? null,
    acceptanceCriteria: row.acceptanceCriteria ?? null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRule(row: RuleRow): PaymentRuleRecord {
  return {
    id: row.id,
    proposalId: row.proposalId,
    tenantId: row.tenantId,
    sectionId: row.sectionId ?? null,
    label: row.label,
    amount: row.amount,
    trigger: row.trigger,
    recurringInterval: row.recurringInterval ?? null,
    relativeDays: row.relativeDays ?? null,
    fixedDate: row.fixedDate ?? null,
    autoSend: row.autoSend,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Repository ───────────────────────────────────────────────────────────

export const clientPortalRepository = {
  // ── Engagements ──────────────────────────────────────────────────────

  async findEngagement(tenantId: string, id: string): Promise<EngagementRecord | null> {
    const result = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, id), eq(engagements.tenantId, tenantId)))
      .limit(1);
    return result[0] ? toEngagement(result[0]) : null;
  },

  async findEngagementById(engagementId: string): Promise<EngagementRecord | null> {
    const rows = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .limit(1);
    return rows[0] ? toEngagement(rows[0]) : null;
  },

  async findEngagementByCustomer(customerId: string, engagementId: string): Promise<EngagementRecord | null> {
    const result = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, engagementId), eq(engagements.customerId, customerId)))
      .limit(1);
    return result[0] ? toEngagement(result[0]) : null;
  },

  async listEngagementsByCustomer(customerId: string): Promise<EngagementRecord[]> {
    const rows = await db
      .select()
      .from(engagements)
      .where(eq(engagements.customerId, customerId))
      .orderBy(desc(engagements.createdAt));
    return rows.map(toEngagement);
  },

  async listEngagements(
    tenantId: string,
    opts: { status?: string; type?: string; search?: string; limit: number; cursor?: string }
  ): Promise<{ rows: EngagementWithCustomer[]; hasMore: boolean }> {
    const conditions = [eq(engagements.tenantId, tenantId)];
    if (opts.status) conditions.push(eq(engagements.status, opts.status as any));
    if (opts.type) conditions.push(eq(engagements.type, opts.type as any));
    if (opts.search) {
      conditions.push(
        sql`(${ilike(engagements.title, `%${opts.search}%`)} OR ${ilike(customers.firstName, `%${opts.search}%`)} OR ${ilike(customers.lastName, `%${opts.search}%`)})`
      );
    }

    const rows = await db
      .select({
        engagement: engagements,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
      })
      .from(engagements)
      .innerJoin(customers, eq(engagements.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(engagements.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const sliced = hasMore ? rows.slice(0, opts.limit) : rows;

    return {
      rows: sliced.map((r) => ({
        ...toEngagement(r.engagement),
        customerName: [r.customerFirstName, r.customerLastName].filter(Boolean).join(" "),
        customerEmail: r.customerEmail ?? "",
      })),
      hasMore,
    };
  },

  async createEngagement(
    tenantId: string,
    input: { customerId: string; type: string; title: string; description?: string | null; startDate?: Date | null }
  ): Promise<EngagementRecord> {
    const now = new Date();
    const [row] = await db
      .insert(engagements)
      .values({
        tenantId,
        customerId: input.customerId,
        type: input.type as any,
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ tenantId, engagementId: row!.id }, "Engagement created");
    return toEngagement(row!);
  },

  async updateEngagement(
    tenantId: string,
    id: string,
    updates: Partial<{ type: string; status: string; title: string; description: string | null; startDate: Date | null; endDate: Date | null; activeProposalId: string | null }>
  ): Promise<EngagementRecord> {
    const [row] = await db
      .update(engagements)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(and(eq(engagements.id, id), eq(engagements.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundError("Engagement", id);
    return toEngagement(row);
  },

  // ── Proposals ────────────────────────────────────────────────────────

  async findProposal(id: string): Promise<ProposalRecord | null> {
    const result = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
    return result[0] ? toProposal(result[0]) : null;
  },

  async findProposalByToken(token: string): Promise<ProposalRecord | null> {
    const result = await db.select().from(proposals).where(eq(proposals.token, token)).limit(1);
    return result[0] ? toProposal(result[0]) : null;
  },

  async listProposalsByEngagement(engagementId: string): Promise<ProposalRecord[]> {
    const rows = await db
      .select()
      .from(proposals)
      .where(eq(proposals.engagementId, engagementId))
      .orderBy(desc(proposals.createdAt));
    return rows.map(toProposal);
  },

  async createProposal(input: {
    engagementId: string;
    scope: string;
    deliverables: ProposalDeliverable[];
    price: number;
    paymentSchedule: PaymentScheduleItem[];
    terms?: string | null;
    token: string;
    tokenExpiresAt: Date;
  }): Promise<ProposalRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposals)
      .values({
        engagementId: input.engagementId,
        scope: input.scope,
        deliverables: input.deliverables,
        price: input.price,
        paymentSchedule: input.paymentSchedule,
        terms: input.terms ?? null,
        token: input.token,
        tokenExpiresAt: input.tokenExpiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ proposalId: row!.id, engagementId: input.engagementId }, "Proposal created");
    return toProposal(row!);
  },

  async updateProposal(
    id: string,
    updates: Partial<{ status: string; sentAt: Date; approvedAt: Date; declinedAt: Date }>
  ): Promise<ProposalRecord> {
    const [row] = await db
      .update(proposals)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposals.id, id))
      .returning();
    if (!row) throw new NotFoundError("Proposal", id);
    return toProposal(row);
  },

  // ── Milestones ───────────────────────────────────────────────────────

  async listMilestones(engagementId: string): Promise<MilestoneRecord[]> {
    const rows = await db
      .select()
      .from(engagementMilestones)
      .where(eq(engagementMilestones.engagementId, engagementId))
      .orderBy(engagementMilestones.sortOrder);
    return rows.map(toMilestone);
  },

  async createMilestone(input: {
    engagementId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    sortOrder: number;
  }): Promise<MilestoneRecord> {
    const now = new Date();
    const [row] = await db
      .insert(engagementMilestones)
      .values({
        engagementId: input.engagementId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ milestoneId: row!.id, engagementId: input.engagementId }, "Milestone created");
    return toMilestone(row!);
  },

  async updateMilestone(
    id: string,
    updates: Partial<{ title: string; description: string | null; status: string; sortOrder: number; dueDate: Date | null; completedAt: Date | null }>
  ): Promise<MilestoneRecord> {
    const [row] = await db
      .update(engagementMilestones)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(engagementMilestones.id, id))
      .returning();
    if (!row) throw new NotFoundError("Milestone", id);
    return toMilestone(row);
  },

  // ── Deliverables ─────────────────────────────────────────────────────

  async findDeliverable(id: string): Promise<DeliverableRecord | null> {
    const result = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1);
    return result[0] ? toDeliverable(result[0]) : null;
  },

  async listDeliverables(engagementId: string): Promise<DeliverableRecord[]> {
    const rows = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.engagementId, engagementId))
      .orderBy(desc(deliverables.createdAt));
    return rows.map(toDeliverable);
  },

  async createDeliverable(input: {
    engagementId: string;
    milestoneId?: string | null;
    title: string;
    description?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
  }): Promise<DeliverableRecord> {
    const now = new Date();
    const [row] = await db
      .insert(deliverables)
      .values({
        engagementId: input.engagementId,
        milestoneId: input.milestoneId ?? null,
        title: input.title,
        description: input.description ?? null,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        fileSize: input.fileSize ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ deliverableId: row!.id, engagementId: input.engagementId }, "Deliverable created");
    return toDeliverable(row!);
  },

  async updateDeliverable(
    id: string,
    updates: Partial<{ status: string; deliveredAt: Date; acceptedAt: Date }>
  ): Promise<DeliverableRecord> {
    const [row] = await db
      .update(deliverables)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(deliverables.id, id))
      .returning();
    if (!row) throw new NotFoundError("Deliverable", id);
    return toDeliverable(row);
  },

  // ── Approval Requests ────────────────────────────────────────────────

  async findApproval(id: string): Promise<ApprovalRequestRecord | null> {
    const result = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
    return result[0] ? toApproval(result[0]) : null;
  },

  async listApprovals(engagementId: string): Promise<ApprovalRequestRecord[]> {
    const rows = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.engagementId, engagementId))
      .orderBy(desc(approvalRequests.createdAt));
    return rows.map(toApproval);
  },

  async createApproval(input: {
    engagementId: string;
    deliverableId?: string | null;
    milestoneId?: string | null;
    title: string;
    description: string;
  }): Promise<ApprovalRequestRecord> {
    const now = new Date();
    const [row] = await db
      .insert(approvalRequests)
      .values({
        engagementId: input.engagementId,
        deliverableId: input.deliverableId ?? null,
        milestoneId: input.milestoneId ?? null,
        title: input.title,
        description: input.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ approvalId: row!.id, engagementId: input.engagementId }, "Approval request created");
    return toApproval(row!);
  },

  async updateApproval(
    id: string,
    updates: Partial<{ status: string; clientComment: string | null; respondedAt: Date }>
  ): Promise<ApprovalRequestRecord> {
    const [row] = await db
      .update(approvalRequests)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(approvalRequests.id, id))
      .returning();
    if (!row) throw new NotFoundError("ApprovalRequest", id);
    return toApproval(row);
  },

  // ── Invoices ─────────────────────────────────────────────────────────

  async findInvoice(id: string): Promise<PortalInvoiceRecord | null> {
    const result = await db.select().from(portalInvoices).where(eq(portalInvoices.id, id)).limit(1);
    return result[0] ? toInvoice(result[0]) : null;
  },

  async listInvoices(engagementId: string): Promise<PortalInvoiceRecord[]> {
    const rows = await db
      .select()
      .from(portalInvoices)
      .where(eq(portalInvoices.engagementId, engagementId))
      .orderBy(desc(portalInvoices.createdAt));
    return rows.map(toInvoice);
  },

  async createInvoice(input: {
    engagementId: string;
    milestoneId?: string | null;
    proposalPaymentIndex?: number | null;
    amount: number;
    description: string;
    dueDate: Date;
    token: string;
  }): Promise<PortalInvoiceRecord> {
    const now = new Date();
    const [row] = await db
      .insert(portalInvoices)
      .values({
        engagementId: input.engagementId,
        milestoneId: input.milestoneId ?? null,
        proposalPaymentIndex: input.proposalPaymentIndex ?? null,
        amount: input.amount,
        description: input.description,
        dueDate: input.dueDate,
        token: input.token,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ invoiceId: row!.id, engagementId: input.engagementId }, "Invoice created");
    return toInvoice(row!);
  },

  async updateInvoice(
    id: string,
    updates: Partial<{ status: string; sentAt: Date; paidAt: Date; paymentMethod: string; paymentReference: string | null }>
  ): Promise<PortalInvoiceRecord> {
    const [row] = await db
      .update(portalInvoices)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(portalInvoices.id, id))
      .returning();
    if (!row) throw new NotFoundError("PortalInvoice", id);
    return toInvoice(row);
  },

  // ── Portal Auth ──────────────────────────────────────────────────────

  async createSession(input: {
    customerId: string;
    token: string;
    tokenExpiresAt: Date;
    sessionToken: string;
    sessionExpiresAt: Date;
  }): Promise<PortalSessionRecord> {
    const now = new Date();
    const [row] = await db
      .insert(portalSessions)
      .values({
        customerId: input.customerId,
        token: input.token,
        tokenExpiresAt: input.tokenExpiresAt,
        sessionToken: input.sessionToken,
        sessionExpiresAt: input.sessionExpiresAt,
        lastAccessedAt: now,
      })
      .returning();
    return toSession(row!);
  },

  async findSessionByToken(token: string): Promise<PortalSessionRecord | null> {
    const result = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.token, token))
      .limit(1);
    return result[0] ? toSession(result[0]) : null;
  },

  async findSessionBySessionToken(sessionToken: string): Promise<PortalSessionRecord | null> {
    const result = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.sessionToken, sessionToken))
      .limit(1);
    return result[0] ? toSession(result[0]) : null;
  },

  async findCredentialByCustomerId(customerId: string): Promise<{ passwordHash: string } | null> {
    const result = await db
      .select({ passwordHash: portalCredentials.passwordHash })
      .from(portalCredentials)
      .where(eq(portalCredentials.customerId, customerId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsertCredential(customerId: string, passwordHash: string): Promise<void> {
    const now = new Date();
    await db
      .insert(portalCredentials)
      .values({ customerId, passwordHash, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: portalCredentials.customerId,
        set: { passwordHash, updatedAt: now },
      });
  },

  async findCustomerByEmail(email: string): Promise<{ id: string; tenantId: string } | null> {
    const result = await db
      .select({ id: customers.id, tenantId: customers.tenantId })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);
    return result[0] ?? null;
  },

  async findCustomerById(id: string): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null; tenantId: string } | null> {
    const result = await db
      .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName, email: customers.email, tenantId: customers.tenantId })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async searchCustomers(
    tenantId: string,
    query: string,
    limit: number = 10
  ): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string | null }[]> {
    const rows = await db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          sql`(${ilike(customers.firstName, `%${query}%`)} OR ${ilike(customers.lastName, `%${query}%`)} OR ${ilike(customers.email, `%${query}%`)})`
        )
      )
      .orderBy(customers.lastName)
      .limit(limit);
    return rows;
  },

  // ── Engagement detail (for admin get) ────────────────────────────────

  async getEngagementDetail(tenantId: string, id: string) {
    const engagement = await this.findEngagement(tenantId, id);
    if (!engagement) return null;

    const [proposalList, milestoneList, deliverableList, approvalList, invoiceList] =
      await Promise.all([
        this.listProposalsByEngagement(id),
        this.listMilestones(id),
        this.listDeliverables(id),
        this.listApprovals(id),
        this.listInvoices(id),
      ]);

    // Enrich proposals with sections/items/rules
    const enrichedProposals = await Promise.all(
      proposalList.map(async (proposal) => {
        const enriched = await this.getProposalWithSections(proposal.id);
        return enriched
          ? { ...proposal, sections: enriched.sections, paymentRules: enriched.paymentRules }
          : proposal;
      })
    );

    return {
      ...engagement,
      proposals: enrichedProposals,
      milestones: milestoneList,
      deliverables: deliverableList,
      approvals: approvalList,
      invoices: invoiceList,
    };
  },

  // ── Proposal Sections ───────────────────────────────────────────────

  async listSections(proposalId: string): Promise<ProposalSectionRecord[]> {
    const rows = await db
      .select()
      .from(proposalSections)
      .where(eq(proposalSections.proposalId, proposalId))
      .orderBy(proposalSections.sortOrder);
    return rows.map(toSection);
  },

  async createSection(input: {
    proposalId: string;
    title: string;
    description?: string | null;
    type: string;
    sortOrder: number;
    estimatedDuration?: string | null;
  }): Promise<ProposalSectionRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposalSections)
      .values({
        proposalId: input.proposalId,
        title: input.title,
        description: input.description ?? null,
        type: input.type as any,
        sortOrder: input.sortOrder,
        estimatedDuration: input.estimatedDuration ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ sectionId: row!.id, proposalId: input.proposalId }, "Proposal section created");
    return toSection(row!);
  },

  async updateSection(
    id: string,
    updates: Partial<{ title: string; description: string | null; type: string; sortOrder: number; estimatedDuration: string | null }>
  ): Promise<ProposalSectionRecord> {
    const [row] = await db
      .update(proposalSections)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposalSections.id, id))
      .returning();
    if (!row) throw new NotFoundError("ProposalSection", id);
    return toSection(row);
  },

  async deleteSection(id: string): Promise<void> {
    const result = await db
      .delete(proposalSections)
      .where(eq(proposalSections.id, id))
      .returning({ id: proposalSections.id });
    if (!result.length) throw new NotFoundError("ProposalSection", id);
    log.info({ sectionId: id }, "Proposal section deleted");
  },

  // ── Proposal Items ──────────────────────────────────────────────────

  async listItems(proposalId: string): Promise<ProposalItemRecord[]> {
    const rows = await db
      .select()
      .from(proposalItems)
      .where(eq(proposalItems.proposalId, proposalId))
      .orderBy(proposalItems.sortOrder);
    return rows.map(toItem);
  },

  async listItemsBySection(sectionId: string): Promise<ProposalItemRecord[]> {
    const rows = await db
      .select()
      .from(proposalItems)
      .where(eq(proposalItems.sectionId, sectionId))
      .orderBy(proposalItems.sortOrder);
    return rows.map(toItem);
  },

  async createItem(input: {
    sectionId: string;
    proposalId: string;
    title: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    sortOrder: number;
  }): Promise<ProposalItemRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposalItems)
      .values({
        sectionId: input.sectionId,
        proposalId: input.proposalId,
        title: input.title,
        description: input.description ?? null,
        acceptanceCriteria: input.acceptanceCriteria ?? null,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ itemId: row!.id, sectionId: input.sectionId }, "Proposal item created");
    return toItem(row!);
  },

  async updateItem(
    id: string,
    updates: Partial<{ title: string; description: string | null; acceptanceCriteria: string | null; sortOrder: number }>
  ): Promise<ProposalItemRecord> {
    const [row] = await db
      .update(proposalItems)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposalItems.id, id))
      .returning();
    if (!row) throw new NotFoundError("ProposalItem", id);
    return toItem(row);
  },

  async deleteItem(id: string): Promise<void> {
    const result = await db
      .delete(proposalItems)
      .where(eq(proposalItems.id, id))
      .returning({ id: proposalItems.id });
    if (!result.length) throw new NotFoundError("ProposalItem", id);
    log.info({ itemId: id }, "Proposal item deleted");
  },

  // ── Payment Rules ───────────────────────────────────────────────────

  async listRules(proposalId: string): Promise<PaymentRuleRecord[]> {
    const rows = await db
      .select()
      .from(paymentRules)
      .where(eq(paymentRules.proposalId, proposalId))
      .orderBy(paymentRules.sortOrder);
    return rows.map(toRule);
  },

  async createRule(input: {
    proposalId: string;
    tenantId: string;
    sectionId?: string | null;
    label: string;
    amount: number;
    trigger: string;
    recurringInterval?: string | null;
    relativeDays?: number | null;
    fixedDate?: Date | null;
    autoSend: boolean;
    sortOrder: number;
  }): Promise<PaymentRuleRecord> {
    const now = new Date();
    const [row] = await db
      .insert(paymentRules)
      .values({
        proposalId: input.proposalId,
        tenantId: input.tenantId,
        sectionId: input.sectionId ?? null,
        label: input.label,
        amount: input.amount,
        trigger: input.trigger as any,
        recurringInterval: input.recurringInterval as any ?? null,
        relativeDays: input.relativeDays ?? null,
        fixedDate: input.fixedDate ?? null,
        autoSend: input.autoSend,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ ruleId: row!.id, proposalId: input.proposalId }, "Payment rule created");
    return toRule(row!);
  },

  async updateRule(
    id: string,
    updates: Partial<{
      sectionId: string | null;
      label: string;
      amount: number;
      trigger: string;
      recurringInterval: string | null;
      relativeDays: number | null;
      fixedDate: Date | null;
      autoSend: boolean;
      sortOrder: number;
    }>
  ): Promise<PaymentRuleRecord> {
    const [row] = await db
      .update(paymentRules)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(paymentRules.id, id))
      .returning();
    if (!row) throw new NotFoundError("PaymentRule", id);
    return toRule(row);
  },

  async deleteRule(id: string): Promise<void> {
    const result = await db
      .delete(paymentRules)
      .where(eq(paymentRules.id, id))
      .returning({ id: paymentRules.id });
    if (!result.length) throw new NotFoundError("PaymentRule", id);
    log.info({ ruleId: id }, "Payment rule deleted");
  },

  async findActiveRecurringRules(): Promise<(PaymentRuleRecord & { engagementId: string })[]> {
    const rows = await db
      .select({
        rule: paymentRules,
        engagementId: engagements.id,
      })
      .from(paymentRules)
      .innerJoin(proposals, eq(paymentRules.proposalId, proposals.id))
      .innerJoin(engagements, eq(proposals.engagementId, engagements.id))
      .where(
        and(
          eq(paymentRules.trigger, "RECURRING"),
          eq(proposals.status, "APPROVED"),
          eq(engagements.status, "ACTIVE")
        )
      );
    return rows.map((r) => ({
      ...toRule(r.rule),
      engagementId: r.engagementId,
    }));
  },

  async findRulesBySectionId(sectionId: string): Promise<PaymentRuleRecord[]> {
    const rows = await db
      .select()
      .from(paymentRules)
      .where(
        and(
          eq(paymentRules.sectionId, sectionId),
          eq(paymentRules.trigger, "MILESTONE_COMPLETE")
        )
      );
    return rows.map(toRule);
  },

  async findLastInvoiceForRule(ruleId: string): Promise<PortalInvoiceRecord | null> {
    const rows = await db
      .select()
      .from(portalInvoices)
      .where(eq(portalInvoices.sourcePaymentRuleId, ruleId))
      .orderBy(desc(portalInvoices.createdAt))
      .limit(1);
    return rows[0] ? toInvoice(rows[0]) : null;
  },

  // ── Enriched Proposal Query ─────────────────────────────────────────

  async getProposalWithSections(proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    if (!proposal) return null;

    const [sectionList, itemList, ruleList] = await Promise.all([
      this.listSections(proposalId),
      this.listItems(proposalId),
      this.listRules(proposalId),
    ]);

    const sections = sectionList.map((section) => ({
      ...section,
      items: itemList.filter((item) => item.sectionId === section.id),
    }));

    return { ...proposal, sections, paymentRules: ruleList };
  },

  // ── Bulk Create Methods ─────────────────────────────────────────────

  async createMilestoneBulk(
    inputs: {
      engagementId: string;
      title: string;
      description?: string | null;
      sortOrder: number;
      dueDate?: Date | null;
      sourceSectionId?: string | null;
    }[]
  ): Promise<MilestoneRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(engagementMilestones)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          title: input.title,
          description: input.description ?? null,
          sortOrder: input.sortOrder,
          dueDate: input.dueDate ?? null,
          sourceSectionId: input.sourceSectionId ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toMilestone);
  },

  async createDeliverableBulk(
    inputs: {
      engagementId: string;
      milestoneId?: string | null;
      title: string;
      description?: string | null;
      sourceProposalItemId?: string | null;
    }[]
  ): Promise<DeliverableRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(deliverables)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          milestoneId: input.milestoneId ?? null,
          title: input.title,
          description: input.description ?? null,
          sourceProposalItemId: input.sourceProposalItemId ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toDeliverable);
  },

  async createInvoiceBulk(
    inputs: {
      engagementId: string;
      milestoneId?: string | null;
      amount: number;
      description: string;
      dueDate: Date;
      token: string;
      sourcePaymentRuleId?: string | null;
      invoiceNumber?: string | null;
    }[]
  ): Promise<PortalInvoiceRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(portalInvoices)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          milestoneId: input.milestoneId ?? null,
          amount: input.amount,
          description: input.description,
          dueDate: input.dueDate,
          token: input.token,
          sourcePaymentRuleId: input.sourcePaymentRuleId ?? null,
          invoiceNumber: input.invoiceNumber ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toInvoice);
  },

  async getNextInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const result = await db
      .select({ invoiceNumber: portalInvoices.invoiceNumber })
      .from(portalInvoices)
      .innerJoin(engagements, eq(portalInvoices.engagementId, engagements.id))
      .where(
        and(
          eq(engagements.tenantId, tenantId),
          sql`${portalInvoices.invoiceNumber} LIKE ${prefix + '%'}`
        )
      )
      .orderBy(desc(portalInvoices.invoiceNumber))
      .limit(1);

    if (!result[0]?.invoiceNumber) return `${prefix}0001`;
    const lastSeq = parseInt(result[0].invoiceNumber.replace(prefix, ""), 10);
    return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
  },

  async findOverdueInvoices(): Promise<(PortalInvoiceRecord & { tenantId: string; customerId: string })[]> {
    const now = new Date();
    const rows = await db
      .select({
        invoice: portalInvoices,
        tenantId: engagements.tenantId,
        customerId: engagements.customerId,
      })
      .from(portalInvoices)
      .innerJoin(engagements, eq(portalInvoices.engagementId, engagements.id))
      .where(
        and(
          eq(portalInvoices.status, "SENT"),
          sql`${portalInvoices.dueDate} < ${now}`
        )
      );
    return rows.map((r) => ({
      ...toInvoice(r.invoice),
      tenantId: r.tenantId,
      customerId: r.customerId,
    }));
  },
};
