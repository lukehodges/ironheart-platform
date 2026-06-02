"use client"

// Legacy admin pipeline UI — kanban-stage model is dead. New pipeline lives
// at /platform/pipeline. This file is preserved as a no-op placeholder so any
// stale imports keep compiling.

// Keep a permissive props signature — admin pages may still try to pass the
// old shape; we intentionally accept anything and render nothing structural.
export interface PipelineListProps {
  members?: unknown
  stages?: unknown
  summaryMap?: unknown
  isLoading?: boolean
  onMove?: (...args: unknown[]) => void
}

export function PipelineList(_props: PipelineListProps) {
  return (
    <div className="p-8 text-sm text-muted-foreground">
      Pipeline UI rebuilding — see /platform/pipeline
    </div>
  )
}
