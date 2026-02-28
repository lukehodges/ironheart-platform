import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatusPipelineProps, PipelineStage } from "./status-pipeline.types"

type StageState = "completed" | "active" | "pending"

function getStageState(
  stageIndex: number,
  currentIndex: number
): StageState {
  if (stageIndex < currentIndex) return "completed"
  if (stageIndex === currentIndex) return "active"
  return "pending"
}

const activeColors: Record<NonNullable<PipelineStage["variant"]>, string> = {
  default: "bg-foreground text-background",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  info: "bg-info text-info-foreground",
}

const completedColors: Record<NonNullable<PipelineStage["variant"]>, string> = {
  default: "bg-foreground/20 text-foreground",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/20 text-destructive",
  info: "bg-info/20 text-info",
}

const connectorActiveColors: Record<NonNullable<PipelineStage["variant"]>, string> = {
  default: "bg-foreground/40",
  success: "bg-success/40",
  warning: "bg-warning/40",
  destructive: "bg-destructive/40",
  info: "bg-info/40",
}

export function StatusPipeline({
  stages,
  currentStageId,
  size = "md",
  className,
}: StatusPipelineProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div
      role="list"
      className={cn("flex items-center", className)}
    >
      {stages.map((stage, index) => {
        const state = getStageState(index, currentIndex)
        const variant = stage.variant ?? "default"
        const isLast = index === stages.length - 1

        // Determine the connector state based on the stage it leads to
        const connectorCompleted = state === "completed"

        return (
          <div key={stage.id} className="flex items-center">
            <div
              role="listitem"
              data-stage={stage.id}
              data-state={state}
              className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
                size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
                state === "active" && activeColors[variant],
                state === "completed" && completedColors[variant],
                state === "pending" && "bg-muted text-muted-foreground"
              )}
            >
              {state === "completed" && (
                <Check
                  className={cn(
                    "shrink-0",
                    size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
                  )}
                />
              )}
              {stage.label}
            </div>

            {!isLast && (
              <div
                className={cn(
                  "shrink-0",
                  size === "sm" ? "mx-1 h-0.5 w-3" : "mx-1.5 h-0.5 w-4",
                  connectorCompleted
                    ? connectorActiveColors[variant]
                    : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
