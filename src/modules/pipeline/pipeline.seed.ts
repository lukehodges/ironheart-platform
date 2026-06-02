import { db } from "@/shared/db"
import { deals, dealEvents } from "@/shared/db/schema"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.seed" })

export interface SeedPipelineDealsInput {
  companyIds: string[]
  contactIds: string[]
  touchIds: string[]
}

export interface SeededDeal {
  id: string
  stage: "qualified" | "demo" | "proposal" | "won" | "lost"
  companyId: string
}

/**
 * Seed a small, realistic set of deals + deal_events for a demo tenant.
 * Intended to be called from scripts/seed-demo.ts after outreach has been
 * seeded so we can link deals back to their originating touches.
 *
 * Idempotent: returns existing deals if any are present for the tenant.
 */
export async function seedPipelineDeals(
  tenantId: string,
  { companyIds, contactIds, touchIds }: SeedPipelineDealsInput,
): Promise<SeededDeal[]> {
  if (companyIds.length === 0) {
    log.warn({ tenantId }, "no companies provided — skipping deal seed")
    return []
  }

  // The pipeline rewrite removed pipelines/pipelineStages — deals carry their
  // own `stage` enum now, so seeding is just inserts into `deals` + `deal_events`.

  const dealDefs: Array<{
    stage: SeededDeal["stage"]
    name: string
    product: "audit" | "build_sprint" | "retainer" | "other"
    valueEstimate: string
    probability: number | null
    daysAgoCreated: number
    daysToClose: number | null
    closedDaysAgo: number | null
    closeReason: string | null
    notes: string | null
    events: Array<{
      kind: "stage_changed" | "note_added" | "meeting_booked" | "proposal_sent" | "contract_signed"
      payload: Record<string, unknown>
      daysAgo: number
    }>
  }> = [
    {
      stage: "qualified",
      name: "Bath events venue — ops audit",
      product: "audit",
      valueEstimate: "3500.00",
      probability: 30,
      daysAgoCreated: 6,
      daysToClose: 21,
      closedDaysAgo: null,
      closeReason: null,
      notes: "Owner-led venue, struggling with double bookings + manual rota.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 6 },
        { kind: "note_added", payload: { text: "Replied positive to wave 1 cold email. Bath venue, 8 staff." }, daysAgo: 6 },
      ],
    },
    {
      stage: "qualified",
      name: "Bristol marquee hire — discovery",
      product: "audit",
      valueEstimate: "3500.00",
      probability: 25,
      daysAgoCreated: 4,
      daysToClose: 28,
      closedDaysAgo: null,
      closeReason: null,
      notes: "Owner mentioned crew scheduling pain. Excel-for-crew angle.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 4 },
        { kind: "note_added", payload: { text: "Lead from Bristol Wave 1 — needs follow-up booking." }, daysAgo: 4 },
      ],
    },
    {
      stage: "demo",
      name: "Crescent Moon — chandelier hire build sprint",
      product: "build_sprint",
      valueEstimate: "8500.00",
      probability: 60,
      daysAgoCreated: 18,
      daysToClose: 14,
      closedDaysAgo: null,
      closeReason: null,
      notes: "Simon Gerrard. Demo built 19 May. Excel-for-crew wedge.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 18 },
        { kind: "meeting_booked", payload: { when: "2026-05-19", notes: "Demo call — chandelier hire ops" }, daysAgo: 12 },
        { kind: "stage_changed", payload: { from: "qualified", to: "demo" }, daysAgo: 12 },
      ],
    },
    {
      stage: "proposal",
      name: "London AV co. — retainer + audit",
      product: "retainer",
      valueEstimate: "12000.00",
      probability: 50,
      daysAgoCreated: 24,
      daysToClose: 10,
      closedDaysAgo: null,
      closeReason: null,
      notes: "Sent proposal Mon. 6-month retainer + opening audit.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 24 },
        { kind: "meeting_booked", payload: { when: "two weeks ago" }, daysAgo: 14 },
        { kind: "stage_changed", payload: { from: "qualified", to: "demo" }, daysAgo: 14 },
        { kind: "proposal_sent", payload: { version: 1, sentAt: "this week" }, daysAgo: 3 },
        { kind: "stage_changed", payload: { from: "demo", to: "proposal" }, daysAgo: 3 },
      ],
    },
    {
      stage: "won",
      name: "Wedding planner collective — audit",
      product: "audit",
      valueEstimate: "3500.00",
      probability: 100,
      daysAgoCreated: 60,
      daysToClose: null,
      closedDaysAgo: 5,
      closeReason: "Signed audit SOW",
      notes: "Closed audit. Kicks off next week.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 60 },
        { kind: "stage_changed", payload: { from: "qualified", to: "demo" }, daysAgo: 40 },
        { kind: "proposal_sent", payload: { version: 1 }, daysAgo: 20 },
        { kind: "stage_changed", payload: { from: "demo", to: "proposal" }, daysAgo: 20 },
        { kind: "contract_signed", payload: { signedAt: "5 days ago" }, daysAgo: 5 },
        { kind: "stage_changed", payload: { from: "proposal", to: "won" }, daysAgo: 5 },
      ],
    },
    {
      stage: "lost",
      name: "Catering co. — audit (no budget)",
      product: "audit",
      valueEstimate: "3500.00",
      probability: 0,
      daysAgoCreated: 45,
      daysToClose: null,
      closedDaysAgo: 12,
      closeReason: "No budget this quarter",
      notes: "Engaged early, fell silent after proposal. Revisit Q4.",
      events: [
        { kind: "stage_changed", payload: { from: null, to: "qualified" }, daysAgo: 45 },
        { kind: "stage_changed", payload: { from: "qualified", to: "demo" }, daysAgo: 30 },
        { kind: "proposal_sent", payload: { version: 1 }, daysAgo: 20 },
        { kind: "stage_changed", payload: { from: "demo", to: "proposal" }, daysAgo: 20 },
        { kind: "stage_changed", payload: { from: "proposal", to: "lost" }, daysAgo: 12 },
      ],
    },
  ]

  const seeded: SeededDeal[] = []
  const now = new Date()

  await db.transaction(async (tx) => {
    for (let i = 0; i < dealDefs.length; i++) {
      const d = dealDefs[i]!
      const companyId = companyIds[i % companyIds.length]!
      const primaryContactId = contactIds.length > 0 ? contactIds[i % contactIds.length]! : null
      const originTouchId = touchIds.length > 0 ? touchIds[i % touchIds.length]! : null

      const createdAt = new Date(now)
      createdAt.setDate(createdAt.getDate() - d.daysAgoCreated)

      const expectedClose = d.daysToClose != null
        ? (() => {
            const ec = new Date(now)
            ec.setDate(ec.getDate() + d.daysToClose)
            return ec.toISOString().split("T")[0]!
          })()
        : null

      const closedAt = d.closedDaysAgo != null
        ? (() => {
            const c = new Date(now)
            c.setDate(c.getDate() - d.closedDaysAgo)
            return c
          })()
        : null

      const [inserted] = await tx
        .insert(deals)
        .values({
          tenantId,
          companyId,
          primaryContactId,
          originTouchId,
          name: d.name,
          stage: d.stage,
          product: d.product,
          valueEstimate: d.valueEstimate,
          probability: d.probability,
          expectedClose: expectedClose as unknown as string | null,
          notes: d.notes,
          closedAt,
          closeReason: d.closeReason,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: deals.id })

      const dealId = inserted!.id
      seeded.push({ id: dealId, stage: d.stage, companyId })

      for (const ev of d.events) {
        const at = new Date(now)
        at.setDate(at.getDate() - ev.daysAgo)
        await tx.insert(dealEvents).values({
          tenantId,
          dealId,
          kind: ev.kind,
          payload: ev.payload,
          at,
          actor: "seed",
        })
      }
    }
  })

  log.info({ tenantId, count: seeded.length }, "Seeded demo deals")
  return seeded
}

/**
 * Legacy export — older callers (e.g. platform.service) invoke
 * `seedDefaultPipeline(tenantId)`. The "configurable pipeline" concept is
 * gone in the re-domained module — deals carry their own `stage` enum, so
 * there's nothing to bootstrap per tenant. Kept as a no-op so existing
 * imports keep compiling. Callers that need sample deals should switch to
 * `seedPipelineDeals`.
 */
export async function seedDefaultPipeline(tenantId: string): Promise<string> {
  log.info(
    { tenantId },
    "seedDefaultPipeline: no-op in deals-based pipeline module",
  )
  return tenantId
}

/**
 * Convenience alias matching the orchestration name used by seed-demo wave 2.
 */
export const seedPipelineDealsFor = seedPipelineDeals
