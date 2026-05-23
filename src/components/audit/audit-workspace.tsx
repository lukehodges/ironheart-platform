"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { CaptureLayer } from "./capture-layer"
import { ProcessingLayer } from "./processing-layer"
import { ReportReadyLayer } from "./report-ready-layer"
import type { AuditSessionStatus } from "@/modules/audit-workspace/audit-workspace.types"

type Layer = "capture" | "processing" | "report"

interface Props {
  engagementId: string
  engagementTitle: string
  companyLabel: string
  currentStage: string
}

export function AuditWorkspace({
  engagementId,
  engagementTitle,
  companyLabel,
}: Props) {
  const [activeLayer, setActiveLayer] = useState<Layer>("capture")

  const sessionQuery = api.auditWorkspace.getOrCreate.useQuery({ engagementId })

  if (sessionQuery.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading audit workspace…</div>
  }

  if (sessionQuery.error) {
    return (
      <div className="p-8">
        <h1 className="font-serif text-2xl mb-2">Cannot load audit</h1>
        <p className="text-sm text-muted-foreground">{sessionQuery.error.message}</p>
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session) return <div className="p-8 text-sm text-muted-foreground">No session.</div>

  const isLocked = (["PROCESSING", "READY_FOR_REPORT", "COMPLETE"] as AuditSessionStatus[]).includes(
    session.status,
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Platform / Clients / {engagementTitle} / Audit
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="font-serif text-2xl">{companyLabel} — Audit workspace</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={session.status} />
            {isLocked && (
              <span className="text-xs text-amber-700">Read-only</span>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 mt-4 border-b border-border -mb-4">
          {(["capture", "processing", "report"] as Layer[]).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                activeLayer === layer
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {layer === "capture" && "1. Capture"}
              {layer === "processing" && "2. Processing"}
              {layer === "report" && "3. Report Ready"}
            </button>
          ))}
        </div>
      </div>

      {/* Layer content */}
      <div className="flex-1 overflow-hidden">
        {activeLayer === "capture" && (
          <CaptureLayer
            engagementId={engagementId}
            session={session}
            disabled={isLocked}
          />
        )}
        {activeLayer === "processing" && (
          <ProcessingLayer
            engagementId={engagementId}
            session={session}
            disabled={isLocked}
          />
        )}
        {activeLayer === "report" && (
          <ReportReadyLayer engagementId={engagementId} session={session} />
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: AuditSessionStatus }) {
  const colors: Record<AuditSessionStatus, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
    PROCESSING: "bg-amber-100 text-amber-800 border-amber-300",
    READY_FOR_REPORT: "bg-emerald-100 text-emerald-800 border-emerald-300",
    COMPLETE: "bg-zinc-100 text-zinc-800 border-zinc-300",
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border ${colors[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
