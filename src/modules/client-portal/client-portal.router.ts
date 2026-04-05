// src/modules/client-portal/client-portal.router.ts
import { z } from "zod";
import {
  router,
  publicProcedure,
  permissionProcedure,
  portalProcedure,
} from "@/shared/trpc";
import { clientPortalService } from "./client-portal.service";
import {
  createEngagementSchema,
  updateEngagementSchema,
  listEngagementsSchema,
  searchCustomersSchema,
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
  getProposalByTokenSchema,
  approveProposalByTokenSchema,
  declineProposalByTokenSchema,
  getDashboardSchema,
  listByEngagementSchema,
  acceptDeliverableSchema,
  respondToApprovalSchema,
  setPasswordSchema,
  portalLoginSchema,
  requestMagicLinkSchema,
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
} from "./client-portal.schemas";
import type { PortalContext } from "@/shared/trpc";

// ── Admin procedures ─────────────────────────────────────────────────────

const adminRouter = router({
  // Engagements
  listEngagements: permissionProcedure("engagement:read")
    .input(listEngagementsSchema)
    .query(({ ctx, input }) => clientPortalService.listEngagements(ctx, input)),

  getEngagement: permissionProcedure("engagement:read")
    .input(z.object({ id: z.uuid() }))
    .query(({ ctx, input }) => clientPortalService.getEngagement(ctx, input.id)),

  createEngagement: permissionProcedure("engagement:create")
    .input(createEngagementSchema)
    .mutation(({ ctx, input }) => clientPortalService.createEngagement(ctx, input)),

  updateEngagement: permissionProcedure("engagement:update")
    .input(updateEngagementSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateEngagement(ctx, input)),

  searchCustomers: permissionProcedure("engagement:read")
    .input(searchCustomersSchema)
    .query(({ ctx, input }) => clientPortalService.searchCustomers(ctx, input)),

  // Proposals
  createProposal: permissionProcedure("proposal:create")
    .input(createProposalSchema)
    .mutation(({ ctx, input }) => clientPortalService.createProposal(ctx, input)),

  sendProposal: permissionProcedure("proposal:send")
    .input(sendProposalSchema)
    .mutation(({ ctx, input }) => clientPortalService.sendProposal(ctx, input)),

  // Milestones
  createMilestone: permissionProcedure("milestone:create")
    .input(createMilestoneSchema)
    .mutation(({ ctx, input }) => clientPortalService.createMilestone(ctx, input)),

  updateMilestone: permissionProcedure("milestone:update")
    .input(updateMilestoneSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateMilestone(ctx, input)),

  // Deliverables
  createDeliverable: permissionProcedure("deliverable:create")
    .input(createDeliverableSchema)
    .mutation(({ ctx, input }) => clientPortalService.createDeliverable(ctx, input)),

  deliverDeliverable: permissionProcedure("deliverable:update")
    .input(deliverDeliverableSchema)
    .mutation(({ ctx, input }) => clientPortalService.deliverDeliverable(ctx, input)),

  // Approvals
  createApproval: permissionProcedure("approval:create")
    .input(createApprovalSchema)
    .mutation(({ ctx, input }) => clientPortalService.createApproval(ctx, input)),

  // Invoices
  createInvoice: permissionProcedure("invoice:create")
    .input(createInvoiceSchema)
    .mutation(({ ctx, input }) => clientPortalService.createInvoice(ctx, input)),

  sendInvoice: permissionProcedure("invoice:send")
    .input(sendInvoiceSchema)
    .mutation(({ ctx, input }) => clientPortalService.sendInvoice(ctx, input)),

  markInvoicePaid: permissionProcedure("invoice:update")
    .input(markInvoicePaidSchema)
    .mutation(({ ctx, input }) => clientPortalService.markInvoicePaid(ctx, input)),

  // Proposal Sections
  createProposalSection: permissionProcedure("proposal:create")
    .input(createProposalSectionSchema)
    .mutation(({ ctx, input }) => clientPortalService.createProposalSection(ctx, input)),

  updateProposalSection: permissionProcedure("proposal:update")
    .input(updateProposalSectionSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateProposalSection(ctx, input)),

  deleteProposalSection: permissionProcedure("proposal:update")
    .input(deleteProposalSectionSchema)
    .mutation(({ ctx, input }) => clientPortalService.deleteProposalSection(ctx, input)),

  // Proposal Items
  createProposalItem: permissionProcedure("proposal:create")
    .input(createProposalItemSchema)
    .mutation(({ ctx, input }) => clientPortalService.createProposalItem(ctx, input)),

  updateProposalItem: permissionProcedure("proposal:update")
    .input(updateProposalItemSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateProposalItem(ctx, input)),

  deleteProposalItem: permissionProcedure("proposal:update")
    .input(deleteProposalItemSchema)
    .mutation(({ ctx, input }) => clientPortalService.deleteProposalItem(ctx, input)),

  // Payment Rules
  createPaymentRule: permissionProcedure("invoice:create")
    .input(createPaymentRuleSchema)
    .mutation(({ ctx, input }) => clientPortalService.createPaymentRule(ctx, input)),

  updatePaymentRule: permissionProcedure("invoice:update")
    .input(updatePaymentRuleSchema)
    .mutation(({ ctx, input }) => clientPortalService.updatePaymentRule(ctx, input)),

  deletePaymentRule: permissionProcedure("invoice:update")
    .input(deletePaymentRuleSchema)
    .mutation(({ ctx, input }) => clientPortalService.deletePaymentRule(ctx, input)),

  // Void Invoice
  voidInvoice: permissionProcedure("invoice:update")
    .input(voidInvoiceSchema)
    .mutation(({ ctx, input }) => clientPortalService.voidInvoice(ctx, input)),

  createPreviewSession: permissionProcedure("engagement:read")
    .input(z.object({ engagementId: z.uuid() }))
    .mutation(({ ctx, input }) => clientPortalService.createPreviewSession(ctx, input.engagementId)),
});

