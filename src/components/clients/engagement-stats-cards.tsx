"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Activity, PoundSterling, FileText } from "lucide-react"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

interface EngagementStatsCardsProps {
  engagements: EngagementWithCustomer[]
}

export function EngagementStatsCards({ engagements }: EngagementStatsCardsProps) {
  const active = engagements.filter((e) => e.status === "ACTIVE").length
  const projects = engagements.filter((e) => e.status === "ACTIVE" && e.type === "PROJECT").length
  const retainers = engagements.filter((e) => e.status === "ACTIVE" && e.type === "RETAINER").length
  const proposalsPending = engagements.filter((e) => e.status === "PROPOSED").length

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Engagements</p>
              <p className="text-3xl font-semibold tracking-tight text-primary mt-1">{active}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {projects} project{projects !== 1 ? "s" : ""}, {retainers} retainer{retainers !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Engagements</p>
              <p className="text-3xl font-semibold tracking-tight text-green-600 mt-1">{engagements.length}</p>
            </div>
            <div className="rounded-lg bg-green-600/10 p-2">
              <PoundSterling className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across all statuses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Proposals Pending</p>
              <p className="text-3xl font-semibold tracking-tight text-orange-500 mt-1">{proposalsPending}</p>
            </div>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Awaiting client review
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
