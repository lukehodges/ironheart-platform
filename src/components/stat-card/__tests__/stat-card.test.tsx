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
    render(<StatCard label="Bookings" value="100" trend={12.5} trendLabel="vs last month" />)
    expect(screen.getByText("+12.5%")).toBeInTheDocument()
    expect(screen.getByText("vs last month")).toBeInTheDocument()
  })

  it("renders negative trend with down indicator", () => {
    render(<StatCard label="Bookings" value="100" trend={-8.3} trendLabel="vs last month" />)
    expect(screen.getByText("-8.3%")).toBeInTheDocument()
  })

  it("renders zero trend as neutral", () => {
    render(<StatCard label="Bookings" value="100" trend={0} />)
    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    render(<StatCard label="Revenue" value="£5,600" description="124 bookings this week" />)
    expect(screen.getByText("124 bookings this week")).toBeInTheDocument()
  })

  it("renders loading skeleton when isLoading is true", () => {
    render(<StatCard label="Revenue" value="£5,600" isLoading />)
    expect(screen.queryByText("£5,600")).not.toBeInTheDocument()
    expect(screen.getByText("Revenue")).toBeInTheDocument()
  })

  it("renders icon when provided", () => {
    render(<StatCard label="Bookings" value="100" icon={Calendar} />)
    expect(screen.getByText("Bookings")).toBeInTheDocument()
  })
})
