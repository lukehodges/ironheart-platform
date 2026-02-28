import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Column definition for a DataGrid.
 * Each column describes how to render a header, cell content, and optional behaviors
 * like sorting, hiding, and CSV export.
 */
export interface DataGridColumn<T> {
  /** Unique identifier for the column, also used as the sort field key. */
  id: string
  /** Display label shown in the column header and CSV export. */
  label: string
  /** Whether the column can be toggled on/off via the column visibility menu. */
  hideable?: boolean
  /** Whether the column header renders a clickable sort button. Requires `onSortChange` on the grid. */
  sortable?: boolean
  /** Tailwind CSS width class applied to the column header (e.g. "w-10", "w-28", "min-w-[160px]"). */
  width?: string
  /** Render function for the cell content of each row. */
  cell: (row: T) => ReactNode
  /** Optional custom header renderer. Falls back to `label` if not provided. */
  header?: () => ReactNode
  /** If provided, the column is included in CSV exports. Returns the string value for a given row. */
  csvValue?: (row: T) => string
}

/**
 * Represents the current sort state of the DataGrid.
 */
export interface DataGridSortState {
  /** The column `id` being sorted. */
  field: string
  /** Sort direction. */
  direction: "asc" | "desc"
}

/**
 * Cursor-based pagination state for external tracking.
 * The DataGrid itself uses `isFirstPage`, `hasMore`, `onNextPage`, and `onPrevPage` props.
 */
export interface DataGridPaginationState {
  /** The current cursor position (last row id), or undefined for the first page. */
  cursor: string | undefined
  /** Stack of previous cursors for backward navigation. */
  cursorStack: string[]
  /** Number of rows per page. */
  limit: number
}

/**
 * A bulk action that operates on one or more selected rows.
 * Shown in the toolbar when at least one row is selected.
 */
export interface DataGridBulkAction<T> {
  /** Button label displayed in the toolbar. */
  label: string
  /** Optional Lucide icon rendered before the label. */
  icon?: LucideIcon
  /** Button variant. Defaults to "default" (renders as outline). */
  variant?: "default" | "destructive"
  /** Callback invoked with the applicable selected rows when the button is clicked. */
  onAction: (selectedRows: T[]) => void
  /** Whether the action is currently pending (disables the button). */
  isPending?: boolean
  /** Optional predicate to filter which selected rows are eligible for this action. Rows that fail this check are excluded from `onAction`. */
  isApplicable?: (row: T) => boolean
}

/**
 * A per-row action displayed in the row's dropdown menu (three-dot button).
 */
export interface DataGridRowAction<T> {
  /** Menu item label. */
  label: string
  /** Optional Lucide icon rendered before the label. */
  icon?: LucideIcon
  /** Menu item variant. "destructive" renders the item in a warning style. */
  variant?: "default" | "destructive"
  /** Callback invoked when the menu item is clicked. */
  onClick: (row: T) => void
  /** If provided, controls whether the action is visible for a given row. Defaults to always visible. */
  isVisible?: (row: T) => boolean
  /** If provided, controls whether the action is disabled for a given row. */
  isDisabled?: (row: T) => boolean
  /** If provided, indicates the action is pending for a given row (disables the item). */
  isPending?: (row: T) => boolean
  /** If true, renders a separator line above this action in the dropdown menu (when not the first item). */
  separator?: boolean
}

/**
 * Configuration for the empty state displayed when the data array is empty.
 */
export interface DataGridEmptyState {
  /** Optional icon displayed above the title. */
  icon?: LucideIcon
  /** Primary message shown in the empty state. */
  title: string
  /** Optional secondary description text. */
  description?: string
  /** Optional call-to-action button. */
  action?: {
    /** Button label. */
    label: string
    /** Callback invoked when the button is clicked. */
    onClick: () => void
  }
}

/**
 * Props for the DataGrid component.
 * Supports cursor-based pagination, sorting, row selection, bulk/row actions,
 * column visibility toggling, CSV export, and accessible loading/error/empty states.
 *
 * @typeParam T - Row data type. Must have an `id: string` field for selection and pagination.
 */
export interface DataGridProps<T extends { id: string }> {
  /** Column definitions describing header labels, cell renderers, and column behaviors. */
  columns: DataGridColumn<T>[]
  /** Array of row data to display. Each row must have a unique `id` field. */
  data: T[]
  /** Whether there are more rows available after the current page (enables the "Next" button). */
  hasMore?: boolean
  /** Whether the grid is in a loading state. Shows skeleton rows instead of data. */
  isLoading?: boolean
  /** Error message to display. Replaces the entire table with an error state when set. */
  error?: string | null
  /** Callback when a row is clicked. Adds a pointer cursor to rows. */
  onRowClick?: (row: T) => void
  /** Current sort state. Controls which column header shows the active sort indicator. */
  sort?: DataGridSortState
  /** Callback when a sortable column header is clicked. Required to enable sorting UI. */
  onSortChange?: (sort: DataGridSortState) => void
  /** Available page size options shown in the page size selector dropdown. Defaults to [10, 25, 50, 100]. */
  pageSizeOptions?: number[]
  /** Current page size. Used to set the selected value in the page size dropdown. */
  pageSize?: number
  /** Callback when the user changes the page size. Enables the page size selector. */
  onPageSizeChange?: (size: number) => void
  /** Callback when the user clicks "Next page". Receives the last row's `id` as the cursor. */
  onNextPage?: (cursor: string) => void
  /** Callback when the user clicks "Previous page". */
  onPrevPage?: () => void
  /** Whether the current page is the first page (disables the "Previous" button). Defaults to true. */
  isFirstPage?: boolean
  /** Enables row selection checkboxes and the bulk action toolbar. */
  selectable?: boolean
  /** Bulk actions shown in the toolbar when rows are selected. */
  bulkActions?: DataGridBulkAction<T>[]
  /** Per-row actions shown in each row's dropdown menu. */
  rowActions?: DataGridRowAction<T>[]
  /** Custom empty state configuration. Defaults to "No results found" title. */
  emptyState?: DataGridEmptyState
  /** Filename for CSV export. Enables the "Export" button in the toolbar. Appends `.csv` if not present. */
  csvFilename?: string
  /** Additional CSS class name applied to the root container. */
  className?: string
}
