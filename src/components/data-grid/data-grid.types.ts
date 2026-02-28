import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export interface DataGridColumn<T> {
  id: string
  label: string
  hideable?: boolean
  sortable?: boolean
  width?: string
  cell: (row: T) => ReactNode
  header?: () => ReactNode
  csvValue?: (row: T) => string
}

export interface DataGridSortState {
  field: string
  direction: "asc" | "desc"
}

export interface DataGridPaginationState {
  cursor: string | undefined
  cursorStack: string[]
  limit: number
}

export interface DataGridBulkAction<T> {
  label: string
  icon?: LucideIcon
  variant?: "default" | "destructive"
  onAction: (selectedRows: T[]) => void
  isPending?: boolean
  isApplicable?: (row: T) => boolean
}

export interface DataGridRowAction<T> {
  label: string
  icon?: LucideIcon
  variant?: "default" | "destructive"
  onClick: (row: T) => void
  isVisible?: (row: T) => boolean
  isDisabled?: (row: T) => boolean
  isPending?: (row: T) => boolean
  separator?: boolean
}

export interface DataGridEmptyState {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface DataGridProps<T extends { id: string }> {
  columns: DataGridColumn<T>[]
  data: T[]
  hasMore?: boolean
  isLoading?: boolean
  error?: string | null
  onRowClick?: (row: T) => void
  sort?: DataGridSortState
  onSortChange?: (sort: DataGridSortState) => void
  pageSizeOptions?: number[]
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  onNextPage?: (cursor: string) => void
  onPrevPage?: () => void
  isFirstPage?: boolean
  selectable?: boolean
  bulkActions?: DataGridBulkAction<T>[]
  rowActions?: DataGridRowAction<T>[]
  emptyState?: DataGridEmptyState
  csvFilename?: string
  className?: string
}
