// ──────────────────────────────────────────────────────────────────────────────
// Workflow Module — TypeScript interfaces only (no Zod)
// ──────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Node & Action Type Enums
// ---------------------------------------------------------------------------

export type WorkflowNodeType =
  // Flow control
  | 'TRIGGER'
  | 'IF'
  | 'SWITCH'
  | 'MERGE'
  | 'LOOP'
  | 'LOOP_END'
  | 'WAIT_FOR_EVENT'
  | 'WAIT_UNTIL'
  | 'STOP'
  | 'ERROR'
  // Action nodes (original 7)
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'WEBHOOK'
  | 'CREATE_CALENDAR_EVENT'
  | 'UPDATE_BOOKING_STATUS'
  | 'CREATE_TASK'
  | 'SEND_NOTIFICATION'
  // Data nodes
  | 'SET_VARIABLE'
  | 'FILTER'
  | 'TRANSFORM'
  // Sub-workflow
  | 'EXECUTE_WORKFLOW'

/** Subset of node types that correspond to the original 7 action types (linear engine). */
export type WorkflowActionType =
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'WEBHOOK'
  | 'CREATE_CALENDAR_EVENT'
  | 'UPDATE_BOOKING_STATUS'
  | 'CREATE_TASK'
  | 'SEND_NOTIFICATION'

// ---------------------------------------------------------------------------
// Condition Model
// ---------------------------------------------------------------------------

export interface WorkflowCondition {
  field: string
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'is_set'
    | 'is_not_set'
  value?: string
}

/** Recursive AND / OR condition group. */
export interface WorkflowConditionGroup {
  logic: 'AND' | 'OR'
  conditions: Array<WorkflowCondition | WorkflowConditionGroup>
}

// ---------------------------------------------------------------------------
// Node Config interfaces
// ---------------------------------------------------------------------------

export interface TriggerNodeConfig {
  /** Event name that triggers this workflow (e.g. "booking/created") */
  eventType: string
  /** Optional conditions to filter which events trigger this node */
  conditions?: WorkflowConditionGroup
  /** Debounce period in milliseconds to prevent duplicate triggers */
  debounceMs?: number
}

export interface IfNodeConfig {
  conditions: WorkflowConditionGroup
}

export interface SwitchNodeConfig {
  /** Dot-path to evaluate: "booking.status" */
  field: string
  cases: Array<{
    handle: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: string
    label?: string
  }>
}

export interface MergeNodeConfig {
  mode: 'wait_all' | 'wait_any' | 'append'
  /** ISO 8601 duration — for wait_all, give up after this duration */
  timeout?: string
}

export interface LoopNodeConfig {
  /** Dot-path to array in context: "variables.bookings" */
  sourceField: string
  /** Name to expose current item: "item" */
  itemVariableName: string
  /** Name to expose current index: "index" */
  indexVariableName?: string
  /** Safety guard — default 100 */
  maxIterations?: number
  mode: 'sequential' | 'parallel'
}

export interface WaitForEventNodeConfig {
  /** Inngest event name: "payment/received" */
  event: string
  /** Field in the incoming event to match: "data.bookingId" */
  matchField: string
  /** Field in current context to match against: "triggerData.bookingId" */
  matchSourceField: string
  /** ISO 8601 duration: "P7D" */
  timeout: string
  timeoutBehavior: 'continue' | 'stop' | 'error'
  /** Store incoming event data under this context key */
  outputField?: string
}

export interface WaitUntilNodeConfig {
  mode: 'duration' | 'datetime' | 'field'
  /** ISO 8601 duration: "PT24H" */
  duration?: string
  /** ISO 8601 timestamp: "2026-03-01T09:00:00Z" */
  datetime?: string
  /** Dot-path to datetime string in context */
  field?: string
}

export interface SetVariableNodeConfig {
  assignments: Array<{
    /** Variable name added to context.variables */
    key: string
    valueType: 'literal' | 'expression' | 'field'
    literal?: string | number | boolean
    /** Dot-path: "nodes.SendEmail_1.output.messageId" */
    field?: string
    /** Arithmetic/string expression: "{{booking.price}} * 1.2" */
    expression?: string
  }>
}

export interface FilterNodeConfig {
  /** Dot-path to array: "variables.bookings" */
  sourceField: string
  /** Where to store result in context.variables */
  outputField: string
  conditions: WorkflowConditionGroup
}

export interface TransformNodeConfig {
  /** Where to store result in context.variables */
  outputField: string
  mappings: Array<{
    targetKey: string
    /** Dot-path into full context */
    sourceField: string
    transform?:
      | 'uppercase'
      | 'lowercase'
      | 'trim'
      | 'toNumber'
      | 'toDate'
      | 'toBoolean'
      | 'toString'
  }>
}

export interface ExecuteWorkflowNodeConfig {
  workflowId: string
  mode: 'sync' | 'fire_and_forget'
  /** What data to pass as triggerData to sub-workflow */
  inputMappings: Array<{
    targetKey: string
    sourceField: string
  }>
  /** sync mode only: store sub-workflow output here */
  outputField?: string
}

// ---------------------------------------------------------------------------
// Action Node Configs (original 7)
// ---------------------------------------------------------------------------

export interface SendEmailActionConfig {
  templateId?: string
  recipientField?: string
  recipientEmail?: string
  subject?: string
  body?: string
  bodyHtml?: string
  delay?: string
}

