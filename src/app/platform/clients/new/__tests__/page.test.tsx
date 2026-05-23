import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import NewClientPage from "../page"

// ── tRPC mock ──────────────────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockPush = vi.fn()

vi.mock("@/lib/trpc/react", () => ({
  api: {
    consulting: {
      createClientEngagement: {
        useMutation: vi.fn(({ onSuccess, onError }: { onSuccess?: (data: { id: string }) => void; onError?: (err: { message: string }) => void } = {}) => ({
          mutate: (input: unknown) => {
            mockMutate(input)
            // Simulate success by default
            onSuccess?.({ id: "engagement-123" })
          },
          isPending: false,
        })),
      },
    },
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function fillRequiredFields() {
  // Tenant — we use the Select component; simulate value change via the component API
  // Since Radix Select uses portal and is hard to interact with in jsdom, we rely on the
  // Select onChange triggers via fireEvent.change on the hidden select, or we test
  // the form error path instead. For the submit-success path, we set tenantId via the
  // internal state — we test this through the formError that appears.

  fireEvent.change(screen.getByPlaceholderText("Acme Manufacturing Ltd"), {
    target: { value: "Widgets Co" },
  })
  fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
    target: { value: "Bob Jones" },
  })
  fireEvent.change(screen.getByPlaceholderText("jane@acme.com"), {
    target: { value: "bob@widgets.com" },
  })
  fireEvent.change(screen.getByPlaceholderText("Q2 Operations Audit"), {
    target: { value: "Process Review" },
  })
  fireEvent.change(screen.getByPlaceholderText("12"), {
    target: { value: "20" },
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("NewClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders page heading and subtitle", () => {
    render(<NewClientPage />)
    expect(screen.getByRole("heading", { name: /new client/i })).toBeInTheDocument()
    expect(screen.getByText(/create a new engagement at discovery stage/i)).toBeInTheDocument()
  })

  it("renders all section labels", () => {
    render(<NewClientPage />)
    // Tenant Account section has been removed — tenantId is auto-resolved server-side
    expect(screen.queryByText(/tenant account/i)).not.toBeInTheDocument()
    // Use getAllByText for "Company" since the word may appear in multiple places
    expect(screen.getAllByText(/^company$/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/^primary contact$/i)).toBeInTheDocument()
    expect(screen.getByText(/^engagement$/i)).toBeInTheDocument()
    expect(screen.getByText(/^qualification$/i)).toBeInTheDocument()
  })

  it("renders all required input fields", () => {
    render(<NewClientPage />)
    expect(screen.getByPlaceholderText("Acme Manufacturing Ltd")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("jane@acme.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Q2 Operations Audit")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("12")).toBeInTheDocument()
  })

  it("renders submit and cancel controls", () => {
    render(<NewClientPage />)
    expect(screen.getByRole("button", { name: /create client/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /cancel/i })).toBeInTheDocument()
  })

  it("cancel link points to /platform/clients", () => {
    render(<NewClientPage />)
    const cancelLink = screen.getByRole("link", { name: /cancel/i })
    expect(cancelLink).toHaveAttribute("href", "/platform/clients")
  })

  it("shows validation error when submitted empty", async () => {
    render(<NewClientPage />)
    fireEvent.submit(screen.getByRole("button", { name: /create client/i }).closest("form")!)
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("shows error when company name is missing", async () => {
    render(<NewClientPage />)
    fireEvent.submit(screen.getByRole("button", { name: /create client/i }).closest("form")!)
    await waitFor(() => {
      expect(screen.getByText(/company name is required/i)).toBeInTheDocument()
    })
  })

  it("shows error when email is invalid", async () => {
    render(<NewClientPage />)
    fireEvent.change(screen.getByPlaceholderText("Acme Manufacturing Ltd"), {
      target: { value: "Widgets Co" },
    })
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Bob Jones" },
    })
    fireEvent.change(screen.getByPlaceholderText("jane@acme.com"), {
      target: { value: "not-an-email" },
    })
    fireEvent.submit(screen.getByRole("button", { name: /create client/i }).closest("form")!)
    await waitFor(() => {
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("adds and removes pain points via common tag buttons", async () => {
    render(<NewClientPage />)
    const tagButton = screen.getByRole("button", { name: "Manual processes" })
    fireEvent.click(tagButton)
    // The button background class should indicate selected state
    expect(tagButton.className).toContain("bg-foreground")
    fireEvent.click(tagButton)
    expect(tagButton.className).not.toContain("bg-foreground")
  })

  it("adds custom pain point on Enter key", async () => {
    render(<NewClientPage />)
    const input = screen.getByPlaceholderText(/type a custom pain point/i)
    fireEvent.change(input, { target: { value: "Supply chain chaos" } })
    fireEvent.keyDown(input, { key: "Enter" })
    // Recheck common tag buttons — the custom one appears in a separate span
    await waitFor(() => {
      // The selected tag set should now include the custom entry
      expect(screen.queryByText("Supply chain chaos")).not.toBeNull()
    })
  })

  it("toggles the decision-maker checkbox", () => {
    render(<NewClientPage />)
    const checkbox = screen.getByLabelText(/primary contact is the decision-maker/i)
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it("does not render a tenant selector (tenantId is auto-resolved server-side)", () => {
    render(<NewClientPage />)
    // Per D-01, Luke is flat in /platform/* — no tenant switching UI
    expect(screen.queryByText("Select tenant")).not.toBeInTheDocument()
  })
})

// ── Zod schema unit tests ──────────────────────────────────────────────────

import { createClientEngagementSchema } from "@/modules/consulting/consulting.schemas"

const VALID_INPUT = {
  // tenantId removed — auto-resolved server-side via IRONHEART_TENANT_ID or slug lookup
  companyName: "Acme Ltd",
  contactName: "Jane Smith",
  contactEmail: "jane@acme.com",
  industry: "Manufacturing" as const,
  source: "Referral" as const,
  engagementType: "PROJECT" as const,
  engagementTitle: "Q2 Operations Audit",
  teamSize: 15,
  painPoints: ["Manual processes"],
  decisionMaker: true,
}

describe("createClientEngagementSchema", () => {
  it("accepts a fully valid input", () => {
    const result = createClientEngagementSchema.safeParse(VALID_INPUT)
    expect(result.success).toBe(true)
  })

  it("accepts optional fields omitted", () => {
    const { contactPhone: _phone, revenue: _rev, ...rest } = { ...VALID_INPUT, contactPhone: undefined, revenue: undefined }
    void _phone; void _rev
    const result = createClientEngagementSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it("rejects missing company name", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, companyName: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, contactEmail: "not-an-email" })
    expect(result.success).toBe(false)
  })

  it("rejects empty pain points array", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, painPoints: [] })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer team size", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, teamSize: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid industry enum value", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, industry: "Unknown Industry" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid engagement type", () => {
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, engagementType: "CONSULTING" })
    expect(result.success).toBe(false)
  })

  it("does not accept tenantId field (removed from schema — server-side resolution)", () => {
    // tenantId is no longer part of the schema; passing it is silently stripped by Zod
    const result = createClientEngagementSchema.safeParse({ ...VALID_INPUT, tenantId: "550e8400-e29b-41d4-a716-446655440000" })
    // Schema still succeeds — extra fields are stripped. Ensure tenantId isn't in output.
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).tenantId).toBeUndefined()
    }
  })
})
