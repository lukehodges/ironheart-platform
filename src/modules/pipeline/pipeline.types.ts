/**
 * Pipeline module — public types.
 *
 * Domain: B2B sales pipeline tracking deals through stages
 *   qualified → demo → proposal → won/lost/dormant
 *
 * Backed by tables `deals` and `deal_events` in pipeline.schema.ts.
 */

import type { DealRow, DealEventRow } from "@/shared/db/schemas/pipeline.schema"

// ---------------------------------------------------------------------------
// Enum string unions (mirror pgEnum values)
// ---------------------------------------------------------------------------

export type DealStage =
  | "qualified"
  | "demo"
  | "proposal"
  | "won"
  | "lost"
  | "dormant"

export type DealProduct = "audit" | "build_sprint" | "retainer" | "other"

export type DealEventKind =
  | "stage_changed"
  | "note_added"
  | "meeting_booked"
  | "proposal_sent"
  | "contract_signed"

export const TERMINAL_STAGES: ReadonlySet<DealStage> = new Set([
  "won",
  "lost",
  "dormant",
])

// Stage ordering used to gate auto-progressions (e.g. proposal_sent should
// only advance, never regress).
export const STAGE_ORDER: Record<DealStage, number> = {
  qualified: 0,
  demo: 1,
  proposal: 2,
  won: 3,
  lost: 3,
  dormant: 3,
}

// ---------------------------------------------------------------------------
// Record shapes returned by the repository
// ---------------------------------------------------------------------------

export interface DealRecord {
  id: string
  tenantId: string
  companyId: string
  primaryContactId: string | null
  originTouchId: string | null
  name: string
  stage: DealStage
  product: DealProduct
  valueEstimate: number | null
  probability: number | null
  expectedClose: string | null
  ownerUserId: string | null
  notes: string | null
  closedAt: Date | null
  closeReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DealEventRecord {
  id: string
  tenantId: string
  dealId: string
  kind: DealEventKind
  payload: Record<string, unknown>
  at: Date
  actor: string | null
}

// ---------------------------------------------------------------------------
// Service inputs
// ---------------------------------------------------------------------------

export interface CreateDealInput {
  companyId: string
  primaryContactId?: string | null
  originTouchId?: string | null
  name: string
  stage?: DealStage
  product?: DealProduct
  valueEstimate?: number | null
  probability?: number | null
  expectedClose?: string | null
  ownerUserId?: string | null
  notes?: string | null
}

export interface UpdateDealInput {
  name?: string
  product?: DealProduct
  valueEstimate?: number | null
  probability?: number | null
  expectedClose?: string | null
  ownerUserId?: string | null
  notes?: string | null
  closeReason?: string | null
}

export interface ListDealsFilters {
  stage?: DealStage
  ownerId?: string
  productLine?: DealProduct
  search?: string
}

export interface StageCounts {
  qualified: number
  demo: number
  proposal: number
  won: number
  lost: number
  dormant: number
}

// ---------------------------------------------------------------------------
// Row mappers (DB row → record)
// ---------------------------------------------------------------------------

export function toDealRecord(row: DealRow): DealRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    primaryContactId: row.primaryContactId ?? null,
    originTouchId: row.originTouchId ?? null,
    name: row.name,
    stage: row.stage as DealStage,
    product: row.product as DealProduct,
    valueEstimate: row.valueEstimate != null ? Number(row.valueEstimate) : null,
    probability: row.probability ?? null,
    expectedClose: row.expectedClose ?? null,
    ownerUserId: row.ownerUserId ?? null,
    notes: row.notes ?? null,
    closedAt: row.closedAt ?? null,
    closeReason: row.closeReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toDealEventRecord(row: DealEventRow): DealEventRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    dealId: row.dealId,
    kind: row.kind as DealEventKind,
    payload: (row.payload as Record<string, unknown>) ?? {},
    at: row.at,
    actor: row.actor ?? null,
  }
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep old export names compiling so module-system consumers
// (e.g. platform.service) keep working with this re-domained module.
// ---------------------------------------------------------------------------

export type PipelineRecord = DealRecord
export type PipelineStageRecord = { stage: DealStage; count: number }
export type PipelineMemberRecord = DealRecord
export type PipelineWithStages = { stageCounts: StageCounts }
