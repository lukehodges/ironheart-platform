# Component Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first set of higher-level, reusable components (DataGrid, StatCard, StatusPipeline) that the vertical scaffolder will use to generate frontend pages.

**Architecture:** Composable components built on top of existing shadcn/ui primitives. Each component is config-driven — you pass a declarative config object and get a fully-featured UI element. No TanStack Table dependency — we keep the existing hand-rolled approach but make it generic and reusable.

**Tech Stack:** React 19, Tailwind 4, CVA (class-variance-authority), existing shadcn/ui primitives, @testing-library/react, vitest

---

## Task 1: DataGrid Types

**Files:**
- Create: `src/components/data-grid/data-grid.types.ts`

**Step 1: Create the type definitions**

These types define the DataGrid's API contract. Every list page across every vertical will use this interface.

```typescript
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

export interface DataGridColumn<T> {
  /** Unique column identifier */
  id: string
  /** Column header label */
  label: string
  /** Whether this column can be hidden via column visibility toggle */
  hideable?: boolean
  /** Whether this column is sortable */
  sortable?: boolean
  /** Fixed width class (e.g. "w-10", "w-28", "min-w-[160px]") */
  width?: string
  /** Render the cell content for a given row */
  cell: (row: T) => ReactNode
  /** Optional: render a custom header (overrides label) */
  header?: () => ReactNode
  /** CSV export value extractor (if omitted, column is excluded from export) */
  csvValue?: (row: T) => string
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export interface DataGridSortState {
  field: string
  direction: "asc" | "desc"
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface DataGridPaginationState {
  cursor: string | undefined
  cursorStack: string[]
  limit: number
}

// ---------------------------------------------------------------------------
// Bulk action
// ---------------------------------------------------------------------------

export interface DataGridBulkAction<T> {
  label: string
  icon?: LucideIcon
  variant?: "default" | "destructive"
  /** Called with the currently selected rows */
  onAction: (selectedRows: T[]) => void
  /** Whether the action is currently running */
  isPending?: boolean
  /** Optional: filter which selected rows this action applies to */
  isApplicable?: (row: T) => boolean
}

// ---------------------------------------------------------------------------
// Row action (per-row dropdown menu item)
// ---------------------------------------------------------------------------

export interface DataGridRowAction<T> {
  label: string
  icon?: LucideIcon
  variant?: "default" | "destructive"
  onClick: (row: T) => void
  /** Whether to show this action for the given row */
  isVisible?: (row: T) => boolean
  /** Whether this action is disabled for the given row */
  isDisabled?: (row: T) => boolean
  /** Whether this action is currently pending for the given row */
  isPending?: (row: T) => boolean
  /** Separator before this action */
  separator?: boolean
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export interface DataGridEmptyState {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

// ---------------------------------------------------------------------------
// Main props
// ---------------------------------------------------------------------------

export interface DataGridProps<T extends { id: string }> {
  /** Column definitions */
  columns: DataGridColumn<T>[]
  /** The data rows to display */
  data: T[]
  /** Whether more rows are available (enables "Next" button) */
  hasMore?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Error message (renders error state instead of table) */
  error?: string | null
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void
  /** Sort state (controlled) */
  sort?: DataGridSortState
  /** Sort change handler */
  onSortChange?: (sort: DataGridSortState) => void
  /** Page size options */
  pageSizeOptions?: number[]
  /** Current page size */
  pageSize?: number
  /** Page size change handler */
  onPageSizeChange?: (size: number) => void
  /** Called when navigating to next page — receives the last row's id as cursor */
  onNextPage?: (cursor: string) => void
  /** Called when navigating to previous page */
  onPrevPage?: () => void
  /** Whether we're on the first page */
  isFirstPage?: boolean
  /** Enable row selection */
  selectable?: boolean
  /** Bulk actions (shown when rows are selected) */
  bulkActions?: DataGridBulkAction<T>[]
  /** Per-row actions (dropdown menu on each row) */
  rowActions?: DataGridRowAction<T>[]
  /** Empty state configuration */
  emptyState?: DataGridEmptyState
  /** CSV export filename (enables export button in bulk actions bar) */
  csvFilename?: string
  /** Additional class name for the root wrapper */
  className?: string
}
```

**Step 2: Commit**

```bash
git add src/components/data-grid/data-grid.types.ts
git commit -m "feat(data-grid): add type definitions for DataGrid component"
```

---

## Task 2: DataGrid Core — Rendering Table from Config

