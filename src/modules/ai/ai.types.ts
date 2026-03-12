// src/modules/ai/ai.types.ts

import type { z, ZodType } from "zod"

// ---------------------------------------------------------------------------
// Agent Tool — the contract every tool implements
// ---------------------------------------------------------------------------

export interface AgentTool {
  /** Namespaced tool name: 'booking.list', 'customer.getById' */
  name: string
  /** Natural language description for the LLM */
  description: string
  /** JSON Schema for the tool's input parameters */
  inputSchema: Record<string, unknown>
  /** Execute the tool — receives validated input and tenant context */
  execute: (input: unknown, ctx: AgentContext) => Promise<unknown>
  /** Which module this tool belongs to */
  module: string
  /** Required RBAC permission (checked before execution). Null = no check. */
  permission: string | null
}

// ---------------------------------------------------------------------------
// Agent Context — passed to every tool execution
// ---------------------------------------------------------------------------

export interface AgentContext {
  tenantId: string
  userId: string
  workosUserId: string
  userPermissions: string[]
  pageContext?: PageContext
}

export interface PageContext {
  route: string
  entityType?: string
  entityId?: string
  listFilters?: Record<string, unknown>
  selectedIds?: string[]
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface ConversationRecord {
  id: string
  tenantId: string
  userId: string
  title: string | null
  status: "active" | "archived"
  tokenCount: number
  costCents: number
  summary: string | null
  summaryUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MessageRecord {
  id: string
  conversationId: string
  role: "system" | "user" | "assistant"
  content: string
  toolCalls: ToolCallRecord[] | null
  toolResults: ToolResultRecord[] | null
  tokenUsage: TokenUsage | null
  pageContext: PageContext | null
  createdAt: Date
}

export interface ToolCallRecord {
  id: string
  name: string
  input: unknown
}

export interface ToolResultRecord {
  toolCallId: string
  output: unknown
  error?: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
}

// ---------------------------------------------------------------------------
// Agent Response — returned from the agent service to the router
// ---------------------------------------------------------------------------

export interface AgentResponse {
  conversationId: string
  messageId: string
  content: string
  toolCalls: ToolCallRecord[]
  toolResults: ToolResultRecord[]
  tokenUsage: TokenUsage
}

// ---------------------------------------------------------------------------
// Guardrails — Three-tier tool classification
// ---------------------------------------------------------------------------

export type GuardrailTier = "AUTO" | "CONFIRM" | "RESTRICT"

export interface MutatingAgentTool extends AgentTool {
  /** Guardrail tier — controls approval flow */
  guardrailTier: GuardrailTier
  /** Human-readable description of what this mutation does */
  mutationDescription: string
  /** Optional: function to undo this action. Receives the compensation data saved in agent_actions. */
  compensate?: (compensationData: unknown, ctx: AgentContext) => Promise<void>
  /** Whether this action can be reversed */
  isReversible: boolean
}

// ---------------------------------------------------------------------------
// Agent Actions — audit trail records
// ---------------------------------------------------------------------------

export type ActionStatus = "pending" | "approved" | "rejected" | "executed" | "failed" | "rolled_back" | "auto_executed"

export interface AgentActionRecord {
  id: string
  conversationId: string
  messageId: string | null
  tenantId: string
  userId: string
  toolName: string
  toolInput: unknown
  toolOutput: unknown | null
  status: ActionStatus
  guardrailTier: GuardrailTier
  approvedAt: Date | null
  approvedBy: string | null
  executedAt: Date | null
  error: string | null
  compensationData: unknown | null
  isReversible: boolean
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Tenant AI Config
// ---------------------------------------------------------------------------

export interface TenantAIConfig {
  id: string
  tenantId: string
  isEnabled: boolean
  maxTokenBudget: number
  maxMessagesPerMinute: number
  defaultModel: string
  guardrailOverrides: Record<string, GuardrailTier>
  trustMetrics: Record<string, { approved: number; rejected: number }>
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Streaming Events — emitted via Redis pub/sub for SSE
// ---------------------------------------------------------------------------

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; durationMs: number }
  | { type: "text_delta"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; content: string; tokenUsage: TokenUsage; toolCallCount: number; conversationId: string }
  | { type: "approval_required"; actionId: string; toolName: string; description: string; input: unknown }
  | { type: "approval_resolved"; actionId: string; approved: boolean }
  | { type: "code_executing"; code: string }
  | { type: "code_result"; result: unknown; durationMs: number; error?: string }

// ---------------------------------------------------------------------------
// Memory System
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  summary: string
  messageCount: number
  lastSummarizedAt: Date
}

export interface CorrectionRecord {
  id: string
  tenantId: string
  toolName: string
  attemptedInput: unknown
  rejectionReason: string | null
  correctAction: string | null
  contextSummary: string | null
  occurrenceCount: number
  createdAt: Date
  updatedAt: Date
}

export interface KnowledgeChunkRecord {
  id: string
  tenantId: string
  sourceId: string
  sourceName: string
  content: string
  chunkIndex: number
  metadata: Record<string, unknown>
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Vertical Profiles
// ---------------------------------------------------------------------------

export interface VerticalProfile {
  slug: string
  name: string
  description: string
  terminology: Record<string, string>
  systemPromptAddendum: string
}

// ---------------------------------------------------------------------------
// RAG Context
// ---------------------------------------------------------------------------

export interface RAGResult {
  chunkId: string
  content: string
  sourceName: string
  similarity: number
}
