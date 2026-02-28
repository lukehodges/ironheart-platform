export interface PipelineStage {
  /** Unique identifier for this stage */
  id: string
  /** Display label */
  label: string
  /** Optional color variant */
  variant?: "default" | "success" | "warning" | "destructive" | "info"
}

export interface StatusPipelineProps {
  /** The ordered list of stages in the pipeline */
  stages: PipelineStage[]
  /** The id of the current/active stage */
  currentStageId: string
  /** Size variant */
  size?: "sm" | "md"
  /** Additional class name */
  className?: string
}
