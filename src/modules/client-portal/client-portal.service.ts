// src/modules/client-portal/client-portal.service.ts
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { logger } from "@/shared/logger";
import { inngest } from "@/shared/inngest";
import { NotFoundError, BadRequestError, UnauthorizedError } from "@/shared/errors";
import type { Context, PortalContext } from "@/shared/trpc";
import { clientPortalRepository } from "./client-portal.repository";
import type { z } from "zod";
import type {
  createEngagementSchema,
  updateEngagementSchema,
  listEngagementsSchema,
  createProposalSchema,
  sendProposalSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createDeliverableSchema,
  deliverDeliverableSchema,
  createApprovalSchema,
  createInvoiceSchema,
  sendInvoiceSchema,
  markInvoicePaidSchema,
  respondToApprovalSchema,
  acceptDeliverableSchema,
  setPasswordSchema,
  portalLoginSchema,
  requestMagicLinkSchema,
  getDashboardSchema,
  listByEngagementSchema,
  createProposalSectionSchema,
  updateProposalSectionSchema,
  deleteProposalSectionSchema,
  createProposalItemSchema,
  updateProposalItemSchema,
  deleteProposalItemSchema,
  createPaymentRuleSchema,
  updatePaymentRuleSchema,
  deletePaymentRuleSchema,
  voidInvoiceSchema,
  approveProposalSchema,
} from "./client-portal.schemas";
import type { ActivityItem, PortalDashboard } from "./client-portal.types";

const log = logger.child({ module: "client-portal.service" });

