// src/modules/ai/ai.events.ts

import { inngest } from "@/shared/inngest"
import { gatherBriefingData } from "./features/morning-briefing.data"
import { generateBriefing } from "./features/morning-briefing.generator"
import { processGhostOperator } from "./features/ghost-operator.processor"

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

const morningBriefingJob = inngest.createFunction(
  { id: "ai/morning-briefing", name: "Morning Briefing Generator" },
  { cron: "0 * * * *" }, // Run every hour — filter by tenant's configured time
  async ({ step }) => {
    const results = await step.run("generate-briefings", async () => {
      const { db } = await import("@/shared/db")
      const { aiTenantConfig } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")

      const configs = await db
        .select()
        .from(aiTenantConfig)
        .where(eq(aiTenantConfig.morningBriefingEnabled, 1))

      const currentHour = new Date().getUTCHours()
      const generated: string[] = []

      for (const config of configs) {
        // Check if current hour matches tenant's briefing time
        const briefingHour = parseInt((config.morningBriefingTime as string ?? "08:00").split(":")[0], 10)
        if (currentHour !== briefingHour) continue

        try {
          const data = await gatherBriefingData(config.tenantId)
          await generateBriefing(config.tenantId, data)

          const { inngest: inn } = await import("@/shared/inngest")
          await inn.send({
            name: "ai/briefing.generated",
            data: { tenantId: config.tenantId, briefingId: crypto.randomUUID() },
          })

          generated.push(config.tenantId)
        } catch (err) {
          const { logger: log } = await import("@/shared/logger")
          log.error({ err, tenantId: config.tenantId }, "Failed to generate morning briefing")
        }
      }

      return { generated: generated.length }
    })

    return results
  }
)

const ghostOperatorJob = inngest.createFunction(
  { id: "ai/ghost-operator", name: "Ghost Operator" },
  { cron: "0 * * * *" }, // Run every hour — filter by tenant's configured window
  async ({ step }) => {
    await step.run("process-ghost-operations", async () => {
      const { db } = await import("@/shared/db")
      const { aiTenantConfig } = await import("@/shared/db/schema")
      const { eq } = await import("drizzle-orm")

      const configs = await db
        .select()
        .from(aiTenantConfig)
        .where(eq(aiTenantConfig.ghostOperatorEnabled, 1))

      const currentHour = new Date().getUTCHours()
      let totalActions = 0

      for (const config of configs) {
        // Check if current hour is within the ghost operator window
        const startHour = config.ghostOperatorStartHour ?? 18
        const endHour = config.ghostOperatorEndHour ?? 8

        const isInWindow = startHour > endHour
          ? (currentHour >= startHour || currentHour < endHour) // Overnight window (e.g., 18-08)
          : (currentHour >= startHour && currentHour < endHour) // Same-day window

        if (!isInWindow) continue

        try {
          const results = await processGhostOperator(config.tenantId)
          totalActions += results.reduce((sum, r) => sum + r.actionsExecuted, 0)
        } catch (err) {
          const { logger: log } = await import("@/shared/logger")
          log.error({ err, tenantId: config.tenantId }, "Ghost operator failed for tenant")
        }
      }

      return { tenantsProcessed: configs.length, totalActions }
    })
  }
)

export const aiFunctions = [weeklyWorkflowSuggestions, mcpToolRefresh, mcpHealthCheck, morningBriefingJob, ghostOperatorJob]
