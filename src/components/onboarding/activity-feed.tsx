"use client"

import { api } from "@/lib/trpc/react"

interface ActivityFeedProps {
  mode: "consultant" | "client"
  engagementId: string
}

export function ActivityFeed({ mode, engagementId }: ActivityFeedProps) {
  const query =
    mode === "consultant"
      ? api.onboarding.getActivity.useQuery(
          { engagementId, limit: 30 },
          { refetchInterval: 10_000 },
        )
      : api.onboarding.clientGetActivity.useQuery(
          { engagementId, limit: 30 },
          { refetchInterval: 10_000 },
        )

  if (query.isLoading) {
    return <div className="text-xs text-muted-foreground">Loading activity…</div>
  }

  const rows = query.data?.rows ?? []

  if (rows.length === 0) {
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Activity</p>
      {rows.map((row) => (
        <div key={row.id} className="text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={[
                "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                row.actorType === "CONSULTANT"
                  ? "bg-blue-500"
                  : row.actorType === "CLIENT"
                    ? "bg-amber-500"
                    : "bg-gray-400",
              ].join(" ")}
            />
            <span className="font-medium truncate">{row.actorName}</span>
            <span className="text-muted-foreground ml-auto font-mono text-[10px] flex-shrink-0">
              {new Date(row.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-foreground/80 mt-0.5 break-words">{row.message}</p>
        </div>
      ))}
    </div>
  )
}
