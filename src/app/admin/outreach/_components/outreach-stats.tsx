"use client"

import { CalendarClock, AlertTriangle, Send, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Outreach Stats Strip
// ---------------------------------------------------------------------------

interface OutreachStatsProps {
  dueToday: number
  overdue: number
  sentToday: number
  repliesWaiting: number
  isLoading: boolean
}

export function OutreachStats({
  dueToday,
  overdue,
  sentToday,
  repliesWaiting,
  isLoading,
}: OutreachStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Due Today"
        value={dueToday}
        icon={<CalendarClock className="h-4 w-4 text-indigo-500" aria-hidden="true" />}
        iconBg="bg-indigo-500/10"
        isLoading={isLoading}
      />
      <StatCard
        label="Overdue"
        value={overdue}
        valueClassName={overdue > 0 ? "text-red-600" : undefined}
        icon={<AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />}
        iconBg="bg-red-500/10"
        isLoading={isLoading}
      />
      <StatCard
        label="Sent Today"
        value={sentToday}
        icon={<Send className="h-4 w-4 text-slate-500" aria-hidden="true" />}
        iconBg="bg-slate-500/10"
        isLoading={isLoading}
      />
      <StatCard
        label="Replies Waiting"
        value={repliesWaiting}
        icon={<MessageSquare className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
        iconBg="bg-emerald-500/10"
        isLoading={isLoading}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  valueClassName,
  icon,
  iconBg,
  isLoading,
}: {
  label: string
  value: number
  valueClassName?: string
  icon: React.ReactNode
  iconBg: string
  isLoading: boolean
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-10 mt-0.5" />
            ) : (
              <p className={`text-xl font-semibold tracking-tight font-mono ${valueClassName ?? ""}`}>
                {value}
              </p>
            )}
          </div>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
