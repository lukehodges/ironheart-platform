"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, FileText, AlertCircle } from "lucide-react"

type AuditLens = "REVENUE" | "OPERATIONS" | "FINANCE" | "TECHNOLOGY" | "TEAM"

interface ValidationResult {
  isReady: boolean
  missingLenses: AuditLens[]
  lensesWithoutFindings: AuditLens[]
  lensesWithoutRag: AuditLens[]
}

interface ReadinessPanelProps {
  validation: ValidationResult | null | undefined
  isValidating: boolean
  onMarkReady: () => void
  isMarking: boolean
  sessionStatus: string
  disabled?: boolean
}

const ALL_LENSES: AuditLens[] = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"]

const LENS_LABELS: Record<AuditLens, string> = {
  REVENUE: "Revenue",
  OPERATIONS: "Operations",
  FINANCE: "Finance",
  TECHNOLOGY: "Technology",
  TEAM: "Team",
}

export function ReadinessPanel({
  validation,
  isValidating,
  onMarkReady,
  isMarking,
  sessionStatus,
  disabled,
}: ReadinessPanelProps) {
  const isReportReady = sessionStatus === "READY_FOR_REPORT" || sessionStatus === "COMPLETE"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isValidating || !validation ? (
            <p className="text-sm text-muted-foreground">Checking readiness...</p>
          ) : (
            <>
              {/* Lens scoring status */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">RAG Scores</h4>
                <div className="space-y-1">
                  {ALL_LENSES.map((lens) => {
                    const hasRag = !validation.lensesWithoutRag.includes(lens) && !validation.missingLenses.includes(lens)
                    return (
                      <div key={lens} className="flex items-center gap-2 text-sm">
                        {hasRag ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span className={hasRag ? "text-foreground" : "text-muted-foreground"}>
                          {LENS_LABELS[lens]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Findings status */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Findings</h4>
                <div className="space-y-1">
                  {ALL_LENSES.map((lens) => {
                    const hasFindings = !validation.lensesWithoutFindings.includes(lens) && !validation.missingLenses.includes(lens)
                    return (
                      <div key={lens} className="flex items-center gap-2 text-sm">
                        {hasFindings ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span className={hasFindings ? "text-foreground" : "text-muted-foreground"}>
                          {LENS_LABELS[lens]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Overall status */}
              <div className="pt-2">
                {validation.isReady ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-md p-3">
                    <Check className="h-4 w-4" />
                    All lenses scored with findings. Ready to generate report.
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-md p-3">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Not ready yet</p>
                      {validation.missingLenses.length > 0 && (
                        <p>Missing lenses: {validation.missingLenses.map((l) => LENS_LABELS[l]).join(", ")}</p>
                      )}
                      {validation.lensesWithoutRag.length > 0 && (
                        <p>No RAG score: {validation.lensesWithoutRag.map((l) => LENS_LABELS[l]).join(", ")}</p>
                      )}
                      {validation.lensesWithoutFindings.length > 0 && (
                        <p>No findings: {validation.lensesWithoutFindings.map((l) => LENS_LABELS[l]).join(", ")}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Generate report button */}
              <div className="pt-2">
                {isReportReady ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <Check className="h-4 w-4" />
                      Report marked as ready
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="#">View Report (coming soon)</a>
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={onMarkReady}
                    disabled={!validation.isReady || isMarking || disabled}
                    className="w-full"
                  >
                    <FileText className="mr-1.5 h-4 w-4" />
                    {isMarking ? "Generating..." : "Generate Report"}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
