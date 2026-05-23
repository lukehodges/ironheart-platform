import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { FileText } from "lucide-react"
import { ActionCard } from "../action-card"

describe("ActionCard", () => {
  const defaultProps = {
    icon: FileText,
    title: "View documents",
    subtitle: "Access your audit deliverables.",
    href: "/acme/dashboard/documents",
  }

  it("renders title", () => {
    render(<ActionCard {...defaultProps} />)
    expect(screen.getByTestId("action-card-title")).toHaveTextContent(
      "View documents"
    )
  })

  it("renders subtitle", () => {
    render(<ActionCard {...defaultProps} />)
    expect(screen.getByTestId("action-card-subtitle")).toHaveTextContent(
      "Access your audit deliverables."
    )
  })

  it("renders the icon container", () => {
    render(<ActionCard {...defaultProps} />)
    expect(screen.getByTestId("action-card-icon")).toBeInTheDocument()
  })

  it("renders as a link when not disabled", () => {
    render(<ActionCard {...defaultProps} />)
    const link = screen.getByTestId("action-card-link")
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/acme/dashboard/documents")
  })

  it("does not render a link when disabled", () => {
    render(<ActionCard {...defaultProps} disabled />)
    expect(screen.queryByTestId("action-card-link")).not.toBeInTheDocument()
  })

  it("shows disabled state on the card when disabled", () => {
    render(<ActionCard {...defaultProps} disabled />)
    const card = screen.getByTestId("action-card")
    expect(card).toHaveAttribute("data-disabled")
  })

  it("does not show data-disabled when enabled", () => {
    render(<ActionCard {...defaultProps} />)
    const card = screen.getByTestId("action-card")
    expect(card).not.toHaveAttribute("data-disabled")
  })

  it("renders badge when provided", () => {
    render(<ActionCard {...defaultProps} disabled badge="Coming soon" />)
    expect(screen.getByTestId("action-card-badge")).toHaveTextContent(
      "Coming soon"
    )
  })

  it("does not render badge when not provided", () => {
    render(<ActionCard {...defaultProps} />)
    expect(screen.queryByTestId("action-card-badge")).not.toBeInTheDocument()
  })

  it("renders badge text correctly", () => {
    render(<ActionCard {...defaultProps} disabled badge="Soon" />)
    expect(screen.getByTestId("action-card-badge")).toHaveTextContent("Soon")
  })
})
