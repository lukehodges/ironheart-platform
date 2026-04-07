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

const roiDataSchema = z.object({
  hoursPerWeek: z.number().positive(),
  automationPct: z.number().min(1).max(100),
  hourlyRate: z.number().int().positive(),
  additionalValueLabel: z.string().optional().nullable(),
  additionalValue: z.number().int().optional().nullable(),
});

// ── Admin: Engagements ───────────────────────────────────────────────────

export const createEngagementSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
});

export const updateEngagementSchema = z.object({
  id: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]).optional(),
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export const listEngagementsSchema = z.object({
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"]).optional(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
});

export const searchCustomersSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().max(20).default(10),
});

// ── Admin: Proposals ─────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  engagementId: z.uuid(),
  scope: z.string().min(1),
  deliverables: z.array(proposalDeliverableSchema).default([]),
  price: z.number().int().default(0),
  paymentSchedule: z.array(paymentScheduleItemSchema).default([]),
  terms: z.string().optional().nullable(),
  problemStatement: z.string().optional().nullable(),
  exclusions: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  roiData: roiDataSchema.optional().nullable(),
});

export const sendProposalSchema = z.object({
  proposalId: z.uuid(),
});

// ── Admin: Proposal Sections ────────────────────────────────────────────

export const createProposalSectionSchema = z.object({
  proposalId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(["PHASE", "RECURRING", "AD_HOC"]),
  sortOrder: z.number().int().default(0),
  estimatedDuration: z.string().optional().nullable(),
});

export const updateProposalSectionSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["PHASE", "RECURRING", "AD_HOC"]).optional(),
  sortOrder: z.number().int().optional(),
  estimatedDuration: z.string().optional().nullable(),
});

export const deleteProposalSectionSchema = z.object({
  id: z.uuid(),
});

// ── Admin: Proposal Items ───────────────────────────────────────────────

export const createProposalItemSchema = z.object({
  sectionId: z.uuid(),
  proposalId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateProposalItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const deleteProposalItemSchema = z.object({
  id: z.uuid(),
});

// ── Admin: Payment Rules ────────────────────────────────────────────────

export const createPaymentRuleSchema = z.object({
  proposalId: z.uuid(),
  sectionId: z.uuid().optional().nullable(),
  label: z.string().min(1),
  amount: z.number().int().positive(),
  trigger: z.enum(["MILESTONE_COMPLETE", "RECURRING", "RELATIVE_DATE", "FIXED_DATE", "ON_APPROVAL"]),
  recurringInterval: z.enum(["MONTHLY", "QUARTERLY"]).optional().nullable(),
  relativeDays: z.number().int().optional().nullable(),
  fixedDate: z.date().optional().nullable(),
  autoSend: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePaymentRuleSchema = z.object({
  id: z.uuid(),
  sectionId: z.uuid().optional().nullable(),
  label: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  trigger: z.enum(["MILESTONE_COMPLETE", "RECURRING", "RELATIVE_DATE", "FIXED_DATE", "ON_APPROVAL"]).optional(),
  recurringInterval: z.enum(["MONTHLY", "QUARTERLY"]).optional().nullable(),
  relativeDays: z.number().int().optional().nullable(),
  fixedDate: z.date().optional().nullable(),
  autoSend: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const deletePaymentRuleSchema = z.object({
  id: z.uuid(),
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

export const voidInvoiceSchema = z.object({
  invoiceId: z.uuid(),
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
