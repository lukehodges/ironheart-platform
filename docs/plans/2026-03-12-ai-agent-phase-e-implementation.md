# AI Agent Phase E Implementation Plan

> **For Claude:** This is a self-contained implementation plan. Follow it task-by-task. Each task specifies exact files, exact code, and exact patterns. Do NOT deviate from established codebase patterns documented below.

**Goal:** Make Ironheart both an MCP server (exposing module tools to external AI agents) and an MCP client (connecting to external tools). Add API key authentication from the developer module, RBAC scoping per API key, and external tool discovery with guardrails.

**Timeline:** 8 working days

**Design Doc:** `docs/plans/2026-03-08-ai-native-agentic-platform-design.md` (Section 6: Integration Strategy, Section 10: Phase E)
**Phase D Plan (prerequisite — must be complete):** `docs/plans/2026-03-12-ai-agent-phase-d-implementation.md`

---

## Key Architecture Decisions (DO NOT CHANGE)

1. **MCP server as a Next.js API route.** `/api/mcp` exposes module tools via the Model Context Protocol. External AI agents authenticate with API keys from the developer module and get RBAC-scoped tool access.
2. **MCP client for external tool connections.** Tenants configure external MCP server connections in `ai_mcp_connections`. The agent discovers external tools at connection time and integrates them into its tool set. External tools are sandboxed with CONFIRM guardrail by default.
3. **API key authentication.** Reuse the developer module's API key infrastructure. Each API key has scoped permissions that determine which tools are available via MCP.
4. **No framework dependencies.** MCP server and client are implemented directly — no `@modelcontextprotocol/sdk` package. The protocol is simple enough (JSON-RPC 2.0 over HTTP) to implement directly. This avoids dependency bloat and gives full control.
5. **External tools get CONFIRM guardrail by default.** Any tool from an external MCP server requires user approval before execution. Tenants can override to AUTO for trusted connections.
6. **Tool discovery at connection time.** When a tenant adds an MCP connection, we call the server's `tools/list` method and cache the tool definitions. Periodic refresh (every 24h) via Inngest.

---

## Progress Tracking

```
[ ] Task 1: Database schema — ai_mcp_connections table
[ ] Task 2: MCP types and protocol definitions
[ ] Task 3: MCP connection repository
[ ] Task 4: MCP server — /api/mcp route handler
[ ] Task 5: MCP server — tool listing + execution
[ ] Task 6: MCP server — authentication middleware
[ ] Task 7: MCP client — connection manager
[ ] Task 8: MCP client — external tool adapter
[ ] Task 9: Integrate external tools into agent
[ ] Task 10: Inngest jobs — tool refresh + connection health
[ ] Task 11: Router procedures + schemas
[ ] Task 12: Tests
[ ] Task 13: Verification — tsc + build + tests
```

---

## Codebase Patterns Reference

All patterns from Phase A+ through D apply. Additionally:

### MCP Protocol (JSON-RPC 2.0):
```typescript
// Request format:
{ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }
{ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "booking.list", arguments: { status: "PENDING" } } }

// Response format:
{ jsonrpc: "2.0", id: 1, result: { tools: [...] } }
{ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "..." }] } }

// Error format:
{ jsonrpc: "2.0", id: 1, error: { code: -32600, message: "Invalid request" } }
```

### API Key pattern (developer module):
```typescript
// Check src/modules/developer/ for existing API key infrastructure
// API keys are typically: prefix + random bytes, stored hashed in DB
// Each key has scoped permissions
```

---

## Task 1: Database Schema — ai_mcp_connections

**Files:**
- Modify: `src/shared/db/schemas/ai.schema.ts`

