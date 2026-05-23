import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoist mock factories so they are available inside vi.mock() closures.
// ---------------------------------------------------------------------------
const {
  mockFindFirst,
  mockFindMany,
  mockInsert,
  mockGetUserOrganizationMemberships,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockInsert: vi.fn(),
  mockGetUserOrganizationMemberships: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock @/shared/db
// ---------------------------------------------------------------------------
vi.mock("@/shared/db", () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirst },
      tenants: { findMany: mockFindMany },
    },
    insert: mockInsert,
  },
}))

// ---------------------------------------------------------------------------
// Mock @/shared/db/schemas/auth.schema
// ---------------------------------------------------------------------------
vi.mock("@/shared/db/schemas/auth.schema", () => ({
  users: { workosUserId: "workos_user_id" },
}))

// ---------------------------------------------------------------------------
// Mock @/shared/db/schemas/tenant.schema
// ---------------------------------------------------------------------------
vi.mock("@/shared/db/schemas/tenant.schema", () => ({
  tenants: {},
}))

// ---------------------------------------------------------------------------
// Mock drizzle-orm eq / inArray (resolve-redirect imports these)
// ---------------------------------------------------------------------------
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, op: "eq" })),
  inArray: vi.fn((col, vals) => ({ col, vals, op: "inArray" })),
}))

// ---------------------------------------------------------------------------
// Mock @/shared/workos
// ---------------------------------------------------------------------------
vi.mock("@/shared/workos", () => ({
  getUserOrganizationMemberships: mockGetUserOrganizationMemberships,
}))

// ---------------------------------------------------------------------------
// Mock @/shared/logger — silence output in tests
// ---------------------------------------------------------------------------
vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks
// ---------------------------------------------------------------------------
import { resolveAuthRedirect } from "../resolve-redirect"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkosUser(overrides: Partial<{
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}> = {}) {
  return {
    id: "wos_user_123",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    ...overrides,
  } as any
}

function makeInternalUser(overrides: Partial<{
  id: string
  tenantId: string
  workosUserId: string
  isPlatformAdmin: boolean
  email: string
}> = {}) {
  return {
    id: "internal-user-uuid",
    tenantId: "tenant-uuid",
    workosUserId: "wos_user_123",
    email: "user@example.com",
    isPlatformAdmin: false,
    ...overrides,
  }
}

function makeTenant(slug: string, orgId: string) {
  return { id: `tenant-${slug}`, slug, workosOrgId: orgId }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveAuthRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no existing internal user
    mockFindFirst.mockResolvedValue(undefined)
    // Default: insert returns a row (for backfill scenarios)
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          makeInternalUser({ id: "new-user-uuid" }),
        ]),
      }),
    })
  })

  // ── Platform admin ─────────────────────────────────────────────────────
  it("routes platform admin to /platform", async () => {
    mockFindFirst.mockResolvedValue(makeInternalUser({ isPlatformAdmin: true }))

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/platform")
    // Should NOT call getUserOrganizationMemberships for platform admin
    expect(mockGetUserOrganizationMemberships).not.toHaveBeenCalled()
  })

  // ── 0 org memberships ──────────────────────────────────────────────────
  it("redirects to /select-tenant?reason=no_tenants when user has no org memberships", async () => {
    mockFindFirst.mockResolvedValue(undefined) // no internal user
    mockGetUserOrganizationMemberships.mockResolvedValue([])

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/select-tenant?reason=no_tenants")
  })

  // ── WorkOS memberships exist but no internal tenant match ─────────────
  it("redirects to /select-tenant?reason=unprovisioned when orgs exist but no DB tenants match", async () => {
    mockFindFirst.mockResolvedValue(undefined)
    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
    ])
    mockFindMany.mockResolvedValue([]) // no matching tenants

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/select-tenant?reason=unprovisioned")
  })

  // ── Single tenant ───────────────────────────────────────────────────────
  it("routes to /[slug]/dashboard when exactly one tenant matches", async () => {
    mockFindFirst.mockResolvedValue(makeInternalUser()) // existing user
    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
    ])
    mockFindMany.mockResolvedValue([makeTenant("acme", "org_abc")])

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/acme/dashboard")
  })

  // ── Multiple tenants ────────────────────────────────────────────────────
  it("routes to /select-tenant when multiple tenants match", async () => {
    mockFindFirst.mockResolvedValue(makeInternalUser())
    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
      { id: "mem_2", organizationId: "org_xyz", userId: "wos_user_123", roleSlug: "admin", status: "active" },
    ])
    mockFindMany.mockResolvedValue([
      makeTenant("acme", "org_abc"),
      makeTenant("beta-corp", "org_xyz"),
    ])

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/select-tenant")
  })

  // ── New user (no internal users row) — backfill then route ────────────
  it("backfills an internal user row on first invitation accept (single tenant)", async () => {
    mockFindFirst.mockResolvedValue(undefined) // no existing row
    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
    ])
    mockFindMany.mockResolvedValue([makeTenant("acme", "org_abc")])

    const mockReturning = vi.fn().mockResolvedValue([
      makeInternalUser({ id: "brand-new-user", tenantId: "tenant-acme" }),
    ])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/acme/dashboard")
    expect(result.backfilledUser).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it("backfills an internal user row on first invitation accept (multi-tenant)", async () => {
    mockFindFirst.mockResolvedValue(undefined)
    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
      { id: "mem_2", organizationId: "org_xyz", userId: "wos_user_123", roleSlug: "member", status: "active" },
    ])
    mockFindMany.mockResolvedValue([
      makeTenant("acme", "org_abc"),
      makeTenant("beta-corp", "org_xyz"),
    ])

    const mockReturning = vi.fn().mockResolvedValue([
      makeInternalUser({ id: "brand-new-user", tenantId: "tenant-acme" }),
    ])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })

    const result = await resolveAuthRedirect(makeWorkosUser())

    expect(result.redirect).toBe("/select-tenant")
    expect(result.backfilledUser).toBe(true)
    // Anchor tenant should be the first one
    const insertCallArgs = mockValues.mock.calls[0][0]
    expect(insertCallArgs.tenantId).toBe("tenant-acme")
  })

  // ── Concurrent backfill race condition ────────────────────────────────
  it("handles concurrent backfill by re-fetching the existing row", async () => {
    const existingUser = makeInternalUser({ id: "existing-race-user" })

    // First findFirst call returns nothing (race start)
    // Second findFirst call (inside catch) returns the row inserted by peer
    let callCount = 0
    mockFindFirst.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve(undefined)
      return Promise.resolve(existingUser)
    })

    mockGetUserOrganizationMemberships.mockResolvedValue([
      { id: "mem_1", organizationId: "org_abc", userId: "wos_user_123", roleSlug: "member", status: "active" },
    ])
    mockFindMany.mockResolvedValue([makeTenant("acme", "org_abc")])

    // Insert throws a unique constraint error (simulating the race)
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(new Error("unique constraint violation")),
    })
    mockInsert.mockReturnValue({ values: mockValues })

    const result = await resolveAuthRedirect(makeWorkosUser())

    // Still routes correctly
    expect(result.redirect).toBe("/acme/dashboard")
  })
})
