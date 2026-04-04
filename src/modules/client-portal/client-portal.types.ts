// ── Enums as string unions ───────────────────────────────────────────────

export type EngagementType = "PROJECT" | "RETAINER";
export type EngagementStatus = "DRAFT" | "PROPOSED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "SUPERSEDED";
export type MilestoneStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
export type DeliverableStatus = "PENDING" | "DELIVERED" | "ACCEPTED";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PortalInvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";
export type PortalPaymentMethod = "STRIPE" | "BANK_TRANSFER";
export type PaymentDueType = "ON_APPROVAL" | "ON_DATE" | "ON_MILESTONE" | "ON_COMPLETION";

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
  createdAt: Date;
  updatedAt: Date;
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

// ── Dashboard ────────────────────────────────────────────────────────────

export interface PortalDashboard {
  engagement: EngagementRecord;
  pendingApprovals: ApprovalRequestRecord[];
  pendingInvoices: PortalInvoiceRecord[];
  milestones: MilestoneRecord[];
  activity: ActivityItem[];
}
