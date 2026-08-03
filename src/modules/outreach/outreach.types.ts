/**
 * Outreach module — domain types.
 *
 * Three operational records mirror the spreadsheet:
 *   - LeadRecord            (the roster)
 *   - DailyActivityRecord   (one row per owner per day)
 *   - WeeklyHypothesisRecord(the 7-day loop spine)
 *
 * Plus supporting:
 *   - TouchRecord    (send audit log)
 *   - ReplyRecord    (Gmail processor writes here)
 *   - DncRecord      (suppression)
 */

import type {
  LeadRow,
  DailyActivityRow,
  WeeklyHypothesisRow,
  TouchRow,
  ReplyRow,
  DncListRow,
} from "@/shared/db/schemas/outreach.schema"

// ---------------------------------------------------------------------------
// Records (DB rows as domain types)
// ---------------------------------------------------------------------------

export type LeadRecord = LeadRow
export type DailyActivityRecord = DailyActivityRow
export type WeeklyHypothesisRecord = WeeklyHypothesisRow
export type TouchRecord = TouchRow
export type ReplyRecord = ReplyRow
export type DncRecord = DncListRow

/**
 * Reply with the embedded lead context — surfaced to the triage inbox UI.
 */
export interface EnrichedReplyRecord extends ReplyRow {
  lead: {
    id: string
    name: string
    company: string
    email: string | null
    owner: OutreachLeadOwner
  }
  touch: {
    id: string
    sentAt: Date | null
    subjectRendered: string | null
    channel: OutreachChannel
  } | null
}

// ---------------------------------------------------------------------------
// Enum string unions
// ---------------------------------------------------------------------------

export type OutreachChannel = "email" | "linkedin" | "phone"
export type OutreachLeadStatus = "ready" | "draft" | "sent" | "skipped" | "dnc"
export type OutreachLeadOwner = "luke" | "alex"
export type OutreachReplySentiment = "positive" | "neutral" | "negative"
export type OutreachHypothesisStatus = "active" | "complete"
export type OutreachHypothesisVerdict =
  | "pending"
  | "testing"
  | "keep"
  | "mutate"
  | "kill"
  | "baseline"
export type OutreachDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
export type OutreachClassifier = "claude" | "luke" | "rule"

// ---------------------------------------------------------------------------
// Lead inputs
// ---------------------------------------------------------------------------

export interface CreateLeadInput {
  owner: OutreachLeadOwner
  name: string
  company: string
  category?: string | null
  email?: string | null
  website?: string | null
  source?: string | null
  status?: OutreachLeadStatus
  researched?: boolean
  followUpFlag?: boolean
  researchNotes?: string | null
  notes?: string | null
  hypothesisWeekId?: string | null
}

export interface UpdateLeadInput {
  id: string
  owner?: OutreachLeadOwner
  status?: OutreachLeadStatus
  name?: string
  company?: string
  category?: string | null
  email?: string | null
  website?: string | null
  source?: string | null
  researched?: boolean
  followUpFlag?: boolean
  lastContactedAt?: string | null
  nextFollowUpAt?: string | null
  reply?: boolean
  replySentiment?: OutreachReplySentiment | null
  researchNotes?: string | null
  notes?: string | null
  hypothesisWeekId?: string | null
}

export interface ListLeadsInput {
  status?: OutreachLeadStatus
  owner?: OutreachLeadOwner
  category?: string
  researched?: boolean
  search?: string
  hypothesisWeekId?: string
  limit?: number
  offset?: number
  /** Date-range lower bound on lastContactedAt (YYYY-MM-DD inclusive) */
  contactedFrom?: string
  /** Date-range upper bound on lastContactedAt (YYYY-MM-DD inclusive) */
  contactedTo?: string
  /** When true: only leads WITH lastContactedAt; when false: only leads without */
  hasContactDate?: boolean
  /** ilike filter on notes field, e.g. "gold" to match "tier: gold" */
  tier?: string
  /** Column to sort by (server-side); defaults to number asc */
  sortBy?: "number" | "company" | "status" | "lastContactedAt"
  /** Sort direction; defaults to asc */
  sortDir?: "asc" | "desc"
  /**
   * When true, exclude any lead whose email (or email-domain) is on the DNC
   * list — a hard suppression gate applied at the query layer. Set on the
   * send path (pullBatch) so a suppressed lead can NEVER be pulled, even if a
   * status field drifted out of sync with the DNC table.
   */
  excludeDnc?: boolean
  /** Exclude leads linked to a Twenty opportunity (live deal — never cold-pull). */
  excludeWarm?: boolean
}

// ---------------------------------------------------------------------------
// Daily activity inputs
// ---------------------------------------------------------------------------

export interface UpsertDailyActivityInput {
  date: string
  owner: OutreachLeadOwner
  channel?: OutreachChannel
  hypothesisWeekId?: string | null
  sent?: number
  replies?: number
  positive?: number
  meetingsBooked?: number
  meetingsTaken?: number
  interested?: number
  closed?: number
  newUpfront?: number
  newRetainer?: number
  notes?: string | null
}

export interface ListDailyActivityInput {
  startDate: string
  endDate: string
  owner?: OutreachLeadOwner
}

// ---------------------------------------------------------------------------
// Weekly hypothesis inputs
// ---------------------------------------------------------------------------

export interface CreateHypothesisInput {
  week: string // "2026-W24"
  startDate: string
  endDate: string
  title: string
  body: string
  targetSample: number
  targetReplyPct: number
  targetPositivePct: number
  targetBooked?: number
  replaces?: string | null
  prevWeekId?: string | null
}

export interface EndWeekInput {
  hypothesisId: string
  resultSummary: string
  verdict: OutreachHypothesisVerdict
  // Optional: pre-draft next week's hypothesis at the same time
  nextHypothesis?: Omit<CreateHypothesisInput, "prevWeekId">
}

// ---------------------------------------------------------------------------
// Gmail processor compatibility (recordReply)
// ---------------------------------------------------------------------------

export interface RecordReplyInput {
  leadId: string
  touchId?: string | null
  receivedAt?: Date
  subject?: string | null
  body?: string | null
  sentiment?: OutreachReplySentiment | null
  classifiedBy?: OutreachClassifier | null
  rawEventId?: string | null
}

// ---------------------------------------------------------------------------
// DNC
// ---------------------------------------------------------------------------

export interface AddDncInput {
  email?: string | null
  domain?: string | null
  reason?: string | null
}
