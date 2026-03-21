"use client"

import { useMemo } from "react"
import { ArrowRight, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"

// ---------------------------------------------------------------------------
// State Machine Flow
// ---------------------------------------------------------------------------

function StateMachineFlow() {
  const { data: analytics, isLoading } = api.outreach.sequenceAnalytics.useQuery({})

  const totals = useMemo(() => {
    if (!analytics) return { sent: 0, replied: 0, converted: 0 }
    return {
      sent: analytics.reduce((sum, a) => sum + a.totalSent, 0),
      replied: analytics.reduce((sum, a) => sum + a.totalReplied, 0),
      converted: analytics.reduce((sum, a) => sum + a.totalConverted, 0),
    }
  }, [analytics])

  const activeToReplied = totals.sent > 0 ? ((totals.replied / totals.sent) * 100).toFixed(1) : "0"
  const repliedToConverted = totals.replied > 0 ? ((totals.converted / totals.replied) * 100).toFixed(1) : "0"

  const mainStates = [
    { label: "SENT", count: totals.sent, bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-700" },
    { label: "REPLIED", count: totals.replied, bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
    { label: "CONVERTED", count: totals.converted, bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800" },
  ]

  const conversionRates = [activeToReplied, repliedToConverted]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-40 mb-5" />
          <div className="flex items-center justify-center gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-foreground mb-5">Contact State Machine</p>

        {/* Main flow */}
        <div className="flex items-center justify-center gap-0">
          {mainStates.map((state, i) => (
            <div key={state.label} className="flex items-center">
              <Card className={`${state.bg} ${state.border} border`}>
                <CardContent className="px-6 py-3 text-center">
                  <p className={`text-[10px] font-medium ${state.text}`}>{state.label}</p>
                  <p className={`text-xl font-bold font-mono ${state.text}`}>{state.count}</p>
                </CardContent>
              </Card>
              {i < mainStates.length - 1 && (
                <div className="flex items-center px-2">
                  <div className="w-8 h-px bg-slate-300" />
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
                      {conversionRates[i]}%
                    </span>
                  </div>
                  <div className="w-8 h-px bg-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Activity Feed — Coming Soon
// ---------------------------------------------------------------------------

function ActivityFeed() {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Activity Feed</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Real-time activity tracking will appear here once contact events are flowing.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Channel Mix — Coming Soon
// ---------------------------------------------------------------------------

function ChannelMix() {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Channel Mix</p>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Clock className="h-6 w-6 text-muted-foreground/40 mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sector Heatmap
// ---------------------------------------------------------------------------

function SectorHeatmap() {
  const { data: sectorStats, isLoading } = api.outreach.sectorAnalytics.useQuery({})

  function intensityClass(value: number, max: number): string {
    const ratio = max > 0 ? value / max : 0
    if (ratio >= 0.8) return "bg-blue-200"
    if (ratio >= 0.6) return "bg-blue-100"
    if (ratio >= 0.4) return "bg-blue-100"
    if (ratio >= 0.2) return "bg-blue-50"
    return "bg-slate-50"
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = sectorStats ?? []
  const maxSent = Math.max(...stats.map((s) => s.totalSent), 1)
  const maxReplies = Math.max(...stats.map((s) => s.totalReplied), 1)
  const maxConversions = Math.max(...stats.map((s) => s.totalConverted), 1)

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Sector Heatmap</p>
        {stats.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No sector data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-muted-foreground font-medium">Sector</th>
                  <th className="text-center pb-2 text-muted-foreground font-medium">Sent</th>
                  <th className="text-center pb-2 text-muted-foreground font-medium">Replied</th>
                  <th className="text-center pb-2 text-muted-foreground font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.sector} className="border-b border-border last:border-0">
                    <td className="py-1.5 text-foreground font-medium">{stat.sector}</td>
                    <td className="py-1.5">
                      <div className={`text-center font-mono rounded px-1.5 py-0.5 ${intensityClass(stat.totalSent, maxSent)}`}>
                        {stat.totalSent}
                      </div>
                    </td>
                    <td className="py-1.5">
                      <div className={`text-center font-mono rounded px-1.5 py-0.5 ${intensityClass(stat.totalReplied, maxReplies)}`}>
                        {stat.totalReplied}
                      </div>
                    </td>
                    <td className="py-1.5">
                      <div className={`text-center font-mono rounded px-1.5 py-0.5 ${intensityClass(stat.totalConverted, maxConversions)}`}>
                        {stat.totalConverted}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sequence Velocity — Coming Soon
// ---------------------------------------------------------------------------

function SequenceVelocity() {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3">Sequence Velocity</p>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Clock className="h-6 w-6 text-muted-foreground/40 mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Outreach Analytics — Main Component
// ---------------------------------------------------------------------------

export function OutreachAnalytics() {
  return (
    <div className="space-y-6">
      {/* State Machine Flow — hero */}
      <StateMachineFlow />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
        {/* Left — Activity Feed (55%) */}
        <div className="lg:col-span-6">
          <ActivityFeed />
        </div>

        {/* Right — Analytics panels (45%) */}
        <div className="lg:col-span-5 space-y-4">
          <ChannelMix />
          <SectorHeatmap />
          <SequenceVelocity />
        </div>
      </div>
    </div>
  )
}
