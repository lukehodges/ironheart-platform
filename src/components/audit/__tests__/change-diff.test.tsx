import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChangeDiff } from "../change-diff"

describe("ChangeDiff", () => {
  describe("Rendering", () => {
    it("renders empty state when no changes provided", () => {
      render(<ChangeDiff changes={[]} />)
      expect(screen.getByText("No changes to display")).toBeInTheDocument()
    })

    it("renders card with changes count in header", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("Changes (1)")).toBeInTheDocument()
    })

    it("displays multiple changes with correct count", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
        { field: "notes", before: "old notes", after: "new notes" },
        { field: "amount", before: 100, after: 150 },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("Changes (3)")).toBeInTheDocument()
    })
  })

  describe("Change Display", () => {
    it("displays field name for each change", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
        { field: "notes", before: "old", after: "new" },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("status")).toBeInTheDocument()
      expect(screen.getByText("notes")).toBeInTheDocument()
    })

    it("shows before and after values for string changes", () => {
      const changes = [
        { field: "description", before: "old value", after: "new value" },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("Before")).toBeInTheDocument()
      expect(screen.getByText("After")).toBeInTheDocument()
      expect(screen.getByText("old value")).toBeInTheDocument()
      expect(screen.getByText("new value")).toBeInTheDocument()
    })

    it("displays boolean values as true/false strings", () => {
      const changes = [
        { field: "isActive", before: false, after: true },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("false")).toBeInTheDocument()
      expect(screen.getByText("true")).toBeInTheDocument()
    })

    it("displays numeric values correctly", () => {
      const changes = [
        { field: "amount", before: 100, after: 250.5 },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("100")).toBeInTheDocument()
      expect(screen.getByText("250.5")).toBeInTheDocument()
    })

    it("handles null and undefined values", () => {
      const changes = [
        { field: "optional", before: null, after: "value" },
        { field: "removed", before: "value", after: undefined },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getAllByText("null")).toHaveLength(1)
      expect(screen.getAllByText("undefined")).toHaveLength(1)
    })
  })

  describe("Complex Types", () => {
    it("formats objects as JSON in code block", () => {
      const changes = [
        {
          field: "config",
          before: { key: "old" },
          after: { key: "new", extra: true },
        },
      ]
      render(<ChangeDiff changes={changes} />)
      // Check that JSON.stringify is used
      const preElements = screen.getAllByText(/key/)
      expect(preElements.length).toBeGreaterThan(0)
    })

    it("formats arrays as JSON in code block", () => {
      const changes = [
        {
          field: "items",
          before: ["a", "b"],
          after: ["a", "b", "c"],
        },
      ]
      render(<ChangeDiff changes={changes} />)
      // Verify array is rendered
      const preElements = document.querySelectorAll("pre")
      expect(preElements.length).toBeGreaterThan(0)
    })

    it("shows type indicators for complex values", () => {
      const changes = [
        {
          field: "data",
          before: { nested: true },
          after: ["array", "of", "items"],
        },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText(/object/)).toBeInTheDocument()
      expect(screen.getByText(/array/)).toBeInTheDocument()
    })
  })

  describe("Color Coding", () => {
    it("displays Removed badge for before values", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} />)
      const badges = screen.getAllByText("Removed")
      expect(badges.length).toBeGreaterThan(0)
    })

    it("displays Added badge for after values", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} />)
      const badges = screen.getAllByText("Added")
      expect(badges.length).toBeGreaterThan(0)
    })

    it("shows only Added badge when before is null", () => {
      const changes = [
        { field: "notes", before: null, after: "new note" },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("Added")).toBeInTheDocument()
      expect(screen.queryByText("Removed")).not.toBeInTheDocument()
    })

    it("shows only Removed badge when after is undefined", () => {
      const changes = [
        { field: "legacy", before: "old value", after: undefined },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("Removed")).toBeInTheDocument()
      expect(screen.queryByText("Added")).not.toBeInTheDocument()
    })
  })

  describe("Expand/Collapse", () => {
    it("renders expanded by default", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} isExpanded={true} />)
      expect(screen.getByText("status")).toBeInTheDocument()
    })

    it("hides content when isExpanded is false", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} isExpanded={false} />)
      expect(screen.queryByText("status")).not.toBeInTheDocument()
      expect(screen.getByText("1 field changed")).toBeInTheDocument()
    })

    it("shows correct field count message when collapsed", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
        { field: "notes", before: "old", after: "new" },
      ]
      render(<ChangeDiff changes={changes} isExpanded={false} />)
      expect(screen.getByText("2 fields changed")).toBeInTheDocument()
    })

    it("calls onExpandChange when header is clicked", async () => {
      const onExpandChange = vi.fn()
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      const { rerender } = render(
        <ChangeDiff
          changes={changes}
          isExpanded={true}
          onExpandChange={onExpandChange}
        />
      )

      const header = screen.getByRole("button")
      await userEvent.click(header)

      expect(onExpandChange).toHaveBeenCalledWith(false)
    })

    it("calls onExpandChange with correct value on second toggle", async () => {
      const onExpandChange = vi.fn()
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(
        <ChangeDiff
          changes={changes}
          isExpanded={false}
          onExpandChange={onExpandChange}
        />
      )

      const header = screen.getByRole("button")
      await userEvent.click(header)

      expect(onExpandChange).toHaveBeenCalledWith(true)
    })

    it("supports keyboard navigation for expand/collapse", async () => {
      const onExpandChange = vi.fn()
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(
        <ChangeDiff
          changes={changes}
          isExpanded={true}
          onExpandChange={onExpandChange}
        />
      )

      const header = screen.getByRole("button")
      header.focus()

      await userEvent.keyboard("{Enter}")
      expect(onExpandChange).toHaveBeenCalledWith(false)

      onExpandChange.mockClear()

      await userEvent.keyboard("{Space}")
      expect(onExpandChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Responsive Layout", () => {
    it("renders with appropriate structure for display", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      const { container } = render(<ChangeDiff changes={changes} />)

      // Should have card structure
      const card = container.querySelector("[class*='rounded-xl']")
      expect(card).toBeInTheDocument()

      // Should have field name in header
      expect(screen.getByText("status")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty string changes", () => {
      const changes = [
        { field: "description", before: "", after: "new description" },
        { field: "notes", before: "old notes", after: "" },
      ]
      render(<ChangeDiff changes={changes} />)
      // Empty strings should be handled gracefully
      expect(screen.getByText("description")).toBeInTheDocument()
      expect(screen.getByText("notes")).toBeInTheDocument()
    })

    it("handles very long values without breaking layout", () => {
      const longValue = "a".repeat(500)
      const changes = [
        { field: "content", before: longValue, after: "short" },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("content")).toBeInTheDocument()
    })

    it("handles special characters in values", () => {
      const changes = [
        {
          field: "description",
          before: 'Special <chars> & "quotes"',
          after: "Normal text",
        },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("description")).toBeInTheDocument()
    })

    it("handles nested objects with many levels", () => {
      const changes = [
        {
          field: "config",
          before: { level1: { level2: { level3: "deep" } } },
          after: { level1: { level2: { level3: "updated", new: true } } },
        },
      ]
      render(<ChangeDiff changes={changes} />)
      expect(screen.getByText("config")).toBeInTheDocument()
    })

    it("handles circular reference gracefully", () => {
      const obj: any = { name: "test" }
      obj.self = obj // Create circular reference
      const changes = [
        { field: "circular", before: obj, after: { name: "test" } },
      ]
      // Should not crash, JSON.stringify has try-catch
      expect(() => render(<ChangeDiff changes={changes} />)).not.toThrow()
    })
  })

  describe("Accessibility", () => {
    it("has proper heading structure for changes count", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} />)
      // Header should be readable
      expect(screen.getByText("Changes (1)")).toBeInTheDocument()
    })

    it("provides aria-label for expand/collapse button", () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      const { rerender } = render(
        <ChangeDiff changes={changes} isExpanded={true} />
      )

      let button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label")

      rerender(<ChangeDiff changes={changes} isExpanded={false} />)
      button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-label")
    })

    it("is keyboard navigable", async () => {
      const changes = [
        { field: "status", before: "pending", after: "confirmed" },
      ]
      render(<ChangeDiff changes={changes} />)

      const button = screen.getByRole("button")
      button.focus()

      expect(button).toHaveFocus()
    })
  })
})