**Files:**
- Create: `src/components/data-grid/data-grid.tsx`
- Create: `src/components/data-grid/__tests__/data-grid.test.tsx`
- Create: `src/components/data-grid/index.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DataGrid } from "../data-grid"
import type { DataGridColumn } from "../data-grid.types"

interface TestRow {
  id: string
  name: string
  status: string
  amount: number
}

const testColumns: DataGridColumn<TestRow>[] = [
  { id: "name", label: "Name", cell: (row) => row.name },
  { id: "status", label: "Status", cell: (row) => row.status },
  { id: "amount", label: "Amount", cell: (row) => `£${row.amount}` },
]

const testData: TestRow[] = [
  { id: "1", name: "Alice", status: "Active", amount: 100 },
  { id: "2", name: "Bob", status: "Pending", amount: 200 },
  { id: "3", name: "Charlie", status: "Active", amount: 300 },
]

describe("DataGrid", () => {
  describe("basic rendering", () => {
    it("renders column headers", () => {
      render(<DataGrid columns={testColumns} data={testData} />)
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Amount")).toBeInTheDocument()
    })

    it("renders row data using cell renderers", () => {
      render(<DataGrid columns={testColumns} data={testData} />)
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
      expect(screen.getByText("£300")).toBeInTheDocument()
    })

    it("calls onRowClick when a row is clicked", async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      render(
        <DataGrid columns={testColumns} data={testData} onRowClick={onRowClick} />
      )
      await user.click(screen.getByText("Alice"))
      expect(onRowClick).toHaveBeenCalledWith(testData[0])
    })
  })

  describe("loading state", () => {
    it("renders skeleton rows when loading", () => {
      render(<DataGrid columns={testColumns} data={[]} isLoading />)
      const skeletons = document.querySelectorAll("[aria-hidden='true'] td")
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("does not render data rows when loading", () => {
      render(<DataGrid columns={testColumns} data={testData} isLoading />)
      expect(screen.queryByText("Alice")).not.toBeInTheDocument()
    })
  })

  describe("empty state", () => {
    it("renders default empty state when data is empty", () => {
      render(<DataGrid columns={testColumns} data={[]} />)
      expect(screen.getByText("No results found")).toBeInTheDocument()
    })

    it("renders custom empty state when provided", () => {
      render(
        <DataGrid
          columns={testColumns}
          data={[]}
          emptyState={{
            title: "No bookings",
            description: "Create your first booking",
          }}
        />
      )
      expect(screen.getByText("No bookings")).toBeInTheDocument()
      expect(screen.getByText("Create your first booking")).toBeInTheDocument()
    })
  })

  describe("error state", () => {
    it("renders error message instead of table", () => {
      render(
        <DataGrid
          columns={testColumns}
          data={[]}
          error="Failed to load data"
        />
      )
      expect(screen.getByText("Failed to load data")).toBeInTheDocument()
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/data-grid/__tests__/data-grid.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement the DataGrid component**

```typescript
"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from "lucide-react"
import type {
  DataGridProps,
  DataGridColumn,
  DataGridSortState,
} from "./data-grid.types"

// ---------------------------------------------------------------------------
// Sort button sub-component
// ---------------------------------------------------------------------------

interface SortButtonProps {
  field: string
  sort: DataGridSortState | undefined
  onSort: (field: string) => void
  children: React.ReactNode
}

