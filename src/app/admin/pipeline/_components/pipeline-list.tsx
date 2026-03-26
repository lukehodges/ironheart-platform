"use client"

import { useState, useMemo } from "react"
import {
  Search,
  ArrowUpDown,
  ArrowRight,
  X,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  PipelineMemberWithCustomer,
  PipelineStageRecord,
  PipelineStageSummary,
} from "@/modules/pipeline/pipeline.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineListProps {
  members: PipelineMemberWithCustomer[]
  stages: PipelineStageRecord[]
  summaryMap: Map<string, PipelineStageSummary>
  isLoading: boolean
  onMove: (member: PipelineMemberWithCustomer, stage: PipelineStageRecord) => void
}

type SortField = "name" | "stage" | "value" | "daysOpen" | "lastActivity"
type SortDirection = "asc" | "desc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getDaysOpen(date: Date | string | null | undefined): number {
  if (!date) return 0
  const d = typeof date === "string" ? new Date(date) : date
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "--"
  const d = typeof date === "string" ? new Date(date) : date
  const diffDays = Math.floor(Math.abs(Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1d ago"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PipelineList({
  members,
  stages,
  summaryMap: _summaryMap,
  isLoading,
  onMove,
}: PipelineListProps) {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDirection>("asc")

  const stageMap = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  )

  const totalStages = useMemo(
    () => stages.filter((s) => s.type === "OPEN").length + 1,
    [stages],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = members
    if (q) {
      result = members.filter(
        (m) =>
          m.customerName.toLowerCase().includes(q) ||
          (m.customerEmail && m.customerEmail.toLowerCase().includes(q)),
      )
    }
    return [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortField) {
        case "name":
          return a.customerName.localeCompare(b.customerName) * dir
        case "stage": {
          const posA = stageMap.get(a.stageId)?.position ?? 0
          const posB = stageMap.get(b.stageId)?.position ?? 0
          return (posA - posB) * dir
        }
        case "value":
          return ((a.dealValue ?? 0) - (b.dealValue ?? 0)) * dir
        case "daysOpen":
          return (getDaysOpen(a.addedAt) - getDaysOpen(b.addedAt)) * dir
        case "lastActivity":
          return (getDaysOpen(a.enteredStageAt) - getDaysOpen(b.enteredStageAt)) * dir
        default:
          return 0
      }
    })
  }, [members, search, sortField, sortDir, stageMap])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  function getTransitions(member: PipelineMemberWithCustomer) {
    const currentStage = stageMap.get(member.stageId)
    if (!currentStage) return { nonLost: [], lost: null }
    const transitions = currentStage.allowedTransitions
      .map((id) => stageMap.get(id))
      .filter((s): s is PipelineStageRecord => !!s)
    return {
      nonLost: transitions.filter((s) => s.type !== "LOST"),
      lost: transitions.find((s) => s.type === "LOST") ?? null,
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5">
                  <SortHeader field="name">Deal</SortHeader>
                </th>
                <th className="text-left px-4 py-2.5">
                  <SortHeader field="stage">Stage</SortHeader>
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortHeader field="value">Value</SortHeader>
                </th>
                <th className="text-left px-4 py-2.5 min-w-[120px]">
                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortHeader field="daysOpen">Days Open</SortHeader>
                </th>
                <th className="text-right px-4 py-2.5">
                  <SortHeader field="lastActivity">Last Activity</SortHeader>
                </th>
                <th className="text-right px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    {search ? "No deals match your search" : "No deals in the pipeline"}
                  </td>
                </tr>
              ) : (
                filtered.map((member) => {
                  const stage = stageMap.get(member.stageId)
                  const daysOpen = getDaysOpen(member.addedAt)
                  const daysInStage = getDaysOpen(member.enteredStageAt)
                  const stagePos = stage?.position ?? 0
                  const progressPct = Math.min(((stagePos + 1) / totalStages) * 100, 100)
                  const { nonLost, lost } = getTransitions(member)

                  // Risk indicators
                  let riskColor = "bg-emerald-500" // < 14 days
                  if (daysInStage > 30) riskColor = "bg-red-500"
                  else if (daysInStage >= 14) riskColor = "bg-amber-500"

                  const followUpOverdue = daysInStage > 21

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Deal name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${riskColor}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {member.customerName}
                            </p>
                            {member.customerEmail && (
                              <p className="text-xs text-muted-foreground truncate">
                                {member.customerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3">
                        {stage && (
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium"
                            style={{
                              backgroundColor: `${stage.color ?? "#94a3b8"}15`,
                              color: stage.color ?? "#94a3b8",
                            }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
                              style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                            />
                            {stage.name}
                          </Badge>
                        )}
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-medium">
                          {member.dealValue ? formatCurrency(member.dealValue) : "--"}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                      </td>

                      {/* Days Open */}
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span className="font-mono text-sm">{daysOpen}d</span>
                          {followUpOverdue && (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px] text-amber-500">Follow-up overdue</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {formatTimeAgo(member.enteredStageAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {(nonLost.length > 0 || lost) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {nonLost.map((s) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() => onMove(member, s)}
                                >
                                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                                  Move to {s.name}
                                </DropdownMenuItem>
                              ))}
                              {lost && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onMove(member, lost)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <X className="h-3.5 w-3.5 mr-2" />
                                    Mark as Lost
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {members.length} deals
      </p>
    </div>
  )
}
