"use client"

import { useState, useMemo } from "react"
import { Filter, Download, Loader2, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { AuditFilters } from "@/components/audit/audit-filters"
import { AuditTimeline } from "@/components/audit/audit-timeline"
import { useAuditLog } from "@/hooks/use-audit-log"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { SkeletonList } from "@/components/ui/skeleton"

/**
 * Audit Log Page
 *
 * Displays a chronological timeline of all system changes with filtering capabilities.
 *
 * Features:
 * - PageHeader with filters toggle and export button
 * - Collapsible filter panel at top (AuditFilters component)
 * - Main content: AuditTimeline component with infinite scroll
 * - Loading skeleton during initial load (timeline shape)
 * - Empty state when no entries match filters
 * - Error boundary with retry button
 * - CSV export respecting current filters
 * - Infinite scroll triggered by AuditTimeline's onLoadMore via IntersectionObserver
 *
 * Layout (from spec):
 * ```
 * ┌─────────────────────────────────────────────────┐
 * │ Audit Log                    [Filters] [Export] │
 * ├─────────────────────────────────────────────────┤
 * │ ┌─────────────────────────────────────────────┐ │
 * │ │ [Filter panel - collapsible]                │ │
 * │ └─────────────────────────────────────────────┘ │
 * ├─────────────────────────────────────────────────┤
 * │ ○ 2 hours ago - John Doe updated Booking #123   │
 * │   └─ Changed status from PENDING to CONFIRMED   │
 * ├─────────────────────────────────────────────────┤
 * │ ○ 5 hours ago - Jane Smith created Customer #45 │
 * ├─────────────────────────────────────────────────┤
 * │ ○ 1 day ago - Admin deleted Service #7          │
 * │   └─ [View changes]                             │
 * └─────────────────────────────────────────────────┘
 * ```
 *
 * @route /admin/audit
 */
export default function AuditLogPage() {
  // Filter panel visibility
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false)

  // Audit log data hook
  const {
    entries,
    hasMore,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore,
    exportCsv,
  } = useAuditLog()

  // Fetch team members for actor dropdown
  const { data: teamData, isLoading: loadingUsers } = api.team.list.useQuery({ limit: 100 })
  const users = useMemo(
    () =>
      (teamData?.rows ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
      })),
    [teamData?.rows],
  )

  /**
   * Handle filter changes from AuditFilters component
   */
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  /**
   * Reset filters to empty state
   */
  const handleResetFilters = () => {
    setFilters({})
  }

  /**
   * Export audit log to CSV with current filters
   */
  const handleExport = async () => {
    try {
      await exportCsv.mutateAsync({
        action: filters.action,
        resourceType: filters.resourceType,
        userId: filters.userId ?? filters.actorId,
        dateFrom: filters.dateFrom ?? filters.from,
        dateTo: filters.dateTo ?? filters.to,
      })
      toast.success("Audit log exported successfully")
    } catch (err) {
      toast.error("Failed to export audit log")
    }
  }

  /**
   * Retry loading on error
   */
  const handleRetry = () => {
    // Reset filters to trigger a fresh query
    setFilters({ ...filters })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4 md:px-8">
        <PageHeader
          title="Audit Log"
          description="View all system changes and modifications"
        >
          <div className="flex items-center gap-2">
            {/* Filters Toggle Button */}
            <Button
              variant={isFiltersPanelOpen ? "secondary" : "outline"}
              size="default"
              onClick={() => setIsFiltersPanelOpen(!isFiltersPanelOpen)}
              aria-label="Toggle filters panel"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>

            {/* Export Button */}
            <Button
              variant="outline"
              size="default"
              onClick={handleExport}
              disabled={exportCsv.isPending || entries.length === 0}
              loading={exportCsv.isPending}
              aria-label="Export audit log to CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Filters Panel (Collapsible) */}
          {isFiltersPanelOpen && (
            <AuditFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleResetFilters}
              users={users}
              loadingUsers={loadingUsers}
              defaultOpen={true}
            />
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-destructive">
                    Failed to load audit log
                  </h3>
                  <p className="text-sm text-destructive/80">
                    {error instanceof Error
                      ? error.message
                      : "An unexpected error occurred. Please try again."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && entries.length === 0 && (
            <div className="space-y-4">
              <SkeletonList items={5} />
            </div>
          )}

          {/* Audit Timeline */}
          {!error && entries.length > 0 && (
            <AuditTimeline
              entries={entries}
              hasMore={hasMore}
              onLoadMore={loadMore}
              isLoading={isLoading}
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No audit entries found</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                {Object.keys(filters).length > 0
                  ? "No audit log entries match your current filters. Try adjusting your filter criteria."
                  : "Audit log entries will appear here as changes are made to your resources."}
              </p>
              {Object.keys(filters).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