```typescript
// Add below existing tables in ai.schema.ts

// ---------------------------------------------------------------------------
// AI MCP Connections — external MCP server configurations
// ---------------------------------------------------------------------------

export const aiMcpConnections = pgTable("ai_mcp_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  /** The MCP server URL (e.g., https://api.example.com/mcp) */
  serverUrl: text("server_url").notNull(),
  /** Authentication type: 'bearer', 'api_key', 'none' */
  authType: text("auth_type").notNull().default("none"),
  /** Encrypted credentials (bearer token or API key) */
  authCredential: text("auth_credential"),
  /** Cached tool definitions from the server (refreshed periodically) */
  cachedTools: jsonb("cached_tools"),
  /** When tools were last refreshed */
  toolsRefreshedAt: timestamp("tools_refreshed_at", { withTimezone: true }),
  /** Default guardrail tier for tools from this connection */
  defaultGuardrailTier: text("default_guardrail_tier").notNull().default("CONFIRM"),
  /** Per-tool guardrail overrides: { "toolName": "AUTO" | "CONFIRM" | "RESTRICT" } */
  toolGuardrailOverrides: jsonb("tool_guardrail_overrides").default("{}"),
  /** Connection health: 'healthy', 'degraded', 'unreachable' */
  healthStatus: text("health_status").notNull().default("healthy"),
  lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
  isEnabled: integer("is_enabled").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_ai_mcp_connections_tenant").on(t.tenantId),
])
```

**Commit:** `feat(ai): add ai_mcp_connections database table`

---

## Task 2: MCP Types and Protocol Definitions

**Files:**
- Create: `src/modules/ai/mcp/types.ts`

```typescript
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
  id: string | number
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
```

**Commit:** `feat(ai): add MCP protocol type definitions`

---

## Task 3: MCP Connection Repository

**Files:**
- Create: `src/modules/ai/mcp/repository.ts`

```typescript
// src/modules/ai/mcp/repository.ts

import { db } from "@/shared/db"
import { aiMcpConnections } from "@/shared/db/schema"
import { eq, and } from "drizzle-orm"
import { logger } from "@/shared/logger"
import type { MCPConnectionRecord, MCPToolDefinition } from "./types"

const log = logger.child({ module: "ai.mcp.repository" })

function mapConnection(row: typeof aiMcpConnections.$inferSelect): MCPConnectionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    serverUrl: row.serverUrl,
    authType: row.authType as MCPConnectionRecord["authType"],
    authCredential: row.authCredential,
    cachedTools: row.cachedTools as MCPToolDefinition[] | null,
    toolsRefreshedAt: row.toolsRefreshedAt,
    defaultGuardrailTier: row.defaultGuardrailTier as MCPConnectionRecord["defaultGuardrailTier"],
    toolGuardrailOverrides: (row.toolGuardrailOverrides as Record<string, "AUTO" | "CONFIRM" | "RESTRICT">) ?? {},
    healthStatus: row.healthStatus as MCPConnectionRecord["healthStatus"],
    lastHealthCheck: row.lastHealthCheck,
    isEnabled: row.isEnabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const mcpConnectionRepository = {
  async create(data: {
    tenantId: string
    name: string
    description?: string
    serverUrl: string
    authType: string
    authCredential?: string
  }): Promise<MCPConnectionRecord> {
    const [row] = await db
      .insert(aiMcpConnections)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        serverUrl: data.serverUrl,
        authType: data.authType,
        authCredential: data.authCredential ?? null,
      })
      .returning()
    log.info({ connectionId: row!.id, tenantId: data.tenantId }, "MCP connection created")
    return mapConnection(row!)
  },

  async getById(tenantId: string, id: string): Promise<MCPConnectionRecord | null> {
    const [row] = await db
      .select()
      .from(aiMcpConnections)
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
      .limit(1)
    return row ? mapConnection(row) : null
  },

  async listByTenant(tenantId: string): Promise<MCPConnectionRecord[]> {
    const rows = await db
      .select()
      .from(aiMcpConnections)
      .where(eq(aiMcpConnections.tenantId, tenantId))
    return rows.map(mapConnection)
  },

  async listEnabled(tenantId: string): Promise<MCPConnectionRecord[]> {
    const rows = await db
      .select()
      .from(aiMcpConnections)
      .where(and(eq(aiMcpConnections.tenantId, tenantId), eq(aiMcpConnections.isEnabled, 1)))
    return rows.map(mapConnection)
  },

  async updateCachedTools(id: string, tools: MCPToolDefinition[]): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({
        cachedTools: tools,
        toolsRefreshedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiMcpConnections.id, id))
  },

  async updateHealth(id: string, status: "healthy" | "degraded" | "unreachable"): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiMcpConnections.id, id))
  },

  async update(id: string, tenantId: string, data: {
    name?: string
    description?: string
    serverUrl?: string
    authType?: string
    authCredential?: string
    isEnabled?: number
    defaultGuardrailTier?: string
    toolGuardrailOverrides?: Record<string, string>
  }): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
  },

  async delete(id: string, tenantId: string): Promise<void> {
    await db
      .delete(aiMcpConnections)
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
    log.info({ connectionId: id }, "MCP connection deleted")
  },
}
```

