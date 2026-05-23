import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the WorkOS SDK before importing the module under test.
// vi.hoisted ensures these are available inside the vi.mock factory, which is
// hoisted to the top of the file at compile time.
// ---------------------------------------------------------------------------

const {
  mockCreateOrganization,
  mockSendInvitation,
  mockRevokeInvitation,
  mockListInvitations,
  mockGetUser,
  mockListOrganizationMemberships,
} = vi.hoisted(() => ({
  mockCreateOrganization: vi.fn(),
  mockSendInvitation: vi.fn(),
  mockRevokeInvitation: vi.fn(),
  mockListInvitations: vi.fn(),
  mockGetUser: vi.fn(),
  mockListOrganizationMemberships: vi.fn(),
}));

vi.mock("@workos-inc/node", async (importOriginal) => {
  // Spread the real module so enum exports (DomainDataState, etc.) remain intact.
  const actual = await importOriginal<typeof import("@workos-inc/node")>();
  function WorkOS() {
    return {
      organizations: {
        createOrganization: mockCreateOrganization,
      },
      userManagement: {
        sendInvitation: mockSendInvitation,
        revokeInvitation: mockRevokeInvitation,
        listInvitations: mockListInvitations,
        getUser: mockGetUser,
        listOrganizationMemberships: mockListOrganizationMemberships,
      },
    };
  }
  return { ...actual, WorkOS };
});

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks are registered
// ---------------------------------------------------------------------------

import { NotFoundException } from "@workos-inc/node";
import {
  createOrganization,
  sendInvitation,
  revokeInvitation,
  listPendingInvitations,
  getUser,
  getUserOrganizationMemberships,
  ExternalServiceError,
} from "../workos";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAutoPaginatable<T>(items: T[]) {
  return {
    data: items,
    autoPagination: vi.fn().mockResolvedValue(items),
  };
}

// ---------------------------------------------------------------------------
// createOrganization
// ---------------------------------------------------------------------------

describe("createOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls workos.organizations.createOrganization with the correct name", async () => {
    mockCreateOrganization.mockResolvedValueOnce({
      id: "org_01",
      name: "Acme Ltd",
      domains: [],
    });

    const result = await createOrganization({ name: "Acme Ltd" });

    expect(mockCreateOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme Ltd" })
    );
    expect(result.id).toBe("org_01");
    expect(result.name).toBe("Acme Ltd");
    expect(result.slug).toBeNull();
  });

  it("maps domains to domainData when provided", async () => {
    mockCreateOrganization.mockResolvedValueOnce({
      id: "org_02",
      name: "Beta Co",
      domains: [],
    });

    await createOrganization({ name: "Beta Co", domains: ["beta.co"] });

    expect(mockCreateOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        domainData: [{ domain: "beta.co", state: "verified" }],
      })
    );
  });

  it("throws ExternalServiceError on SDK failure", async () => {
    mockCreateOrganization.mockRejectedValueOnce(new Error("SDK boom"));

    const error = await createOrganization({ name: "Fail Co" }).catch((e) => e);
    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error.message).toContain("createOrganization failed");
  });
});

// ---------------------------------------------------------------------------
// sendInvitation
// ---------------------------------------------------------------------------

describe("sendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults roleSlug to 'member' when not provided", async () => {
    mockSendInvitation.mockResolvedValueOnce({
      id: "inv_01",
      email: "jane@example.com",
      expiresAt: "2026-06-01T00:00:00Z",
      state: "pending",
    });

    await sendInvitation({
      email: "jane@example.com",
      organizationId: "org_01",
    });

    expect(mockSendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ roleSlug: "member" })
    );
  });

  it("defaults expiresInDays to 7 when not provided", async () => {
    mockSendInvitation.mockResolvedValueOnce({
      id: "inv_02",
      email: "john@example.com",
      expiresAt: "2026-06-01T00:00:00Z",
      state: "pending",
    });

    await sendInvitation({
      email: "john@example.com",
      organizationId: "org_01",
    });

    expect(mockSendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ expiresInDays: 7 })
    );
  });

  it("passes explicit roleSlug and expiresInDays through to SDK", async () => {
    mockSendInvitation.mockResolvedValueOnce({
      id: "inv_03",
      email: "admin@example.com",
      expiresAt: "2026-06-01T00:00:00Z",
      state: "pending",
    });

    await sendInvitation({
      email: "admin@example.com",
      organizationId: "org_01",
      roleSlug: "admin",
      expiresInDays: 3,
    });

    expect(mockSendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ roleSlug: "admin", expiresInDays: 3 })
    );
  });

  it("throws ExternalServiceError on SDK failure", async () => {
    mockSendInvitation.mockRejectedValueOnce(new Error("Rate limited"));

    await expect(
      sendInvitation({ email: "x@x.com", organizationId: "org_01" })
    ).rejects.toThrow(ExternalServiceError);
  });
});

