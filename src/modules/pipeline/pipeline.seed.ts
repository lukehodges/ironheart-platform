import { eq } from "drizzle-orm"
import { db } from "@/shared/db"
import { pipelines, pipelineStages } from "@/shared/db/schema"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.seed" })

interface StageDef {
  name: string
  slug: string
  position: number
  color: string
  type: "OPEN" | "WON" | "LOST"
  transitionsToSlugs: string[]
}

const DEFAULT_STAGES: StageDef[] = [
  { name: "Prospect", slug: "prospect", position: 0, color: "#64748b", type: "OPEN", transitionsToSlugs: ["outreach", "lost"] },
  { name: "Outreach", slug: "outreach", position: 1, color: "#0ea5e9", type: "OPEN", transitionsToSlugs: ["discovery", "lost"] },
  { name: "Discovery", slug: "discovery", position: 2, color: "#06b6d4", type: "OPEN", transitionsToSlugs: ["audit", "lost"] },
  { name: "Audit", slug: "audit", position: 3, color: "#6366f1", type: "OPEN", transitionsToSlugs: ["proposal", "lost"] },
  { name: "Proposal", slug: "proposal", position: 4, color: "#8b5cf6", type: "OPEN", transitionsToSlugs: ["negotiation", "lost"] },
  { name: "Negotiation", slug: "negotiation", position: 5, color: "#f59e0b", type: "OPEN", transitionsToSlugs: ["won", "lost"] },
  { name: "Won", slug: "won", position: 6, color: "#10b981", type: "WON", transitionsToSlugs: ["delivering"] },
  { name: "Delivering", slug: "delivering", position: 7, color: "#3b82f6", type: "OPEN", transitionsToSlugs: ["complete"] },
  { name: "Complete", slug: "complete", position: 8, color: "#22c55e", type: "WON", transitionsToSlugs: [] },
  { name: "Lost", slug: "lost", position: 9, color: "#ef4444", type: "LOST", transitionsToSlugs: [] },
]

export async function seedDefaultPipeline(tenantId: string): Promise<string> {
  const pipelineId = crypto.randomUUID()
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx.insert(pipelines).values({
      id: pipelineId,
      tenantId,
      name: "Sales Pipeline",
      description: "Default consulting sales pipeline",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })

    // Pass 1: create all stages without transitions (IDs don't exist yet)
    const slugToId = new Map<string, string>()
    for (const stage of DEFAULT_STAGES) {
      const stageId = crypto.randomUUID()
      slugToId.set(stage.slug, stageId)
      await tx.insert(pipelineStages).values({
        id: stageId,
        tenantId,
        pipelineId,
        name: stage.name,
        slug: stage.slug,
        position: stage.position,
        color: stage.color,
        type: stage.type,
        allowedTransitions: [],
        createdAt: now,
        updatedAt: now,
      })
    }

    // Pass 2: update transitions now that all stage IDs exist
    for (const stage of DEFAULT_STAGES) {
      if (stage.transitionsToSlugs.length === 0) continue
      const stageId = slugToId.get(stage.slug)!
      const transitionIds = stage.transitionsToSlugs.map((s) => slugToId.get(s)!)
      await tx
        .update(pipelineStages)
        .set({ allowedTransitions: transitionIds })
        .where(eq(pipelineStages.id, stageId))
    }
  })

  log.info({ tenantId, pipelineId }, "Default pipeline seeded")
  return pipelineId
}