**Commit:** `feat(ai): add MCP connection repository`

---

## Task 4: MCP Server — /api/mcp Route Handler

**Files:**
- Create: `src/app/api/mcp/route.ts`

```typescript
// src/app/api/mcp/route.ts

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/shared/logger"
import { mcpServerHandler } from "@/modules/ai/mcp/server"

const log = logger.child({ module: "api.mcp" })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apiKey = req.headers.get("authorization")?.replace("Bearer ", "")

    if (!apiKey) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32600, message: "Missing API key" } },
        { status: 401 }
      )
    }

    const response = await mcpServerHandler(body, apiKey)
    return NextResponse.json(response)
  } catch (err) {
    log.error({ err }, "MCP server error")
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } },
      { status: 500 }
    )
  }
}
```

**Commit:** `feat(ai): add MCP server API route handler`

---

## Task 5: MCP Server — Tool Listing + Execution

**Files:**
- Create: `src/modules/ai/mcp/server.ts`

```typescript
// src/modules/ai/mcp/server.ts

import { logger } from "@/shared/logger"
import { allTools, getToolsForUser } from "../tools"
import type { AgentContext } from "../ai.types"
import type { JsonRpcRequest, JsonRpcResponse, MCPToolDefinition, MCPToolCallResult, RPC_METHOD_NOT_FOUND, RPC_INVALID_PARAMS, RPC_INTERNAL_ERROR } from "./types"

const log = logger.child({ module: "ai.mcp.server" })

const SERVER_INFO = {
  name: "ironheart",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
}

/**
 * Handle an incoming MCP JSON-RPC request.
 * apiKeyContext is resolved by the auth layer before this is called.
 */
export async function mcpServerHandler(
  request: JsonRpcRequest,
  apiKey: string
): Promise<JsonRpcResponse> {
  const { id, method, params } = request

  // 1. Authenticate and resolve API key → tenant + permissions
  const keyContext = await resolveApiKey(apiKey)
  if (!keyContext) {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid API key" } }
  }

  // 2. Route by method
  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SERVER_INFO.protocolVersion,
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        },
      }

    case "tools/list":
      return handleToolsList(id, keyContext)

    case "tools/call":
      return handleToolsCall(id, params as { name: string; arguments?: Record<string, unknown> }, keyContext)

    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } }
  }
}

function handleToolsList(id: string | number, ctx: ApiKeyContext): JsonRpcResponse {
  const availableTools = getToolsForUser(allTools, ctx.permissions)

  // Filter by allowed modules if scoped
  const filteredTools = ctx.allowedModules.length > 0
    ? availableTools.filter((t) => ctx.allowedModules.includes(t.module))
    : availableTools

  const mcpTools: MCPToolDefinition[] = filteredTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema as MCPToolDefinition["inputSchema"],
  }))

  return { jsonrpc: "2.0", id, result: { tools: mcpTools } }
}

async function handleToolsCall(
  id: string | number,
  params: { name: string; arguments?: Record<string, unknown> },
  ctx: ApiKeyContext
): Promise<JsonRpcResponse> {
  if (!params?.name) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing tool name" } }
  }

  const availableTools = getToolsForUser(allTools, ctx.permissions)
  const tool = availableTools.find((t) => t.name === params.name)

  if (!tool) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Tool not found: ${params.name}` } }
  }

  // Check module scoping
  if (ctx.allowedModules.length > 0 && !ctx.allowedModules.includes(tool.module)) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Tool not in allowed modules: ${params.name}` } }
  }

  const agentCtx: AgentContext = {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    userPermissions: ctx.permissions,
  }

  try {
    const result = await tool.execute(params.arguments ?? {}, agentCtx)
    const text = JSON.stringify(result, null, 2)
    log.info({ tool: params.name, tenantId: ctx.tenantId }, "MCP tool call executed")

    return {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text }] } as MCPToolCallResult,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed"
    log.error({ err, tool: params.name }, "MCP tool call failed")

    return {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true } as MCPToolCallResult,
    }
  }
}

// ---------------------------------------------------------------------------
// API Key Resolution
// ---------------------------------------------------------------------------

interface ApiKeyContext {
  tenantId: string
  userId: string
  permissions: string[]
  allowedModules: string[]
  rateLimit: number
}

/**
 * Resolve an API key to tenant context and permissions.
 * This should integrate with the developer module's API key system.
 * Read the developer module before implementing.
 */
async function resolveApiKey(apiKey: string): Promise<ApiKeyContext | null> {
  // TODO: Integrate with developer module's API key validation
  // For now, return null to reject all keys until developer module integration
  // The developer module should have: developerRepository.validateApiKey(key) → { tenantId, userId, scopes }
  return null
}
```

