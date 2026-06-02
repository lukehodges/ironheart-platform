/**
 * Outreach module — domain types
 *
 * The DB row types live in `@/shared/db/schemas/outreach.schema` as
 * CompanyRow / ContactRow / CampaignRow / TemplateRow / TouchRow / ReplyRow / DncListRow.
 *
 * This file re-exports them as the module's public record types and adds
 * input shapes the service layer accepts.
 */

import type {
  CompanyRow,
  ContactRow,
  CampaignRow,
  TemplateRow,
  TouchRow,
  ReplyRow,
  DncListRow,
} from "@/shared/db/schemas/outreach.schema"

// ---------------------------------------------------------------------------
// Re-exported record types (DB rows as our domain records)
// ---------------------------------------------------------------------------

export type CompanyRecord = CompanyRow
export type ContactRecord = ContactRow
export type CampaignRecord = CampaignRow
export type TemplateRecord = TemplateRow
export type TouchRecord = TouchRow
export type ReplyRecord = ReplyRow
export type DncListRecord = DncListRow

/**
 * Reply enriched with the embedded contact, company, and originating touch
 * context — surfaced to the triage inbox UI.
 */
export interface EnrichedReplyRecord extends ReplyRow {
  contact: {
    id: string
    fullName: string
    role: string | null
    email: string | null
  }
  company: {
    id: string
    name: string
    domain: string | null
  }
  touch: {
    id: string
    sentAt: Date | null
    subjectRendered: string | null
    channel: string
  } | null
}

// ---------------------------------------------------------------------------
// Enum string unions (mirror the pg enums)
// ---------------------------------------------------------------------------

export type OutreachChannel = "email" | "linkedin" | "phone"
export type OutreachEmployeeBand = "1-2" | "3-15" | "15-50" | "50+"
export type OutreachCompanySource = "cold" | "referral" | "inbound" | "manual"
export type OutreachCampaignStatus = "draft" | "active" | "paused" | "complete"
export type OutreachDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
export type OutreachReplyStatus =
  | "none"
  | "positive"
  | "negative"
  | "ooo"
  | "converter"
  | "wrong_person"
  | "auto_reply"
export type OutreachClassifier = "claude" | "luke" | "rule"

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

export interface CreateCompanyInput {
  name: string
  domain?: string | null
  industry?: string | null
  employeeBand?: OutreachEmployeeBand | null
  city?: string | null
  country?: string | null
  ownerLed?: boolean
  source?: OutreachCompanySource
  notes?: string | null
  enrichment?: Record<string, unknown>
}

export interface UpdateCompanyInput {
  name?: string
  domain?: string | null
  industry?: string | null
  employeeBand?: OutreachEmployeeBand | null
  city?: string | null
  country?: string | null
  ownerLed?: boolean
  source?: OutreachCompanySource
  notes?: string | null
  enrichment?: Record<string, unknown>
  doNotContact?: boolean
  dncReason?: string | null
}

export interface CreateContactInput {
  companyId: string
  fullName: string
  role?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  isOwner?: boolean
  isDecisionMaker?: boolean
}

export interface UpdateContactInput {
  fullName?: string
  role?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  isOwner?: boolean
  isDecisionMaker?: boolean
  bounced?: boolean
  doNotContact?: boolean
}

export interface CreateCampaignInput {
  name: string
  channel: OutreachChannel
  city?: string | null
  industryFocus?: string | null
  status?: OutreachCampaignStatus
  startedAt?: Date | null
  endedAt?: Date | null
}

export interface CreateTemplateInput {
  name: string
  channel: OutreachChannel
  subject?: string | null
  body: string
  variables?: Record<string, unknown>
  parentId?: string | null
  active?: boolean
}

export interface SendTouchInput {
  contactId: string
  templateId?: string | null
  campaignId?: string | null
  channel: OutreachChannel
  renderedSubject?: string | null
  renderedBody?: string | null
  externalMessageId?: string | null
}

export interface RecordReplyInput {
  contactId: string
  touchId?: string | null
  receivedAt?: Date
  subject?: string | null
  body?: string | null
  classifiedAs?: string | null
  classifiedBy?: OutreachClassifier | null
  classificationConfidence?: number | null
  rawEventId?: string | null
}

export interface AddDncInput {
  email?: string | null
  domain?: string | null
  reason?: string | null
}

export interface BulkImportLeadRow {
  companyName: string
  domain?: string | null
  industry?: string | null
  city?: string | null
  country?: string | null
  employeeBand?: OutreachEmployeeBand | null
  ownerLed?: boolean
  contactName: string
  email?: string | null
  phone?: string | null
  role?: string | null
  linkedinUrl?: string | null
  isOwner?: boolean
  isDecisionMaker?: boolean
}

export interface BulkImportResult {
  companiesCreated: number
  contactsCreated: number
  skipped: number
}
