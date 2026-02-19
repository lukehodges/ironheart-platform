import { describe, it, expect } from "vitest";
import { hasPermission, requirePermission, getUserPermissions, canAccessResource } from "./rbac";
import type { UserWithRoles } from "./rbac";

function makeUser(type: string, perms: Array<{ resource: string; action: string }>): UserWithRoles {
  return {
    id: "user-1",
    type,
    email: "test@example.com",
    tenantId: "tenant-1",
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    timezone: "Europe/London",
    locale: "en-GB",
    loginCount: 0,
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
    isTeamMember: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: null, passwordHash: null, displayName: null, avatarUrl: null,
    phone: null, phoneVerified: null, lastLoginAt: null, lastActiveAt: null,
    lockedUntil: null, twoFactorSecret: null, recoveryCodesHash: null, deletedAt: null,
    invitedById: null, bio: null, dayRate: null, employeeType: null, hourlyRate: null,
    jobTitle: null, maxConcurrentBookings: null, maxDailyBookings: null,
    mileageRate: null, serviceIds: null, staffStatus: null, startDate: null,
    workosUserId: null,
    roles: [
      {
        role: {
          id: "role-1", name: "Test Role", tenantId: "tenant-1",
          description: null, color: null, isSystem: false, isDefault: false,
          createdAt: new Date(), updatedAt: new Date(),
          permissions: perms.map((p, i) => ({
            permission: { id: `perm-${i}`, resource: p.resource, action: p.action, description: null },
          })),
        },
      },
    ],
  } as unknown as UserWithRoles;
}

describe("hasPermission", () => {
  it("OWNER has all permissions", () => {
    const user = makeUser("OWNER", []);
    expect(hasPermission(user, "bookings:read")).toBe(true);
    expect(hasPermission(user, "staff:delete")).toBe(true);
  });

  it("ADMIN has all permissions", () => {
    expect(hasPermission(makeUser("ADMIN", []), "bookings:read")).toBe(true);
  });

  it("CUSTOMER has no admin permissions", () => {
    const user = makeUser("CUSTOMER", [{ resource: "bookings", action: "read" }]);
    expect(hasPermission(user, "bookings:read")).toBe(false);
  });

  it("exact match: bookings:read", () => {
    const user = makeUser("MEMBER", [{ resource: "bookings", action: "read" }]);
    expect(hasPermission(user, "bookings:read")).toBe(true);
    expect(hasPermission(user, "bookings:write")).toBe(false);
  });

  it("wildcard action: bookings:*", () => {
    const user = makeUser("MEMBER", [{ resource: "bookings", action: "*" }]);
    expect(hasPermission(user, "bookings:read")).toBe(true);
    expect(hasPermission(user, "bookings:delete")).toBe(true);
    expect(hasPermission(user, "staff:read")).toBe(false);
  });

  it("wildcard resource: *:read", () => {
    const user = makeUser("MEMBER", [{ resource: "*", action: "read" }]);
    expect(hasPermission(user, "bookings:read")).toBe(true);
    expect(hasPermission(user, "bookings:write")).toBe(false);
  });

  it("full wildcard: *:*", () => {
    const user = makeUser("MEMBER", [{ resource: "*", action: "*" }]);
    expect(hasPermission(user, "anything:anything")).toBe(true);
  });

  it("rejects malformed permission string", () => {
    const user = makeUser("MEMBER", [{ resource: "bookings", action: "read" }]);
    expect(hasPermission(user, "invalid")).toBe(false);
    expect(hasPermission(user, "")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws FORBIDDEN code when denied", () => {
    const user = makeUser("MEMBER", []);
    try {
      requirePermission(user, "bookings:read");
      expect.fail("should have thrown");
    } catch (e: unknown) {
      expect((e as { code?: string }).code).toBe("FORBIDDEN");
    }
  });
});

describe("getUserPermissions", () => {
  it("OWNER returns [*:*]", () => {
    expect(getUserPermissions(makeUser("OWNER", []))).toEqual(["*:*"]);
  });
  it("MEMBER returns sorted unique permission strings", () => {
    const user = makeUser("MEMBER", [
      { resource: "staff", action: "read" },
      { resource: "bookings", action: "read" },
      { resource: "bookings", action: "read" },
    ]);
    const perms = getUserPermissions(user);
    expect(perms).toContain("bookings:read");
    expect(perms).toContain("staff:read");
    expect(new Set(perms).size).toBe(perms.length);
  });
});

describe("canAccessResource", () => {
  it("OWNER can access anything", () => {
    expect(canAccessResource(makeUser("OWNER", []), "booking", "other")).toBe(true);
    expect(canAccessResource(makeUser("OWNER", []), "booking", null)).toBe(true);
  });
  it("MEMBER can only access own resource", () => {
    const user = { ...makeUser("MEMBER", []), id: "user-123" };
    expect(canAccessResource(user, "booking", "user-123")).toBe(true);
    expect(canAccessResource(user, "booking", "user-999")).toBe(false);
    expect(canAccessResource(user, "booking", null)).toBe(false);
  });
});
