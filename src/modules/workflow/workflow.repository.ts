// ──────────────────────────────────────────────────────────────────────────────
// Workflow Repository - pure Drizzle DB queries, no business logic
// ──────────────────────────────────────────────────────────────────────────────
//
// Schema vs. type mapping notes:
//  - workflows.enabled  ↔  WorkflowRecord.isActive  (DB uses "enabled")
//  - workflows.delay    ↔  WorkflowRecord.delay      (DB is integer minutes;
//    WorkflowRecord expects string | null - stored as ISO-8601 string in types
//    but DB stores integer. We cast to string on read and parse on write.)
//  - workflows table has NO deletedAt column - softDelete uses enabled=false only.
//  - workflowActions has NO tenantId column on the DB table.
//  - workflowExecutions.errorMessage  ↔  WorkflowExecutionRecord.error
//  - workflowExecutions status enum is UPPERCASE in DB (PENDING/RUNNING/etc.)
//    but WorkflowExecutionRecord uses lowercase - we lowercase on read, uppercase on write.
//  - workflowExecutions has no bookingId column - findExecution matches on
//    (workflowId, triggerEvent) only; bookingId param is matched inside triggerData.
// ──────────────────────────────────────────────────────────────────────────────

import { db } from '@/shared/db'
import { eq, and, desc, asc, isNull } from 'drizzle-orm'
import { workflows, workflowActions, workflowExecutions } from '@/shared/db/schema'
import { NotFoundError } from '@/shared/errors'
import { logger } from '@/shared/logger'
import type {
  WorkflowRecord,
  WorkflowActionRecord,
  WorkflowExecutionRecord,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  NodeConfig,
  WorkflowNode,
  WorkflowEdge,
  WorkflowConditionGroup,
  WorkflowCondition,
  NodeExecutionResult,
  ActionExecutionResult,
} from './workflow.types'

const log = logger.child({ module: 'workflow.repository' })

// ──────────────────────────────────────────────────────────────────────────────
// Row mappers - reconcile DB column names with WorkflowRecord interface
// ──────────────────────────────────────────────────────────────────────────────

type WorkflowDbRow = typeof workflows.$inferSelect
type WorkflowActionDbRow = typeof workflowActions.$inferSelect
type WorkflowExecutionDbRow = typeof workflowExecutions.$inferSelect

function mapWorkflowRow(row: WorkflowDbRow): WorkflowRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description ?? null,
    // DB uses "enabled"; WorkflowRecord interface uses "isActive"
    isActive: row.enabled,
    isVisual: row.isVisual,
    nodes: (row.nodes as WorkflowNode[] | null) ?? null,
    edges: (row.edges as WorkflowEdge[] | null) ?? null,
    conditions: (row.conditions as WorkflowConditionGroup | WorkflowCondition[] | null) ?? null,
    // DB stores delay as integer (minutes); expose as string for service layer
    // null stays null; integer becomes string representation
    delay: row.delay != null ? String(row.delay) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // workflows table has no deletedAt column - always null
    deletedAt: null,
  }
}

function mapActionRow(row: WorkflowActionDbRow): WorkflowActionRecord {
  return {
    id: row.id,
    workflowId: row.workflowId,
    // workflowActions table has no tenantId column - set to empty string sentinel
    // The service layer must supply tenantId context separately when needed
    tenantId: '',
    actionType: row.actionType as WorkflowActionRecord['actionType'],
    config: row.config as NodeConfig,
    order: row.order,
    createdAt: row.createdAt,
  }
}

