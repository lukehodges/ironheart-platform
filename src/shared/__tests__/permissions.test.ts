import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  hasPermission,
  requirePermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccessResource,
  type UserWithRoles,
} from "../permissions";
import type { User } from "../db/schema";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

type UserType = "OWNER" | "ADMIN" | "MEMBER" | "CUSTOMER" | "API";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    // Required non-nullable fields from real schema
    id: "user-1",
    tenantId: "tenant-1",
    email: "user@test.com",
    firstName: "Test",
    lastName: "User",
    timezone: "Europe/London",
    locale: "en-GB",
    type: "MEMBER",
    status: "ACTIVE",
    loginCount: 0,
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
    isTeamMember: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Nullable fields
    emailVerified: null,
    passwordHash: null,
    displayName: null,
    avatarUrl: null,
    phone: null,
    phoneVerified: null,
    lastLoginAt: null,
    lastActiveAt: null,
    lockedUntil: null,
    twoFactorSecret: null,
    recoveryCodesHash: null,
    deletedAt: null,
    invitedById: null,
    bio: null,
    dayRate: null,
    employeeType: null,
    hourlyRate: null,
    jobTitle: null,
    maxConcurrentBookings: null,
    maxDailyBookings: null,
    mileageRate: null,
    serviceIds: null,
    staffStatus: null,
    startDate: null,
    ...overrides,
  } as User;
}

