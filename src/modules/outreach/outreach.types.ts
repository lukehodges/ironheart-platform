// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type OutreachContactStatus =
  | "ACTIVE"
  | "REPLIED"
  | "BOUNCED"
  | "OPTED_OUT"
  | "CONVERTED"
  | "PAUSED"
  | "COMPLETED"

export type OutreachActivityType =
  | "SENT"
  | "REPLIED"
  | "BOUNCED"
  | "OPTED_OUT"
  | "SKIPPED"
  | "CALL_COMPLETED"
  | "MEETING_BOOKED"
  | "CONVERTED"
  | "UNDONE"

export type OutreachChannel =
  | "EMAIL"
  | "LINKEDIN_REQUEST"
  | "LINKEDIN_MESSAGE"
  | "CALL"

export type OutreachSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_NOW"

export type OutreachReplyCategory =
  | "INTERESTED"
  | "NOT_NOW"
  | "NOT_INTERESTED"
  | "WRONG_PERSON"
  | "AUTO_REPLY"

export type OutreachTemplateCategory =
  | "intro"
  | "follow-up"
  | "break-up"
  | "case-study"
  | "linkedin"
  | "custom"

// ---------------------------------------------------------------------------
// JSONB step shape
// ---------------------------------------------------------------------------

export interface OutreachStep {
  position: number
  channel: OutreachChannel
  delayDays: number
  subject?: string
  bodyMarkdown: string
  notes?: string
}

// ---------------------------------------------------------------------------
// Table records
// ---------------------------------------------------------------------------

export interface OutreachSequenceRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  sector: string
  targetIcp: string | null
  isActive: boolean
  abVariant: string | null
  pairedSequenceId: string | null
  steps: OutreachStep[]
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OutreachContactRecord {
  id: string
  tenantId: string
  customerId: string
  sequenceId: string
  assignedUserId: string | null
  status: OutreachContactStatus
  currentStep: number
  nextDueAt: Date | null
  enrolledAt: Date
  completedAt: Date | null
  lastActivityAt: Date | null
  pipelineMemberId: string | null
  notes: string | null
  sentiment: OutreachSentiment | null
  replyCategory: OutreachReplyCategory | null
  snoozedUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OutreachActivityRecord {
  id: string
  tenantId: string
  contactId: string
  sequenceId: string
  customerId: string
  stepPosition: number
  channel: string
  activityType: OutreachActivityType
  deliveredTo: string | null
  notes: string | null
  performedByUserId: string | null
  previousState: { currentStep: number; status: string; nextDueAt: string | null } | null
  occurredAt: Date
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Template & Snippet records
// ---------------------------------------------------------------------------

export interface OutreachTemplateRecord {
  id: string
  tenantId: string
  name: string
  category: string
  channel: string
  subject: string | null
  bodyMarkdown: string
  tags: string[] | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OutreachSnippetRecord {
  id: string
  tenantId: string
  name: string
  category: string
  bodyMarkdown: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export interface OutreachContactWithDetails extends OutreachContactRecord {
  customerFirstName: string
  customerLastName: string
  customerEmail: string | null
  customerTags: string[]
  sequenceName: string
  sector: string
  currentStepTemplate: OutreachStep | null
}

export interface DashboardContact {
  id: string
  customerId: string
  customerName: string
  customerEmail: string | null
  company: string | null
  sequenceId: string
  sequenceName: string
  sector: string
  currentStep: number
  totalSteps: number
  channel: OutreachChannel
  subject: string | null
  nextDueAt: Date | null
  notes: string | null
}

export interface DailyDashboard {
  dueNow: DashboardContact[]
  overdue: DashboardContact[]
  recentReplies: DashboardContact[]
  todayStats: {
    sent: number
    replied: number
    bounced: number
    optedOut: number
    converted: number
    callsCompleted: number
    meetingsBooked: number
  }
}

export interface SequencePerformance {
  sequenceId: string
  name: string
  sector: string
  abVariant: string | null
  pairedSequenceId: string | null
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
  conversionRate: number
}

export interface SectorPerformance {
  sector: string
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
}

export interface RenderedTemplate {
  subject: string | null
  body: string
  channel: OutreachChannel
  stepNotes: string | null
}

// ---------------------------------------------------------------------------
// Sentiment derivation
// ---------------------------------------------------------------------------

const CATEGORY_TO_SENTIMENT: Record<OutreachReplyCategory, OutreachSentiment> = {
  INTERESTED: "POSITIVE",
  NOT_NOW: "NOT_NOW",
  NOT_INTERESTED: "NEGATIVE",
  WRONG_PERSON: "NEUTRAL",
  AUTO_REPLY: "NEUTRAL",
}

export function deriveSentiment(category: OutreachReplyCategory): OutreachSentiment {
  return CATEGORY_TO_SENTIMENT[category]
}

// ---------------------------------------------------------------------------
// Import result
// ---------------------------------------------------------------------------

export interface ImportResult {
  imported: number
  skipped: number
  skippedEmails: string[]
}
