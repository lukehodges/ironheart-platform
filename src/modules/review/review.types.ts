export type ReviewRequestStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'BOUNCED'
  | 'IGNORED'
  | 'COMPLETED'

export type ReviewIssueCategory =
  | 'LATE'
  | 'QUALITY'
  | 'ATTITUDE'
  | 'SAFETY'
  | 'OTHER'

export type ReviewResolutionStatus =
  | 'CONTACTED'
  | 'RESOLVED'
  | 'DISMISSED'

export type ReviewChannel =
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'

export interface ReviewRecord {
  id: string
  tenantId: string
  bookingId: string
  customerId?: string | null
  staffId?: string | null
  rating?: number | null   // 1–5
  comment?: string | null
  isPublic: boolean
  platform?: string | null
  issueCategory?: ReviewIssueCategory | null
  resolutionStatus?: ReviewResolutionStatus | null
  resolutionNotes?: string | null
  resolvedBy?: string | null
  resolvedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ReviewRequestRecord {
  id: string
  tenantId: string
  bookingId: string
  customerId?: string | null
  status: ReviewRequestStatus
  channel?: ReviewChannel | null
  sentAt?: Date | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ReviewAutomationSettings {
  id: string
  tenantId: string
  enabled: boolean
  preScreenEnabled: boolean
  autoPublicMinRating?: number | null
  delay?: string | null
  googleEnabled: boolean
  googleUrl?: string | null
  privateEnabled: boolean
  facebookEnabled: boolean
  facebookUrl?: string | null
  channels: ReviewChannel[]
  messageTemplate?: string | null
  smsTemplate?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateReviewRequestInput {
  bookingId: string
  customerId?: string | null
  delay?: string | null
}

export interface SubmitReviewInput {
  token: string
  rating: number
  comment?: string | null
  isPublic?: boolean
}

export interface UpdateAutomationInput {
  enabled?: boolean
  preScreenEnabled?: boolean
  autoPublicMinRating?: number | null
  delay?: string | null
  googleEnabled?: boolean
  googleUrl?: string | null
  privateEnabled?: boolean
  facebookEnabled?: boolean
  facebookUrl?: string | null
  channels?: ReviewChannel[]
  messageTemplate?: string | null
  smsTemplate?: string | null
}

export interface ResolveIssueInput {
  reviewId: string
  resolutionStatus: ReviewResolutionStatus
  resolutionNotes?: string | null
}
