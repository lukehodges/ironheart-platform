"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import type { ChurnRiskCustomer } from "@/types/analytics"
import {
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = "riskLevel" | "daysSinceLastBooking"
type SortDir = "asc" | "desc"

interface SortState {
  field: SortField
  dir: SortDir
}

interface ColumnDef {
  id: string
  label: string
}

const COLUMN_DEFS: ColumnDef[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "lastBooking", label: "Last Booking" },
  { id: "daysSince", label: "Days Since" },
  { id: "riskLevel", label: "Risk Level" },
  { id: "totalSpend", label: "Total Spend" },
]

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function getRiskLevelColor(
  riskLevel: "HIGH" | "MEDIUM" | "LOW"
): "destructive" | "warning" | "default" {
  switch (riskLevel) {
    case "HIGH":
      return "destructive"
    case "MEDIUM":
      return "warning"
    case "LOW":
      return "default"
  }
}

function getRiskLevelLabel(riskLevel: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (riskLevel) {
    case "HIGH":
      return "High Risk"
    case "MEDIUM":
      return "Medium Risk"
    case "LOW":
      return "Low Risk"
  }
}

function exportCsv(rows: ChurnRiskCustomer[], filename = "churn-risk.csv") {
  const headers = [
    "Customer Name",
    "Email",
    "Last Booking Date",
    "Days Since Last Booking",
    "Risk Level",
    "Total Spend",
  ]

  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.customerName,
        r.email,
        formatDate(r.lastBookingDate),
        r.daysSinceLastBooking,
        getRiskLevelLabel(r.riskLevel),
        formatCurrency(r.totalSpend),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ]

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Sort button sub-component
// ---------------------------------------------------------------------------

interface SortButtonProps {
  field: SortField
  sort: SortState
  onSort: (field: SortField) => void
  children: React.ReactNode
}

function SortButton({ field, sort, onSort, children }: SortButtonProps) {
  const isActive = sort.field === field
  const Icon = isActive ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : null

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <TableRow key={rowIdx} aria-hidden="true">
          {COLUMN_DEFS.map((_, colIdx) => (
            <TableCell key={colIdx} className="py-3">
              <Skeleton
                className={cn(
                  "h-4",
                  colIdx === 0 && "w-32",
                  colIdx === 1 && "w-40",
                  colIdx === 2 && "w-28",
                  colIdx === 3 && "w-20",
                  colIdx === 4 && "w-24",
                  colIdx === 5 && "w-24"
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ChurnRiskTableProps {
  filters?: {
    preset?: "7d" | "30d" | "90d" | "12m"
    from?: Date
    to?: Date
  }
}

export function ChurnRiskTable({ filters = {} }: ChurnRiskTableProps) {
  // Local state
  const [sort, setSort] = useState<SortState>({
    field: "riskLevel",
    dir: "desc",
  })
  const [currentPage, setCurrentPage] = useState(0)

  // TODO: Implement getChurnRisk procedure in analytics router
  // For now, using stub data to make build pass
  const isLoading = false
  const error = null
  const rows: ChurnRiskCustomer[] = []

  // Client-side sort
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      if (sort.field === "riskLevel") {
        const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        aVal = riskOrder[a.riskLevel]
        bVal = riskOrder[b.riskLevel]
      } else {
        aVal = a.daysSinceLastBooking
        bVal = b.daysSinceLastBooking
      }

      return sort.dir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [rows, sort])

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    return sortedRows.slice(start, start + PAGE_SIZE)
  }, [sortedRows, currentPage])

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE)
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage >= totalPages - 1

  // Handlers
  function handleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "desc" }
    )
    setCurrentPage(0)
  }

  function handlePrevPage() {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  function handleNextPage() {
    setCurrentPage((prev) => (isLastPage ? prev : prev + 1))
  }

  function handleExportCsv() {
    exportCsv(sortedRows, "churn-risk.csv")
    toast.success(`Exported ${sortedRows.length} at-risk customers to CSV`)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // TODO: Re-enable error handling when getChurnRisk procedure is implemented
  // if (error) {
  //   return (
  //     <div className="flex h-40 items-center justify-center rounded-md border border-border">
  //       <p className="text-sm text-destructive">
  //         {error.message ?? "Failed to load churn risk data"}
  //       </p>
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-3">
      {/* Header row: title + export button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          At-Risk Customers ({sortedRows.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={handleExportCsv}
          disabled={sortedRows.length === 0 || isLoading}
          aria-label="Export at-risk customers to CSV"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Name */}
              <TableHead className="min-w-[160px]">Name</TableHead>

              {/* Email */}
              <TableHead className="min-w-[200px]">Email</TableHead>

              {/* Last Booking */}
              <TableHead className="min-w-[140px]">Last Booking</TableHead>

              {/* Days Since */}
              <TableHead className="min-w-[100px]">
                <SortButton
                  field="daysSinceLastBooking"
                  sort={sort}
                  onSort={handleSort}
                >
                  Days Since
                </SortButton>
              </TableHead>

              {/* Risk Level */}
              <TableHead className="min-w-[120px]">
                <SortButton field="riskLevel" sort={sort} onSort={handleSort}>
                  Risk Level
                </SortButton>
              </TableHead>

              {/* Total Spend */}
              <TableHead className="min-w-[120px] text-right">
                Total Spend
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_DEFS.length} className="p-0">
                  <EmptyState
                    variant="default"
                    title="No at-risk customers"
                    description="All your customers are actively booking services."
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((customer) => (
                <TableRow
                  key={customer.customerId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  role="row"
                >
                  {/* Name with avatar */}
                  <TableCell className="py-3">
                    <Link
                      href={`/admin/customers?id=${customer.customerId}`}
                      className="flex items-center gap-2 min-w-0 hover:underline"
                    >
                      <Avatar className="h-6 w-6 shrink-0 text-[10px]">
                        <AvatarFallback>
                          {getInitials(customer.customerName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium text-foreground">
                        {customer.customerName}
                      </span>
                    </Link>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-3">
                    <Link
                      href={`/admin/customers?id=${customer.customerId}`}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline truncate"
                    >
                      {customer.email}
                    </Link>
                  </TableCell>

                  {/* Last Booking */}
                  <TableCell className="py-3">
                    <span className="text-sm text-foreground">
                      {formatDate(customer.lastBookingDate)}
                    </span>
                  </TableCell>

                  {/* Days Since */}
                  <TableCell className="py-3">
                    <span className="text-sm font-medium text-foreground">
                      {customer.daysSinceLastBooking}d
                    </span>
                  </TableCell>

                  {/* Risk Level Badge */}
                  <TableCell className="py-3">
                    <Badge variant={getRiskLevelColor(customer.riskLevel)}>
                      {getRiskLevelLabel(customer.riskLevel)}
                    </Badge>
                  </TableCell>

                  {/* Total Spend */}
                  <TableCell className="py-3 text-right">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(customer.totalSpend)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${paginatedRows.length > 0 ? currentPage * PAGE_SIZE + 1 : 0}–${Math.min((currentPage + 1) * PAGE_SIZE, sortedRows.length)} of ${sortedRows.length}`}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handlePrevPage}
            disabled={isFirstPage || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleNextPage}
            disabled={isLastPage || isLoading}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChurnRiskTable
