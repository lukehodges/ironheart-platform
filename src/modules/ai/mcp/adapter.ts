// src/modules/ai/mcp/adapter.ts

import { logger } from "@/shared/logger"
import { mcpConnectionRepository } from "./repository"
import { discoverTools } from "./client"
import type { MCPConnectionRecord, MCPToolDefinition } from "./types"

const log = logger.child({ module: "ai.mcp.adapter" })

/**
 * External tool description for injection into the system prompt module index.
 * External tools are NOT individual AgentTool/MutatingAgentTool instances --
 * they are described in the system prompt and routed through a special
 * `call_external_tool` path in the executor when Claude writes code that
 * calls them via `ctx.external("connection:tool", args)`.
 */
export interface ExternalToolEntry {
  /** Namespaced name: "ext:connectionName:toolName" */
  name: string
  description: string
  connectionId: string
  connectionName: string
  originalToolName: string
  inputSchema: Record<string, unknown>
  guardrailTier: "AUTO" | "CONFIRM" | "RESTRICT"
}

/**
 * Convert external MCP tools into ExternalToolEntry descriptions.
 * These are injected into the system prompt module index so Claude knows
 * about them, and routed through the executor when called.
 */
export function adaptExternalTools(
  connection: MCPConnectionRecord,
  tools: MCPToolDefinition[]
): ExternalToolEntry[] {
  return tools.map((mcpTool) => {
    const guardrailTier = connection.toolGuardrailOverrides[mcpTool.name]
      ?? connection.defaultGuardrailTier
      ?? "CONFIRM"

    return {
      name: `ext:${connection.name}:${mcpTool.name}`,
      description: `[External: ${connection.name}] ${mcpTool.description}`,
      connectionId: connection.id,
      connectionName: connection.name,
      originalToolName: mcpTool.name,
      inputSchema: mcpTool.inputSchema as Record<string, unknown>,
      guardrailTier: guardrailTier as "AUTO" | "CONFIRM" | "RESTRICT",
    }
  })
}

/**
 * Get all external tool descriptions available to a tenant.
 * Uses cached tool definitions, falling back to discovery if stale.
 * Returns entries for system prompt injection + executor routing.
 */
export async function getExternalToolsForTenant(tenantId: string): Promise<ExternalToolEntry[]> {
  const connections = await mcpConnectionRepository.listEnabled(tenantId)
  const allExternalTools: ExternalToolEntry[] = []

  for (const connection of connections) {
    let tools = connection.cachedTools
    if (!tools) {
      // No cached tools -- discover them
      tools = await discoverTools(connection)
    }
    if (tools && tools.length > 0) {
      allExternalTools.push(...adaptExternalTools(connection, tools))
    }
  }

  log.info({ tenantId, toolCount: allExternalTools.length, connections: connections.length }, "External tools loaded")
  return allExternalTools
}
