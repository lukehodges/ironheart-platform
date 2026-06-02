"use client"

// Legacy admin pipeline UI — kanban-stage model is dead. New pipeline lives
// at /platform/pipeline. This file is preserved as a no-op placeholder so any
// stale imports keep compiling.

export interface RightPanelProps {
  summaryMap?: unknown
  stages?: unknown
}

export function PipelineRightPanel(_props: RightPanelProps) {
  return (
    <div className="p-8 text-sm text-muted-foreground">
      Pipeline UI rebuilding — see /platform/pipeline
    </div>
  )
}
