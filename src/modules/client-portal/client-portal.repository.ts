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
} from "@/shared/db/schema";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import type {
  EngagementRecord,
  EngagementWithCustomer,
  ProposalRecord,
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
    updates: Partial<{ type: string; status: string; title: string; description: string | null; startDate: Date | null; endDate: Date | null }>
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

    return {
      ...engagement,
      proposals: proposalList,
      milestones: milestoneList,
      deliverables: deliverableList,
      approvals: approvalList,
      invoices: invoiceList,
    };
  },
};