// ---------------------------------------------------------------------------
// revokeInvitation
// ---------------------------------------------------------------------------

describe("revokeInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls workos.userManagement.revokeInvitation with the invitationId", async () => {
    mockRevokeInvitation.mockResolvedValueOnce({
      id: "inv_01",
      state: "revoked",
    });

    await revokeInvitation({ invitationId: "inv_01" });

    expect(mockRevokeInvitation).toHaveBeenCalledWith("inv_01");
  });

  it("throws ExternalServiceError on SDK failure", async () => {
    mockRevokeInvitation.mockRejectedValueOnce(new Error("Not found"));

    await expect(revokeInvitation({ invitationId: "inv_99" })).rejects.toThrow(
      ExternalServiceError
    );
  });
});

// ---------------------------------------------------------------------------
// listPendingInvitations
// ---------------------------------------------------------------------------

describe("listPendingInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only pending invitations filtered from all states", async () => {
    const allInvitations = [
      {
        id: "inv_01",
        email: "a@a.com",
        state: "pending",
        expiresAt: "2026-06-01T00:00:00Z",
        organizationId: "org_01",
      },
      {
        id: "inv_02",
        email: "b@b.com",
        state: "accepted",
        expiresAt: "2026-05-01T00:00:00Z",
        organizationId: "org_01",
      },
      {
        id: "inv_03",
        email: "c@c.com",
        state: "expired",
        expiresAt: "2026-04-01T00:00:00Z",
        organizationId: "org_01",
      },
    ];

    mockListInvitations.mockResolvedValueOnce(makeAutoPaginatable(allInvitations));

    const result = await listPendingInvitations({ organizationId: "org_01" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("inv_01");
    expect(result[0].roleSlug).toBeNull();
  });

  it("passes organizationId to SDK", async () => {
    mockListInvitations.mockResolvedValueOnce(makeAutoPaginatable([]));

    await listPendingInvitations({ organizationId: "org_42" });

    expect(mockListInvitations).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org_42" })
    );
  });

  it("throws ExternalServiceError on SDK failure", async () => {
    mockListInvitations.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      listPendingInvitations({ organizationId: "org_01" })
    ).rejects.toThrow(ExternalServiceError);
  });
});

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

describe("getUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped user fields on success", async () => {
    mockGetUser.mockResolvedValueOnce({
      id: "user_01",
      email: "luke@example.com",
      firstName: "Luke",
      lastName: "Hodges",
      emailVerified: true,
      profilePictureUrl: null,
    });

    const result = await getUser({ workosUserId: "user_01" });

    expect(result).toEqual({
      id: "user_01",
      email: "luke@example.com",
      firstName: "Luke",
      lastName: "Hodges",
    });
  });

  it("returns null when SDK throws NotFoundException (404)", async () => {
    const notFoundErr = new NotFoundException({
      path: "/users/user_missing",
      requestID: "req_test_001",
    });
    mockGetUser.mockRejectedValueOnce(notFoundErr);

    const result = await getUser({ workosUserId: "user_missing" });

    expect(result).toBeNull();
  });

  it("throws ExternalServiceError on non-404 SDK failure", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Service unavailable"));

    await expect(getUser({ workosUserId: "user_01" })).rejects.toThrow(
      ExternalServiceError
    );
  });
});

// ---------------------------------------------------------------------------
// getUserOrganizationMemberships
// ---------------------------------------------------------------------------

describe("getUserOrganizationMemberships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped membership fields including roleSlug from role.slug", async () => {
    const memberships = [
      {
        id: "mem_01",
        organizationId: "org_01",
        userId: "user_01",
        role: { slug: "admin" },
        status: "active",
      },
    ];
    mockListOrganizationMemberships.mockResolvedValueOnce(
      makeAutoPaginatable(memberships)
    );

    const result = await getUserOrganizationMemberships({
      workosUserId: "user_01",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "mem_01",
      organizationId: "org_01",
      userId: "user_01",
      roleSlug: "admin",
      status: "active",
    });
  });

  it("passes userId to SDK listOrganizationMemberships", async () => {
    mockListOrganizationMemberships.mockResolvedValueOnce(
      makeAutoPaginatable([])
    );

    await getUserOrganizationMemberships({ workosUserId: "user_42" });

    expect(mockListOrganizationMemberships).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_42" })
    );
  });

  it("throws ExternalServiceError on SDK failure", async () => {
    mockListOrganizationMemberships.mockRejectedValueOnce(
      new Error("Auth error")
    );

    await expect(
      getUserOrganizationMemberships({ workosUserId: "user_01" })
    ).rejects.toThrow(ExternalServiceError);
  });
});
