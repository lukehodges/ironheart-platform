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
  { id: "amount", label: "Amount", cell: (row) => `\u00A3${row.amount}` },
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
      expect(screen.getByText("\u00A3300")).toBeInTheDocument()
    })

    it("calls onRowClick when a row is clicked", async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      render(<DataGrid columns={testColumns} data={testData} onRowClick={onRowClick} />)
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
          emptyState={{ title: "No bookings", description: "Create your first booking" }}
        />
      )
      expect(screen.getByText("No bookings")).toBeInTheDocument()
      expect(screen.getByText("Create your first booking")).toBeInTheDocument()
    })
  })

  describe("error state", () => {
    it("renders error message instead of table", () => {
      render(<DataGrid columns={testColumns} data={[]} error="Failed to load data" />)
      expect(screen.getByText("Failed to load data")).toBeInTheDocument()
    })
  })

  describe("selection", () => {
    it("renders checkboxes when selectable is true", () => {
      render(<DataGrid columns={testColumns} data={testData} selectable />)
      const checkboxes = screen.getAllByRole("checkbox")
      expect(checkboxes).toHaveLength(4) // 1 header + 3 rows
    })

    it("does not render checkboxes when selectable is false", () => {
      render(<DataGrid columns={testColumns} data={testData} />)
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    })

    it("selects a row when its checkbox is clicked", async () => {
      const user = userEvent.setup()
      render(<DataGrid columns={testColumns} data={testData} selectable />)
      const checkboxes = screen.getAllByRole("checkbox")
      await user.click(checkboxes[1])
      expect(checkboxes[1]).toBeChecked()
    })

    it("selects all rows when header checkbox is clicked", async () => {
      const user = userEvent.setup()
      render(<DataGrid columns={testColumns} data={testData} selectable />)
      const checkboxes = screen.getAllByRole("checkbox")
      await user.click(checkboxes[0])
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
          bulkActions={[{ label: "Approve", onAction }]}
        />
      )
      expect(screen.queryByText("Approve")).not.toBeInTheDocument()
      const checkboxes = screen.getAllByRole("checkbox")
      await user.click(checkboxes[1])
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
      const checkboxes = screen.getAllByRole("checkbox")
      await user.click(checkboxes[1])
      await user.click(screen.getByText("Delete"))
      expect(onAction).toHaveBeenCalledWith([testData[0]])
    })
  })

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
      expect(onSortChange).toHaveBeenCalledWith({ field: "name", direction: "desc" })
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
      expect(onNextPage).toHaveBeenCalledWith("3")
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
          rowActions={[{ label: "View", onClick: vi.fn() }]}
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
        { id: "amount", label: "Amount", cell: (r) => `\u00A3${r.amount}` },
      ]
      render(<DataGrid columns={cols} data={testData} />)
      expect(screen.getByLabelText("Toggle column visibility")).toBeInTheDocument()
    })

    it("does not render column toggle when no columns are hideable", () => {
      render(<DataGrid columns={testColumns} data={testData} />)
      expect(screen.queryByLabelText("Toggle column visibility")).not.toBeInTheDocument()
    })
  })
})
