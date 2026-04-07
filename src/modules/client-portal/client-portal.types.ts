// ── Enums as string unions ───────────────────────────────────────────────

export type EngagementType = "PROJECT" | "RETAINER" | "HYBRID";
export type EngagementStatus = "DRAFT" | "PROPOSED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "PAUSED";
export type ProposalStatus = "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "SUPERSEDED";
export type MilestoneStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
export type DeliverableStatus = "PENDING" | "DELIVERED" | "ACCEPTED" | "CANCELLED";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PortalInvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
export type PortalPaymentMethod = "STRIPE" | "BANK_TRANSFER";
export type PaymentDueType = "ON_APPROVAL" | "ON_DATE" | "ON_MILESTONE" | "ON_COMPLETION";

export type ProposalSectionType = "PHASE" | "RECURRING" | "AD_HOC";
export type PaymentRuleTrigger = "MILESTONE_COMPLETE" | "RECURRING" | "RELATIVE_DATE" | "FIXED_DATE" | "ON_APPROVAL";
export type RecurringInterval = "MONTHLY" | "QUARTERLY";

// ── JSONB shapes ─────────────────────────────────────────────────────────

export interface ProposalDeliverable {
  title: string;
  description: string;
}

export interface PaymentScheduleItem {
  label: string;
  amount: number;
  dueType: PaymentDueType;
}

export interface RoiData {
  hoursPerWeek: number;
  automationPct: number;    // e.g. 80 (not 0.8)
  hourlyRate: number;       // in pence, consistent with rest of system
  additionalValueLabel: string | null;
  additionalValue: number | null;  // in pence
}

// ── Domain records ───────────────────────────────────────────────────────

export interface EngagementRecord {
  id: string;
  tenantId: string;
  customerId: string;
  type: EngagementType;
  status: EngagementStatus;
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  activeProposalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementWithCustomer extends EngagementRecord {
  customerName: string;
  customerEmail: string;
}

export interface ProposalRecord {
  id: string;
  engagementId: string;
  status: ProposalStatus;
  scope: string;
  deliverables: ProposalDeliverable[];
  price: number;
  paymentSchedule: PaymentScheduleItem[];
  terms: string | null;
  token: string;
  tokenExpiresAt: Date;
  sentAt: Date | null;
  approvedAt: Date | null;
  declinedAt: Date | null;
  version: number;
  revisionOf: string | null;
  problemStatement: string | null;
  exclusions: string[];
  requirements: string[];
  roiData: RoiData | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalSectionRecord {
  id: string;
  proposalId: string;
  title: string;
  description: string | null;
  type: ProposalSectionType;
  sortOrder: number;
  estimatedDuration: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalItemRecord {
  id: string;
  sectionId: string;
  proposalId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRuleRecord {
  id: string;
  proposalId: string;
  tenantId: string;
  sectionId: string | null;
  label: string;
  amount: number;
  trigger: PaymentRuleTrigger;
  recurringInterval: RecurringInterval | null;
  relativeDays: number | null;
  fixedDate: Date | null;
  autoSend: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneRecord {
  id: string;
  engagementId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  sortOrder: number;
  dueDate: Date | null;
  completedAt: Date | null;
  sourceSectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliverableRecord {
  id: string;
  engagementId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  deliveredAt: Date | null;
  acceptedAt: Date | null;
  sourceProposalItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequestRecord {
  id: string;
  engagementId: string;
  deliverableId: string | null;
  milestoneId: string | null;
  title: string;
  description: string;
  status: ApprovalRequestStatus;
  clientComment: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalInvoiceRecord {
  id: string;
  engagementId: string;
  milestoneId: string | null;
  proposalPaymentIndex: number | null;
  amount: number;
  description: string;
  status: PortalInvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: PortalPaymentMethod | null;
  paymentReference: string | null;
  token: string;
  sentAt: Date | null;
  sourcePaymentRuleId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalSessionRecord {
  id: string;
  customerId: string;
  token: string;
  tokenExpiresAt: Date;
  sessionToken: string | null;
  sessionExpiresAt: Date | null;
  lastAccessedAt: Date;
  createdAt: Date;
}

// ── Activity feed ────────────────────────────────────────────────────────

export type ActivityType =
  | "proposal_sent"
  | "proposal_approved"
  | "proposal_declined"
  | "milestone_started"
  | "milestone_completed"
  | "deliverable_shared"
  | "deliverable_accepted"
  | "approval_requested"
  | "approval_responded"
  | "invoice_sent"
  | "invoice_paid";

export interface ActivityItem {
  type: ActivityType;
  title: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ── Composite types ─────────────────────────────────────────────────────

export interface ProposalWithSections extends ProposalRecord {
  sections: (ProposalSectionRecord & { items: ProposalItemRecord[] })[];
  paymentRules: PaymentRuleRecord[];
}

export interface FinancialSummary {
  totalValue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

// ── Dashboard ────────────────────────────────────────────────────────────

export interface PortalDashboard {
  engagement: EngagementRecord;
  customerName: string;
  customerEmail: string;
  pendingApprovals: ApprovalRequestRecord[];
  pendingInvoices: PortalInvoiceRecord[];
  milestones: MilestoneRecord[];
  deliverables: DeliverableRecord[];
  financials: FinancialSummary;
  activity: ActivityItem[];
}