**Important:** Before implementing `resolveApiKey`, read the developer module to understand how API keys are stored and validated. If no developer module exists yet, create a simple API key validation using a new `ai_api_keys` table or wait for the developer module.

**Commit:** `feat(ai): add MCP server with tool listing and execution`

---

## Task 6: MCP Server — Rate Limiting

**Files:**
- Modify: `src/modules/ai/mcp/server.ts`

Add Redis-based rate limiting to the MCP server handler:

```typescript
import { redis } from "@/shared/redis"

async function checkMcpRateLimit(apiKey: string, limit: number): Promise<boolean> {
  const key = `mcp:rate:${apiKey}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60)
  }
  return current <= limit
}
```

Call this in `mcpServerHandler` before processing any request. Return a `-32600` error if rate limited.

**Commit:** `feat(ai): add rate limiting to MCP server`

---

## Task 7: MCP Client — Connection Manager

**Files:**
- Create: `src/modules/ai/mcp/client.ts`

```typescript
// src/modules/ai/mcp/client.ts

import { logger } from "@/shared/logger"
import { mcpConnectionRepository } from "./repository"
import type { MCPToolDefinition, MCPConnectionRecord, JsonRpcRequest, JsonRpcResponse } from "./types"

const log = logger.child({ module: "ai.mcp.client" })

const REQUEST_TIMEOUT_MS = 10_000 // 10 seconds

/**
 * Send a JSON-RPC request to an external MCP server.
 */
async function sendMcpRequest(
  connection: MCPConnectionRecord,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (connection.authType === "bearer" && connection.authCredential) {
    headers["Authorization"] = `Bearer ${connection.authCredential}`
  } else if (connection.authType === "api_key" && connection.authCredential) {
    headers["X-API-Key"] = connection.authCredential
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(connection.serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`MCP server returned ${response.status}`)
    }

    const json = (await response.json()) as JsonRpcResponse
    if (json.error) {
      throw new Error(`MCP error: ${json.error.message}`)
    }

    return json.result
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("MCP server request timed out")
    }
    throw err
  }
}

/**
 * Discover tools from an external MCP server.
 */