export interface SendSmsActionConfig {
  templateId?: string
  recipientField?: string
  recipientPhone?: string
  body?: string
  delay?: string
}

export interface WebhookActionConfig {
  url: string
  method: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  bodyTemplate?: string
  timeout?: number
  expectedStatus?: number
}

export interface CreateCalendarEventActionConfig {
  userIdField?: string
  titleTemplate?: string
  descriptionTemplate?: string
  addCustomerAsAttendee?: boolean
}

export interface UpdateBookingStatusActionConfig {
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  reason?: string
}

export interface CreateTaskActionConfig {
  title?: string
  description?: string
  assigneeField?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDateOffset?: string
}

export interface SendNotificationActionConfig {
  recipientField?: string
  title?: string
  body?: string
}

/** Union of all node config shapes */
export type NodeConfig =
  | TriggerNodeConfig
  | IfNodeConfig
  | SwitchNodeConfig
  | MergeNodeConfig
  | LoopNodeConfig
  | WaitForEventNodeConfig
  | WaitUntilNodeConfig
  | SetVariableNodeConfig
  | FilterNodeConfig
  | TransformNodeConfig
  | ExecuteWorkflowNodeConfig
  | SendEmailActionConfig
  | SendSmsActionConfig
  | WebhookActionConfig
  | CreateCalendarEventActionConfig
  | UpdateBookingStatusActionConfig
  | CreateTaskActionConfig
  | SendNotificationActionConfig
  | Record<string, unknown>

// ---------------------------------------------------------------------------
// Graph model (stored as JSONB in workflows table)
// ---------------------------------------------------------------------------

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  label?: string
  position: { x: number; y: number }
  config: NodeConfig
  errorHandling?: 'stop' | 'continue' | 'branch'
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  label?: string
}

// ---------------------------------------------------------------------------
// Execution Context
// ---------------------------------------------------------------------------

export interface WorkflowExecutionContext {
  /** Enriched trigger data (immutable after enrichTriggerData()) */
  triggerData: Record<string, unknown>

  /** Accumulated node outputs: nodeId → result */
  nodes: Record<
    string,
    {
      output: Record<string, unknown>
      success: boolean
      skipped?: boolean
      error?: string
    }
  >

  /** Named variables from SET_VARIABLE nodes */
  variables: Record<string, unknown>

  /** Loop frame stack (supports nested loops) */
  loopStack: Array<{
    sourceField: string
    items: unknown[]
    currentIndex: number
    currentItem: unknown
    itemVariableName: string
    indexVariableName?: string
  }>

  /** Loop / recursion prevention */
  __workflowDepth: number
}

// ---------------------------------------------------------------------------
// Execution Results
// ---------------------------------------------------------------------------

export interface NodeExecutionResult {
  nodeId: string
  nodeType: WorkflowNodeType
  label?: string
  /** Position in graph traversal order */
  order?: number
  startedAt: Date
  completedAt: Date
  durationMs: number
  success: boolean
  skipped: boolean
  skipReason?: string
  /** Which output handle was taken */
  nextHandle?: string
  output?: Record<string, unknown>
  error?: string
  /** LOOP node: number of iterations run */
  iterations?: number
  /** Parallel branch results */
  branchResults?: NodeExecutionResult[][]
}

export interface ActionExecutionResult {
  nodeId: string
  nodeType: WorkflowActionType
  label?: string
  order?: number
  startedAt: Date
  completedAt: Date
  durationMs: number
  success: boolean
  skipped: boolean
  skipReason?: string
  nextHandle?: string
  output?: Record<string, unknown>
  error?: string
  iterations?: number
  branchResults?: ActionExecutionResult[][]
}

// ---------------------------------------------------------------------------
// DB Record shapes
// ---------------------------------------------------------------------------

export interface WorkflowRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  isActive: boolean
  isVisual: boolean
  /** Graph mode: array of WorkflowNode (stored as JSONB) */
  nodes: WorkflowNode[] | null
  /** Graph mode: array of WorkflowEdge (stored as JSONB) */
  edges: WorkflowEdge[] | null
  /** Linear mode: flat condition array OR WorkflowConditionGroup (stored as JSONB) */
  conditions: WorkflowConditionGroup | WorkflowCondition[] | null
  /** ISO 8601 delay before execution (e.g. "PT24H") */
  delay: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface WorkflowActionRecord {
  id: string
  workflowId: string
  tenantId: string
  actionType: WorkflowActionType
  config: NodeConfig
  order: number
  createdAt: Date
}

export interface WorkflowExecutionRecord {
  id: string
  workflowId: string
  tenantId: string
  triggerEvent: string
  triggerData: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt: Date | null
  /** Serialized array of NodeExecutionResult or ActionExecutionResult */
  actionResults: Array<NodeExecutionResult | ActionExecutionResult> | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Input types (used by service layer)
// ---------------------------------------------------------------------------

export interface CreateWorkflowInput {
  name: string
  description?: string | null
  isActive?: boolean
  isVisual?: boolean
  conditions?: WorkflowConditionGroup | null
  delay?: string | null
  nodes?: WorkflowNode[] | null
  edges?: WorkflowEdge[] | null
}

export interface UpdateWorkflowInput {
  id: string
  name?: string
  description?: string | null
  isActive?: boolean
  isVisual?: boolean
  conditions?: WorkflowConditionGroup | null
  delay?: string | null
  nodes?: WorkflowNode[] | null
  edges?: WorkflowEdge[] | null
}