function makeUserWithRoles(
  userType: UserType,
  permissionStrings: string[] = []
): UserWithRoles {
  const permissions = permissionStrings.map((p, i) => {
    const [resource, action] = p.split(":");
    return {
      permission: {
        id: `perm-${i}`,
        resource: resource ?? "*",
        action: action ?? "*",
        description: null,
      },
    };
  });

  return {
    ...makeUser({ type: userType }),
    roles: [
      {
        role: {
          id: "role-1",
          name: "Test Role",
          tenantId: "tenant-1",
          description: null,
          color: null,
          isSystem: false,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// hasPermission — unit tests
// ---------------------------------------------------------------------------

describe("hasPermission", () => {
  describe("privileged user types always return true", () => {
    it("OWNER has all permissions", () => {
      const user = makeUserWithRoles("OWNER");
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "staff:delete")).toBe(true);
      expect(hasPermission(user, "anything:anything")).toBe(true);
    });

    it("ADMIN has all permissions", () => {
      const user = makeUserWithRoles("ADMIN");
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "staff:delete")).toBe(true);
    });
  });

  describe("restricted user types always return false", () => {
    it("CUSTOMER has no admin permissions", () => {
      const user = makeUserWithRoles("CUSTOMER", ["bookings:*"]);
      expect(hasPermission(user, "bookings:read")).toBe(false);
    });

    it("API has no admin permissions", () => {
      const user = makeUserWithRoles("API", ["*:*"]);
      expect(hasPermission(user, "bookings:read")).toBe(false);
    });
  });

  describe("MEMBER permission checks", () => {
    it("exact match — returns true", () => {
      const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
      expect(hasPermission(user, "bookings:read")).toBe(true);
    });

    it("exact match — wrong permission returns false", () => {
      const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
      expect(hasPermission(user, "bookings:write")).toBe(false);
    });

    it("resource wildcard — bookings:* grants bookings:read", () => {
      const user = makeUserWithRoles("MEMBER", ["bookings:*"]);
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "bookings:write")).toBe(true);
      expect(hasPermission(user, "bookings:delete")).toBe(true);
    });

    it("resource wildcard — does not grant other resources", () => {
      const user = makeUserWithRoles("MEMBER", ["bookings:*"]);
      expect(hasPermission(user, "staff:read")).toBe(false);
    });

    it("action wildcard — *:read grants bookings:read and staff:read", () => {
      const user = makeUserWithRoles("MEMBER", ["*:read"]);
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "staff:read")).toBe(true);
    });

    it("action wildcard — *:read does not grant write", () => {
      const user = makeUserWithRoles("MEMBER", ["*:read"]);
      expect(hasPermission(user, "bookings:write")).toBe(false);
    });

    it("full wildcard *:* grants everything", () => {
      const user = makeUserWithRoles("MEMBER", ["*:*"]);
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "staff:delete")).toBe(true);
      expect(hasPermission(user, "anything:anything")).toBe(true);
    });

    it("no roles — no permissions", () => {
      const user: UserWithRoles = { ...makeUser({ type: "MEMBER" }), roles: [] };
      expect(hasPermission(user, "bookings:read")).toBe(false);
    });

    it("multiple roles — union of all permissions", () => {
      const user: UserWithRoles = {
        ...makeUser({ type: "MEMBER" }),
        roles: [
          {
            role: {
              id: "role-1",
              name: "Booking Manager",
              tenantId: "t1",
              description: null,
              color: null,
              isSystem: false,
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              permissions: [
                {
                  permission: { id: "p1", resource: "bookings", action: "read", description: null },
                },
              ],
            },
          },
          {
            role: {
              id: "role-2",
              name: "Staff Manager",
              tenantId: "t1",
              description: null,
              color: null,
              isSystem: false,
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              permissions: [
                {
                  permission: { id: "p2", resource: "staff", action: "write", description: null },
                },
              ],
            },
          },
        ],
      };
      expect(hasPermission(user, "bookings:read")).toBe(true);
      expect(hasPermission(user, "staff:write")).toBe(true);
      expect(hasPermission(user, "staff:read")).toBe(false);
    });

    it("invalid permission format returns false", () => {
      const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
      expect(hasPermission(user, "invalidformat")).toBe(false);
      expect(hasPermission(user, "")).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// hasPermission — property-based tests (fast-check)
// ---------------------------------------------------------------------------

describe("hasPermission — properties", () => {
  const privilegedTypes = fc.constantFrom("OWNER", "ADMIN");
  const restrictedTypes = fc.constantFrom("CUSTOMER", "API");
  const arbitraryPermission = fc.string({ minLength: 1 }).chain((resource) =>
    fc
      .string({ minLength: 1 })
      .map((action) => `${resource}:${action}`)
  );

  it("Property: OWNER/ADMIN always return true for any permission", () => {
    fc.assert(
      fc.property(privilegedTypes, arbitraryPermission, (userType, perm) => {
        const user = makeUserWithRoles(userType);
        return hasPermission(user, perm) === true;
      })
    );
  });

  it("Property: CUSTOMER/API always return false regardless of roles", () => {
    fc.assert(
      fc.property(
        restrictedTypes,
        fc.array(arbitraryPermission, { minLength: 0, maxLength: 5 }),
        arbitraryPermission,
        (userType, permStrings, reqPerm) => {
          const user = makeUserWithRoles(userType, permStrings);
          return hasPermission(user, reqPerm) === false;
        }
      )
    );
  });

  it("Property: MEMBER with *:* permission always returns true", () => {
    fc.assert(
      fc.property(arbitraryPermission, (reqPerm) => {
        // Only test strings that parse as a valid "resource:action" pair.
        // split(":") on ":: " yields ["", "", " "] — resource would be "" (falsy),
        // causing hasPermission to return false even with *:*. Skip those.
        const parts = reqPerm.split(":");
        const resource = parts[0];
        const action = parts[1];
        if (!resource || !action) return true; // skip malformed, vacuously pass
        const user = makeUserWithRoles("MEMBER", ["*:*"]);
        return hasPermission(user, reqPerm) === true;
      })
    );
  });

  it("Property: hasPermission is idempotent (same inputs same output)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("OWNER", "ADMIN", "MEMBER", "CUSTOMER", "API"),
        arbitraryPermission,
        (userType, perm) => {
          const user = makeUserWithRoles(userType);
          const result1 = hasPermission(user, perm);
          const result2 = hasPermission(user, perm);
          return result1 === result2;
        }
      )
    );
  });

  it("Property: if hasPermission is true then hasAnyPermission with that perm is also true", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("OWNER", "ADMIN", "MEMBER"),
        fc.array(arbitraryPermission, { minLength: 0, maxLength: 3 }),
        arbitraryPermission,
        (userType, rolePerms, reqPerm) => {
          const user = makeUserWithRoles(userType, rolePerms);
          const single = hasPermission(user, reqPerm);
          const any = hasAnyPermission(user, [reqPerm]);
          return single === any;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// requirePermission
// ---------------------------------------------------------------------------

describe("requirePermission", () => {
  it("does not throw for OWNER", () => {
    const user = makeUserWithRoles("OWNER");
    expect(() => requirePermission(user, "anything:read")).not.toThrow();
  });

  it("throws FORBIDDEN for MEMBER without permission", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
    expect(() => requirePermission(user, "staff:delete")).toThrow();
  });

  it("throws with FORBIDDEN code", () => {
    const user = makeUserWithRoles("MEMBER");
    try {
      requirePermission(user, "bookings:read");
      expect.fail("Should have thrown");
    } catch (e: unknown) {
      expect((e as { code?: string }).code).toBe("FORBIDDEN");
    }
  });
});

// ---------------------------------------------------------------------------
// hasAnyPermission / hasAllPermissions
// ---------------------------------------------------------------------------

describe("hasAnyPermission", () => {
  it("returns true if at least one permission matches", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
    expect(hasAnyPermission(user, ["staff:delete", "bookings:read"])).toBe(true);
  });

  it("returns false if none match", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
    expect(hasAnyPermission(user, ["staff:delete", "staff:read"])).toBe(false);
  });

  it("returns false for empty permissions array", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
    expect(hasAnyPermission(user, [])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when user has all permissions", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read", "staff:read"]);
    expect(hasAllPermissions(user, ["bookings:read", "staff:read"])).toBe(true);
  });

  it("returns false when user is missing one permission", () => {
    const user = makeUserWithRoles("MEMBER", ["bookings:read"]);
    expect(hasAllPermissions(user, ["bookings:read", "staff:read"])).toBe(false);
  });

  it("returns true for empty permissions array (vacuously true)", () => {
    const user = makeUserWithRoles("MEMBER");
    expect(hasAllPermissions(user, [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getUserPermissions
// ---------------------------------------------------------------------------

describe("getUserPermissions", () => {
  it("OWNER returns [*:*]", () => {
    const user = makeUserWithRoles("OWNER");
    expect(getUserPermissions(user)).toEqual(["*:*"]);
  });

  it("ADMIN returns [*:*]", () => {
    const user = makeUserWithRoles("ADMIN");
    expect(getUserPermissions(user)).toEqual(["*:*"]);
  });

  it("MEMBER returns sorted unique permissions", () => {
    const user = makeUserWithRoles("MEMBER", [
      "staff:read",
      "bookings:read",
      "bookings:read", // duplicate
    ]);
    const perms = getUserPermissions(user);
    expect(perms).toContain("bookings:read");
    expect(perms).toContain("staff:read");
    // Should be unique
    expect(new Set(perms).size).toBe(perms.length);
    // Should be sorted
    expect(perms).toEqual([...perms].sort());
  });

  it("MEMBER with no roles returns []", () => {
    const user: UserWithRoles = { ...makeUser({ type: "MEMBER" }), roles: [] };
    expect(getUserPermissions(user)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// canAccessResource
// ---------------------------------------------------------------------------

describe("canAccessResource", () => {
  it("OWNER can access any resource", () => {
    const user = makeUser({ type: "OWNER" });
    expect(canAccessResource(user, "booking", "other-user-id")).toBe(true);
    expect(canAccessResource(user, "booking", null)).toBe(true);
  });

  it("ADMIN can access any resource", () => {
    const user = makeUser({ type: "ADMIN" });
    expect(canAccessResource(user, "booking", "other-user-id")).toBe(true);
  });

  it("MEMBER can access their own resource", () => {
    const user = makeUser({ type: "MEMBER", id: "user-123" });
    expect(canAccessResource(user, "booking", "user-123")).toBe(true);
  });

  it("MEMBER cannot access another user's resource", () => {
    const user = makeUser({ type: "MEMBER", id: "user-123" });
    expect(canAccessResource(user, "booking", "user-999")).toBe(false);
  });

  it("MEMBER with null resourceOwnerId returns false", () => {
    const user = makeUser({ type: "MEMBER", id: "user-123" });
    expect(canAccessResource(user, "booking", null)).toBe(false);
  });

  it("Property: OWNER/ADMIN always can access any resource", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("OWNER", "ADMIN"),
        fc.option(fc.string(), { nil: null }),
        (userType, ownerId) => {
          const user = makeUser({ type: userType });
          return canAccessResource(user, "booking", ownerId) === true;
        }
      )
    );
  });
});
