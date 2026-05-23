import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StageStrip } from "../stage-strip"

const ALL_STAGES = [
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
] as const

describe("StageStrip", () => {
  it("renders all 8 stages", () => {
    render(<StageStrip currentStage="ONBOARDING" />)
    for (const stage of ALL_STAGES) {
      expect(screen.getByTestId(`stage-item-${stage}`)).toBeInTheDocument()
    }
  })

  it("highlights the current stage with data-current attribute", () => {
    render(<StageStrip currentStage="AUDITING" />)
    const auditingLabel = screen
      .getByTestId("stage-item-AUDITING")
      .querySelector("[data-current]")
    expect(auditingLabel).not.toBeNull()
  })

  it("does not mark other stages as current when AUDITING is current", () => {
    render(<StageStrip currentStage="AUDITING" />)
    // Non-current stages should not have data-current
    const discoveryItem = screen.getByTestId("stage-item-DISCOVERY")
    expect(discoveryItem.querySelector("[data-current]")).toBeNull()
  })

  it("marks past stages with data-past", () => {
    render(<StageStrip currentStage="REPORTING" />)
    // DISCOVERY, PROPOSAL, CONTRACTED, ONBOARDING, AUDITING are past
    const discoveryLabel = screen
      .getByTestId("stage-item-DISCOVERY")
      .querySelector("[data-past]")
    expect(discoveryLabel).not.toBeNull()

    const auditingLabel = screen
      .getByTestId("stage-item-AUDITING")
      .querySelector("[data-past]")
    expect(auditingLabel).not.toBeNull()
  })

  it("marks future stages with data-future", () => {
    render(<StageStrip currentStage="CONTRACTED" />)
    // ONBOARDING, AUDITING, REPORTING, IMPLEMENTING, RETAINER are future
    const retainerLabel = screen
      .getByTestId("stage-item-RETAINER")
      .querySelector("[data-future]")
    expect(retainerLabel).not.toBeNull()
  })

  it("renders the stage strip container", () => {
    render(<StageStrip currentStage="DISCOVERY" />)
    expect(screen.getByTestId("stage-strip")).toBeInTheDocument()
  })

  it("renders all stage labels as text", () => {
    render(<StageStrip currentStage="DISCOVERY" />)
    expect(screen.getByText("Discovery")).toBeInTheDocument()
    expect(screen.getByText("Proposal")).toBeInTheDocument()
    expect(screen.getByText("Contracted")).toBeInTheDocument()
    expect(screen.getByText("Onboarding")).toBeInTheDocument()
    expect(screen.getByText("Auditing")).toBeInTheDocument()
    expect(screen.getByText("Reporting")).toBeInTheDocument()
    expect(screen.getByText("Implementing")).toBeInTheDocument()
    expect(screen.getByText("Retainer")).toBeInTheDocument()
  })

  it("renders when currentStage is null (no stage highlighted)", () => {
    render(<StageStrip currentStage={null} />)
    expect(screen.getByTestId("stage-strip")).toBeInTheDocument()
    // No stage should be marked current
    for (const stage of ALL_STAGES) {
      const item = screen.getByTestId(`stage-item-${stage}`)
      expect(item.querySelector("[data-current]")).toBeNull()
    }
  })

  it("renders DISCOVERY as current when set", () => {
    render(<StageStrip currentStage="DISCOVERY" />)
    const discoveryLabel = screen
      .getByTestId("stage-item-DISCOVERY")
      .querySelector("[data-current]")
    expect(discoveryLabel).not.toBeNull()
  })

  it("renders RETAINER as current when set", () => {
    render(<StageStrip currentStage="RETAINER" />)
    const retainerLabel = screen
      .getByTestId("stage-item-RETAINER")
      .querySelector("[data-current]")
    expect(retainerLabel).not.toBeNull()

    // All others should be past
    const discoveryLabel = screen
      .getByTestId("stage-item-DISCOVERY")
      .querySelector("[data-past]")
    expect(discoveryLabel).not.toBeNull()
  })
})
