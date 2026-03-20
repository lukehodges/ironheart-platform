export type PipelineStageType = "OPEN" | "WON" | "LOST"

export interface PipelineRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  isDefault: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PipelineStageRecord {
  id: string
  tenantId: string
  pipelineId: string
  name: string
  slug: string
  position: number
  color: string | null
  type: PipelineStageType
  allowedTransitions: string[]
  createdAt: Date
  updatedAt: Date
}

export interface PipelineMemberRecord {
  id: string
  tenantId: string
  pipelineId: string
  customerId: string
  stageId: string
  dealValue: number | null
  lostReason: string | null
  enteredStageAt: Date
  addedAt: Date
  closedAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface PipelineMemberWithCustomer extends PipelineMemberRecord {
  customerName: string
  customerEmail: string | null
  customerTags: string[]
}

export interface PipelineStageHistoryRecord {
  id: string
  tenantId: string
  memberId: string
  fromStageId: string | null
  toStageId: string
  changedAt: Date
  changedById: string | null
  dealValue: number | null
  lostReason: string | null
  notes: string | null
}

export interface PipelineWithStages extends PipelineRecord {
  stages: PipelineStageRecord[]
}

export interface PipelineStageSummary {
  stageId: string
  count: number
  totalDealValue: number
}
