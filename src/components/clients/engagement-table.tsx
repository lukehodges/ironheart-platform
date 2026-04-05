"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { EngagementRow } from "./engagement-row"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

interface EngagementTableProps {
  engagements: EngagementWithCustomer[]
  hasMore: boolean
  hasPrevious: boolean
  onNextPage: () => void
  onPreviousPage: () => void
  isLoading: boolean
}

export function EngagementTable({
  engagements,
  hasMore,
  hasPrevious,
  onNextPage,
  onPreviousPage,
  isLoading,
}: EngagementTableProps) {
  return (
    <div>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Client</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[130px]">Last Activity</TableHead>
              <TableHead className="w-[48px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements.map((e) => (
              <EngagementRow key={e.id} engagement={e} />
            ))}
            {engagements.length === 0 && !isLoading && (
              <TableRow>
                <TableHead colSpan={6} className="text-center py-8 text-muted-foreground">
                  No engagements found
                </TableHead>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Showing {engagements.length} engagement{engagements.length !== 1 ? "s" : ""}</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasPrevious}
            onClick={onPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasMore}
            onClick={onNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
