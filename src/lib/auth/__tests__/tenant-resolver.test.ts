/**
 * Unit tests for src/lib/auth/tenant-resolver.ts
 *
 * All external I/O (db, redis, workos) is mocked at the module level.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before the module under test is imported.
// ---------------------------------------------------------------------------

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      tenants: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock("@/shared/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/shared/workos", () => ({
  getUserOrganizationMemberships: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Now import under test (after mocks are registered).
// ---------------------------------------------------------------------------

import {
  extractPotentialTenantSlug,
  getTenantBySlug,
  isMemberOfOrg,
  RESERVED_TOP_LEVEL,
} from "../tenant-resolver";

import { db } from "@/shared/db";
import { redis } from "@/shared/redis";
import { getUserOrganizationMemberships } from "@/shared/workos";

const mockFindFirst = db.query.tenants.findFirst as ReturnType<typeof vi.fn>;
const mockRedisGet = redis.get as ReturnType<typeof vi.fn>;
const mockRedisSet = redis.set as ReturnType<typeof vi.fn>;
const mockGetMemberships = getUserOrganizationMemberships as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT = {
  id: "tenant-uuid-123",
  name: "Acme Corp",
  slug: "acme",
  workosOrgId: "org_workos_abc",
  domain: null,
  plan: "STARTER" as const,
  status: "ACTIVE" as const,
  stripeCustomerId: null,
  subscriptionId: null,
  billingEmail: null,
  maxUsers: 5,
  maxStaff: 10,
  maxBookingsMonth: 500,
  storageUsedBytes: 0,
  storageLimitBytes: 5368709120,
  createdAt: new Date(),
  updatedAt: new Date(),
  trialEndsAt: null,
  productId: null,
  planId: null,
  deletedAt: null,
};

// ---------------------------------------------------------------------------
// extractPotentialTenantSlug
// ---------------------------------------------------------------------------

describe("extractPotentialTenantSlug", () => {
  it("returns null for root path /", () => {
    expect(extractPotentialTenantSlug("/")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractPotentialTenantSlug("")).toBeNull();
  });

  it("returns null for /platform/*", () => {
    expect(extractPotentialTenantSlug("/platform/clients")).toBeNull();
  });

  it("returns null for /api/foo", () => {
    expect(extractPotentialTenantSlug("/api/foo")).toBeNull();
  });

  it("returns null for /auth/callback", () => {
    expect(extractPotentialTenantSlug("/auth/callback")).toBeNull();
  });

  it("returns null for /api exactly", () => {
    expect(extractPotentialTenantSlug("/api")).toBeNull();
  });

  it("returns null for /_next/static/...", () => {
    expect(extractPotentialTenantSlug("/_next/static/chunk.js")).toBeNull();
  });

  it("returns null for /book/*", () => {
    expect(extractPotentialTenantSlug("/book/session")).toBeNull();
  });

  it("returns null for /sign-in", () => {
    expect(extractPotentialTenantSlug("/sign-in")).toBeNull();
  });

  it("returns null for /select-tenant", () => {
    expect(extractPotentialTenantSlug("/select-tenant")).toBeNull();
  });

  it("returns null for /admin/*", () => {
    expect(extractPotentialTenantSlug("/admin/settings")).toBeNull();
  });

  it("returns the slug for /acme/dashboard", () => {
    expect(extractPotentialTenantSlug("/acme/dashboard")).toBe("acme");
  });

  it("returns the slug for /my-company/bookings/123", () => {
    expect(extractPotentialTenantSlug("/my-company/bookings/123")).toBe("my-company");
  });

  it("returns the slug for a bare /some-slug", () => {
    expect(extractPotentialTenantSlug("/some-slug")).toBe("some-slug");
  });

  it("every entry in RESERVED_TOP_LEVEL is properly blocked", () => {
    for (const reserved of RESERVED_TOP_LEVEL) {
      expect(
        extractPotentialTenantSlug(`/${reserved}/something`),
        `expected /${reserved}/something to return null`
      ).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// getTenantBySlug
// ---------------------------------------------------------------------------

describe("getTenantBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the tenant when found", async () => {
    mockFindFirst.mockResolvedValueOnce(TENANT);
    const result = await getTenantBySlug("acme");
    expect(result).toEqual(TENANT);
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  it("returns null when no tenant exists with that slug", async () => {
    mockFindFirst.mockResolvedValueOnce(undefined);
    const result = await getTenantBySlug("unknown-slug");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isMemberOfOrg
// ---------------------------------------------------------------------------

describe("isMemberOfOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true immediately on cache hit 'yes' without calling WorkOS", async () => {
    mockRedisGet.mockResolvedValueOnce("yes");

    const result = await isMemberOfOrg("user_abc", "org_xyz");

    expect(result).toBe(true);
    expect(mockGetMemberships).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("returns false immediately on cache hit 'no' without calling WorkOS", async () => {
    mockRedisGet.mockResolvedValueOnce("no");

    const result = await isMemberOfOrg("user_abc", "org_xyz");

    expect(result).toBe(false);
    expect(mockGetMemberships).not.toHaveBeenCalled();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("calls WorkOS and caches 'yes' on cache miss — member", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockGetMemberships.mockResolvedValueOnce([
      {
        id: "mem_1",
        organizationId: "org_xyz",
        userId: "user_abc",
        roleSlug: "member",
        status: "active",
      },
    ]);

    const result = await isMemberOfOrg("user_abc", "org_xyz");

    expect(result).toBe(true);
    expect(mockGetMemberships).toHaveBeenCalledWith({ workosUserId: "user_abc" });
    expect(mockRedisSet).toHaveBeenCalledWith(
      "membership:user_abc:org_xyz",
      "yes",
      { ex: 5 * 60 }
    );
  });

  it("calls WorkOS and caches 'no' on cache miss — non-member", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockGetMemberships.mockResolvedValueOnce([
      {
        id: "mem_2",
        organizationId: "org_different",
        userId: "user_abc",
        roleSlug: "member",
        status: "active",
      },
    ]);

    const result = await isMemberOfOrg("user_abc", "org_xyz");

    expect(result).toBe(false);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "membership:user_abc:org_xyz",
      "no",
      { ex: 5 * 60 }
    );
  });

  it("calls WorkOS and caches 'no' when memberships list is empty", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockGetMemberships.mockResolvedValueOnce([]);

    const result = await isMemberOfOrg("user_abc", "org_xyz");

    expect(result).toBe(false);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "membership:user_abc:org_xyz",
      "no",
      { ex: 5 * 60 }
    );
  });

  it("uses the correct cache key format", async () => {
    mockRedisGet.mockResolvedValueOnce(null);
    mockGetMemberships.mockResolvedValueOnce([]);

    await isMemberOfOrg("user_foo", "org_bar");

    expect(mockRedisGet).toHaveBeenCalledWith("membership:user_foo:org_bar");
  });
});
