"use client"

import { useParams } from "next/navigation"
import { api } from "@/lib/trpc/react"
import { BrandedReport } from "@/components/consulting/report/branded-report"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReportContentJson } from "@/modules/report-generator/report-generator.types"

export default function ReportPreviewPage() {
  const params = useParams()
  const engagementId = params.id as string

  const { data: report, isLoading, error, refetch } = api.reportGenerator.getByEngagement.useQuery(
    { engagementId },
    { enabled: !!engagementId },
  )

  const contentJson = report?.contentJson as ReportContentJson | null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#EFEAE0" }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "#D13A1F" }} />
          <p className="text-sm" style={{ color: "rgba(14,16,19,0.66)" }}>
            Loading report...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Failed to load report</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()} className="min-h-[44px]">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!contentJson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-semibold">No report available</h2>
          <p className="text-sm text-muted-foreground">
            This engagement does not have a generated report yet.
          </p>
        </div>
      </div>
    )
  }

  return <BrandedReport content={contentJson} />
}