export async function discoverTools(connection: MCPConnectionRecord): Promise<MCPToolDefinition[]> {
  try {
    // Initialize connection
    await sendMcpRequest(connection, "initialize")

    // List tools
    const result = (await sendMcpRequest(connection, "tools/list")) as { tools: MCPToolDefinition[] }
    const tools = result.tools ?? []

    // Cache the tools
    await mcpConnectionRepository.updateCachedTools(connection.id, tools)
    await mcpConnectionRepository.updateHealth(connection.id, "healthy")

    log.info({ connectionId: connection.id, toolCount: tools.length }, "MCP tools discovered")
    return tools
  } catch (err) {
    log.error({ err, connectionId: connection.id }, "Failed to discover MCP tools")
    await mcpConnectionRepository.updateHealth(connection.id, "unreachable")
    return []
  }
}

/**
 * Call a tool on an external MCP server.
 */
export async function callExternalTool(
  connection: MCPConnectionRecord,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = (await sendMcpRequest(connection, "tools/call", {
    name: toolName,
    arguments: args,
  })) as { content: Array<{ type: string; text: string }>; isError?: boolean }

  if (result.isError) {
    const errorText = result.content?.map((c) => c.text).join("") ?? "External tool error"
    throw new Error(errorText)
  }

  // Parse text content
  const text = result.content?.map((c) => c.text).join("") ?? ""
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Check health of an MCP connection.
 */
export async function checkConnectionHealth(connection: MCPConnectionRecord): Promise<"healthy" | "degraded" | "unreachable"> {
  try {
    await sendMcpRequest(connection, "initialize")
    await mcpConnectionRepository.updateHealth(connection.id, "healthy")
    return "healthy"
  } catch {
    await mcpConnectionRepository.updateHealth(connection.id, "unreachable")
    return "unreachable"
  }
}
```

**Commit:** `feat(ai): add MCP client for external tool discovery and execution`

---

## Task 8: MCP Client — External Tool Adapter

**Files:**
- Create: `src/modules/ai/mcp/adapter.ts`

```typescript
// src/modules/ai/mcp/adapter.ts

import { logger } from "@/shared/logger"
import { mcpConnectionRepository } from "./repository"
import { callExternalTool, discoverTools } from "./client"
import type { MutatingAgentTool, AgentTool } from "../ai.types"
import type { MCPConnectionRecord, MCPToolDefinition } from "./types"

const log = logger.child({ module: "ai.mcp.adapter" })

/**
 * Convert external MCP tools into AgentTool format for the agent to use.
 * All external tools get CONFIRM guardrail by default (overridable per connection).
 */
export function adaptExternalTools(
  connection: MCPConnectionRecord,
  tools: MCPToolDefinition[]
): MutatingAgentTool[] {
  return tools.map((mcpTool) => {
    const guardrailTier = connection.toolGuardrailOverrides[mcpTool.name]
      ?? connection.defaultGuardrailTier
      ?? "CONFIRM"

    return {
      name: `ext:${connection.name}:${mcpTool.name}`,
      description: `[External: ${connection.name}] ${mcpTool.description}`,
      module: `ext:${connection.name}`,
      permission: null, // External tools don't use internal RBAC
      inputSchema: mcpTool.inputSchema as Record<string, unknown>,
      guardrailTier: guardrailTier as "AUTO" | "CONFIRM" | "RESTRICT",
      mutationDescription: `External tool call to ${connection.name}: ${mcpTool.name}`,
      isReversible: false, // External tools are not reversible
      execute: async (input: unknown, ctx) => {
        return callExternalTool(connection, mcpTool.name, input as Record<string, unknown>)
      },
    }
  })
}

/**
 * Get all external tools available to a tenant.
 * Uses cached tool definitions, falling back to discovery if stale.
 */
export async function getExternalToolsForTenant(tenantId: string): Promise<MutatingAgentTool[]> {
  const connections = await mcpConnectionRepository.listEnabled(tenantId)
  const allExternalTools: MutatingAgentTool[] = []

  for (const connection of connections) {
    let tools = connection.cachedTools
    if (!tools) {
      // No cached tools — discover them
      tools = await discoverTools(connection)
    }
    if (tools && tools.length > 0) {
      allExternalTools.push(...adaptExternalTools(connection, tools))
    }
  }

  log.info({ tenantId, toolCount: allExternalTools.length, connections: connections.length }, "External tools loaded")
  return allExternalTools
}
```

**Commit:** `feat(ai): add external tool adapter converting MCP tools to agent tools`

---

## Task 9: Integrate External Tools Into Agent

**Files:**
- Modify: `src/modules/ai/ai.service.ts`

Update the agent loop in `sendMessage` to include external tools:

1. After loading internal tools with `getToolsForUser()`, call `getExternalToolsForTenant(tenantId)` to get external tools
2. Merge both tool sets: `[...internalTools, ...externalTools]`
3. External tools go through the same mutation approval flow from Phase B (they implement `MutatingAgentTool`)
4. The `ext:` prefix on tool names makes it clear to the agent which tools are external

Read the current service code before modifying. The change is small — just merge the tool arrays.

**Commit:** `feat(ai): integrate external MCP tools into agent tool set`

---

## Task 10: Inngest Jobs — Tool Refresh + Connection Health

**Files:**
- Modify: `src/modules/ai/ai.events.ts`
- Modify: `src/shared/inngest.ts`

### Add Inngest events:

```typescript
// src/shared/inngest.ts — add:
"ai/mcp.tools.refresh": {
  data: { connectionId: string; tenantId: string }
}
"ai/mcp.health.check": {
  data: { connectionId: string; tenantId: string }
}
```

### Add Inngest functions to ai.events.ts:

```typescript
// Daily tool refresh for all MCP connections
const mcpToolRefresh = inngest.createFunction(
  { id: "ai/mcp-tool-refresh", name: "MCP Tool Refresh" },
  { cron: "0 2 * * *" }, // Daily at 2 AM
  async ({ step }) => {
    await step.run("refresh-all-connections", async () => {
      // Get all enabled connections across all tenants
      // For each, call discoverTools() to refresh cached tools
      // This is a simplified approach — in production, iterate tenant by tenant
      const { db } = await import("@/shared/db")
      const { aiMcpConnections } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")
      const { discoverTools } = await import("./mcp/client")
      const { mcpConnectionRepository } = await import("./mcp/repository")

      const connections = await db
        .select()
        .from(aiMcpConnections)
        .where(eq(aiMcpConnections.isEnabled, 1))

      for (const conn of connections) {
        const mapped = await mcpConnectionRepository.getById(conn.tenantId, conn.id)
        if (mapped) await discoverTools(mapped)
      }

      return { refreshed: connections.length }
    })
  }
)

// Health check for MCP connections (every 6 hours)
const mcpHealthCheck = inngest.createFunction(
  { id: "ai/mcp-health-check", name: "MCP Health Check" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    await step.run("check-all-connections", async () => {
      const { db } = await import("@/shared/db")
      const { aiMcpConnections } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")
      const { checkConnectionHealth } = await import("./mcp/client")
      const { mcpConnectionRepository } = await import("./mcp/repository")

      const connections = await db
        .select()
        .from(aiMcpConnections)
        .where(eq(aiMcpConnections.isEnabled, 1))

      for (const conn of connections) {
        const mapped = await mcpConnectionRepository.getById(conn.tenantId, conn.id)
        if (mapped) await checkConnectionHealth(mapped)
      }

      return { checked: connections.length }
    })
  }
)

// Update aiFunctions array to include new functions:
export const aiFunctions = [weeklyWorkflowSuggestions, mcpToolRefresh, mcpHealthCheck]
```

**Commit:** `feat(ai): add Inngest jobs for MCP tool refresh and connection health checks`

---

## Task 11: Router Procedures + Schemas

**Files:**
- Modify: `src/modules/ai/ai.schemas.ts`
- Modify: `src/modules/ai/ai.router.ts`
- Modify: `src/modules/ai/index.ts`

### New schemas:

```typescript
export const createMcpConnectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  serverUrl: z.string().url(),
  authType: z.enum(["bearer", "api_key", "none"]),
  authCredential: z.string().optional(),
})

