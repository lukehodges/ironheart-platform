"use client"

import { useMemo, useState } from "react"
import { Plus, Filter } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ABTestSpotlight } from "./_components/ab-test-spotlight"
import { SequenceCard } from "./_components/sequence-card"
import type { SequenceCardData } from "./_components/sequence-card"
import { SequenceEditor } from "./_components/sequence-editor"

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "ARCHIVED"

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
]

export default function SequencesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [editorSequenceId, setEditorSequenceId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const { data: sequences, isLoading: sequencesLoading } =
    api.outreach.listSequences.useQuery()
  const { data: analytics, isLoading: analyticsLoading } =
    api.outreach.sequenceAnalytics.useQuery({})

  const isLoading = sequencesLoading || analyticsLoading

  // Merge sequences + analytics into SequenceCardData[]
  const mergedSequences = useMemo(() => {
    if (!sequences || !analytics) return []

    const analyticsMap = new Map(
      analytics.map((a) => [a.sequenceId, a])
    )

    return sequences.map((seq): SequenceCardData => {
      const perf = analyticsMap.get(seq.id)
      return {
        id: seq.id,
        name: seq.name,
        sector: seq.sector,
        isActive: seq.isActive,
        archivedAt: seq.archivedAt,
        abVariant: seq.abVariant,
        pairedSequenceId: seq.pairedSequenceId,
        steps: seq.steps,
        totalSent: perf?.totalSent ?? 0,
        totalReplied: perf?.totalReplied ?? 0,
        replyRate: perf?.replyRate ?? 0,
        totalConverted: perf?.totalConverted ?? 0,
        conversionRate: perf?.conversionRate ?? 0,
      }
    })
  }, [sequences, analytics])

  // Unique sorted sectors
  const sectors = useMemo(() => {
    const unique = [...new Set(mergedSequences.map((s) => s.sector))]
    return unique.sort()
  }, [mergedSequences])

  // Find A/B pair: first variant A with a pairedSequenceId, then its matching B
  const abPair = useMemo(() => {
    const variantA = mergedSequences.find(
      (s) => s.abVariant === "A" && s.pairedSequenceId
    )
    if (!variantA) return null

    const variantB = mergedSequences.find(
      (s) => s.id === variantA.pairedSequenceId
    )
    if (!variantB) return null

    return { variantA, variantB }
  }, [mergedSequences])

  // Filter sequences by status + sector
  const filteredSequences = useMemo(() => {
    return mergedSequences.filter((seq) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "ARCHIVED" && !seq.archivedAt) return false
        if (statusFilter === "ACTIVE" && (!seq.isActive || seq.archivedAt))
          return false
        if (statusFilter === "PAUSED" && (seq.isActive || seq.archivedAt))
          return false
      }

      // Sector filter
      if (sectorFilter !== "all" && seq.sector !== sectorFilter) return false

      return true
    })
  }, [mergedSequences, statusFilter, sectorFilter])

  // Remove A/B paired sequences from grid (they show in spotlight)
  const gridSequences = useMemo(() => {
    if (!abPair) return filteredSequences

    const pairedIds = new Set([abPair.variantA.id, abPair.variantB.id])
    return filteredSequences.filter((s) => !pairedIds.has(s.id))
  }, [filteredSequences, abPair])

  const showSpotlight =
    abPair && statusFilter !== "ARCHIVED"

  function openEditor(sequenceId: string | null) {
    setEditorSequenceId(sequenceId)
    setEditorOpen(true)
  }

  function handleEditorOpenChange(open: boolean) {
    setEditorOpen(open)
    if (!open) {
      setEditorSequenceId(null)
    }
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sequences"
        description="Manage outreach sequences and A/B tests"
      >
        <Button onClick={() => openEditor(null)}>
          <Plus className="mr-2 h-4 w-4" />
          New Sequence
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center rounded-full border p-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {sectors.length > 1 && (
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* A/B Spotlight */}
      {showSpotlight && (
        <ABTestSpotlight
          variantA={abPair.variantA}
          variantB={abPair.variantB}
        />
      )}

      {/* Sequences grid */}
      {gridSequences.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gridSequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onEdit={openEditor}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No sequences found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => openEditor(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first sequence
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sequence editor dialog */}
      <SequenceEditor
        sequenceId={editorSequenceId}
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
      />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-72 rounded-full" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
