export { pipelineRouter } from "./pipeline.router"
export type { PipelineRouter } from "./pipeline.router"
export { pipelineFunctions } from "./pipeline.events"
export { pipelineService } from "./pipeline.service"
export { pipelineRepository } from "./pipeline.repository"
export { pipelineManifest } from "./pipeline.manifest"
export {
  seedPipelineDeals,
  seedPipelineDealsFor,
  seedDefaultPipeline,
} from "./pipeline.seed"

// Public type surface
export type {
  DealRecord,
  DealEventRecord,
  DealStage,
  DealProduct,
  DealEventKind,
  CreateDealInput,
  UpdateDealInput,
  ListDealsFilters,
  StageCounts,
  // Legacy aliases (kept for backwards compatibility)
  PipelineRecord,
  PipelineStageRecord,
  PipelineMemberRecord,
  PipelineWithStages,
} from "./pipeline.types"
