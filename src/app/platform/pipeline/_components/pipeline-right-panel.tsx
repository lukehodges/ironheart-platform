"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { stageVelocity, recentActivity } from "../_mock-data"
import type { PipelineStageSummary } from "@/modules/pipeline/pipeline.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RightPanelProps {
  summaryMap: Map<string, PipelineStageSummary>
  stages: { id: string; name: string; color: string | null; type: string; position: number }[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PipelineRightPanel({ summaryMap, stages }: RightPanelProps) {
  // Build funnel data from real summary
  const openStages = stages
    .filter((s) => s.type === "OPEN")
    .sort((a, b) => a.position - b.position)

  const funnelData = openStages.map((stage) => {
    const summary = summaryMap.get(stage.id)
    return {
      name: stage.name,
      count: summary?.count ?? 0,
      color: stage.color ?? "#94a3b8",
    }
  })

  const maxFunnelCount = Math.max(...funnelData.map((f) => f.count), 1)
  const firstCount = funnelData[0]?.count ?? 1

  // Stage velocity max for bar widths
  const maxVelocity = Math.max(...stageVelocity.map((v) => v.avgDays), 1)

  return (
    <div className="space-y-4">
      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Conversion Funnel
          </h3>
          <div className="space-y-2">
            {funnelData.map((step, i) => {
              const barWidth = maxFunnelCount > 0
                ? Math.max(20, (step.count / maxFunnelCount) * 100)
                : 20
              const percentage = firstCount > 0
                ? Math.round((step.count / firstCount) * 100)
                : 0

              return (
                <div key={step.name} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{step.name}</span>
                    <span className="font-mono text-muted-foreground">
                      {i === 0 ? "" : `${percentage}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 rounded transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: step.color,
                        opacity: 0.8,
                      }}
                    />
                    <span className="text-xs font-mono font-medium text-foreground shrink-0">
                      {step.count}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Velocity */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Stage Velocity
          </h3>
          <div className="space-y-2.5">
            {stageVelocity.map((item) => {
              const barWidth = Math.max(15, (item.avgDays / maxVelocity) * 100)

              return (
                <div key={item.stage} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{item.stage}</span>
                    <span className="font-mono text-foreground font-medium shrink-0">
                      {item.avgDays}d
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: item.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Avg. total cycle</span>
              <span className="font-mono font-semibold text-foreground">
                {stageVelocity.reduce((sum, v) => sum + v.avgDays, 0)}d
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Recent Activity
          </h3>
          <div className="space-y-0">
            {recentActivity.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-start gap-2.5 py-2">
                  <div
                    className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-relaxed">
                      {item.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.timestamp}
                    </p>
                  </div>
                </div>
                {i < recentActivity.length - 1 && (
                  <Separator className="ml-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