const MAGIC_LINK_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_DAYS = 30;
const PROPOSAL_TOKEN_EXPIRY_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const clientPortalService = {
  // ── Admin: Engagements ─────────────────────────────────────────────

  async listEngagements(ctx: Context, input: z.infer<typeof listEngagementsSchema>) {
    return clientPortalRepository.listEngagements(ctx.tenantId, {
      status: input.status,
      type: input.type,
      search: input.search,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async getEngagement(ctx: Context, id: string) {
    const detail = await clientPortalRepository.getEngagementDetail(ctx.tenantId, id);
    if (!detail) throw new NotFoundError("Engagement", id);
    return detail;
  },

  async createEngagement(ctx: Context, input: z.infer<typeof createEngagementSchema>) {
    return clientPortalRepository.createEngagement(ctx.tenantId, {
      customerId: input.customerId,
      type: input.type,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
    });
  },

  async updateEngagement(ctx: Context, input: z.infer<typeof updateEngagementSchema>) {
    return clientPortalRepository.updateEngagement(ctx.tenantId, input.id, {
      type: input.type,
      status: input.status,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },

  async searchCustomers(ctx: { tenantId: string }, input: { query: string; limit: number }) {
    return clientPortalRepository.searchCustomers(ctx.tenantId, input.query, input.limit);
  },

  // ── Admin: Proposals ───────────────────────────────────────────────

  async createProposal(ctx: Context, input: z.infer<typeof createProposalSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const token = randomUUID();
    const tokenExpiresAt = addDays(new Date(), PROPOSAL_TOKEN_EXPIRY_DAYS);

    return clientPortalRepository.createProposal({
      engagementId: input.engagementId,
      scope: input.scope,
      deliverables: input.deliverables,
      price: input.price,
      paymentSchedule: input.paymentSchedule,
      terms: input.terms,
      token,
      tokenExpiresAt,
      problemStatement: input.problemStatement,
      exclusions: input.exclusions,
      requirements: input.requirements,
      roiData: input.roiData,
    });
  },

  async sendProposal(ctx: Context, input: z.infer<typeof sendProposalSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Proposal has already been sent");

    // Get engagement to find customer
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    // Mark as sent
    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "SENT",
      sentAt: new Date(),
    });

    // Update engagement status
    await clientPortalRepository.updateEngagement(ctx.tenantId, engagement.id, {
      status: "PROPOSED",
    });

    // Emit event for email
    await inngest.send({
      name: "portal/proposal:sent",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ proposalId: proposal.id, engagementId: engagement.id }, "Proposal sent");
    return updated;
  },

  // ── Admin: Milestones ──────────────────────────────────────────────

  async createMilestone(ctx: Context, input: z.infer<typeof createMilestoneSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    // Auto-calculate sort order
    const existing = await clientPortalRepository.listMilestones(input.engagementId);
    const sortOrder = existing.length;

    return clientPortalRepository.createMilestone({
      engagementId: input.engagementId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      sortOrder,
    });
  },

  async updateMilestone(ctx: Context, input: z.infer<typeof updateMilestoneSchema>) {
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "COMPLETED") updates.completedAt = new Date();
    }
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;

    const milestone = await clientPortalRepository.updateMilestone(input.id, updates);

    // If milestone completed and has a source section, check for milestone-triggered payment rules
    if (input.status === "COMPLETED" && milestone.sourceSectionId) {
      const rules = await clientPortalRepository.findRulesBySectionId(milestone.sourceSectionId);

      if (rules.length > 0) {
        const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, milestone.engagementId);
        if (engagement) {
          let nextInvoiceNumber = await clientPortalRepository.getNextInvoiceNumber(ctx.tenantId);
          const now = new Date();

          const invoiceInputs = rules.map((rule) => {
            const invoiceNumber = nextInvoiceNumber;
            const seq = parseInt(nextInvoiceNumber.split("-").pop()!, 10);
            const year = now.getFullYear();
            nextInvoiceNumber = `INV-${year}-${String(seq + 1).padStart(4, "0")}`;

            return {
              engagementId: milestone.engagementId,
              amount: rule.amount,
              description: rule.label,
              dueDate: addDays(now, rule.relativeDays ?? 14),
              token: randomUUID(),
              sourcePaymentRuleId: rule.id,
              invoiceNumber,
            };
          });

          const invoices = await clientPortalRepository.createInvoiceBulk(invoiceInputs);

          // Auto-send if configured
          for (let i = 0; i < rules.length; i++) {
            if (rules[i].autoSend && invoices[i]) {
              await clientPortalRepository.updateInvoice(invoices[i].id, {
                status: "SENT",
                sentAt: new Date(),
              });
            }
          }

          log.info(
            { milestoneId: milestone.id, invoiceCount: invoices.length },
            "Milestone-triggered invoices generated"
          );
        }
      }
    }

    return milestone;
  },

  // ── Admin: Deliverables ────────────────────────────────────────────

  async createDeliverable(ctx: Context, input: z.infer<typeof createDeliverableSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    return clientPortalRepository.createDeliverable({
      engagementId: input.engagementId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
    });
  },

  async deliverDeliverable(ctx: Context, input: z.infer<typeof deliverDeliverableSchema>) {
    const deliverable = await clientPortalRepository.findDeliverable(input.id);
    if (!deliverable) throw new NotFoundError("Deliverable", input.id);

    // Verify tenant ownership via engagement
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, deliverable.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", deliverable.engagementId);

    const updated = await clientPortalRepository.updateDeliverable(input.id, {
      status: "DELIVERED",
      deliveredAt: new Date(),
    });

    await inngest.send({
      name: "portal/deliverable:shared",
      data: {
        deliverableId: deliverable.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ deliverableId: input.id }, "Deliverable marked as delivered");
    return updated;
  },

  // ── Admin: Approvals ───────────────────────────────────────────────

  async createApproval(ctx: Context, input: z.infer<typeof createApprovalSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const approval = await clientPortalRepository.createApproval({
      engagementId: input.engagementId,
      deliverableId: input.deliverableId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
    });

    await inngest.send({
      name: "portal/approval:requested",
      data: {
        approvalId: approval.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ approvalId: approval.id }, "Approval request created");
    return approval;
  },

  // ── Admin: Invoices ────────────────────────────────────────────────

  async createInvoice(ctx: Context, input: z.infer<typeof createInvoiceSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const token = randomUUID();
    return clientPortalRepository.createInvoice({
      engagementId: input.engagementId,
      milestoneId: input.milestoneId,
      proposalPaymentIndex: input.proposalPaymentIndex,
      amount: input.amount,
      description: input.description,
      dueDate: input.dueDate,
      token,
    });
  },

  async sendInvoice(ctx: Context, input: z.infer<typeof sendInvoiceSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);
    if (invoice.status !== "DRAFT") throw new BadRequestError("Invoice has already been sent");

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, invoice.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", invoice.engagementId);

    const updated = await clientPortalRepository.updateInvoice(invoice.id, {
      status: "SENT",
      sentAt: new Date(),
    });

    await inngest.send({
      name: "portal/invoice:sent",
      data: {
        invoiceId: invoice.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ invoiceId: invoice.id }, "Invoice sent");
    return updated;
  },

  async markInvoicePaid(ctx: Context, input: z.infer<typeof markInvoicePaidSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, invoice.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", invoice.engagementId);

    const updated = await clientPortalRepository.updateInvoice(invoice.id, {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null,
    });

    await inngest.send({
      name: "portal/invoice:paid",
      data: {
        invoiceId: invoice.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ invoiceId: invoice.id }, "Invoice marked as paid");
    return updated;
  },

  // ── Admin: Proposal Sections ──────────────────────────────────────

  async createProposalSection(ctx: Context, input: z.infer<typeof createProposalSectionSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    return clientPortalRepository.createSection({
      proposalId: input.proposalId,
      title: input.title,
      description: input.description,
      type: input.type,
      sortOrder: input.sortOrder,
      estimatedDuration: input.estimatedDuration,
    });
  },

  async updateProposalSection(ctx: Context, input: z.infer<typeof updateProposalSectionSchema>) {
    return clientPortalRepository.updateSection(input.id, {
      title: input.title,
      description: input.description,
      type: input.type,
      sortOrder: input.sortOrder,
      estimatedDuration: input.estimatedDuration,
    });
  },

  async deleteProposalSection(ctx: Context, input: z.infer<typeof deleteProposalSectionSchema>) {
    await clientPortalRepository.deleteSection(input.id);
  },

  // ── Admin: Proposal Items ─────────────────────────────────────────

  async createProposalItem(ctx: Context, input: z.infer<typeof createProposalItemSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    return clientPortalRepository.createItem({
      sectionId: input.sectionId,
      proposalId: input.proposalId,
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      sortOrder: input.sortOrder,
    });
  },

  async updateProposalItem(ctx: Context, input: z.infer<typeof updateProposalItemSchema>) {
    return clientPortalRepository.updateItem(input.id, {
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      sortOrder: input.sortOrder,
    });
  },

  async deleteProposalItem(ctx: Context, input: z.infer<typeof deleteProposalItemSchema>) {
    await clientPortalRepository.deleteItem(input.id);
  },

  // ── Admin: Payment Rules ──────────────────────────────────────────

  async createPaymentRule(ctx: Context, input: z.infer<typeof createPaymentRuleSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    return clientPortalRepository.createRule({
      proposalId: input.proposalId,
      tenantId: ctx.tenantId,
      sectionId: input.sectionId,
      label: input.label,
      amount: input.amount,
      trigger: input.trigger,
      recurringInterval: input.recurringInterval,
      relativeDays: input.relativeDays,
      fixedDate: input.fixedDate,
      autoSend: input.autoSend,
      sortOrder: input.sortOrder,
    });
  },

  async updatePaymentRule(ctx: Context, input: z.infer<typeof updatePaymentRuleSchema>) {
    return clientPortalRepository.updateRule(input.id, {
      sectionId: input.sectionId,
      label: input.label,
      amount: input.amount,
      trigger: input.trigger,
      recurringInterval: input.recurringInterval,
      relativeDays: input.relativeDays,
      fixedDate: input.fixedDate,
      autoSend: input.autoSend,
      sortOrder: input.sortOrder,
    });
  },

  async deletePaymentRule(ctx: Context, input: z.infer<typeof deletePaymentRuleSchema>) {
    await clientPortalRepository.deleteRule(input.id);
  },

  async voidInvoice(ctx: Context, input: z.infer<typeof voidInvoiceSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);
    if (invoice.status === "PAID") throw new BadRequestError("Cannot void a paid invoice");
    if (invoice.status === "VOID") throw new BadRequestError("Invoice is already voided");

    return clientPortalRepository.updateInvoice(invoice.id, { status: "VOID" });
  },

  // ── Portal: Proposals ──────────────────────────────────────────────

  async getProposalByToken(token: string) {
    const proposal = await clientPortalRepository.findProposalByToken(token);
    if (!proposal) throw new NotFoundError("Proposal", token);

    const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    const customer = await clientPortalRepository.findCustomerById(engagement.customerId);

    const [milestones, enriched, invoices] = await Promise.all([
      clientPortalRepository.listMilestones(engagement.id),
      clientPortalRepository.getProposalWithSections(proposal.id),
      proposal.status === "APPROVED"
        ? clientPortalRepository.listInvoices(engagement.id)
        : Promise.resolve([]),
    ]);

    return {
      ...proposal,
      sections: enriched?.sections ?? [],
      paymentRules: enriched?.paymentRules ?? [],
      engagement: {
        id: engagement.id,
        title: engagement.title,
        customerId: engagement.customerId,
        status: engagement.status,
      },
      customerName: customer ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client" : "Client",
      customerEmail: customer?.email ?? "",
      milestones,
      depositInvoices: invoices.map((i) => ({
        id: i.id,
        amount: i.amount,
        sourcePaymentRuleId: i.sourcePaymentRuleId,
      })),
    };
  },

  async approveProposal(portalCtx: PortalContext, input: z.infer<typeof approveProposalSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be approved");

    const engagement = await clientPortalRepository.findEngagementByCustomer(
      portalCtx.portalCustomerId,
      proposal.engagementId,
    );
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "APPROVED",
      approvedAt: new Date(),
    });

    await clientPortalRepository.updateEngagement(engagement.tenantId, engagement.id, {
      status: "ACTIVE",
      activeProposalId: proposal.id,
    });

    await inngest.send({
      name: "portal/proposal:approved",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
      },
    });

    log.info({ proposalId: proposal.id, engagementId: engagement.id }, "Proposal approved via portal session");
    return updated;
  },

  async approveProposalByToken(token: string) {
    const proposal = await clientPortalRepository.findProposalByToken(token);
    if (!proposal) throw new NotFoundError("Proposal", token);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be approved");
    if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");

    const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    const enriched = await clientPortalRepository.getProposalWithSections(proposal.id);
    if (!enriched) throw new NotFoundError("Proposal", proposal.id);

    // 1. Update proposal status
    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "APPROVED",
      approvedAt: new Date(),
    });

    // 2. Infer engagement type from sections
    const sectionTypes = new Set(enriched.sections.map((s) => s.type));
    let engagementType: string = engagement.type;
    if (sectionTypes.has("PHASE") && sectionTypes.has("RECURRING")) {
      engagementType = "HYBRID";
    } else if (sectionTypes.has("RECURRING") && !sectionTypes.has("PHASE")) {
      engagementType = "RETAINER";
    } else if (sectionTypes.has("PHASE")) {
      engagementType = "PROJECT";
    }

    // 3. Activate engagement
    await clientPortalRepository.updateEngagement(engagement.tenantId, engagement.id, {
      status: "ACTIVE",
      type: engagementType,
      startDate: new Date(),
      activeProposalId: proposal.id,
    });

    // 4. Materialize PHASE sections -> milestones
    const phaseSections = enriched.sections.filter((s) => s.type === "PHASE");
    const milestones = await clientPortalRepository.createMilestoneBulk(
      phaseSections.map((section) => ({
        engagementId: engagement.id,
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        sourceSectionId: section.id,
      }))
    );

    const sectionToMilestone = new Map<string, string>();
    phaseSections.forEach((section, i) => {
      if (milestones[i]) sectionToMilestone.set(section.id, milestones[i].id);
    });

    // 5. Materialize items -> deliverables (skip RECURRING section items)
    const deliverableInputs: {
      engagementId: string;
      milestoneId?: string | null;
      title: string;
      description?: string | null;
      sourceProposalItemId?: string | null;
    }[] = [];

    for (const section of enriched.sections) {
      if (section.type === "RECURRING") continue;
      const milestoneId = sectionToMilestone.get(section.id) ?? null;
      for (const item of section.items) {
        deliverableInputs.push({
          engagementId: engagement.id,
          milestoneId,
          title: item.title,
          description: item.description,
          sourceProposalItemId: item.id,
        });
      }
    }

    await clientPortalRepository.createDeliverableBulk(deliverableInputs);

    // 6. Materialize payment rules -> invoices (only immediate triggers)
    const now = new Date();
    const invoiceInputs: {
      engagementId: string;
      amount: number;
      description: string;
      dueDate: Date;
      token: string;
      sourcePaymentRuleId: string;
      invoiceNumber: string;
    }[] = [];

    let nextInvoiceNumber = await clientPortalRepository.getNextInvoiceNumber(engagement.tenantId);

    for (const rule of enriched.paymentRules) {
      let dueDate: Date | null = null;

      if (rule.trigger === "ON_APPROVAL") {
        dueDate = addDays(now, rule.relativeDays ?? 14);
      } else if (rule.trigger === "FIXED_DATE" && rule.fixedDate) {
        dueDate = rule.fixedDate;
      } else if (rule.trigger === "RELATIVE_DATE") {
        dueDate = addDays(now, rule.relativeDays ?? 14);
      }

      if (dueDate) {
        invoiceInputs.push({
          engagementId: engagement.id,
          amount: rule.amount,
          description: rule.label,
          dueDate,
          token: randomUUID(),
          sourcePaymentRuleId: rule.id,
          invoiceNumber: nextInvoiceNumber,
        });
        const seq = parseInt(nextInvoiceNumber.split("-").pop()!, 10);
        const year = new Date().getFullYear();
        nextInvoiceNumber = `INV-${year}-${String(seq + 1).padStart(4, "0")}`;
      }
    }

    await clientPortalRepository.createInvoiceBulk(invoiceInputs);

    // 7. Create portal session
    const session = await this.createMagicLinkSession(engagement.customerId);

    // 8. Emit events
    await inngest.send({
      name: "portal/proposal:approved",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
      },
    });

    log.info(
      { proposalId: proposal.id, engagementId: engagement.id, milestones: milestones.length, deliverables: deliverableInputs.length, invoices: invoiceInputs.length },
      "Proposal approved and materialized"
    );

    return { proposal: updated, sessionToken: session.sessionToken };
  },

  async declineProposalByToken(token: string, feedback?: string | null) {
    const proposal = await clientPortalRepository.findProposalByToken(token);
    if (!proposal) throw new NotFoundError("Proposal", token);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be declined");
    if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");

    const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "DECLINED",
      declinedAt: new Date(),
    });

    await inngest.send({
      name: "portal/proposal:declined",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
        feedback: feedback ?? null,
      },
    });

    log.info({ proposalId: proposal.id }, "Proposal declined by client via token");
    return updated;
  },

  // ── Admin: Preview portal as client ────────────────────────────────

  async createPreviewSession(ctx: Context, engagementId: string): Promise<{ sessionToken: string }> {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);

    const { sessionToken } = await this.createMagicLinkSession(engagement.customerId);
    log.info({ engagementId, adminUserId: ctx.user?.id }, "Admin preview session created");
    return { sessionToken };
  },

  // ── Portal: My Engagements ─────────────────────────────────────────

  async listMyEngagements(portalCtx: PortalContext) {
    return clientPortalRepository.listEngagementsByCustomer(portalCtx.portalCustomerId);
  },

  // ── Portal: Dashboard ──────────────────────────────────────────────

  async getDashboard(portalCtx: PortalContext, input: z.infer<typeof getDashboardSchema>): Promise<PortalDashboard> {
    const engagement = await clientPortalRepository.findEngagementByCustomer(
      portalCtx.portalCustomerId,
      input.engagementId,
    );
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const customer = await clientPortalRepository.findCustomerById(engagement.customerId);

    const [milestones, allDeliverables, allApprovals, allInvoices, proposalList] = await Promise.all([
      clientPortalRepository.listMilestones(engagement.id),
      clientPortalRepository.listDeliverables(engagement.id),
      clientPortalRepository.listApprovals(engagement.id),
      clientPortalRepository.listInvoices(engagement.id),
      clientPortalRepository.listProposalsByEngagement(engagement.id),
    ]);

    const pendingApprovals = allApprovals.filter((a) => a.status === "PENDING");
    const pendingInvoices = allInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");

    // Financial summary
    const nonVoidInvoices = allInvoices.filter((i) => i.status !== "VOID");
    const totalValue = nonVoidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = nonVoidInvoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
    const totalOutstanding = nonVoidInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").reduce((sum, i) => sum + i.amount, 0);
    const overdueCount = nonVoidInvoices.filter((i) => i.status === "OVERDUE").length;

    // Build activity feed from all entities
    const activity: ActivityItem[] = [];

    for (const p of proposalList) {
      if (p.sentAt) activity.push({ type: "proposal_sent", title: "Proposal sent", timestamp: p.sentAt });
      if (p.approvedAt) activity.push({ type: "proposal_approved", title: "Proposal approved", timestamp: p.approvedAt });
      if (p.declinedAt) activity.push({ type: "proposal_declined", title: "Proposal declined", timestamp: p.declinedAt });
    }
    for (const m of milestones) {
      if (m.status === "IN_PROGRESS") activity.push({ type: "milestone_started", title: `${m.title} started`, timestamp: m.updatedAt });
      if (m.completedAt) activity.push({ type: "milestone_completed", title: `${m.title} completed`, timestamp: m.completedAt });
    }
    for (const d of allDeliverables) {
      if (d.deliveredAt) activity.push({ type: "deliverable_shared", title: `${d.title} shared`, timestamp: d.deliveredAt });
      if (d.acceptedAt) activity.push({ type: "deliverable_accepted", title: `${d.title} accepted`, timestamp: d.acceptedAt });
    }
    for (const a of allApprovals) {
      activity.push({ type: "approval_requested", title: `Approval requested: ${a.title}`, timestamp: a.createdAt });
      if (a.respondedAt) activity.push({ type: "approval_responded", title: `Approval ${a.status.toLowerCase()}: ${a.title}`, timestamp: a.respondedAt });
    }
    for (const i of allInvoices) {
      if (i.sentAt) activity.push({ type: "invoice_sent", title: `Invoice sent: ${i.description}`, timestamp: i.sentAt });
      if (i.paidAt) activity.push({ type: "invoice_paid", title: `Invoice paid: ${i.description}`, timestamp: i.paidAt });
    }

    // Sort by timestamp descending
    activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      engagement,
      customerName: customer ? [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Client" : "Client",
      customerEmail: customer?.email ?? "",
      pendingApprovals,
      pendingInvoices,
      milestones,
      deliverables: allDeliverables,
      financials: { totalValue, totalPaid, totalOutstanding, overdueCount },
      activity,
    };
  },

  // ── Portal: Entity lists ───────────────────────────────────────────

  async listClientDeliverables(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listDeliverables(engagement.id);
  },

  async acceptDeliverable(portalCtx: PortalContext, input: z.infer<typeof acceptDeliverableSchema>) {
    const deliverable = await clientPortalRepository.findDeliverable(input.deliverableId);
    if (!deliverable) throw new NotFoundError("Deliverable", input.deliverableId);
    if (deliverable.status !== "DELIVERED") throw new BadRequestError("Deliverable is not ready for acceptance");

    // Verify ownership
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, deliverable.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", deliverable.engagementId);

    return clientPortalRepository.updateDeliverable(input.deliverableId, {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    });
  },

  async listClientInvoices(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listInvoices(engagement.id);
  },

  async listClientApprovals(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listApprovals(engagement.id);
  },

  async respondToApproval(portalCtx: PortalContext, input: z.infer<typeof respondToApprovalSchema>) {
    const approval = await clientPortalRepository.findApproval(input.approvalId);
    if (!approval) throw new NotFoundError("ApprovalRequest", input.approvalId);
    if (approval.status !== "PENDING") throw new BadRequestError("Approval has already been responded to");

    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, approval.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", approval.engagementId);

    const updated = await clientPortalRepository.updateApproval(input.approvalId, {
      status: input.approved ? "APPROVED" : "REJECTED",
      clientComment: input.comment ?? null,
      respondedAt: new Date(),
    });

    await inngest.send({
      name: "portal/approval:responded",
      data: {
        approvalId: approval.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
        approved: input.approved,
      },
    });

    return updated;
  },

  // ── Portal: Auth ───────────────────────────────────────────────────

  async createMagicLinkSession(customerId: string): Promise<{ token: string; sessionToken: string }> {
    const token = randomUUID();
    const sessionToken = randomUUID();
    const now = new Date();

    await clientPortalRepository.createSession({
      customerId,
      token,
      tokenExpiresAt: addDays(now, MAGIC_LINK_EXPIRY_DAYS),
      sessionToken,
      sessionExpiresAt: addDays(now, SESSION_EXPIRY_DAYS),
    });

    return { token, sessionToken };
  },

  async validateMagicLink(token: string): Promise<{ customerId: string; sessionToken: string }> {
    const session = await clientPortalRepository.findSessionByToken(token);
    if (!session) throw new UnauthorizedError("Invalid magic link");
    if (session.tokenExpiresAt < new Date()) throw new UnauthorizedError("Magic link has expired");
    if (!session.sessionToken) throw new UnauthorizedError("Session not initialized");
    return { customerId: session.customerId, sessionToken: session.sessionToken };
  },

  async setPassword(portalCtx: PortalContext, input: z.infer<typeof setPasswordSchema>): Promise<void> {
    const passwordHash = await hash(input.password, 12);
    await clientPortalRepository.upsertCredential(portalCtx.portalCustomerId, passwordHash);
    log.info({ customerId: portalCtx.portalCustomerId }, "Portal password set");
  },

  async login(input: z.infer<typeof portalLoginSchema>): Promise<{ sessionToken: string }> {
    const customer = await clientPortalRepository.findCustomerByEmail(input.email);
    if (!customer) throw new UnauthorizedError("Invalid email or password");

    const credential = await clientPortalRepository.findCredentialByCustomerId(customer.id);
    if (!credential) throw new UnauthorizedError("Invalid email or password");

    const valid = await compare(input.password, credential.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const { sessionToken } = await this.createMagicLinkSession(customer.id);
    return { sessionToken };
  },

  async requestMagicLink(input: z.infer<typeof requestMagicLinkSchema>): Promise<void> {
    const customer = await clientPortalRepository.findCustomerByEmail(input.email);
    if (!customer) {
      // Silent fail - don't reveal whether email exists
      log.info({ email: input.email }, "Magic link requested for unknown email");
      return;
    }
    const { token } = await this.createMagicLinkSession(customer.id);

    await inngest.send({
      name: "portal/magic-link:requested",
      data: {
        customerId: customer.id,
        tenantId: customer.tenantId,
        token,
        email: input.email,
      },
    });

    log.info({ customerId: customer.id }, "Magic link requested");
  },
};
