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
    return (
      <div
        style={{
          padding: 32,
          fontSize: 13,
          color: "var(--ih-ink-50)",
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        Loading audit workspace…
      </div>
    )
  }

  if (sessionQuery.error) {
    return (
      <div style={{ padding: 32, background: "var(--ih-bg)" }}>
        <h1
          style={{
            fontFamily: "var(--ih-font-serif)",
            fontSize: 28,
            marginBottom: 8,
            color: "var(--ih-ink)",
          }}
        >
          Cannot load audit
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>
          {sessionQuery.error.message}
        </p>
      </div>
    )
  }

  const session = sessionQuery.data
  if (!session) {
    return (
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)" }}>
        No session.
      </div>
    )
  }

  const isLocked = (
    ["PROCESSING", "READY_FOR_REPORT", "COMPLETE"] as AuditSessionStatus[]
  ).includes(session.status)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--ih-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--ih-line)",
          padding: "16px 32px 0",
          background: "var(--ih-surface)",
        }}
      >
        {/* Eyebrow breadcrumb */}
        <p
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
            marginBottom: 4,
          }}
        >
          Platform / Clients / {engagementTitle} / Audit
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h1
            className="ih-serif"
            style={{ margin: 0, fontSize: 28, color: "var(--ih-ink)" }}
          >
            {companyLabel} — Audit workspace
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={session.status} />
            {isLocked && (
              <span
                className="ih-mono"
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ih-warn)",
                }}
              >
                Read-only
              </span>
            )}
          </div>
        </div>

        {/* Tab strip */}
        <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
          {(["capture", "processing", "report"] as Layer[]).map((layer) => {
            const isActive = activeLayer === layer
            return (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                style={{
                  padding: "8px 18px",
                  fontSize: 12,
                  fontFamily: "var(--ih-font-sans)",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--ih-accent)"
                    : "2px solid transparent",
                  color: isActive ? "var(--ih-ink)" : "var(--ih-ink-50)",
                  fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  transition: "color 0.15s",
                  marginBottom: -1,
                }}
              >
                {layer === "capture" && "1. Capture"}
                {layer === "processing" && "2. Processing"}
                {layer === "report" && "3. Report Ready"}
              </button>
            )
          })}
        </div>
      </div>

      {/* Layer content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
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
  const tones: Record<AuditSessionStatus, { bg: string; color: string; border: string }> = {
    IN_PROGRESS: {
      bg: "rgba(42,93,191,0.08)",
      color: "var(--ih-info)",
      border: "rgba(42,93,191,0.25)",
    },
    PROCESSING: {
      bg: "rgba(184,134,11,0.08)",
      color: "var(--ih-warn)",
      border: "rgba(184,134,11,0.25)",
    },
    READY_FOR_REPORT: {
      bg: "rgba(47,111,92,0.08)",
      color: "var(--ih-ok)",
      border: "rgba(47,111,92,0.25)",
    },
    COMPLETE: {
      bg: "rgba(14,16,19,0.05)",
      color: "var(--ih-ink-65)",
      border: "rgba(14,16,19,0.15)",
    },
  }
  const t = tones[status]
  return (
    <span
      className="ih-mono"
      style={{
        padding: "2px 8px",
        borderRadius: "var(--ih-r-pill)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
