import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TenantDashboardShell } from "../dashboard-shell"

const defaultUser = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
}

const defaultProps = {
  tenantName: "Acme Corp",
  tenantSlug: "acme-corp",
  user: defaultUser,
  engagementStage: null as null,
}

describe("TenantDashboardShell", () => {
  it("renders the sidebar", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.getByTestId("tenant-sidebar")).toBeInTheDocument()
  })

  it("renders Dashboard link in the sidebar", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div>content</div>
      </TenantDashboardShell>
    )
    // Dashboard link should be present
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i })
    expect(dashboardLink).toBeInTheDocument()
    expect(dashboardLink).toHaveAttribute("href", "/acme-corp/dashboard")
  })

  it("shows Onboarding link when stage is CONTRACTED", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="CONTRACTED"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    const onboardingLink = screen.getByRole("link", { name: /onboarding/i })
    expect(onboardingLink).toBeInTheDocument()
    expect(onboardingLink).toHaveAttribute("href", "/acme-corp/dashboard/onboarding")
  })

  it("shows Onboarding link when stage is ONBOARDING", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="ONBOARDING"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.getByRole("link", { name: /onboarding/i })).toBeInTheDocument()
  })

  it("shows Onboarding link when stage is AUDITING", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="AUDITING"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.getByRole("link", { name: /onboarding/i })).toBeInTheDocument()
  })

  it("shows Onboarding link when stage is REPORTING", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="REPORTING"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.getByRole("link", { name: /onboarding/i })).toBeInTheDocument()
  })

  it("hides Onboarding link when stage is DISCOVERY", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="DISCOVERY"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.queryByRole("link", { name: /onboarding/i })).not.toBeInTheDocument()
  })

  it("hides Onboarding link when stage is PROPOSAL", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage="PROPOSAL"
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.queryByRole("link", { name: /onboarding/i })).not.toBeInTheDocument()
  })

  it("hides Onboarding link when stage is undefined", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        engagementStage={undefined}
      >
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.queryByRole("link", { name: /onboarding/i })).not.toBeInTheDocument()
  })

  it("renders tenant name in the topbar", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div>content</div>
      </TenantDashboardShell>
    )
    const topbar = screen.getByTestId("tenant-topbar")
    expect(topbar).toHaveTextContent("Acme Corp")
  })

  it("renders user initials in avatar", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div>content</div>
      </TenantDashboardShell>
    )
    // initials = JS from Jane Smith
    const avatar = screen.getByTestId("topbar-avatar")
    expect(avatar).toHaveTextContent("JS")
  })

  it("renders user email in sidebar footer", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div>content</div>
      </TenantDashboardShell>
    )
    expect(screen.getByText("jane@example.com")).toBeInTheDocument()
  })

  it("renders children inside main content", () => {
    render(
      <TenantDashboardShell {...defaultProps}>
        <div data-testid="child-content">Hello World</div>
      </TenantDashboardShell>
    )
    expect(screen.getByTestId("child-content")).toBeInTheDocument()
  })

  it("falls back to email initials when firstName is null", () => {
    render(
      <TenantDashboardShell
        {...defaultProps}
        user={{ firstName: null, lastName: null, email: "ab@test.com" }}
      >
        <div />
      </TenantDashboardShell>
    )
    const avatar = screen.getByTestId("topbar-avatar")
    expect(avatar).toHaveTextContent("AB")
  })
})
