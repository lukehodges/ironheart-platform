// src/modules/ai/mcp/server.ts

import { logger } from "@/shared/logger"
import { getModuleMap } from "../ai.introspection"
import { createCallerFactory } from "@/shared/trpc"
import type { JsonRpcRequest, JsonRpcResponse, MCPToolDefinition, MCPToolCallResult } from "./types"

const log = logger.child({ module: "ai.mcp.server" })

// Lazy-init to avoid circular imports
let cachedCreateCaller: ReturnType<typeof createCallerFactory> | null = null
async function getCreateCaller() {
  if (!cachedCreateCaller) {
    const { appRouter } = await import("@/server/root")
    cachedCreateCaller = createCallerFactory(appRouter)
  }
  return cachedCreateCaller
}

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
  apiKey: string,
  req?: Request
): Promise<JsonRpcResponse> {
  const { id, method, params } = request

  // 1. Authenticate and resolve API key -> tenant + permissions
  const keyContext = await resolveApiKey(apiKey)
  if (!keyContext) {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid API key" } }
  }

  // 2. Rate limit check
  const withinLimit = await checkMcpRateLimit(apiKey, keyContext.rateLimit)
  if (!withinLimit) {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Rate limit exceeded" } }
  }

  // 3. Route by method
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
      return handleToolsCall(id, params as { name: string; arguments?: Record<string, unknown> }, keyContext, req)

    default:
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } }
  }
}

/**
 * List available tools using router introspection (getModuleMap).
 * Each tRPC procedure is exposed as an MCP tool with its JSON Schema input.
 * Filtered by the API key's allowed modules and permissions.
 */
async function handleToolsList(id: string | number, ctx: ApiKeyContext): Promise<JsonRpcResponse> {
  const moduleMap = await getModuleMap()

  const mcpTools: MCPToolDefinition[] = []
  for (const [moduleName, moduleMeta] of moduleMap) {
    // Filter by allowed modules if scoped
    if (ctx.allowedModules.length > 0 && !ctx.allowedModules.includes(moduleName)) continue

    for (const proc of moduleMeta.procedures) {
      mcpTools.push({
        name: `${moduleName}.${proc.name}`,
        description: `${proc.type} procedure: ${moduleName}.${proc.name}`,
        inputSchema: (proc.inputSchema as MCPToolDefinition["inputSchema"]) ?? {
          type: "object",
          properties: {},
        },
      })
    }
  }

  return { jsonrpc: "2.0", id, result: { tools: mcpTools } }
}

/**
 * Execute a tool call using a tRPC caller.
 * The tool name is a procedure path (e.g., "booking.list").
 * A tRPC caller is built with the API key's tenant/user context,
 * so all auth, RBAC, and tenant isolation is enforced.
 */
async function handleToolsCall(
  id: string | number,
  params: { name: string; arguments?: Record<string, unknown> },
  ctx: ApiKeyContext,
  req?: Request
): Promise<JsonRpcResponse> {
  if (!params?.name) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing tool name" } }
  }

  // Parse procedure path: "module.procedure"
  const dotIndex = params.name.indexOf(".")
  if (dotIndex === -1) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Invalid tool name format: ${params.name}. Expected "module.procedure".` } }
  }

  const moduleName = params.name.slice(0, dotIndex)
  const procedureName = params.name.slice(dotIndex + 1)

  // Check module scoping
  if (ctx.allowedModules.length > 0 && !ctx.allowedModules.includes(moduleName)) {
    return { jsonrpc: "2.0", id, error: { code: -32602, message: `Module not in allowed scope: ${moduleName}` } }
  }

  // Build a tRPC caller with the API key's context
  const { db } = await import("@/shared/db")
  const createCaller = await getCreateCaller()
  const trpc = createCaller({
    db,
    session: { user: { id: ctx.userId } } as any,
    tenantId: ctx.tenantId,
    tenantSlug: ctx.tenantSlug,
    user: ctx.userWithRoles as any,
    requestId: crypto.randomUUID(),
    req: req ?? new Request("https://localhost/api/mcp"),
  })

  try {
    // Call the tRPC procedure via the caller
    const moduleObj = (trpc as any)[moduleName]
    if (!moduleObj || typeof moduleObj[procedureName] !== "function") {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Procedure not found: ${params.name}` } }
    }

    const result = await moduleObj[procedureName](params.arguments ?? {})
    const text = JSON.stringify(result, null, 2)
    log.info({ procedure: params.name, tenantId: ctx.tenantId }, "MCP tool call executed")

    return {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text }] } as MCPToolCallResult,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed"
    log.error({ err, procedure: params.name }, "MCP tool call failed")

    return {
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true } as MCPToolCallResult,
    }
  }
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

async function checkMcpRateLimit(apiKey: string, limit: number): Promise<boolean> {
  const { redis } = await import("@/shared/redis")
  const key = `mcp:rate:${apiKey}`
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60)
  }
  return current <= limit
}

// ---------------------------------------------------------------------------
// API Key Resolution
// ---------------------------------------------------------------------------

interface ApiKeyContext {
  tenantId: string
  tenantSlug: string
  userId: string
  userWithRoles: unknown // User object with roles for tRPC context
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
  // The developer module should have: developerRepository.validateApiKey(key) -> { tenantId, userId, scopes }
  return null
}
