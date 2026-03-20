import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "pipeline.events" })

const onMemberAdded = inngest.createFunction(
  { id: "pipeline-member-added", retries: 3 },
  { event: "pipeline/member.added" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, tenantId }, "Pipeline member added")
  }
)

const onMemberMoved = inngest.createFunction(
  { id: "pipeline-member-moved", retries: 3 },
  { event: "pipeline/member.moved" },
  async ({ event }) => {
    const { memberId, pipelineId, fromStageId, toStageId, tenantId } = event.data
    log.info({ memberId, pipelineId, fromStageId, toStageId, tenantId }, "Pipeline member moved")
  }
)

const onMemberRemoved = inngest.createFunction(
  { id: "pipeline-member-removed", retries: 3 },
  { event: "pipeline/member.removed" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, tenantId }, "Pipeline member removed")
  }
)

const onMemberClosed = inngest.createFunction(
  { id: "pipeline-member-closed", retries: 3 },
  { event: "pipeline/member.closed" },
  async ({ event }) => {
    const { memberId, pipelineId, customerId, stageType, dealValue, tenantId } = event.data
    log.info({ memberId, pipelineId, customerId, stageType, dealValue, tenantId }, "Pipeline member closed")
  }
)

export const pipelineFunctions = [onMemberAdded, onMemberMoved, onMemberRemoved, onMemberClosed]
