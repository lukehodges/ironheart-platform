"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Download,
  AlertCircle,
} from "lucide-react"
import type { DataGridProps } from "./data-grid.types"

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const SKELETON_ROW_COUNT = 5

export function DataGrid<T extends { id: string }>({
  columns,
  data,
  hasMore = false,
  isLoading = false,
  error = null,
  onRowClick,
  sort,
  onSortChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  pageSize,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  isFirstPage = true,
  selectable = false,
  bulkActions = [],
  rowActions = [],
  emptyState,
  csvFilename,
  className,
}: DataGridProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

  const hideableColumns = useMemo(
    () => columns.filter((col) => col.hideable),
    [columns]
  )

  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.has(col.id)),
    [columns, hiddenColumns]
  )

  const selectedRows = useMemo(
    () => data.filter((row) => selectedIds.has(row.id)),
    [data, selectedIds]
  )

  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(row.id))
  const someSelected = data.some((row) => selectedIds.has(row.id))
  const headerChecked = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((row) => row.id)))
    }
  }, [allSelected, data])

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }, [])

  const handleSort = useCallback(
    (field: string) => {
      if (!onSortChange) return
      if (sort?.field === field) {
        onSortChange({
          field,
          direction: sort.direction === "asc" ? "desc" : "asc",
        })
      } else {
        onSortChange({ field, direction: "asc" })
      }
    },
    [sort, onSortChange]
  )

  const handleToggleColumn = useCallback((columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const handleCsvExport = useCallback(() => {
    if (!csvFilename) return

    const csvColumns = columns.filter((col) => col.csvValue)
    if (csvColumns.length === 0) return

    const escapeCsvField = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const header = csvColumns.map((col) => escapeCsvField(col.label)).join(",")
    const rows = data.map((row) =>
      csvColumns
        .map((col) => escapeCsvField(col.csvValue!(row)))
        .join(",")
    )

    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = csvFilename.endsWith(".csv") ? csvFilename : `${csvFilename}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [csvFilename, columns, data])

  const showPagination = onNextPage || onPrevPage

  // Error state
  if (error) {
    return (
      <div className={cn("rounded-lg border border-destructive/50 bg-destructive/5 p-8", className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar: bulk actions bar + column visibility */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectable && selectedRows.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </span>
              {bulkActions.map((action) => {
                const applicableRows = action.isApplicable
                  ? selectedRows.filter(action.isApplicable)
                  : selectedRows
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant === "destructive" ? "destructive" : "outline"}
                    onClick={() => action.onAction(applicableRows)}
                    disabled={action.isPending || applicableRows.length === 0}
                  >
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                    {action.isApplicable && applicableRows.length !== selectedRows.length && (
                      <span className="ml-1 text-muted-foreground">
                        ({applicableRows.length})
                      </span>
                    )}
                  </Button>
                )
              })}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {csvFilename && (
            <Button size="sm" variant="outline" onClick={handleCsvExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Toggle column visibility"
                >
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={!hiddenColumns.has(col.id)}
                    onCheckedChange={() => handleToggleColumn(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className={col.width}
                  aria-sort={
                    col.sortable && onSortChange
                      ? sort?.field === col.id
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                >
                  {col.sortable && onSortChange ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort(col.id)}
                    >
                      {col.header ? col.header() : col.label}
                      {sort?.field === col.id ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    col.header ? col.header() : col.label
                  )}
                </TableHead>
              ))}
              {rowActions.length > 0 && (
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} aria-hidden="true">
                  {selectable && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  {rowActions.length > 0 && (
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={
                    visibleColumns.length +
                    (selectable ? 1 : 0) +
                    (rowActions.length > 0 ? 1 : 0)
                  }
                >
                  <EmptyState
                    icon={emptyState?.icon}
                    title={emptyState?.title ?? "No results found"}
                    description={emptyState?.description}
                    action={emptyState?.action}
                    className="py-8"
                  />
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              data.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedIds.has(row.id) ? "selected" : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => handleSelectRow(row.id)}
                        aria-label={`Select row ${row.id}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id}>{col.cell(row)}</TableCell>
                  ))}
                  {rowActions.length > 0 && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for row ${row.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions
                            .filter((action) => !action.isVisible || action.isVisible(row))
                            .map((action, idx) => (
                              <span key={action.label}>
                                {action.separator && idx > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  destructive={action.variant === "destructive"}
                                  disabled={action.isDisabled?.(row) || action.isPending?.(row)}
                                  onClick={() => action.onClick(row)}
                                >
                                  {action.icon && <action.icon className="h-4 w-4" />}
                                  {action.label}
                                </DropdownMenuItem>
                              </span>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {data.length} {data.length === 1 ? "row" : "rows"}
            </span>
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pageSize ?? pageSizeOptions[0])}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onPrevPage}
              disabled={isFirstPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                if (data.length > 0) {
                  onNextPage?.(data[data.length - 1].id)
                }
              }}
              disabled={!hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
