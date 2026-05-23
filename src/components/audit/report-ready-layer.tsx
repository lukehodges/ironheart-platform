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
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-2">Report readiness</h2>
        <p className="text-sm text-muted-foreground">
          Once all 5 lenses are scored with at least one finding, you can generate the audit report.
        </p>
      </div>

      {validateQuery.isLoading && <p className="text-sm text-muted-foreground">Checking…</p>}

      {validation && (
        <>
          <div className="rounded-md border border-border p-4 space-y-3">
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
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-6 text-center">
              <FileText size={32} className="mx-auto text-emerald-700 mb-2" />
              <h3 className="font-serif text-lg text-emerald-900">Ready to generate report</h3>
              <p className="text-sm text-emerald-800 mt-1">
                Mark this audit ready; the report generator (Phase 0.4) takes over from here.
              </p>
              <button
                onClick={() => markReadyMutation.mutate({ engagementId })}
                disabled={markReadyMutation.isPending || isAlreadyDone}
                className="mt-4 px-6 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isAlreadyDone
                  ? "Already marked ready"
                  : markReadyMutation.isPending
                    ? "Marking…"
                    : "Mark ready for report"}
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-6">
              <p className="text-sm text-amber-900 font-medium mb-2">Not ready yet</p>
              <p className="text-sm text-amber-800">Complete the items above before marking ready.</p>
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
  const Icon = pass ? CheckCircle2 : XCircle
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon size={18} className={pass ? "text-emerald-600" : "text-red-600"} />
      <div className="flex-1">
        <p className={pass ? "" : "font-medium"}>{label}</p>
        {!pass && detail && (
          <p className="text-xs text-muted-foreground mt-0.5">Missing: {detail}</p>
        )}
      </div>
    </div>
  )
}
