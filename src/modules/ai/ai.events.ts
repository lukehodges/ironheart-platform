// src/modules/ai/ai.events.ts

import { inngest } from "@/shared/inngest"
import { gatherBriefingData } from "./features/morning-briefing.data"
import { generateBriefing } from "./features/morning-briefing.generator"

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

export const aiFunctions = [weeklyWorkflowSuggestions, morningBriefingJob]
