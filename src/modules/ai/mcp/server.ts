// src/modules/ai/mcp/server.ts

import { logger } from "@/shared/logger"
import { getModuleMap } from "../ai.introspection"
import { createCallerFactory } from "@/shared/trpc"
import type { Context } from "@/shared/trpc"
import type { UserWithRoles } from "@/modules/auth/rbac"
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
 *
 * Builds a tRPC context that matches what tenantProcedure/platformAdminProcedure
 * expect: a WorkOS-shaped session with the user's workosUserId (or internal ID
 * as fallback) and email, plus the pre-loaded user with roles.
 *
 * The middleware pipeline (tenantProcedure) will re-fetch the user from DB using
 * session.user.id (workosUserId) → fallback to session.user.email + tenantId.
 * We set both so at least one lookup path succeeds.
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

  // Parse procedure path: "module.procedure" or "module.sub.procedure"
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

  // Build a tRPC caller with the resolved context
  const { db } = await import("@/shared/db")
  const createCaller = await getCreateCaller()

  const trpcContext: Context = {
    db,
    session: {
      user: {
        // workosUserId is the primary lookup key in tenantProcedure.
        // Fall back to internal userId so the email fallback path fires.
        id: ctx.session.workosUserId ?? ctx.session.userId,
        email: ctx.session.email,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        profilePictureUrl: null,
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // MCP callers don't go through WorkOS OAuth — no real access token.
      // The tRPC middleware only uses session.user fields, not accessToken.
      accessToken: "mcp-internal",
    },
    tenantId: ctx.tenantId,
    tenantSlug: ctx.tenantSlug,
    user: ctx.user,
    requestId: crypto.randomUUID(),
    req: req ?? new Request("https://localhost/api/mcp"),
  }

  const trpc = createCaller(trpcContext)

  try {
    // Call the tRPC procedure via the caller
    const moduleObj = (trpc as any)[moduleName]
    if (!moduleObj || typeof moduleObj[procedureName] !== "function") {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Procedure not found: ${params.name}` } }
    }

    const result = await moduleObj[procedureName](params.arguments ?? {})
    const text = JSON.stringify(truncateMcpResult(result))
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
// Result Truncation (keeps MCP responses within token budget)
// ---------------------------------------------------------------------------

const MAX_MCP_RESULT_BYTES = 8192

function truncateMcpResult(result: unknown): unknown {
  if (result === undefined || result === null) return result

  try {
    const json = JSON.stringify(result)
    if (json.length <= MAX_MCP_RESULT_BYTES) return result

    // Object with rows array (paginated list) — trim rows
    if (typeof result === "object" && result !== null && "rows" in result) {
      const obj = result as Record<string, unknown>
      if (Array.isArray(obj.rows)) {
        const total = obj.rows.length
        let shown = Math.min(total, 20)
        while (shown > 1) {
          const slice = obj.rows.slice(0, shown)
          if (JSON.stringify(slice).length <= MAX_MCP_RESULT_BYTES - 200) break
          shown = Math.floor(shown * 0.7)
        }
        return { ...obj, rows: obj.rows.slice(0, shown), _truncated: { total, shown } }
      }
    }

    // Plain array
    if (Array.isArray(result)) {
      const total = result.length
      let shown = Math.min(total, 20)
      while (shown > 1) {
        const slice = result.slice(0, shown)
        if (JSON.stringify(slice).length <= MAX_MCP_RESULT_BYTES - 200) break
        shown = Math.floor(shown * 0.7)
      }
      return { items: result.slice(0, shown), _truncated: { total, shown } }
    }

    // Large object — truncate keys
    if (typeof result === "object" && result !== null) {
      const keys = Object.keys(result as Record<string, unknown>)
      const trimmed: Record<string, unknown> = {}
      for (const key of keys) {
        trimmed[key] = (result as Record<string, unknown>)[key]
        if (JSON.stringify(trimmed).length > MAX_MCP_RESULT_BYTES - 100) {
          delete trimmed[key]
          break
        }
      }
      return { ...trimmed, _truncated: { totalKeys: keys.length, shownKeys: Object.keys(trimmed).length } }
    }

    return result
  } catch {
    return { _error: "Result too large", _sizeBytes: JSON.stringify(result).length }
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

/**
 * Session fields needed to build a WorkOS-compatible tRPC context.
 * tenantProcedure uses session.user.id (workosUserId) for its primary DB
 * lookup, then falls back to session.user.email + ctx.tenantId.
 */
interface McpSession {
  userId: string       // Internal Ironheart user ID
  workosUserId: string | null // WorkOS user ID (may be null for seeded users)
  email: string
  firstName: string | null
  lastName: string | null
}

interface ApiKeyContext {
  tenantId: string
  tenantSlug: string
  session: McpSession
  /** Pre-loaded user with roles — used as ctx.user in tRPC context. */
  user: UserWithRoles | null
  permissions: string[]
  allowedModules: string[]
  rateLimit: number
}

/**
 * Resolve an API key to tenant context and permissions.
 * Supports a dev-mode key for local MCP access (Claude Code, etc.).
 * Production should integrate with the developer module's API key system.
 */
async function resolveApiKey(apiKey: string): Promise<ApiKeyContext | null> {
  // Dev-mode key: allows local tools (Claude Code) to access tRPC procedures
  const devKey = process.env.IRONHEART_MCP_DEV_KEY
  if (devKey && apiKey === devKey) {
    return resolveDevApiKey()
  }

  // TODO: Integrate with developer module's API key validation
  // The developer module should have: developerRepository.validateApiKey(key) -> { tenantId, userId, scopes }
  return null
}

/**
 * Build an ApiKeyContext for the dev key using DEFAULT_TENANT_SLUG.
 * Grants full access to all modules — only for local development.
 *
 * Loads the full user record with roles using the same relational query
 * that tenantProcedure uses, so ctx.user is a real UserWithRoles object.
 * This means procedures that access ctx.user.roles, ctx.user.tenantId,
 * ctx.user.isPlatformAdmin etc. all work correctly.
 */
async function resolveDevApiKey(): Promise<ApiKeyContext | null> {
  const { db } = await import("@/shared/db")
  const { tenants, users } = await import("@/shared/db/schema")
  const { eq } = await import("drizzle-orm")

  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "demo"
  const adminEmail = process.env.PLATFORM_ADMIN_EMAILS?.split(",")[0]?.trim()

  // Resolve tenant
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1)
  if (!tenant) {
    log.warn({ tenantSlug }, "Dev MCP key: tenant not found")
    return null
  }

  // Load user with full role/permission graph — same shape as tenantProcedure
  const userWithRolesQuery = {
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  } as const

  type DrizzleUserWithRoles = Awaited<ReturnType<typeof db.query.users.findFirst<typeof userWithRolesQuery>>>

  let rawUser: DrizzleUserWithRoles | undefined

  // Prefer platform admin, fall back to first tenant member
  if (adminEmail) {
    rawUser = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
      ...userWithRolesQuery,
    })
  }
  if (!rawUser) {
    rawUser = await db.query.users.findFirst({
      where: eq(users.tenantId, tenant.id),
      ...userWithRolesQuery,
    })
  }
  if (!rawUser) {
    log.warn({ tenantSlug }, "Dev MCP key: no user found for tenant")
    return null
  }

  // Reshape to UserWithRoles (same as reshapeUserWithRoles in trpc.ts)
  const user: UserWithRoles = {
    ...rawUser,
    roles: (rawUser.userRoles ?? []).map((ur) => ({
      role: {
        ...ur.role,
        permissions: ur.role.rolePermissions.map((rp) => ({
          permission: rp.permission,
        })),
      },
    })),
  }

  log.info(
    { tenantSlug, userId: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
    "Dev MCP key resolved"
  )

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    session: {
      userId: user.id,
      workosUserId: user.workosUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    user,
    permissions: [], // empty = no RBAC filtering in MCP layer
    allowedModules: [], // empty = all modules
    rateLimit: 600, // generous for dev
  }
}
