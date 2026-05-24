"use client"

import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types"

interface AuditSummaryPaneProps {
  session: AuditSessionWithLenses | null | undefined
}

export function AuditSummaryPane({ session }: AuditSummaryPaneProps) {
  if (!session) {
    return <p className="text-sm text-muted-foreground">No audit data.</p>
  }

  const totalFindings = session.lenses.reduce((n, l) => n + (l.findings?.length ?? 0), 0)
  const totalRecs = session.lenses.reduce((n, l) => n + (l.recommendations?.length ?? 0), 0)
  const totalWaste = session.lenses
    .flatMap((l) => l.findings ?? [])
    .reduce((sum, f) => sum + (f.estimatedAnnualWaste ?? 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Audit summary</p>
        <p className="font-serif text-lg mt-1">Source data</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-border p-2">
          <p className="text-muted-foreground">Findings</p>
          <p className="font-mono text-lg">{totalFindings}</p>
        </div>
        <div className="rounded border border-border p-2">
          <p className="text-muted-foreground">Recommendations</p>
          <p className="font-mono text-lg">{totalRecs}</p>
        </div>
        <div className="rounded border border-border p-2 col-span-2">
          <p className="text-muted-foreground">Total estimated annual waste</p>
          <p className="font-mono text-lg">£{(totalWaste / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {session.lenses.map((lens) => (
          <div key={lens.id} className="rounded border border-border p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{lens.lens}</span>
              {lens.ragScore && (
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    lens.ragScore === "RED"
                      ? "bg-red-500"
                      : lens.ragScore === "AMBER"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />
              )}
            </div>
            <p className="text-muted-foreground">
              {lens.findings?.length ?? 0} findings · {lens.recommendations?.length ?? 0} recs
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
