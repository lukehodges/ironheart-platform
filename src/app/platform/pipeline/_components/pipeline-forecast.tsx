"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  forecastMetrics,
  monthlyForecast,
  heatmapData,
  heatmapStages,
  dealBands,
} from "../_mock-data"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `£${Math.round(amount / 1000)}k`
  }
  return `£${amount.toLocaleString("en-GB")}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PipelineForecast() {
  const maxMonthValue = Math.max(
    ...monthlyForecast.map((m) => Math.max(m.actual, m.forecast)),
  )

  const maxHeatCount = Math.max(...heatmapData.map((c) => c.count), 1)

  return (
    <div className="space-y-6">
      {/* Weighted pipeline strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {forecastMetrics.map((metric) => (
          <Card key={metric.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-xl font-semibold tracking-tight font-mono mt-1">
                {formatCurrency(metric.value)}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {metric.delta >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    metric.delta >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {metric.delta >= 0 ? "+" : ""}
                  {metric.delta}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {metric.deltaLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue forecast */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Revenue Forecast
          </h3>
          <div className="space-y-3">
            {monthlyForecast.map((month) => {
              const actualPct = maxMonthValue > 0
                ? (month.actual / maxMonthValue) * 100
                : 0
              const forecastPct = maxMonthValue > 0
                ? (month.forecast / maxMonthValue) * 100
                : 0

              return (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 font-medium">
                    {month.month}
                  </span>
                  <div className="flex-1 space-y-1">
                    {/* Actual bar */}
                    {month.actual > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-4 rounded bg-primary transition-all" style={{ width: `${actualPct}%` }} />
                        <span className="text-[10px] font-mono text-foreground shrink-0">
                          {formatCurrencyShort(month.actual)}
                        </span>
                      </div>
                    )}
                    {/* Forecast bar */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 rounded bg-primary/20 transition-all"
                        style={{ width: `${forecastPct}%` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {formatCurrencyShort(month.forecast)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-primary" />
              <span className="text-[10px] text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-primary/20" />
              <span className="text-[10px] text-muted-foreground">Forecast</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline heatmap */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Pipeline Heatmap
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-medium">
                    Deal Size
                  </th>
                  {heatmapStages.map((stage) => (
                    <th
                      key={stage}
                      className="text-center py-2 px-2 text-muted-foreground font-medium"
                    >
                      {stage}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dealBands.map((band) => (
                  <tr key={band}>
                    <td className="py-1.5 pr-3 text-muted-foreground font-mono">
                      {band}
                    </td>
                    {heatmapStages.map((stage) => {
                      const cell = heatmapData.find(
                        (c) => c.stage === stage && c.band === band,
                      )
                      const count = cell?.count ?? 0
                      const intensity = count > 0
                        ? Math.max(0.1, count / maxHeatCount)
                        : 0

                      return (
                        <td key={stage} className="py-1.5 px-2">
                          <div
                            className="flex items-center justify-center h-8 rounded text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: count > 0
                                ? `rgba(59, 130, 246, ${intensity})`
                                : "transparent",
                              color: intensity > 0.5 ? "white" : count > 0 ? "#3b82f6" : "#94a3b8",
                              border: count === 0 ? "1px solid #e2e8f0" : "none",
                            }}
                          >
                            {count > 0 ? count : "--"}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
