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
    const draft = screen.getByText("Draft").closest("[data-stage]")
    expect(draft).toHaveAttribute("data-state", "completed")
  })
})