function SortButton({ field, sort, onSort, children }: SortButtonProps) {
  const isActive = sort?.field === field
  const Icon = isActive
    ? sort.direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
      aria-sort={
        isActive
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      {children}
      <Icon className="h-3 w-3" aria-hidden="true" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function GridSkeleton({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 10 }).map((_, rowIdx) => (
        <TableRow key={rowIdx} aria-hidden="true">
          {Array.from({ length: colCount }).map((_, colIdx) => (
            <TableCell key={colIdx} className="py-3">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function exportCsv<T extends { id: string }>(
  rows: T[],
  columns: DataGridColumn<T>[],
  filename: string
) {
  const exportable = columns.filter((c) => c.csvValue)
  const headers = exportable.map((c) => c.label)

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      exportable
        .map((col) => `"${String(col.csvValue!(row)).replace(/"/g, '""')}"`)
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
// Main DataGrid component
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]

export function DataGrid<T extends { id: string }>({
  columns,
  data,
  hasMore = false,
  isLoading = false,
  error = null,
  onRowClick,
  sort,
  onSortChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
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
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

  // Derived state
  const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.id))
  const totalColCount =
    visibleColumns.length +
    (selectable ? 1 : 0) +
    (rowActions.length > 0 ? 1 : 0)

  const allSelected =
    data.length > 0 && data.every((r) => selectedIds.has(r.id))
  const someSelected = data.some((r) => selectedIds.has(r.id))

  const selectedRows = useMemo(
    () => data.filter((r) => selectedIds.has(r.id)),
    [data, selectedIds]
  )

  // Handlers
  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)))
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSort(field: string) {
    if (!onSortChange) return
    if (sort?.field === field) {
      onSortChange({
        field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      })
    } else {
      onSortChange({ field, direction: "asc" })
    }
  }

  function handleNextPage() {
    if (!hasMore || data.length === 0 || !onNextPage) return
    const lastRow = data[data.length - 1]
    onNextPage(lastRow.id)
    setSelectedIds(new Set())
  }

  function handlePrevPage() {
    if (!onPrevPage) return
    onPrevPage()
    setSelectedIds(new Set())
  }

  function toggleColumn(colId: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(colId)) {
        next.delete(colId)
      } else {
        next.add(colId)
      }
      return next
    })
  }

  const hideableColumns = columns.filter((c) => c.hideable)
  const hasPagination = onNextPage || onPrevPage
  const hasColumnVisibility = hideableColumns.length > 0

  // Error state
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar: bulk actions + column visibility */}
      {(selectable || hasColumnVisibility) && (
        <div className="flex items-center justify-between gap-2 min-h-[32px]">
          {/* Bulk actions */}
          {selectable && selectedIds.size > 0 ? (
            <div
              className="flex items-center gap-2"
              role="toolbar"
              aria-label={`Bulk actions for ${selectedIds.size} selected rows`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {selectedIds.size} selected
              </span>
              {bulkActions.map((action) => {
                const ActionIcon = action.icon
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-7 gap-1 text-xs",
                      action.variant === "destructive" &&
                        "text-destructive hover:text-destructive"
                    )}
                    onClick={() => action.onAction(selectedRows)}
                    disabled={action.isPending}
                    aria-label={action.label}
                  >
                    {ActionIcon && (
                      <ActionIcon className="h-3.5 w-3.5" />
                    )}
                    {action.label}
                  </Button>
                )
              })}
              {csvFilename && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => exportCsv(selectedRows, columns, csvFilename)}
                  aria-label="Export selected rows to CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Column visibility */}
          {hasColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  aria-label="Toggle column visibility"
                >
                  <Columns className="h-3.5 w-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {hideableColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={!hiddenColumns.has(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection checkbox header */}
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                    disabled={isLoading || data.length === 0}
                  />
                </TableHead>
              )}

              {/* Data column headers */}
              {visibleColumns.map((col) => (
                <TableHead key={col.id} className={col.width}>
                  {col.header ? (
                    col.header()
                  ) : col.sortable && onSortChange ? (
                    <SortButton
                      field={col.id}
                      sort={sort}
                      onSort={handleSort}
                    >
                      {col.label}
                    </SortButton>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}

              {/* Row actions header */}
              {rowActions.length > 0 && (
                <TableHead className="w-10" aria-label="Row actions" />
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <GridSkeleton colCount={totalColCount} />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColCount} className="p-0">
                  <EmptyState
                    title={emptyState?.title ?? "No results found"}
                    description={
                      emptyState?.description ??
                      "Try adjusting your search or filters."
                    }
                    icon={emptyState?.icon}
                    action={emptyState?.action}
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const isSelected = selectedIds.has(row.id)

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={() => onRowClick?.(row)}
                    role="row"
                    aria-selected={selectable ? isSelected : undefined}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="py-3"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select row ${row.id}`}
                        />
                      </TableCell>
                    )}

                    {/* Data cells */}
                    {visibleColumns.map((col) => (
                      <TableCell key={col.id} className="py-3">
                        {col.cell(row)}
                      </TableCell>
                    ))}

                    {/* Row actions */}
                    {rowActions.length > 0 && (
                      <TableCell
                        className="py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActionsMenu
                          row={row}
                          actions={rowActions}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {hasPagination && (
        <div className="flex items-center justify-between gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Rows per page
            </span>
            {onPageSizeChange && pageSize && (
              <Select
                value={String(pageSize)}
                onValueChange={(v) => onPageSizeChange(Number(v))}
              >
                <SelectTrigger
                  className="h-7 w-[70px] text-xs"
                  aria-label="Rows per page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${data.length} row${data.length !== 1 ? "s" : ""}`}
            </span>
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
              disabled={!hasMore || isLoading}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row actions dropdown
// ---------------------------------------------------------------------------

function RowActionsMenu<T extends { id: string }>({
  row,
  actions,
}: {
  row: T
  actions: DataGridProps<T>["rowActions"]
}) {
  if (!actions || actions.length === 0) return null

  const visibleActions = actions.filter(
    (a) => !a.isVisible || a.isVisible(row)
  )
  if (visibleActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Actions for row ${row.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {visibleActions.map((action, idx) => {
          const ActionIcon = action.icon
          return (
            <div key={action.label}>
              {action.separator && idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => action.onClick(row)}
                disabled={
                  action.isDisabled?.(row) || action.isPending?.(row)
                }
                destructive={action.variant === "destructive" ? true : undefined}
              >
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 4: Create barrel export**

```typescript
// src/components/data-grid/index.ts
export { DataGrid } from "./data-grid"
export type {
  DataGridColumn,
  DataGridProps,
  DataGridSortState,
  DataGridBulkAction,
  DataGridRowAction,
  DataGridEmptyState,
  DataGridPaginationState,
} from "./data-grid.types"
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/data-grid/__tests__/data-grid.test.tsx`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/components/data-grid/
git commit -m "feat(data-grid): add DataGrid component with sort, pagination, selection, bulk actions"
```

---

## Task 3: DataGrid — Selection and Bulk Action Tests

**Files:**
- Modify: `src/components/data-grid/__tests__/data-grid.test.tsx`

**Step 1: Add selection and bulk action tests**

Append to the existing test file:

```typescript
describe("selection", () => {
  it("renders checkboxes when selectable is true", () => {
    render(<DataGrid columns={testColumns} data={testData} selectable />)
    const checkboxes = screen.getAllByRole("checkbox")
    // 1 header + 3 rows
    expect(checkboxes).toHaveLength(4)
  })

  it("does not render checkboxes when selectable is false", () => {
    render(<DataGrid columns={testColumns} data={testData} />)
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("selects a row when its checkbox is clicked", async () => {
    const user = userEvent.setup()
    render(<DataGrid columns={testColumns} data={testData} selectable />)
    const checkboxes = screen.getAllByRole("checkbox")
    // Click the first row checkbox (index 1, since index 0 is header)
    await user.click(checkboxes[1])
    expect(checkboxes[1]).toBeChecked()
  })

  it("selects all rows when header checkbox is clicked", async () => {
    const user = userEvent.setup()
    render(<DataGrid columns={testColumns} data={testData} selectable />)
    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0]) // header checkbox
    // All row checkboxes should be checked
    expect(checkboxes[1]).toBeChecked()
    expect(checkboxes[2]).toBeChecked()
    expect(checkboxes[3]).toBeChecked()
  })

  it("shows bulk action buttons when rows are selected", async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        selectable
        bulkActions={[
          { label: "Approve", onAction },
        ]}
      />
    )
    // No bulk actions visible initially
    expect(screen.queryByText("Approve")).not.toBeInTheDocument()
    // Select a row
    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[1])
    // Now bulk actions visible
    expect(screen.getByText("Approve")).toBeInTheDocument()
    expect(screen.getByText("1 selected")).toBeInTheDocument()
  })

  it("calls bulk action with selected rows", async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        selectable
        bulkActions={[{ label: "Delete", onAction }]}
      />
    )
    // Select first row
    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[1])
    // Click bulk action
    await user.click(screen.getByText("Delete"))
    expect(onAction).toHaveBeenCalledWith([testData[0]])
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/components/data-grid/__tests__/data-grid.test.tsx`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/components/data-grid/__tests__/data-grid.test.tsx
git commit -m "test(data-grid): add selection and bulk action tests"
```

---

## Task 4: DataGrid — Sort, Pagination, Row Actions, Column Visibility Tests

**Files:**
- Modify: `src/components/data-grid/__tests__/data-grid.test.tsx`

**Step 1: Add remaining feature tests**

```typescript
describe("sorting", () => {
  it("renders sort buttons for sortable columns", () => {
    const sortableColumns: DataGridColumn<TestRow>[] = [
      { id: "name", label: "Name", cell: (r) => r.name, sortable: true },
      { id: "status", label: "Status", cell: (r) => r.status },
    ]
    render(
      <DataGrid
        columns={sortableColumns}
        data={testData}
        sort={{ field: "name", direction: "asc" }}
        onSortChange={vi.fn()}
      />
    )
    // Name should have a sort button, Status should not
    expect(screen.getByRole("button", { name: /name/i })).toBeInTheDocument()
  })

  it("calls onSortChange when sort button is clicked", async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    const sortableColumns: DataGridColumn<TestRow>[] = [
      { id: "name", label: "Name", cell: (r) => r.name, sortable: true },
    ]
    render(
      <DataGrid
        columns={sortableColumns}
        data={testData}
        sort={{ field: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />
    )
    await user.click(screen.getByRole("button", { name: /name/i }))
    expect(onSortChange).toHaveBeenCalledWith({
      field: "name",
      direction: "desc",
    })
  })
})

describe("pagination", () => {
  it("renders pagination controls when handlers are provided", () => {
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        hasMore
      />
    )
    expect(screen.getByLabelText("Previous page")).toBeInTheDocument()
    expect(screen.getByLabelText("Next page")).toBeInTheDocument()
  })

  it("disables prev button on first page", () => {
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        isFirstPage
        hasMore
      />
    )
    expect(screen.getByLabelText("Previous page")).toBeDisabled()
  })

  it("disables next button when hasMore is false", () => {
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        hasMore={false}
      />
    )
    expect(screen.getByLabelText("Next page")).toBeDisabled()
  })

  it("calls onNextPage with last row id", async () => {
    const user = userEvent.setup()
    const onNextPage = vi.fn()
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        onNextPage={onNextPage}
        onPrevPage={vi.fn()}
        hasMore
      />
    )
    await user.click(screen.getByLabelText("Next page"))
    expect(onNextPage).toHaveBeenCalledWith("3") // last row's id
  })

  it("shows row count", () => {
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
      />
    )
    expect(screen.getByText("3 rows")).toBeInTheDocument()
  })
})

describe("row actions", () => {
  it("renders action menu button per row", () => {
    render(
      <DataGrid
        columns={testColumns}
        data={testData}
        rowActions={[
          { label: "View", onClick: vi.fn() },
        ]}
      />
    )
    const actionButtons = screen.getAllByLabelText(/actions for row/i)
    expect(actionButtons).toHaveLength(3)
  })
})

describe("column visibility", () => {
  it("renders column visibility toggle for hideable columns", () => {
    const cols: DataGridColumn<TestRow>[] = [
      { id: "name", label: "Name", cell: (r) => r.name, hideable: true },
      { id: "status", label: "Status", cell: (r) => r.status, hideable: true },
      { id: "amount", label: "Amount", cell: (r) => `£${r.amount}` },
    ]
    render(<DataGrid columns={cols} data={testData} />)
    expect(
      screen.getByLabelText("Toggle column visibility")
    ).toBeInTheDocument()
  })

  it("does not render column toggle when no columns are hideable", () => {
    render(<DataGrid columns={testColumns} data={testData} />)
    expect(
      screen.queryByLabelText("Toggle column visibility")
    ).not.toBeInTheDocument()
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/components/data-grid/__tests__/data-grid.test.tsx`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/components/data-grid/__tests__/data-grid.test.tsx
git commit -m "test(data-grid): add sort, pagination, row actions, column visibility tests"
```

---

## Task 5: StatCard Component

**Files:**
- Create: `src/components/stat-card/stat-card.types.ts`
- Create: `src/components/stat-card/stat-card.tsx`
- Create: `src/components/stat-card/__tests__/stat-card.test.tsx`
- Create: `src/components/stat-card/index.ts`

**Step 1: Create type definitions**

```typescript
// src/components/stat-card/stat-card.types.ts
import type { LucideIcon } from "lucide-react"

export interface StatCardProps {
  /** The metric label (e.g. "Total Bookings") */
  label: string
  /** The primary value to display (e.g. "1,234" or "£5,600") */
  value: string | number
  /** Optional icon to display */
  icon?: LucideIcon
  /** Trend percentage (positive = up, negative = down) */
  trend?: number
  /** Description of comparison period (e.g. "vs last month") */
  trendLabel?: string
  /** Optional secondary value (e.g. "124 this week") */
  description?: string
  /** Loading state */
  isLoading?: boolean
  /** Additional class name */
  className?: string
}
```

**Step 2: Write failing tests**

```typescript
// src/components/stat-card/__tests__/stat-card.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatCard } from "../stat-card"
import { Calendar } from "lucide-react"

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Bookings" value="1,234" />)
    expect(screen.getByText("Total Bookings")).toBeInTheDocument()
    expect(screen.getByText("1,234")).toBeInTheDocument()
  })

  it("renders numeric value", () => {
    render(<StatCard label="Revenue" value={5600} />)
    expect(screen.getByText("5600")).toBeInTheDocument()
  })

  it("renders positive trend with up indicator", () => {
    render(
      <StatCard label="Bookings" value="100" trend={12.5} trendLabel="vs last month" />
    )
    expect(screen.getByText("+12.5%")).toBeInTheDocument()
    expect(screen.getByText("vs last month")).toBeInTheDocument()
  })

  it("renders negative trend with down indicator", () => {
    render(
      <StatCard label="Bookings" value="100" trend={-8.3} trendLabel="vs last month" />
    )
    expect(screen.getByText("-8.3%")).toBeInTheDocument()
  })

  it("renders zero trend as neutral", () => {
    render(<StatCard label="Bookings" value="100" trend={0} />)
    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    render(
      <StatCard label="Revenue" value="£5,600" description="124 bookings this week" />
    )
    expect(screen.getByText("124 bookings this week")).toBeInTheDocument()
  })

  it("renders loading skeleton when isLoading is true", () => {
    render(<StatCard label="Revenue" value="£5,600" isLoading />)
    expect(screen.queryByText("£5,600")).not.toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(<StatCard label="Bookings" value="100" icon={Calendar} />)
    // Icon is rendered as aria-hidden SVG — just verify the card renders
    expect(screen.getByText("Bookings")).toBeInTheDocument()
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/stat-card/__tests__/stat-card.test.tsx`
Expected: FAIL — module not found

**Step 4: Implement StatCard**

```typescript
// src/components/stat-card/stat-card.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { StatCardProps } from "./stat-card.types"

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  isLoading = false,
  className,
}: StatCardProps) {
  const trendDirection =
    trend === undefined
      ? null
      : trend > 0
        ? "up"
        : trend < 0
          ? "down"
          : "neutral"

  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : Minus

  const trendText =
    trend === undefined
      ? null
      : trend > 0
        ? `+${trend}%`
        : trend === 0
          ? "0%"
          : `${trend}%`

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {value}
              </p>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Trend + description */}
        {!isLoading && (trendDirection || description) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {trendDirection && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trendDirection === "up" && "text-success",
                  trendDirection === "down" && "text-destructive",
                  trendDirection === "neutral" && "text-muted-foreground"
                )}
              >
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                {trendText}
              </span>
            )}
            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
            {description && !trendLabel && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
        {!isLoading && description && trendLabel && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 5: Create barrel export**

```typescript
// src/components/stat-card/index.ts
export { StatCard } from "./stat-card"
export type { StatCardProps } from "./stat-card.types"
```

**Step 6: Run tests**

Run: `npx vitest run src/components/stat-card/__tests__/stat-card.test.tsx`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/components/stat-card/
git commit -m "feat(stat-card): add StatCard component with trend, icon, and loading state"
```

---

## Task 6: StatusPipeline Component

**Files:**
- Create: `src/components/status-pipeline/status-pipeline.types.ts`
- Create: `src/components/status-pipeline/status-pipeline.tsx`
- Create: `src/components/status-pipeline/__tests__/status-pipeline.test.tsx`
- Create: `src/components/status-pipeline/index.ts`

**Step 1: Create type definitions**

```typescript
// src/components/status-pipeline/status-pipeline.types.ts

export interface PipelineStage {
  /** Unique identifier for this stage */
  id: string
  /** Display label */
  label: string
  /** Optional color variant */
  variant?: "default" | "success" | "warning" | "destructive" | "info"
}

export interface StatusPipelineProps {
  /** The ordered list of stages in the pipeline */
  stages: PipelineStage[]
  /** The id of the current/active stage */
  currentStageId: string
  /** Size variant */
  size?: "sm" | "md"
  /** Additional class name */
  className?: string
}
```

**Step 2: Write failing tests**

```typescript
// src/components/status-pipeline/__tests__/status-pipeline.test.tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusPipeline } from "../status-pipeline"
import type { PipelineStage } from "../status-pipeline.types"

const invoiceStages: PipelineStage[] = [
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent", variant: "info" },
  { id: "viewed", label: "Viewed", variant: "info" },
  { id: "paid", label: "Paid", variant: "success" },
]

describe("StatusPipeline", () => {
  it("renders all stage labels", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="sent" />)
    expect(screen.getByText("Draft")).toBeInTheDocument()
    expect(screen.getByText("Sent")).toBeInTheDocument()
    expect(screen.getByText("Viewed")).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("marks the current stage as active", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="sent" />)
    const sent = screen.getByText("Sent").closest("[data-stage]")
    expect(sent).toHaveAttribute("data-state", "active")
  })

  it("marks stages before current as completed", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="viewed" />)
    const draft = screen.getByText("Draft").closest("[data-stage]")
    const sent = screen.getByText("Sent").closest("[data-stage]")
    expect(draft).toHaveAttribute("data-state", "completed")
    expect(sent).toHaveAttribute("data-state", "completed")
  })

  it("marks stages after current as pending", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="sent" />)
    const viewed = screen.getByText("Viewed").closest("[data-stage]")
    const paid = screen.getByText("Paid").closest("[data-stage]")
    expect(viewed).toHaveAttribute("data-state", "pending")
    expect(paid).toHaveAttribute("data-state", "pending")
  })

  it("handles first stage as current", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="draft" />)
    const draft = screen.getByText("Draft").closest("[data-stage]")
    expect(draft).toHaveAttribute("data-state", "active")
  })

  it("handles last stage as current", () => {
    render(<StatusPipeline stages={invoiceStages} currentStageId="paid" />)
    const paid = screen.getByText("Paid").closest("[data-stage]")
    expect(paid).toHaveAttribute("data-state", "active")
    // All others should be completed
    const draft = screen.getByText("Draft").closest("[data-stage]")
    expect(draft).toHaveAttribute("data-state", "completed")
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/status-pipeline/__tests__/status-pipeline.test.tsx`
Expected: FAIL — module not found

**Step 4: Implement StatusPipeline**

```typescript
// src/components/status-pipeline/status-pipeline.tsx
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import type { StatusPipelineProps, PipelineStage } from "./status-pipeline.types"

const variantColors: Record<
  NonNullable<PipelineStage["variant"]>,
  { active: string; completed: string }
> = {
  default: {
    active: "bg-foreground text-background",
    completed: "bg-foreground/20 text-foreground",
  },
  success: {
    active: "bg-success text-success-foreground",
    completed: "bg-success/20 text-success",
  },
  warning: {
    active: "bg-warning text-warning-foreground",
    completed: "bg-warning/20 text-warning",
  },
  destructive: {
    active: "bg-destructive text-destructive-foreground",
    completed: "bg-destructive/20 text-destructive",
  },
  info: {
    active: "bg-info text-info-foreground",
    completed: "bg-info/20 text-info",
  },
}

export function StatusPipeline({
  stages,
  currentStageId,
  size = "md",
  className,
}: StatusPipelineProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="list"
      aria-label="Status pipeline"
    >
      {stages.map((stage, idx) => {
        const state: "completed" | "active" | "pending" =
          idx < currentIndex
            ? "completed"
            : idx === currentIndex
              ? "active"
              : "pending"

        const variant = stage.variant ?? "default"
        const colors = variantColors[variant]

        return (
          <div key={stage.id} className="flex items-center gap-1">
            {/* Connector line (not before first stage) */}
            {idx > 0 && (
              <div
                className={cn(
                  "h-px",
                  size === "sm" ? "w-4" : "w-6",
                  state === "pending"
                    ? "bg-border"
                    : "bg-foreground/30"
                )}
                aria-hidden="true"
              />
            )}

            {/* Stage pill */}
            <div
              data-stage={stage.id}
              data-state={state}
              role="listitem"
              className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
                size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
                state === "active" && colors.active,
                state === "completed" && colors.completed,
                state === "pending" && "bg-muted text-muted-foreground"
              )}
            >
              {state === "completed" && (
                <Check
                  className={cn(
                    size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
                  )}
                  aria-hidden="true"
                />
              )}
              {stage.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 5: Create barrel export**

```typescript
// src/components/status-pipeline/index.ts
export { StatusPipeline } from "./status-pipeline"
export type { StatusPipelineProps, PipelineStage } from "./status-pipeline.types"
```

**Step 6: Run tests**

Run: `npx vitest run src/components/status-pipeline/__tests__/status-pipeline.test.tsx`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/components/status-pipeline/
git commit -m "feat(status-pipeline): add StatusPipeline component with stage tracking"
```

---

## Task 7: Refactor BookingsTable to Use DataGrid

**Files:**
- Modify: `src/components/bookings/bookings-table.tsx`
- Modify: `src/components/bookings/bookings-table.tsx` — reduce from ~960 lines to ~180 lines

This task validates that the DataGrid is genuinely useful by replacing the largest table component with it.

**Step 1: Rewrite BookingsTable using DataGrid**

The new file should import `DataGrid` and define columns + actions declaratively. The 800+ lines of sort logic, selection, pagination, column visibility, CSV export, and skeleton rendering all go away — DataGrid handles them.

```typescript
"use client"

import { useState, useMemo } from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { DataGrid } from "@/components/data-grid"
import type { DataGridColumn, DataGridRowAction, DataGridBulkAction, DataGridSortState } from "@/components/data-grid"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import BookingStatusBadge from "@/components/bookings/booking-status-badge"
import type { BookingRecord } from "@/modules/booking/booking.types"
import { Eye, CheckCircle, XCircle, CalendarClock, CheckSquare, X } from "lucide-react"
import type { BookingFilters } from "@/components/bookings/bookings-filters"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDateTime(date: Date | string, time: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  return `${dateStr} at ${time}`
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "yesterday"
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} months ago`
  return `${Math.floor(diffMonths / 12)} years ago`
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: DataGridColumn<BookingRecord>[] = [
  {
    id: "status",
    label: "Status",
    hideable: true,
    sortable: true,
    width: "w-28",
    cell: (row) => <BookingStatusBadge status={row.status} />,
    csvValue: (row) => row.status,
  },
  {
    id: "customer",
    label: "Customer",
    hideable: true,
    width: "min-w-[160px]",
    cell: (row) => (
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-6 w-6 shrink-0 text-[10px]">
          <AvatarFallback>{getInitials(row.customerName ?? "?")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.customerName ?? "Unknown customer"}
          </p>
          <p className="truncate text-xs text-muted-foreground">#{row.bookingNumber}</p>
        </div>
      </div>
    ),
    csvValue: (row) => row.customerName ?? row.customerId,
  },
  {
    id: "service",
    label: "Service",
    hideable: true,
    cell: (row) => (
      <span className="text-sm text-foreground">
        {row.customServiceName ?? row.serviceName ?? "Unknown service"}
      </span>
    ),
    csvValue: (row) => row.customServiceName ?? row.serviceName ?? row.serviceId,
  },
  {
    id: "staff",
    label: "Staff",
    hideable: true,
    cell: (row) =>
      row.staffId ? (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0 text-[10px]">
            <AvatarImage src={row.staffAvatarUrl ?? undefined} alt={row.staffName ?? "Staff"} />
            <AvatarFallback>{getInitials(row.staffName ?? "?")}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-foreground">{row.staffName ?? "Unknown staff"}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      ),
    csvValue: (row) => row.staffName ?? "",
  },
  {
    id: "datetime",
    label: "Date / Time",
    hideable: true,
    sortable: true,
    width: "min-w-[160px]",
    cell: (row) => (
      <span className="text-sm text-foreground">
        {formatDateTime(row.scheduledDate, row.scheduledTime)}
      </span>
    ),
    csvValue: (row) =>
      `${new Date(row.scheduledDate).toISOString().slice(0, 10)} ${row.scheduledTime}`,
  },
  {
    id: "created",
    label: "Created",
    hideable: true,
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(row.createdAt)}
      </span>
    ),
    csvValue: (row) => new Date(row.createdAt).toISOString(),
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BookingsTableProps {
  filters: BookingFilters
  onRowClick: (bookingId: string) => void
}

export function BookingsTable({ filters, onRowClick }: BookingsTableProps) {
  const utils = api.useUtils()

  // Pagination state
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])
  const [sort, setSort] = useState<DataGridSortState>({ field: "datetime", direction: "desc" })

  const debouncedSearch = useDebounce(filters.search, 300)

  // Build query input
  const queryInput = useMemo(() => {
    const input: Record<string, unknown> = { limit: filters.limit, cursor: currentCursor }
    if (debouncedSearch) input.search = debouncedSearch
    if (filters.staffId) input.staffId = filters.staffId
    if (filters.dateFrom) input.startDate = new Date(filters.dateFrom + "T00:00:00")
    if (filters.dateTo) input.endDate = new Date(filters.dateTo + "T23:59:59")
    if (filters.statuses.length === 1) input.status = filters.statuses[0]
    return input
  }, [filters, debouncedSearch, currentCursor])

  const { data, isLoading, error } = api.booking.list.useQuery(queryInput as any, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const rows: BookingRecord[] = (data as any)?.rows ?? []
  const hasMore: boolean = (data as any)?.hasMore ?? false

  // Client-side multi-status filter
  const displayRows = useMemo(() => {
    if (filters.statuses.length <= 1) return rows
    return rows.filter((r) => filters.statuses.includes(r.status))
  }, [rows, filters.statuses])

  // Mutations
  const confirmMutation = api.approval.approveBooking.useMutation({
    onSuccess: () => { toast.success("Booking confirmed"); void utils.booking.list.invalidate() },
    onError: (err) => toast.error(err.message ?? "Failed to confirm booking"),
  })

  const cancelMutation = api.booking.cancel.useMutation({
    onSuccess: () => { toast.success("Booking cancelled"); void utils.booking.list.invalidate() },
    onError: (err) => toast.error(err.message ?? "Failed to cancel booking"),
  })

  // Row actions
  const rowActions: DataGridRowAction<BookingRecord>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row) => onRowClick(row.id),
    },
    {
      label: "Confirm",
      icon: CheckCircle,
      onClick: (row) => confirmMutation.mutate({ bookingId: row.id }),
      isVisible: (row) => ["PENDING", "APPROVED", "RESERVED"].includes(row.status),
      isPending: (row) => confirmMutation.isPending && confirmMutation.variables?.bookingId === row.id,
    },
    {
      label: "Reschedule",
      icon: CalendarClock,
      onClick: () => {},
      isDisabled: () => true,
    },
    {
      label: "Cancel",
      icon: XCircle,
      variant: "destructive",
      separator: true,
      onClick: (row) => cancelMutation.mutate({ id: row.id }),
      isVisible: (row) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(row.status),
      isPending: (row) => cancelMutation.isPending && cancelMutation.variables?.id === row.id,
    },
  ]

  // Bulk actions
  const bulkActions: DataGridBulkAction<BookingRecord>[] = [
    {
      label: "Approve",
      icon: CheckSquare,
      isPending: confirmMutation.isPending,
      onAction: (selected) => {
        const toApprove = selected.filter((r) => ["PENDING", "APPROVED", "RESERVED"].includes(r.status))
        if (toApprove.length === 0) { toast.info("No bookings can be approved"); return }
        toApprove.forEach((r) => confirmMutation.mutate({ bookingId: r.id }))
        toast.success(`Approving ${toApprove.length} bookings...`)
      },
    },
    {
      label: "Cancel",
      icon: X,
      variant: "destructive",
      isPending: cancelMutation.isPending,
      onAction: (selected) => {
        const toCancel = selected.filter((r) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(r.status))
        if (toCancel.length === 0) { toast.info("No bookings can be cancelled"); return }
        toCancel.forEach((r) => cancelMutation.mutate({ id: r.id }))
        toast.success(`Cancelling ${toCancel.length} bookings...`)
      },
    },
  ]

  return (
    <DataGrid
      columns={columns}
      data={displayRows}
      hasMore={hasMore}
      isLoading={isLoading}
      error={error?.message}
      onRowClick={(row) => onRowClick(row.id)}
      sort={sort}
      onSortChange={setSort}
      pageSize={filters.limit}
      onNextPage={(cursor) => {
        setCursorStack((prev) => [...prev, currentCursor ?? ""])
        setCurrentCursor(cursor)
      }}
      onPrevPage={() => {
        const newStack = [...cursorStack]
        const prev = newStack.pop()
        setCursorStack(newStack)
        setCurrentCursor(prev === "" ? undefined : prev)
      }}
      isFirstPage={cursorStack.length === 0}
      selectable
      bulkActions={bulkActions}
      rowActions={rowActions}
      emptyState={{
        title: "No bookings found",
        description: "Try adjusting your filters or create a new booking.",
      }}
      csvFilename="bookings.csv"
    />
  )
}

export default BookingsTable
```

**Step 2: Verify the app still compiles**

Run: `npx tsc --noEmit`
Expected: No errors

Note: The refactored BookingsTable is now ~180 lines vs the original ~960 lines. All the table infrastructure (sort, selection, pagination, column visibility, CSV export, skeletons) is handled by DataGrid. The domain component only defines columns, actions, and data fetching.

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All existing tests + new DataGrid/StatCard/StatusPipeline tests pass

**Step 4: Commit**

```bash
git add src/components/bookings/bookings-table.tsx
git commit -m "refactor(bookings): rewrite BookingsTable using DataGrid component (960 → 180 lines)"
```

---

## Task 8: Final Verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, no regressions

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify new component exports are accessible**

Confirm these imports work:
- `import { DataGrid } from "@/components/data-grid"`
- `import { StatCard } from "@/components/stat-card"`
- `import { StatusPipeline } from "@/components/status-pipeline"`

**Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any issues from component library integration"
```
