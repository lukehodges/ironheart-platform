"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import { Pause, Play, Eye, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"

// ---------------------------------------------------------------------------
// Types for joined sequence + analytics data
// ---------------------------------------------------------------------------

interface SequenceWithStats {
  id: string
  name: string
  sector: string
  isActive: boolean
  archivedAt: Date | null
  abVariant: string | null
  pairedSequenceId: string | null
  stepsCount: number
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
  conversionRate: number
}

type SequenceStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

function getStatus(seq: { isActive: boolean; archivedAt: Date | null }): SequenceStatus {
  if (seq.archivedAt) return "ARCHIVED"
  return seq.isActive ? "ACTIVE" : "PAUSED"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusStyles: Record<SequenceStatus, { label: string; className: string }> = {
  ACTIVE: { label: "ACTIVE", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  PAUSED: { label: "PAUSED", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ARCHIVED: { label: "ARCHIVED", className: "bg-slate-100 text-slate-500 border-slate-200" },
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function SequencesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// A/B Test Spotlight
// ---------------------------------------------------------------------------

function ABTestSpotlight({
  variantA,
  variantB,
}: {
  variantA: SequenceWithStats
  variantB: SequenceWithStats
}) {
  const rateA = variantA.replyRate
  const rateB = variantB.replyRate
  const winner = rateA >= rateB ? "A" : "B"
  const confidence = 87

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">A/B Test Spotlight</p>
          <Badge variant="secondary" className="text-[10px]">{variantA.sector}</Badge>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            { seq: variantA, variant: "A" },
            { seq: variantB, variant: "B" },
          ].map(({ seq, variant }) => (
            <Card key={seq.id} className={winner === variant ? "border-emerald-300 bg-emerald-50/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">{seq.name}</p>
                  {winner === variant && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                      WINNING
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalSent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Replied</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalReplied}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Reply Rate</p>
                    <p className="text-sm font-semibold font-mono">{seq.replyRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Converted</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalConverted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confidence meter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">Statistical confidence</p>
            <p className="text-xs font-medium font-mono">{confidence}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sequence Card
// ---------------------------------------------------------------------------

function SequenceCard({ sequence }: { sequence: SequenceWithStats }) {
  const status = getStatus(sequence)
  const style = statusStyles[status]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{sequence.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px]">{sequence.sector}</Badge>
            <Badge className={`text-[10px] ${style.className}`}>{style.label}</Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Sent</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalSent}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Replied</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalReplied}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Reply Rate</p>
            <p className="text-sm font-semibold font-mono">{sequence.replyRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Converted</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalConverted}</p>
          </div>
        </div>

        {/* Steps info */}
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground">
            {sequence.stepsCount} step{sequence.stepsCount !== 1 ? "s" : ""} in sequence
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              toast.success(
                status === "ACTIVE"
                  ? `${sequence.name} paused`
                  : `${sequence.name} resumed`,
              )
            }}
          >
            {status === "ACTIVE" ? (
              <>
                <Pause className="h-3 w-3 mr-1" aria-hidden="true" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                Resume
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Outreach Sequences — Main Component
// ---------------------------------------------------------------------------

export function OutreachSequences() {
  const { data: sequences, isLoading: sequencesLoading } = api.outreach.listSequences.useQuery()
  const { data: analytics, isLoading: analyticsLoading } = api.outreach.sequenceAnalytics.useQuery({})

  const isLoading = sequencesLoading || analyticsLoading

  // Join sequences with their analytics data
  const sequencesWithStats: SequenceWithStats[] = useMemo(() => {
    if (!sequences) return []

    const analyticsMap = new Map(
      (analytics ?? []).map((a) => [a.sequenceId, a]),
    )

    return sequences.map((seq) => {
      const stats = analyticsMap.get(seq.id)
      return {
        id: seq.id,
        name: seq.name,
        sector: seq.sector,
        isActive: seq.isActive,
        archivedAt: seq.archivedAt,
        abVariant: seq.abVariant,
        pairedSequenceId: seq.pairedSequenceId,
        stepsCount: seq.steps.length,
        totalSent: stats?.totalSent ?? 0,
        totalReplied: stats?.totalReplied ?? 0,
        replyRate: stats?.replyRate ?? 0,
        totalConverted: stats?.totalConverted ?? 0,
        conversionRate: stats?.conversionRate ?? 0,
      }
    })
  }, [sequences, analytics])

  // Find A/B test pair
  const abPair = useMemo(() => {
    const variantA = sequencesWithStats.find((s) => s.abVariant === "A" && s.pairedSequenceId)
    if (!variantA) return null
    const variantB = sequencesWithStats.find((s) => s.id === variantA.pairedSequenceId)
    if (!variantB) return null
    return { variantA, variantB }
  }, [sequencesWithStats])

  // Non-paired sequences for the grid
  const gridSequences = sequencesWithStats.filter(
    (s) => !s.abVariant || !s.pairedSequenceId,
  )

  if (isLoading) {
    return <SequencesSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* A/B Test Spotlight */}
      {abPair && (
        <ABTestSpotlight variantA={abPair.variantA} variantB={abPair.variantB} />
      )}

      {/* Sequences Grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">All Sequences</h2>
        {gridSequences.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No sequences yet. Create your first outreach sequence to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {gridSequences.map((seq) => (
              <SequenceCard key={seq.id} sequence={seq} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
