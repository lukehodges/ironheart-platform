"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, CalendarDays, Layers, BarChart3, Target, Clock } from "lucide-react"
import { OutreachStats } from "./_components/outreach-stats"
import { OutreachToday } from "./_components/outreach-today"
import { OutreachSequences } from "./_components/outreach-sequences"
import { OutreachAnalytics } from "./_components/outreach-analytics"

// ---------------------------------------------------------------------------
// Outreach Page
// ---------------------------------------------------------------------------

export default function OutreachPage() {
  const [view, setView] = useState<"today" | "sequences" | "analytics">("today")
  const dashboardQuery = api.outreach.getDashboard.useQuery()
  const dashboard = dashboardQuery.data

  const dueCount = (dashboard?.dueNow.length ?? 0) + (dashboard?.overdue.length ?? 0)
  const repliesCount = dashboard?.recentReplies.length ?? 0
  const estimatedMinutes = dueCount * 3
  const sentToday = dashboard?.todayStats.sent ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Outreach"
        description="Track and manage cold outreach campaigns"
      >
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden="true" /> New Sequence
        </Button>
      </PageHeader>

      {/* Briefing card */}
      <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20">
        <CardContent className="p-4">
          {dashboardQuery.isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Target className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium">Today&apos;s Mission</p>
                  <p className="text-xs text-muted-foreground">
                    {dueCount} contact{dueCount !== 1 ? "s" : ""} to reach
                    {repliesCount > 0 && (
                      <> &middot; {repliesCount} {repliesCount === 1 ? "reply" : "replies"} waiting</>
                    )}
                    {dueCount > 0 && (
                      <>
                        {" "}&middot;{" "}
                        <Clock className="inline h-3 w-3" aria-hidden="true" />{" "}
                        ~{estimatedMinutes} min
                      </>
                    )}
                  </p>
                </div>
              </div>
              {sentToday > 0 && (
                <Badge variant="secondary" className="shrink-0">
                  {sentToday} sent today
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <OutreachStats
        dueToday={dashboard?.dueNow.length ?? 0}
        overdue={dashboard?.overdue.length ?? 0}
        sentToday={sentToday}
        repliesWaiting={repliesCount}
        isLoading={dashboardQuery.isLoading}
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50 w-fit">
        <Button
          variant={view === "today" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("today")}
        >
          <CalendarDays className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Today
        </Button>
        <Button
          variant={view === "sequences" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("sequences")}
        >
          <Layers className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Sequences
        </Button>
        <Button
          variant={view === "analytics" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("analytics")}
        >
          <BarChart3 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Analytics
        </Button>
      </div>

      {view === "today" && <OutreachToday />}
      {view === "sequences" && <OutreachSequences />}
      {view === "analytics" && <OutreachAnalytics />}
    </div>
  )
}