// ── Portal procedures (client-facing) ────────────────────────────────────

const portalRouter = router({
  // Public (no session needed - uses proposal token)
  getProposal: publicProcedure
    .input(getProposalByTokenSchema)
    .query(({ input }) => clientPortalService.getProposalByToken(input.token)),

  // Public auth endpoints
  login: publicProcedure
    .input(portalLoginSchema)
    .mutation(({ input }) => clientPortalService.login(input)),

  requestMagicLink: publicProcedure
    .input(requestMagicLinkSchema)
    .mutation(({ input }) => clientPortalService.requestMagicLink(input)),

  // Token-based (no session needed)
  approveProposal: publicProcedure
    .input(approveProposalByTokenSchema)
    .mutation(({ input }) =>
      clientPortalService.approveProposalByToken(input.token)),

  declineProposal: publicProcedure
    .input(declineProposalByTokenSchema)
    .mutation(({ input }) =>
      clientPortalService.declineProposalByToken(input.token, input.feedback)),

  listMyEngagements: portalProcedure
    .query(({ ctx }) =>
      clientPortalService.listMyEngagements(ctx as PortalContext)),

  getDashboard: portalProcedure
    .input(getDashboardSchema)
    .query(({ ctx, input }) =>
      clientPortalService.getDashboard(ctx as PortalContext, input)),

  listDeliverables: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientDeliverables(ctx as PortalContext, input)),

  acceptDeliverable: portalProcedure
    .input(acceptDeliverableSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.acceptDeliverable(ctx as PortalContext, input)),

  listInvoices: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientInvoices(ctx as PortalContext, input)),

  listApprovals: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientApprovals(ctx as PortalContext, input)),

  respondToApproval: portalProcedure
    .input(respondToApprovalSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.respondToApproval(ctx as PortalContext, input)),

  setPassword: portalProcedure
    .input(setPasswordSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.setPassword(ctx as PortalContext, input)),
});

// ── Combined router ──────────────────────────────────────────────────────

export const clientPortalRouter = router({
  admin: adminRouter,
  portal: portalRouter,
});

export type ClientPortalRouter = typeof clientPortalRouter;
