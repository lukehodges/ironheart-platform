import { z } from "zod";

// ── Shared sub-schemas ───────────────────────────────────────────────────

const proposalDeliverableSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
});

const paymentScheduleItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().int().positive(),
  dueType: z.enum(["ON_APPROVAL", "ON_DATE", "ON_MILESTONE", "ON_COMPLETION"]),
});

// ── Admin: Engagements ───────────────────────────────────────────────────

export const createEngagementSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
});

export const updateEngagementSchema = z.object({
  id: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER"]).optional(),
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export const listEngagementsSchema = z.object({
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  type: z.enum(["PROJECT", "RETAINER"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
});

// ── Admin: Proposals ─────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  engagementId: z.uuid(),
  scope: z.string().min(1),
  deliverables: z.array(proposalDeliverableSchema).min(1),
  price: z.number().int().positive(),
  paymentSchedule: z.array(paymentScheduleItemSchema),
  terms: z.string().optional().nullable(),
});

export const sendProposalSchema = z.object({
  proposalId: z.uuid(),
});

// ── Admin: Milestones ────────────────────────────────────────────────────

export const createMilestoneSchema = z.object({
  engagementId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

export const updateMilestoneSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
  dueDate: z.date().optional().nullable(),
});

// ── Admin: Deliverables ──────────────────────────────────────────────────

export const createDeliverableSchema = z.object({
  engagementId: z.uuid(),
  milestoneId: z.uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
});

export const deliverDeliverableSchema = z.object({
  id: z.uuid(),
});

// ── Admin: Approval Requests ─────────────────────────────────────────────

export const createApprovalSchema = z.object({
  engagementId: z.uuid(),
  deliverableId: z.uuid().optional().nullable(),
  milestoneId: z.uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
});

// ── Admin: Invoices ──────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  engagementId: z.uuid(),
  milestoneId: z.uuid().optional().nullable(),
  proposalPaymentIndex: z.number().int().optional().nullable(),
  amount: z.number().int().positive(),
  description: z.string().min(1),
  dueDate: z.date(),
});

export const sendInvoiceSchema = z.object({
  invoiceId: z.uuid(),
});

export const markInvoicePaidSchema = z.object({
  invoiceId: z.uuid(),
  paymentMethod: z.enum(["STRIPE", "BANK_TRANSFER"]),
  paymentReference: z.string().optional().nullable(),
});

// ── Portal: Client-facing ────────────────────────────────────────────────

export const getProposalByTokenSchema = z.object({
  token: z.string().min(1),
});

export const approveProposalSchema = z.object({
  proposalId: z.uuid(),
});

export const declineProposalSchema = z.object({
  proposalId: z.uuid(),
  feedback: z.string().optional().nullable(),
});

// Token-based versions for public proposal flow (no session required)
export const approveProposalByTokenSchema = z.object({
  token: z.string().min(1),
});

export const declineProposalByTokenSchema = z.object({
  token: z.string().min(1),
  feedback: z.string().optional().nullable(),
});

export const respondToApprovalSchema = z.object({
  approvalId: z.uuid(),
  approved: z.boolean(),
  comment: z.string().optional().nullable(),
});

export const acceptDeliverableSchema = z.object({
  deliverableId: z.uuid(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8),
});

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

export const getDashboardSchema = z.object({
  engagementId: z.uuid(),
});

export const listByEngagementSchema = z.object({
  engagementId: z.uuid(),
});
