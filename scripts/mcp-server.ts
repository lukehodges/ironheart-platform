#!/usr/bin/env npx tsx
// scripts/mcp-server.ts
//
// Stdio MCP server for Claude Code (and other MCP clients).
// Bridges to the running Ironheart dev server at localhost:3000/api/mcp.
//
// Exposes 3 tools:
//   1. list_modules   — compact index of all modules + procedures
//   2. describe_module — compact JSON Schema for a specific module
//   3. call_procedure  — execute a tRPC procedure
//
// Token optimization:
//   - Schemas are compacted (UUID patterns stripped, nullable simplified, etc.)
//   - Results use compact JSON (no pretty-printing)
//   - describe_module returns only procedures with non-empty input schemas

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const BASE_URL = process.env.IRONHEART_MCP_URL ?? "http://localhost:3000/api/mcp"
const API_KEY = process.env.IRONHEART_MCP_DEV_KEY ?? "dev-mcp-local-only"

// ---------------------------------------------------------------------------
// JSON-RPC helper
// ---------------------------------------------------------------------------

let rpcId = 0

async function mcpCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const body = { jsonrpc: "2.0", id: ++rpcId, method, params }
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as { result?: unknown; error?: { message: string } }
  if (json.error) {
    throw new Error(json.error.message)
  }
  return json.result
}

// ---------------------------------------------------------------------------
// Cache for tools/list (avoid repeated introspection calls)
// ---------------------------------------------------------------------------

interface MCPToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

let cachedTools: MCPToolDef[] | null = null

async function getTools(): Promise<MCPToolDef[]> {
  if (cachedTools) return cachedTools
  const result = (await mcpCall("tools/list")) as { tools: MCPToolDef[] }
  cachedTools = result.tools
  return cachedTools
}

// ---------------------------------------------------------------------------
// Schema compaction — strips verbose noise to save tokens
// ---------------------------------------------------------------------------

function compactSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== "object" || schema === null) return schema

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    // Drop keys that waste tokens
    if (key === "additionalProperties" && value === false) continue
    if (key === "pattern" && typeof value === "string" && value.includes("0-9a-fA-F")) continue
    if (key === "maximum" && value === 9007199254740991) continue
    if (key === "$schema") continue

    // anyOf: [{type: X}, {type: "null"}] → {type: X, nullable: true}
    if (key === "anyOf" && Array.isArray(value) && value.length === 2) {
      const nullVariant = value.find((v: Record<string, unknown>) => v.type === "null")
      const realVariant = value.find((v: Record<string, unknown>) => v.type !== "null")
      if (nullVariant && realVariant) {
        Object.assign(result, compactSchema(realVariant as Record<string, unknown>), { nullable: true })
        continue
      }
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null ? compactSchema(item as Record<string, unknown>) : item
      )
    } else if (typeof value === "object" && value !== null) {
      result[key] = compactSchema(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "ironheart",
  version: "1.0.0",
})

// Tool 1: list_modules — compact module index
server.tool(
  "list_modules",
  "List all available modules and their tRPC procedures. Returns module names with query/mutation procedure names.",
  {},
  async () => {
    const tools = await getTools()

    const modules = new Map<string, { queries: string[]; mutations: string[] }>()
    for (const tool of tools) {
      const dotIndex = tool.name.indexOf(".")
      if (dotIndex === -1) continue
      const mod = tool.name.slice(0, dotIndex)
      const proc = tool.name.slice(dotIndex + 1)
      const type = tool.description.startsWith("mutation") ? "mutations" : "queries"

      if (!modules.has(mod)) modules.set(mod, { queries: [], mutations: [] })
      modules.get(mod)![type].push(proc)
    }

    const lines: string[] = []
    for (const [mod, procs] of modules) {
      lines.push(`${mod}:`)
      if (procs.queries.length) lines.push(`  q: ${procs.queries.join(", ")}`)
      if (procs.mutations.length) lines.push(`  m: ${procs.mutations.join(", ")}`)
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] }
  }
)

// Tool 2: describe_module — compact schemas for a module
server.tool(
  "describe_module",
  "Get input schemas for a module's procedures. Call before using call_procedure for mutations.",
  { module: z.string().describe("Module name (e.g., 'booking', 'customer')") },
  async ({ module }) => {
    const tools = await getTools()

    const matching = tools.filter((t) => t.name.startsWith(`${module}.`))
    if (matching.length === 0) {
      return {
        content: [{ type: "text" as const, text: `Module "${module}" not found. Use list_modules.` }],
        isError: true,
      }
    }

    const procedures = matching.map((t) => {
      const schema = compactSchema(t.inputSchema)
      // Only include schema if it has properties
      const props = schema.properties as Record<string, unknown> | undefined
      const hasProps = props && Object.keys(props).length > 0

      return {
        name: t.name.slice(module.length + 1),
        type: t.description.startsWith("mutation") ? "mutation" : "query",
        ...(hasProps ? { input: schema } : {}),
      }
    })

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ module, procedures }) }],
    }
  }
)

// Tool 3: call_procedure — execute a tRPC procedure
server.tool(
  "call_procedure",
  "Execute a tRPC procedure. Use 'module.procedure' format for the name (e.g., 'booking.list'). Pass the input as a JSON object matching the schema from describe_module.",
  {
    name: z.string().describe("Procedure path in 'module.procedure' format (e.g., 'booking.list', 'customer.getById')"),
    arguments: z.record(z.string(), z.unknown()).optional().describe("Input arguments matching the procedure's schema"),
  },
  async ({ name, arguments: args }) => {
    try {
      const result = (await mcpCall("tools/call", { name, arguments: args ?? {} })) as {
        content: { type: string; text: string }[]
        isError?: boolean
      }

      return {
        content: result.content.map((c) => ({ type: "text" as const, text: c.text })),
        isError: result.isError,
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  }
)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  process.stderr.write(`MCP server fatal: ${err}\n`)
  process.exit(1)
})
