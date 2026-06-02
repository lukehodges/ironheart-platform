import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import { deals, dealEvents } from "@/shared/db/schemas/pipeline.schema"
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  sql,
} from "drizzle-orm"
import type {
  CreateDealInput,
  DealRecord,
  DealEventRecord,
  DealEventKind,
  DealStage,
  ListDealsFilters,
  StageCounts,
  UpdateDealInput,
} from "./pipeline.types"
import { toDealRecord, toDealEventRecord } from "./pipeline.types"

const log = logger.child({ module: "pipeline.repository" })

// ---------------------------------------------------------------------------
// Drizzle insert helpers
// ---------------------------------------------------------------------------

type DealInsert = typeof deals.$inferInsert
type DealEventInsert = typeof dealEvents.$inferInsert

function numericOrNull(v: number | null | undefined): string | null {
  return v == null ? null : String(v)
}

// ===========================================================================
// PIPELINE REPOSITORY
// ===========================================================================

export const pipelineRepository = {
  // ---- READ: Deals ----

  async getDealById(
    tenantId: string,
    dealId: string,
  ): Promise<DealRecord | null> {
    const rows = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)))
      .limit(1)
    return rows[0] ? toDealRecord(rows[0]) : null
  },

  async listDeals(
    tenantId: string,
    filters: ListDealsFilters = {},
  ): Promise<DealRecord[]> {
    const conditions = [eq(deals.tenantId, tenantId)]

    if (filters.stage) {
      conditions.push(eq(deals.stage, filters.stage))
    }
    if (filters.ownerId) {
      conditions.push(eq(deals.ownerUserId, filters.ownerId))
    }
    if (filters.productLine) {
      conditions.push(eq(deals.product, filters.productLine))
    }
    if (filters.search) {
      conditions.push(ilike(deals.name, `%${filters.search}%`))
    }

    const rows = await db
      .select()
      .from(deals)
      .where(and(...conditions))
      .orderBy(desc(deals.updatedAt))

    return rows.map(toDealRecord)
  },

  async getDealsByOriginTouch(touchId: string): Promise<DealRecord[]> {
    const rows = await db
      .select()
      .from(deals)
      .where(eq(deals.originTouchId, touchId))
      .orderBy(desc(deals.createdAt))
    return rows.map(toDealRecord)
  },

  async findDealByCompany(
    tenantId: string,
    companyId: string,
  ): Promise<DealRecord | null> {
    const rows = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.companyId, companyId)))
      .orderBy(desc(deals.createdAt))
      .limit(1)
    return rows[0] ? toDealRecord(rows[0]) : null
  },

  // ---- READ: Aggregations ----

  async getStageCounts(tenantId: string): Promise<StageCounts> {
    const rows = await db
      .select({
        stage: deals.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(deals)
      .where(eq(deals.tenantId, tenantId))
      .groupBy(deals.stage)

    const out: StageCounts = {
      qualified: 0,
      demo: 0,
      proposal: 0,
      won: 0,
      lost: 0,
      dormant: 0,
    }
    for (const row of rows) {
      out[row.stage as DealStage] = Number(row.count)
    }
    return out
  },

  /**
   * Weighted forecast: SUM(value_estimate * probability/100) over open deals.
   * Open deals = stage not in (won, lost, dormant).
   */
  async getWeightedValue(tenantId: string): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string | null>`COALESCE(SUM(${deals.valueEstimate} * COALESCE(${deals.probability}, 0) / 100.0), 0)`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, tenantId),
          inArray(deals.stage, ["qualified", "demo", "proposal"] as DealStage[]),
        ),
      )
    return row?.total != null ? Number(row.total) : 0
  },

  // ---- WRITE: Deals ----

  async createDeal(
    tenantId: string,
    input: CreateDealInput,
  ): Promise<DealRecord> {
    const values: DealInsert = {
      tenantId,
      companyId: input.companyId,
      primaryContactId: input.primaryContactId ?? null,
      originTouchId: input.originTouchId ?? null,
      name: input.name,
      stage: input.stage ?? "qualified",
      product: input.product ?? "other",
      valueEstimate: numericOrNull(input.valueEstimate ?? null),
      probability: input.probability ?? null,
      expectedClose: input.expectedClose ?? null,
      ownerUserId: input.ownerUserId ?? null,
      notes: input.notes ?? null,
    }

    const [row] = await db.insert(deals).values(values).returning()
    if (!row) throw new Error("createDeal: insert returned no row")
    log.info({ tenantId, dealId: row.id }, "Deal created")
    return toDealRecord(row)
  },

  async updateDeal(
    tenantId: string,
    dealId: string,
    patch: UpdateDealInput & {
      stage?: DealStage
      closedAt?: Date | null
    },
  ): Promise<DealRecord> {
    const updateData: Partial<DealInsert> = { updatedAt: new Date() }

    if (patch.name !== undefined) updateData.name = patch.name
    if (patch.product !== undefined) updateData.product = patch.product
    if (patch.valueEstimate !== undefined)
      updateData.valueEstimate = numericOrNull(patch.valueEstimate)
    if (patch.probability !== undefined)
      updateData.probability = patch.probability
    if (patch.expectedClose !== undefined)
      updateData.expectedClose = patch.expectedClose
    if (patch.ownerUserId !== undefined)
      updateData.ownerUserId = patch.ownerUserId
    if (patch.notes !== undefined) updateData.notes = patch.notes
    if (patch.closeReason !== undefined)
      updateData.closeReason = patch.closeReason
    if (patch.stage !== undefined) updateData.stage = patch.stage
    if (patch.closedAt !== undefined) updateData.closedAt = patch.closedAt

    const [updated] = await db
      .update(deals)
      .set(updateData)
      .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)))
      .returning()

    if (!updated) throw new NotFoundError("Deal", dealId)
    log.info({ tenantId, dealId }, "Deal updated")
    return toDealRecord(updated)
  },

  async deleteDeal(tenantId: string, dealId: string): Promise<void> {
    await db
      .delete(deals)
      .where(and(eq(deals.id, dealId), eq(deals.tenantId, tenantId)))
    log.info({ tenantId, dealId }, "Deal deleted")
  },

  // ---- READ / WRITE: Deal events ----

  async listDealEvents(
    tenantId: string,
    dealId: string,
  ): Promise<DealEventRecord[]> {
    const rows = await db
      .select()
      .from(dealEvents)
      .where(
        and(eq(dealEvents.tenantId, tenantId), eq(dealEvents.dealId, dealId)),
      )
      .orderBy(asc(dealEvents.at))
    return rows.map(toDealEventRecord)
  },

  async createDealEvent(
    tenantId: string,
    input: {
      dealId: string
      kind: DealEventKind
      payload?: Record<string, unknown>
      actor?: string | null
    },
  ): Promise<DealEventRecord> {
    const values: DealEventInsert = {
      tenantId,
      dealId: input.dealId,
      kind: input.kind,
      payload: input.payload ?? {},
      actor: input.actor ?? null,
    }
    const [row] = await db.insert(dealEvents).values(values).returning()
    if (!row) throw new Error("createDealEvent: insert returned no row")
    return toDealEventRecord(row)
  },
}
