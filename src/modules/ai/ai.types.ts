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
// Streaming Events — emitted via Redis pub/sub for SSE
// ---------------------------------------------------------------------------

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; toolName: string; input: unknown }
  | { type: "tool_result"; toolName: string; result: unknown; durationMs: number }
  | { type: "text_delta"; content: string }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done"; content: string; tokenUsage: TokenUsage; toolCallCount: number; conversationId: string }