export const updateMcpConnectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  serverUrl: z.string().url().optional(),
  authType: z.enum(["bearer", "api_key", "none"]).optional(),
  authCredential: z.string().optional(),
  isEnabled: z.boolean().optional(),
  defaultGuardrailTier: z.enum(["AUTO", "CONFIRM", "RESTRICT"]).optional(),
})

export const deleteMcpConnectionSchema = z.object({ id: z.string() })
export const refreshMcpToolsSchema = z.object({ id: z.string() })
export const listMcpConnectionsSchema = z.object({})
```

### New router procedures:

```typescript
createMcpConnection: modulePermission("ai:write")
  .input(createMcpConnectionSchema)
  .mutation(async ({ ctx, input }) => {
    const connection = await mcpConnectionRepository.create({ tenantId: ctx.tenantId, ...input })
    // Auto-discover tools on creation
    await discoverTools(connection)
    return connection
  }),

updateMcpConnection: modulePermission("ai:write")
  .input(updateMcpConnectionSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, isEnabled, ...data } = input
    await mcpConnectionRepository.update(id, ctx.tenantId, {
      ...data,
      isEnabled: isEnabled !== undefined ? (isEnabled ? 1 : 0) : undefined,
    })
    return { success: true }
  }),

deleteMcpConnection: modulePermission("ai:write")
  .input(deleteMcpConnectionSchema)
  .mutation(async ({ ctx, input }) => {
    await mcpConnectionRepository.delete(input.id, ctx.tenantId)
    return { success: true }
  }),

