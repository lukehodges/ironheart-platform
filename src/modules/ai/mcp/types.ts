// src/modules/ai/mcp/types.ts

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 Base Types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number | null
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// JSON-RPC error codes
export const RPC_PARSE_ERROR = -32700
export const RPC_INVALID_REQUEST = -32600
export const RPC_METHOD_NOT_FOUND = -32601
export const RPC_INVALID_PARAMS = -32602
export const RPC_INTERNAL_ERROR = -32603

// ---------------------------------------------------------------------------
// MCP Protocol Types
// ---------------------------------------------------------------------------

export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface MCPToolCallResult {
  content: Array<{
    type: "text"
    text: string
  }>
  isError?: boolean
}

export interface MCPServerInfo {
  name: string
  version: string
  protocolVersion: string
}

// ---------------------------------------------------------------------------
// MCP Connection Record
// ---------------------------------------------------------------------------

export interface MCPConnectionRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  serverUrl: string
  authType: "bearer" | "api_key" | "none"
  authCredential: string | null
  cachedTools: MCPToolDefinition[] | null
  toolsRefreshedAt: Date | null
  defaultGuardrailTier: "AUTO" | "CONFIRM" | "RESTRICT"
  toolGuardrailOverrides: Record<string, "AUTO" | "CONFIRM" | "RESTRICT">
  healthStatus: "healthy" | "degraded" | "unreachable"
  lastHealthCheck: Date | null
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// MCP API Key Scope (for server mode)
// ---------------------------------------------------------------------------

export interface MCPApiKeyScope {
  /** Which module tools this key can access */
  allowedModules: string[]
  /** Specific tool names to allow (overrides module-level) */
  allowedTools?: string[]
  /** Specific tool names to block */
  blockedTools?: string[]
  /** Rate limit: requests per minute */
  rateLimit: number
}
