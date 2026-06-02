/**
 * Pipeline module — Inngest subscribers.
 *
 * Note: this module emits via `emitEvent` (events outbox table) for the
 * cross-module event framework. These Inngest functions provide additional
 * side-effect handlers (logging, fan-out) that can subscribe to the same
 * `pipeline/...` Inngest stream if/when emitters bridge to Inngest.
 */

import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.events" })

const onDealCreated = inngest.createFunction(
  { id: "pipeline-deal-created", retries: 3 },
  { event: "pipeline/deal.created" },
  async ({ event }) => {
    const { dealId, tenantId, companyId, stage } = event.data
    log.info({ dealId, tenantId, companyId, stage }, "Deal created")
  },
)

const onDealStageChanged = inngest.createFunction(
  { id: "pipeline-deal-stage-changed", retries: 3 },
  { event: "pipeline/deal.stage_changed" },
  async ({ event }) => {
    const { dealId, from, to, tenantId } = event.data
    log.info({ dealId, from, to, tenantId }, "Deal stage changed")
  },
)

const onDealWon = inngest.createFunction(
  { id: "pipeline-deal-won", retries: 3 },
  { event: "pipeline/deal.won" },
  async ({ event }) => {
    const { dealId, tenantId, companyId } = event.data
    log.info(
      { dealId, tenantId, companyId },
      "Deal won — downstream should trigger client onboarding",
    )
  },
)

export const pipelineFunctions = [
  onDealCreated,
  onDealStageChanged,
  onDealWon,
]
