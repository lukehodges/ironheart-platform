export type OrgChartNodeType = "DEPARTMENT" | "ROLE" | "PERSON"
export type InterviewMode = "ALL" | "SAMPLE" | "OWNER_ONLY" | "SKIP"
export type AuditTier = "MICRO" | "SMALL" | "MID" | "LARGE"
export type ChartActorType = "CONSULTANT" | "CLIENT" | "SYSTEM"
export type EditorIdentity = "CONSULTANT" | "CLIENT"

export interface OrgChartNodeRecord {
  id: string
  tenantId: string
  engagementId: string
  parentId: string | null
  label: string
  type: OrgChartNodeType
  headcount: number | null
  contactUserId: string | null
  contactEmail: string | null
  contactName: string | null
  contactRole: string | null
  interviewMode: InterviewMode
  sampleSize: number | null
  templateSlugOverride: string | null
  sortOrder: number
  version: number
  lastEditedBy: EditorIdentity
  lastEditedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface OrgChartTree extends OrgChartNodeRecord {
  children: OrgChartTree[]
}

export interface ChartActivityRecord {
  id: string
  engagementId: string
  nodeId: string | null
  actorType: ChartActorType
  actorId: string | null
  actorName: string
  action: string
  fromValue: unknown
  toValue: unknown
  message: string
  createdAt: Date
}

export interface CreateNodeInput {
  tenantId: string
  engagementId: string
  parentId: string | null
  label: string
  type: OrgChartNodeType
  headcount?: number | null
  contactUserId?: string | null
  contactEmail?: string | null
  contactName?: string | null
  contactRole?: string | null
  interviewMode?: InterviewMode
  sampleSize?: number | null
  templateSlugOverride?: string | null
  sortOrder?: number
  editedBy: EditorIdentity
}

export interface UpdateNodePatch {
  label?: string
  type?: OrgChartNodeType
  headcount?: number | null
  contactUserId?: string | null
  contactEmail?: string | null
  contactName?: string | null
  contactRole?: string | null
  interviewMode?: InterviewMode
  sampleSize?: number | null
  templateSlugOverride?: string | null
  sortOrder?: number
}

export interface UpdateNodeInput {
  id: string
  expectedVersion: number
  editedBy: EditorIdentity
  patch: UpdateNodePatch
}

export interface ReparentNodeInput {
  id: string
  expectedVersion: number
  newParentId: string | null
  newSortOrder: number
  editedBy: EditorIdentity
}

export interface LogActivityInput {
  engagementId: string
  nodeId: string | null
  actorType: ChartActorType
  actorId: string | null
  actorName: string
  action: string
  fromValue?: unknown
  toValue?: unknown
  message: string
}

export interface ListActivityInput {
  engagementId: string
  limit?: number
  cursor?: string // ISO timestamp
}

export interface PlannedFormSend {
  nodeId: string
  contactEmail: string
  contactName: string
  templateSlug: string
  reason: string
}

export interface UnfilledSampleSlot {
  nodeId: string
  deptLabel: string
  needed: number
}

export interface OnboardingPlan {
  engagementId: string
  tier: AuditTier
  totalSends: number
  sends: PlannedFormSend[]
  unfilledSampleSlots: UnfilledSampleSlot[]
}

export interface OnboardingStatus {
  totalRecipients: number
  sent: number
  completed: number
  pending: number
  byContact: Array<{ name: string; email: string; status: "PENDING" | "SENT" | "COMPLETED" }>
}
