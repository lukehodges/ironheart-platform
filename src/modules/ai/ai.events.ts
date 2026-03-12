// src/modules/ai/ai.events.ts

import { inngest } from "@/shared/inngest"

const weeklyWorkflowSuggestions = inngest.createFunction(
  { id: "ai/weekly-workflow-suggestions", name: "Weekly Workflow Suggestions" },
  { cron: "0 9 * * 1" }, // Every Monday at 9 AM
  async ({ step }) => {
    await step.run("detect-patterns", async () => {
      // TODO: Pattern detection logic will analyze workflow execution history
      return { analyzed: true }
    })
  }
)

// Daily tool refresh for all MCP connections
const mcpToolRefresh = inngest.createFunction(
  { id: "ai/mcp-tool-refresh", name: "MCP Tool Refresh" },
  { cron: "0 2 * * *" }, // Daily at 2 AM
  async ({ step }) => {
    await step.run("refresh-all-connections", async () => {
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

export const aiFunctions = [weeklyWorkflowSuggestions, mcpToolRefresh, mcpHealthCheck]
