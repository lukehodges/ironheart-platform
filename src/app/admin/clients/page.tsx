"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EngagementStatsCards } from "@/components/clients/engagement-stats-cards"
import { EngagementFilters } from "@/components/clients/engagement-filters"
import { EngagementTable } from "@/components/clients/engagement-table"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"

const PAGE_SIZE = 25

export default function ClientsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursorStack[cursorStack.length - 1]

  const { data, isLoading } = api.clientPortal.admin.listEngagements.useQuery({
    search: debouncedSearch || undefined,
    status: status as any,
    limit: PAGE_SIZE,
    cursor: currentCursor,
  })

  const engagements = data?.rows ?? []
  const hasMore = data?.hasMore ?? false

  const handleNextPage = useCallback(() => {
    if (engagements.length > 0) {
      setCursorStack((prev) => [...prev, engagements[engagements.length - 1]!.id])
    }
  }, [engagements])

  const handlePreviousPage = useCallback(() => {
    setCursorStack((prev) => prev.slice(0, -1))
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCursorStack([])
  }, [])

  const handleStatusChange = useCallback((value: string | undefined) => {
    setStatus(value)
    setCursorStack([])
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Clients"
        description="Manage client engagements and proposals."
      >
        <Button size="sm" onClick={() => router.push("/admin/clients/new")}>
          <Plus className="h-4 w-4" />
          New Engagement
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <EngagementStatsCards engagements={engagements} />
      )}

      <EngagementFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
      />

      {isLoading ? (
        <Skeleton className="h-[400px] rounded-xl" />
      ) : (
        <EngagementTable
          engagements={engagements}
          hasMore={hasMore}
          hasPrevious={cursorStack.length > 0}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
