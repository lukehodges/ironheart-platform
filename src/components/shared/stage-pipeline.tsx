"use client"

import { Icon } from "@/components/shell"

export interface PipelineStage {
  id: string
  label: string
  done: boolean
  current: boolean
}

export interface StagePipelineProps {
  stages: PipelineStage[]
  currentDay?: number
  totalDays?: number
}

export function StagePipeline({ stages, currentDay, totalDays }: StagePipelineProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {stages.map((stage, i) => (
          <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
            {/* Circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: stage.current
                  ? "2px solid var(--ih-accent)"
                  : stage.done
                    ? "2px solid var(--ih-ink)"
                    : "2px solid var(--ih-line-2)",
                background: stage.done ? "var(--ih-ink)" : "transparent",
                color: stage.done
                  ? "#fff"
                  : stage.current
                    ? "var(--ih-accent)"
                    : "var(--ih-ink-30)",
                flexShrink: 0,
              }}
            >
              {stage.done ? (
                <Icon name="check" size={12} stroke={2.5} />
              ) : (
                <span className="ih-mono" style={{ fontSize: 10, fontWeight: 600 }}>
                  {i + 1}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className="ih-mono"
              style={{
                fontSize: 10,
                marginLeft: 6,
                color: stage.current
                  ? "var(--ih-accent)"
                  : stage.done
                    ? "var(--ih-ink)"
                    : "var(--ih-ink-40)",
                fontWeight: stage.current ? 600 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}
            >
              {stage.label}
            </span>

            {/* Connector */}
            {i < stages.length - 1 && (
              <div
                style={{
                  width: 24,
                  height: 2,
                  marginLeft: 8,
                  marginRight: 8,
                  background: stage.done ? "var(--ih-ink)" : "var(--ih-line-2)",
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {currentDay != null && totalDays != null && (
        <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 8 }}>
          Day {currentDay} of {totalDays}
        </div>
      )}
    </div>
  )
}