listMcpConnections: moduleProcedure
  .input(listMcpConnectionsSchema)
  .query(({ ctx }) => mcpConnectionRepository.listByTenant(ctx.tenantId)),

refreshMcpTools: modulePermission("ai:write")
  .input(refreshMcpToolsSchema)
  .mutation(async ({ ctx, input }) => {
    const connection = await mcpConnectionRepository.getById(ctx.tenantId, input.id)
    if (!connection) return { tools: [] }
    const tools = await discoverTools(connection)
    return { tools }
  }),
```

**Commit:** `feat(ai): add MCP connection management router procedures`

---

## Task 12: Tests

**Files:**
- Create: `src/modules/ai/__tests__/ai-phase-e.test.ts`

Test:
1. **MCP connection repository**: CRUD operations, list enabled, update cached tools, update health
2. **MCP server handler**: Initialize, tools/list, tools/call, unknown method, missing API key
3. **MCP client**: Mock fetch. Test tool discovery, tool call, timeout handling, health check
4. **External tool adapter**: Convert MCP tools to agent tools, guardrail tier resolution
5. **Rate limiting**: Redis-based rate limit for MCP server
6. **Tool integration**: Verify external tools merge into agent tool set

**Commit:** `test(ai): add Phase E tests for MCP server, client, and external tool integration`

---

## Task 13: Verification — tsc + build + tests

Run:
1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test`

Fix any issues. Commit with: `fix(ai): resolve Phase E verification issues`

---

## Post-Implementation Checklist

```
[ ] ai_mcp_connections table created with tenant index
[ ] MCP server at /api/mcp handles initialize, tools/list, tools/call
[ ] MCP server authenticates via API key (integration with developer module)
[ ] MCP server rate-limited per API key
[ ] MCP client discovers tools from external servers
[ ] MCP client calls external tools with timeout and error handling
[ ] External tools adapted to agent tool format with CONFIRM guardrail default
[ ] External tools integrated into agent loop
[ ] Inngest jobs: daily tool refresh, 6-hourly health check
[ ] MCP connection CRUD router procedures working
[ ] All tests pass
[ ] tsc + build pass
```
