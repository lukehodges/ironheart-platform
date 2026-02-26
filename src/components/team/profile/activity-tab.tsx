"use client"

import { useState } from "react"
import { format } from "date-fns"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { ScrollText } from "lucide-react"

export function ActivityTab({ memberId }: { memberId: string }) {
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const { data, isLoading, isError } = api.audit.list.useQuery(
    { userId: memberId, limit: 50, cursor },
    {
      retry: false,
    }
  )

  if (isError) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center py-12 gap-2">
          <ScrollText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Activity log unavailable</p>
          <p className="text-xs text-muted-foreground">
            You may not have permission to view audit logs.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const entries = data?.rows ?? []

  if (entries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          variant="documents"
          title="No activity"
          description="No audit log entries found for this staff member."
        />
      </div>
    )
  }

  return (
    <div className="py-6 space-y-2">
      <h3 className="text-sm font-medium mb-4">
        Activity
        <span className="ml-1.5 text-muted-foreground font-normal">({entries.length})</span>
      </h3>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md border border-border px-4 py-3"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {entry.action}
                </Badge>
                {entry.entityType && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {entry.entityType}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              {format(new Date(entry.createdAt), "d MMM yyyy HH:mm")}
            </span>
          </div>
        ))}
        {data?.hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                const last = entries[entries.length - 1]
                if (last) setCursor(last.id)
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
