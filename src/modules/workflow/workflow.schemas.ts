import { z } from 'zod'

// ---------------------------------------------------------------------------
// Node / Edge schemas (broad acceptance — JSONB storage)
// ---------------------------------------------------------------------------

export const workflowNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'TRIGGER',
    'IF',
    'SWITCH',
    'MERGE',
    'LOOP',
    'LOOP_END',
    'WAIT_FOR_EVENT',
    'WAIT_UNTIL',
    'STOP',
    'ERROR',
    'SEND_EMAIL',
    'SEND_SMS',
    'WEBHOOK',
    'CREATE_CALENDAR_EVENT',
    'UPDATE_BOOKING_STATUS',
    'CREATE_TASK',
    'SEND_NOTIFICATION',
    'SET_VARIABLE',
    'FILTER',
    'TRANSFORM',
    'EXECUTE_WORKFLOW',
  ]),
  label: z.string().optional(),
  position: workflowNodePositionSchema,
  config: z.record(z.string(), z.unknown()),
  errorHandling: z.enum(['stop', 'continue', 'branch']).optional(),
})

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string(),
  label: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Condition schemas
// ---------------------------------------------------------------------------

const workflowConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_set',
  'is_not_set',
])

export const workflowConditionSchema = z.object({
  field: z.string(),
  operator: workflowConditionOperatorSchema,
  value: z.string().optional(),
})

/**
 * Recursive condition group schema.
 * We use z.lazy() so Zod can handle the recursive WorkflowConditionGroup type.
 */
export type WorkflowConditionGroupInput = {
  logic: 'AND' | 'OR'
  conditions: Array<
    | z.infer<typeof workflowConditionSchema>
    | WorkflowConditionGroupInput
  >
}

export const workflowConditionGroupSchema: z.ZodType<WorkflowConditionGroupInput> = z.lazy(
  () =>
    z.object({
      logic: z.enum(['AND', 'OR']),
      conditions: z.array(
        z.union([workflowConditionSchema, workflowConditionGroupSchema]),
      ),
    }),
)

// ---------------------------------------------------------------------------
// CRUD schemas
// ---------------------------------------------------------------------------

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  triggerEvent: z.string().min(1),
  isActive: z.boolean().default(true),
  isVisual: z.boolean().default(false),
  /** Backward-compat: accepts flat WorkflowCondition[] or WorkflowConditionGroup */
  conditions: z.union([workflowConditionGroupSchema, z.array(workflowConditionSchema)]).optional(),
  /** ISO 8601 delay string (e.g. "PT24H") */
  delay: z.string().optional(),
  /** Graph mode: node definitions */
  nodes: z.array(z.unknown()).optional(),
  /** Graph mode: edge definitions */
  edges: z.array(z.unknown()).optional(),
})

export const updateWorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  triggerEvent: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isVisual: z.boolean().optional(),
  conditions: z
    .union([workflowConditionGroupSchema, z.array(workflowConditionSchema)])
    .optional()
    .nullable(),
  delay: z.string().optional().nullable(),
  nodes: z.array(z.unknown()).optional().nullable(),
  edges: z.array(z.unknown()).optional().nullable(),
})

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const listWorkflowsSchema = z.object({
  triggerEvent: z.string().optional(),
  isActive: z.boolean().optional(),
  isVisual: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

export const getWorkflowSchema = z.object({
  id: z.string(),
})

export const deleteWorkflowSchema = z.object({
  id: z.string(),
})

// ---------------------------------------------------------------------------
// Graph validation schema
// ---------------------------------------------------------------------------

export const validateGraphSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
})

// ---------------------------------------------------------------------------
// Test trigger schema
// ---------------------------------------------------------------------------

export const testTriggerSchema = z.object({
  workflowId: z.string(),
  triggerData: z.record(z.string(), z.unknown()),
})
