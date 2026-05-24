"use client"

import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types"

interface AuditSummaryPaneProps {
  session: AuditSessionWithLenses | null | undefined
}

const RAG_DOT: Record<string, string> = {
  RED: "var(--ih-danger)",
  AMBER: "var(--ih-warn)",
  GREEN: "var(--ih-ok)",
}

export function AuditSummaryPane({ session }: AuditSummaryPaneProps) {
  if (!session) {
    return (
      <p
        style={{
          fontSize: 13,
          color: "var(--ih-ink-50)",
          fontStyle: "italic",
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        No audit data.
      </p>
    )
  }

  const totalFindings = session.lenses.reduce((n, l) => n + (l.findings?.length ?? 0), 0)
  const totalRecs = session.lenses.reduce((n, l) => n + (l.recommendations?.length ?? 0), 0)
  const totalWaste = session.lenses
    .flatMap((l) => l.findings ?? [])
    .reduce((sum, f) => sum + (f.estimatedAnnualWaste ?? 0), 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Section header */}
      <div>
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
          Audit summary
        </p>
        <p
          className="ih-serif"
          style={{ fontSize: 18, color: "var(--ih-ink)", margin: 0 }}
        >
          Source data
        </p>
      </div>

      {/* Stat cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div
          className="ih-card"
          style={{ padding: "10px 12px" }}
        >
          <p
            className="ih-mono"
            style={{
              fontSize: 8.5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ih-ink-40)",
              margin: 0,
              marginBottom: 4,
            }}
          >
            Findings
          </p>
          <p
            className="ih-serif"
            style={{ fontSize: 26, lineHeight: 1, color: "var(--ih-ink)", margin: 0 }}
          >
            {totalFindings}
          </p>
        </div>
        <div
          className="ih-card"
          style={{ padding: "10px 12px" }}
        >
          <p
            className="ih-mono"
            style={{
              fontSize: 8.5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ih-ink-40)",
              margin: 0,
              marginBottom: 4,
            }}
          >
            Recs
          </p>
          <p
            className="ih-serif"
            style={{ fontSize: 26, lineHeight: 1, color: "var(--ih-ink)", margin: 0 }}
          >
            {totalRecs}
          </p>
        </div>
        <div
          className="ih-card"
          style={{ padding: "10px 12px", gridColumn: "span 2" }}
        >
          <p
            className="ih-mono"
            style={{
              fontSize: 8.5,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--ih-ink-40)",
              margin: 0,
              marginBottom: 4,
            }}
          >
            Est. annual waste
          </p>
          <p
            className="ih-serif"
            style={{
              fontSize: 26,
              lineHeight: 1,
              color: totalWaste > 0 ? "var(--ih-danger)" : "var(--ih-ink)",
              margin: 0,
            }}
          >
            £{(totalWaste / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Per-lens breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
            marginBottom: 2,
          }}
        >
          By lens
        </p>
        {session.lenses.map((lens) => (
          <div
            key={lens.id}
            className="ih-card"
            style={{ padding: "8px 12px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span
                className="ih-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ih-ink)",
                }}
              >
                {lens.lens}
              </span>
              {lens.ragScore && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--ih-font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: RAG_DOT[lens.ragScore] ?? "var(--ih-ink-40)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: RAG_DOT[lens.ragScore] ?? "var(--ih-ink-30)",
                      flexShrink: 0,
                    }}
                  />
                  {lens.ragScore}
                </span>
              )}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--ih-ink-50)",
                fontFamily: "var(--ih-font-sans)",
              }}
            >
              {lens.findings?.length ?? 0} findings · {lens.recommendations?.length ?? 0} recs
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
