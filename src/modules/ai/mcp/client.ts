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
