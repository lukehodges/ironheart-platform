"use client"

import { api } from "@/lib/trpc/react"
import { CheckCircle2, XCircle, FileText } from "lucide-react"
import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types"

interface Props {
  engagementId: string
  session: AuditSessionWithLenses
}

export function ReportReadyLayer({ engagementId, session }: Props) {
  const utils = api.useUtils()

  const validateQuery = api.auditWorkspace.validateByEngagement.useQuery({ engagementId })
  const markReadyMutation = api.auditWorkspace.markReadyByEngagement.useMutation({
    onSuccess: () => void utils.auditWorkspace.getOrCreate.invalidate({ engagementId }),
  })

  const validation = validateQuery.data
  const isReady = validation?.isReady
  const isAlreadyDone =
    session.status === "READY_FOR_REPORT" || session.status === "COMPLETE"

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 680,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        background: "var(--ih-bg)",
      }}
    >
      <div>
        <p
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
            marginBottom: 6,
          }}
        >
          Validation
        </p>
        <h2
          className="ih-serif"
          style={{ margin: 0, fontSize: 28, color: "var(--ih-ink)" }}
        >
          Report readiness
        </h2>
        <p
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "var(--ih-ink-50)",
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          Once all 5 lenses are scored with at least one finding, you can generate the audit report.
        </p>
      </div>

      {validateQuery.isLoading && (
        <p
          style={{
            fontSize: 12,
            color: "var(--ih-ink-50)",
            fontFamily: "var(--ih-font-sans)",
          }}
        >
          Checking…
        </p>
      )}

      {validation && (
        <>
          <div
            className="ih-card"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <CheckRow
              label="All 5 lenses have a RAG score"
              pass={(validation.lensesWithoutRag ?? []).length === 0}
              detail={(validation.lensesWithoutRag ?? []).join(", ")}
            />
            <CheckRow
              label="Each lens has at least 1 finding"
              pass={(validation.lensesWithoutFindings ?? []).length === 0}
              detail={(validation.lensesWithoutFindings ?? []).join(", ")}
            />
          </div>

          {isReady ? (
            <div
              style={{
                borderRadius: "var(--ih-r-md)",
                border: "1px solid rgba(47,111,92,0.3)",
                background: "rgba(47,111,92,0.06)",
                padding: 24,
                textAlign: "center",
              }}
            >
              <FileText
                size={28}
                style={{ display: "block", margin: "0 auto 10px", color: "var(--ih-ok)" }}
              />
              <h3
                className="ih-serif"
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: 20,
                  color: "var(--ih-ok)",
                }}
              >
                Ready to generate report
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ih-ink-65)",
                  fontFamily: "var(--ih-font-sans)",
                  marginBottom: 16,
                }}
              >
                Mark this audit ready; the report generator (Phase 0.4) takes over from here.
              </p>
              <button
                onClick={() => markReadyMutation.mutate({ engagementId })}
                disabled={markReadyMutation.isPending || isAlreadyDone}
                style={{
                  padding: "8px 24px",
                  borderRadius: "var(--ih-r-md)",
                  background: isAlreadyDone ? "var(--ih-surface-3)" : "var(--ih-ok)",
                  color: isAlreadyDone ? "var(--ih-ink-50)" : "white",
                  border: "none",
                  fontSize: 13,
                  fontFamily: "var(--ih-font-sans)",
                  fontWeight: 500,
                  cursor: isAlreadyDone || markReadyMutation.isPending ? "not-allowed" : "pointer",
                  opacity: markReadyMutation.isPending ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {isAlreadyDone
                  ? "Already marked ready"
                  : markReadyMutation.isPending
                    ? "Marking…"
                    : "Mark ready for report"}
              </button>
            </div>
          ) : (
            <div
              style={{
                borderRadius: "var(--ih-r-md)",
                border: "1px solid rgba(184,134,11,0.3)",
                background: "rgba(184,134,11,0.06)",
                padding: 20,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ih-warn)",
                  fontWeight: 500,
                  fontFamily: "var(--ih-font-sans)",
                  marginBottom: 4,
                }}
              >
                Not ready yet
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ih-ink-65)",
                  fontFamily: "var(--ih-font-sans)",
                }}
              >
                Complete the items above before marking ready.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CheckRow({
  label,
  pass,
  detail,
}: {
  label: string
  pass: boolean
  detail?: string
}) {
  const CheckIcon = pass ? CheckCircle2 : XCircle
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        fontFamily: "var(--ih-font-sans)",
      }}
    >
      <CheckIcon
        size={16}
        style={{
          flexShrink: 0,
          marginTop: 1,
          color: pass ? "var(--ih-ok)" : "var(--ih-danger)",
        }}
      />
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontWeight: pass ? 400 : 500,
            color: "var(--ih-ink)",
          }}
        >
          {label}
        </p>
        {!pass && detail && (
          <p
            className="ih-mono"
            style={{
              margin: 0,
              marginTop: 3,
              fontSize: 9.5,
              color: "var(--ih-ink-40)",
              letterSpacing: "0.06em",
            }}
          >
            Missing: {detail}
          </p>
        )}
      </div>
    </div>
  )
}