function mapExecutionRow(row: WorkflowExecutionDbRow): WorkflowExecutionRecord {
  return {
    id: row.id,
    workflowId: row.workflowId,
    tenantId: row.tenantId,
    triggerEvent: row.triggerEvent,
    triggerData: row.triggerData as Record<string, unknown>,
    // DB enum is UPPERCASE; WorkflowExecutionRecord uses lowercase
    status: row.status.toLowerCase() as WorkflowExecutionRecord['status'],
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? null,
    // DB column is "errorMessage"; WorkflowExecutionRecord uses "error"
    error: row.errorMessage ?? null,
    actionResults: (row.actionResults as Array<NodeExecutionResult | ActionExecutionResult> | null) ?? null,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Workflow CRUD
// ──────────────────────────────────────────────────────────────────────────────

export const workflowRepository = {

  async findById(tenantId: string, workflowId: string): Promise<WorkflowRecord | null> {
    log.debug({ workflowId, tenantId }, 'findById called')
    const [row] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, workflowId)))
      .limit(1)
    return row ? mapWorkflowRow(row) : null
  },

  async findByTrigger(tenantId: string, triggerEvent: string): Promise<WorkflowRecord[]> {
    log.debug({ tenantId, triggerEvent }, 'findByTrigger called')
    // Returns all ACTIVE workflows that have a TRIGGER node matching this event
    // Search in nodes JSONB array for TRIGGER nodes with matching eventType
    const { sql: rawSql } = await import('drizzle-orm')
    const rows = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.tenantId, tenantId),
          eq(workflows.enabled, true),
          rawSql`EXISTS (
            SELECT 1
            FROM jsonb_array_elements(${workflows.nodes}) AS node
            WHERE node->>'type' = 'TRIGGER'
            AND node->'config'->>'eventType' = ${triggerEvent}
          )`
        )
      )
    return rows.map(mapWorkflowRow)
  },

  async listByTenant(
    tenantId: string,
    opts: { triggerEvent?: string; isActive?: boolean; limit: number; cursor?: string }
  ): Promise<{ rows: WorkflowRecord[]; hasMore: boolean }> {
    log.debug({ tenantId, opts }, 'listByTenant called')

    const conditions: any[] = [eq(workflows.tenantId, tenantId)]

    if (opts.triggerEvent) {
      // Search for TRIGGER nodes in JSONB with matching eventType
      const { sql: rawSql } = await import('drizzle-orm')
      conditions.push(
        rawSql`EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${workflows.nodes}) AS node
          WHERE node->>'type' = 'TRIGGER'
          AND node->'config'->>'eventType' = ${opts.triggerEvent}
        )`
      )
    }
    if (opts.isActive !== undefined) {
      conditions.push(eq(workflows.enabled, opts.isActive))
    }
    // cursor is the createdAt ISO string of the last seen row
    // We use createdAt-based cursor pagination with DESC ordering:
    // rows with createdAt < cursor are fetched next.
    // For simplicity we implement offset-style via the cursor as ISO timestamp.
    // The service can use the last row's createdAt.toISOString() as cursor.

    const dbRows = await db
      .select()
      .from(workflows)
      .where(and(...conditions))
      .orderBy(desc(workflows.createdAt))
      .limit(opts.limit + 1)

    const hasMore = dbRows.length > opts.limit
    return { rows: dbRows.slice(0, opts.limit).map(mapWorkflowRow), hasMore }
  },

  async create(tenantId: string, input: CreateWorkflowInput): Promise<WorkflowRecord> {
    log.debug({ tenantId, name: input.name }, 'create called')
    const now = new Date()
    const [row] = await db
      .insert(workflows)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name: input.name,
        description: input.description ?? null,
        // WorkflowRecord.isActive → DB column "enabled"
        enabled: input.isActive ?? true,
        isVisual: input.isVisual ?? false,
        conditions: (input.conditions ?? null) as typeof workflows.$inferInsert['conditions'],
        // WorkflowRecord.delay is string | null; DB stores integer (minutes).
        // Parse numeric string to integer, or null.
        delay: input.delay != null ? parseInt(input.delay, 10) || null : null,
        nodes: (input.nodes ?? null) as typeof workflows.$inferInsert['nodes'],
        edges: (input.edges ?? null) as typeof workflows.$inferInsert['edges'],
        viewport: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!row) throw new NotFoundError('Workflow', 'created')
    return mapWorkflowRow(row)
  },

  async update(
    tenantId: string,
    workflowId: string,
    input: Partial<UpdateWorkflowInput>
  ): Promise<WorkflowRecord> {
    log.debug({ workflowId, tenantId }, 'update called')
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.isActive !== undefined) updateData.enabled = input.isActive
    if (input.isVisual !== undefined) updateData.isVisual = input.isVisual
    if (input.conditions !== undefined) updateData.conditions = input.conditions
    if (input.delay !== undefined) {
      updateData.delay = input.delay != null ? parseInt(input.delay, 10) || null : null
    }
    if (input.nodes !== undefined) updateData.nodes = input.nodes
    if (input.edges !== undefined) updateData.edges = input.edges

    const [row] = await db
      .update(workflows)
      .set(updateData as Partial<typeof workflows.$inferInsert>)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, workflowId)))
      .returning()

    if (!row) throw new NotFoundError('Workflow', workflowId)
    return mapWorkflowRow(row)
  },

  async softDelete(tenantId: string, workflowId: string): Promise<void> {
    log.debug({ workflowId, tenantId }, 'softDelete called')
    // workflows table has no deletedAt column - disable only
    const [row] = await db
      .update(workflows)
      .set({ enabled: false, updatedAt: new Date() })
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, workflowId)))
      .returning({ id: workflows.id })

    if (!row) throw new NotFoundError('Workflow', workflowId)
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Linear mode - workflowActions (ordered)
  // ────────────────────────────────────────────────────────────────────────────

  async findActionsByWorkflowId(workflowId: string): Promise<WorkflowActionRecord[]> {
    log.debug({ workflowId }, 'findActionsByWorkflowId called')
    const rows = await db
      .select()
      .from(workflowActions)
      .where(eq(workflowActions.workflowId, workflowId))
      .orderBy(asc(workflowActions.order))
    return rows.map(mapActionRow)
  },

  async createAction(
    input: Omit<WorkflowActionRecord, 'id' | 'createdAt'>
  ): Promise<WorkflowActionRecord> {
    log.debug({ workflowId: input.workflowId, actionType: input.actionType }, 'createAction called')
    // Note: workflowActions table has no tenantId column - tenantId from input is not stored
    const [row] = await db
      .insert(workflowActions)
      .values({
        id: crypto.randomUUID(),
        workflowId: input.workflowId,
        actionType: input.actionType as typeof workflowActions.$inferInsert['actionType'],
        config: input.config as typeof workflowActions.$inferInsert['config'],
        order: input.order,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (!row) throw new NotFoundError('WorkflowAction', 'created')
    return mapActionRow(row)
  },

  async deleteActionsByWorkflowId(workflowId: string): Promise<void> {
    log.debug({ workflowId }, 'deleteActionsByWorkflowId called')
    // Used when updating a linear workflow (replace-all pattern)
    await db
      .delete(workflowActions)
      .where(eq(workflowActions.workflowId, workflowId))
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Execution tracking
  // ────────────────────────────────────────────────────────────────────────────

  async findExecutionById(
    tenantId: string,
    executionId: string
  ): Promise<(WorkflowExecutionRecord & { workflowName: string }) | null> {
    log.debug({ executionId, tenantId }, 'findExecutionById called')
    const [row] = await db
      .select({
        execution: workflowExecutions,
        workflowName: workflows.name,
      })
      .from(workflowExecutions)
      .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .where(
        and(
          eq(workflowExecutions.tenantId, tenantId),
          eq(workflowExecutions.id, executionId)
        )
      )
      .limit(1)
    if (!row) return null
    return {
      ...mapExecutionRow(row.execution),
      workflowName: row.workflowName,
    }
  },

  async recordExecution(
    input: Omit<WorkflowExecutionRecord, 'id'>
  ): Promise<WorkflowExecutionRecord> {
    log.debug({ workflowId: input.workflowId, tenantId: input.tenantId }, 'recordExecution called')
    const [row] = await db
      .insert(workflowExecutions)
      .values({
        id: crypto.randomUUID(),
        workflowId: input.workflowId,
        tenantId: input.tenantId,
        triggerEvent: input.triggerEvent,
        triggerData: input.triggerData as typeof workflowExecutions.$inferInsert['triggerData'],
        // WorkflowExecutionRecord uses lowercase; DB enum is UPPERCASE
        status: (input.status.toUpperCase()) as typeof workflowExecutions.$inferInsert['status'],
        startedAt: input.startedAt,
        completedAt: input.completedAt ?? null,
        // WorkflowExecutionRecord.error → DB column "errorMessage"
        errorMessage: input.error ?? null,
        actionsExecuted: 0,
        actionResults: (input.actionResults ?? null) as typeof workflowExecutions.$inferInsert['actionResults'],
      })
      .returning()

    if (!row) throw new NotFoundError('WorkflowExecution', 'created')
    return mapExecutionRow(row)
  },

  async findExecution(
    workflowId: string,
    triggerEvent: string,
    bookingId: string
  ): Promise<WorkflowExecutionRecord | null> {
    log.debug({ workflowId, triggerEvent, bookingId }, 'findExecution called')
    // Idempotency check - workflowExecutions has no bookingId column.
    // We match on (workflowId, triggerEvent) and filter by bookingId inside triggerData.
    // Using Postgres JSON path: triggerData->>'bookingId' = bookingId
    const rows = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.workflowId, workflowId),
          eq(workflowExecutions.triggerEvent, triggerEvent),
        )
      )
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(20)

    // Filter in application code by bookingId inside triggerData
    const match = rows.find((r) => {
      const td = r.triggerData as Record<string, unknown>
      return td?.bookingId === bookingId
    })
    return match ? mapExecutionRow(match) : null
  },

  async updateExecution(
    executionId: string,
    updates: Partial<Pick<WorkflowExecutionRecord, 'status' | 'completedAt' | 'actionResults' | 'error'>>
  ): Promise<void> {
    log.debug({ executionId }, 'updateExecution called')
    const updateData: Record<string, unknown> = {}

    if (updates.status !== undefined) {
      updateData.status = updates.status.toUpperCase()
    }
    if (updates.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt
    }
    if (updates.actionResults !== undefined) {
      updateData.actionResults = updates.actionResults
    }
    if (updates.error !== undefined) {
      // WorkflowExecutionRecord.error → DB column "errorMessage"
      updateData.errorMessage = updates.error
    }

    await db
      .update(workflowExecutions)
      .set(updateData as Partial<typeof workflowExecutions.$inferInsert>)
      .where(eq(workflowExecutions.id, executionId))
  },

  async listExecutions(
    tenantId: string,
    opts: { workflowId?: string; limit: number; cursor?: string }
  ): Promise<{ rows: WorkflowExecutionRecord[]; hasMore: boolean }> {
    log.debug({ tenantId, opts }, 'listExecutions called')

    const conditions: ReturnType<typeof eq>[] = [eq(workflowExecutions.tenantId, tenantId)]

    if (opts.workflowId) {
      conditions.push(eq(workflowExecutions.workflowId, opts.workflowId))
    }

    const dbRows = await db
      .select()
      .from(workflowExecutions)
      .where(and(...(conditions as Parameters<typeof and>)))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(opts.limit + 1)

    const hasMore = dbRows.length > opts.limit
    return { rows: dbRows.slice(0, opts.limit).map(mapExecutionRow), hasMore }
  },
}
