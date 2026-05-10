"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/react"
import { StageBadge } from "@/components/consulting/stage-badge"
import type { EngagementStage } from "@/components/consulting/stage-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase } from "lucide-react"

const ALL_STAGES: (EngagementStage | "ALL")[] = [
  "ALL",
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
  "CLOSED_WON",
  "CLOSED_LOST",
]

const STAGE_TAB_LABELS: Record<string, string> = {
  ALL: "All",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  CONTRACTED: "Contracted",
  ONBOARDING: "Onboarding",
  AUDITING: "Auditing",
  REPORTING: "Reporting",
  IMPLEMENTING: "Implementing",
  RETAINER: "Retainer",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "--"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function EngagementsPage() {
  const router = useRouter()
  const [activeStage, setActiveStage] = useState<EngagementStage | "ALL">("ALL")

  const queryInput = {
    stage: activeStage === "ALL" ? undefined : activeStage,
    limit: 50 as const,
  }

  const { data, isLoading } = api.consulting.list.useQuery(queryInput)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagements</h1>
          <p className="text-sm text-muted-foreground">Manage consulting engagements across all stages</p>
        </div>
      </div>

      {/* Stage filter tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {ALL_STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStage === stage
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {STAGE_TAB_LABELS[stage]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Audit Window</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : data?.rows && data.rows.length > 0 ? (
              data.rows.map((engagement) => (
                <TableRow
                  key={engagement.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/engagements/${engagement.id}`)}
                >
                  <TableCell className="font-medium">{engagement.title}</TableCell>
                  <TableCell>
                    <StageBadge stage={engagement.stage} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">
                    {engagement.type?.toLowerCase() ?? "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {engagement.auditWindowStart && engagement.auditWindowEnd
                      ? `${formatDate(engagement.auditWindowStart)} - ${formatDate(engagement.auditWindowEnd)}`
                      : "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(engagement.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No engagements found{activeStage !== "ALL" ? ` in ${STAGE_TAB_LABELS[activeStage]}` : ""}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data?.hasMore && (
        <p className="text-center text-sm text-muted-foreground">
          Showing first {data.rows.length} results. More engagements available.
        </p>
      )}
    </div>
  )
}
