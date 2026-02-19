import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { tenants, users } from "@/shared/db/schema";
import { logger } from "@/shared/logger";
import { withAuth } from "@workos-inc/authkit-nextjs";
import type { WorkOSSession } from "@/modules/auth/auth.config";
import type { UserWithRoles } from "@/modules/auth/rbac";
import { extractTenantSlugFromRequest } from "@/modules/auth/tenant";
import { hasPermission } from "@/modules/auth/rbac";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

import type { InferSelectModel } from "drizzle-orm";
import type { roles, permissions } from "@/shared/db/schema";

type RawPermission = InferSelectModel<typeof permissions>;
type RawRole = InferSelectModel<typeof roles>;

/** Shape returned by the Drizzle relational query for a user with roles/permissions. */
type DrizzleUserWithRoles = InferSelectModel<typeof users> & {
  userRoles: Array<{
    role: RawRole & {
      rolePermissions: Array<{
        permission: RawPermission;
      }>;
    };
  }>;
};

/** Reshape the Drizzle relational result to match the UserWithRoles type. */
function reshapeUserWithRoles(raw: DrizzleUserWithRoles): UserWithRoles {
  return {
    ...raw,
    roles: raw.userRoles.map((ur) => ({
      role: {
        ...ur.role,
        permissions: ur.role.rolePermissions.map((rp) => ({
          permission: rp.permission,
        })),
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * The tRPC context available to all procedures.
 */
export type Context = {
  db: typeof db;
  session: WorkOSSession | null;
  tenantId: string;
  tenantSlug: string;
  /**
   * Fully loaded user record from the Drizzle DB — set by tenantProcedure.
   * null in publicProcedure context.
   */
  user: UserWithRoles | null;
};

/**
 * Create the request context.
 *
 * Called once per tRPC request. Responsible for:
 * 1. Retrieving the WorkOS session
 * 2. Resolving the tenant from subdomain, header, or session
 * 3. Providing db access
 */
export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  // Retrieve the WorkOS session. Failed auth is not an error for public routes.
  let session: WorkOSSession | null = null;
  try {
    const authResult = await withAuth();
    if (authResult.user) {
      session = {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          firstName: authResult.user.firstName ?? null,
          lastName: authResult.user.lastName ?? null,
          profilePictureUrl: authResult.user.profilePictureUrl ?? null,
          emailVerified: authResult.user.emailVerified,
          createdAt: authResult.user.createdAt,
          updatedAt: authResult.user.updatedAt,
        },
        accessToken: authResult.accessToken ?? "",
        organizationId: authResult.organizationId,
        role: authResult.role,
        permissions: authResult.permissions,
      };
    }
  } catch {
    // Unauthenticated — leave session as null
  }

  // Tenant detection from request headers / cookie / env.
  const { slug: tenantSlugFromRequest } = extractTenantSlugFromRequest(req);
  const tenantSlug =
    tenantSlugFromRequest ?? process.env.DEFAULT_TENANT_SLUG ?? "default";

  // Look up tenantId from slug if not the default fallback.
  let tenantId = "default";
  if (tenantSlug !== "default") {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
        columns: { id: true },
      });
      if (tenant) {
        tenantId = tenant.id;
        logger.debug({ tenantSlug, tenantId }, "Tenant resolved from slug");
      } else {
        logger.warn({ tenantSlug }, "Tenant not found for slug");
      }
    } catch (err) {
      logger.error({ tenantSlug, err }, "Failed to resolve tenantId from slug");
    }
  }

  return {
    db,
    session,
    tenantId,
    tenantSlug,
    user: null,
  };
}

// ---------------------------------------------------------------------------
// tRPC initialisation
// ---------------------------------------------------------------------------

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

// ---------------------------------------------------------------------------
// Base exports
// ---------------------------------------------------------------------------

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// ---------------------------------------------------------------------------
// Protected procedure — requires a WorkOS session
// ---------------------------------------------------------------------------

/**
 * Requires an authenticated WorkOS session.
 * Throws UNAUTHORIZED if session is null.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// ---------------------------------------------------------------------------
// Tenant procedure — requires auth + tenant context
// ---------------------------------------------------------------------------

/**
 * Extends protectedProcedure. Ensures tenantId is resolved and the Drizzle
 * User record is loaded into context.
 */
export const tenantProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to access this resource",
      });
    }

    const workosUserId = ctx.session.user.id;
    const userEmail = ctx.session.user.email;

    // Try to find user by workosUserId first.
    let rawUser = (await ctx.db.query.users.findFirst({
      where: eq(users.workosUserId, workosUserId),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as DrizzleUserWithRoles | undefined;

    // Email fallback: find by email + tenantId if workosUserId not matched.
    if (!rawUser && ctx.tenantId !== "default") {
      rawUser = (await ctx.db.query.users.findFirst({
        where: and(
          eq(users.email, userEmail),
          eq(users.tenantId, ctx.tenantId)
        ),
        with: {
          userRoles: {
            with: {
              role: {
                with: {
                  rolePermissions: {
                    with: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      })) as DrizzleUserWithRoles | undefined;

      // Backfill workosUserId if found by email.
      if (rawUser) {
        try {
          await ctx.db
            .update(users)
            .set({ workosUserId })
            .where(eq(users.id, rawUser.id));
          logger.info(
            { userId: rawUser.id, workosUserId },
            "Backfilled workosUserId for user found by email"
          );
        } catch (err) {
          logger.error({ err, userId: rawUser.id }, "Failed to backfill workosUserId");
        }
      }
    }

    if (!rawUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "User account not found. Please visit /auth/account-not-found for assistance.",
      });
    }

    if (rawUser.status !== "ACTIVE") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is not active.",
      });
    }

    if (ctx.tenantId !== "default" && rawUser.tenantId !== ctx.tenantId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this tenant.",
      });
    }

    const userWithRoles = reshapeUserWithRoles(rawUser);

    return next({
      ctx: {
        ...ctx,
        user: userWithRoles,
        tenantId: userWithRoles.tenantId,
      },
    });
  }
);

// ---------------------------------------------------------------------------
// Permission procedure factory — RBAC gate
// ---------------------------------------------------------------------------

/**
 * Returns a procedure that requires a specific RBAC permission.
 * Extends tenantProcedure — also requires auth + tenant.
 *
 * @example
 * // In a module router:
 * const listBookings = permissionProcedure("bookings:read")
 *   .input(z.object({ ... }))
 *   .query(async ({ ctx, input }) => { ... });
 */
export function permissionProcedure(requiredPermission: string) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User record not loaded — cannot check permissions",
      });
    }

    if (!hasPermission(ctx.user, requiredPermission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied: ${requiredPermission}`,
      });
    }

    return next({ ctx });
  });
}

// ---------------------------------------------------------------------------
// Platform admin procedure
// ---------------------------------------------------------------------------

/**
 * Cross-tenant platform admin access.
 * Used for Ironheart internal admin tools — not tenant admin.
 *
 * Source of truth: the `users.isPlatformAdmin` boolean column in the database.
 *
 * Bootstrap escape hatch (initial setup only):
 *   If `isPlatformAdmin` is false/null AND the user's email appears in the
 *   `PLATFORM_ADMIN_EMAILS` environment variable (comma-separated), the flag
 *   is automatically set to `true` in the database and the request proceeds.
 *   This runs once per user — after that the env var is no longer consulted.
 *
 * The env var (`PLATFORM_ADMIN_EMAILS`) should be removed from production
 * deployments once all initial platform admins have been bootstrapped.
 */
export const platformAdminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const workosUserId = ctx.session.user.id;
    const userEmail = ctx.session.user.email;

    // Load the user record to check isPlatformAdmin.
    const rawUser = await ctx.db.query.users.findFirst({
      where: eq(users.workosUserId, workosUserId),
      columns: { id: true, isPlatformAdmin: true, email: true },
    });

    if (!rawUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "User account not found. Please visit /auth/account-not-found for assistance.",
      });
    }

    // Primary check: database flag.
    if (rawUser.isPlatformAdmin) {
      return next({ ctx });
    }

    // Bootstrap escape hatch: promote user on first admin access via env var.
    const bootstrapEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (bootstrapEmails.length > 0 && bootstrapEmails.includes(userEmail)) {
      // Promote the user to platform admin in the database (runs once per user).
      await ctx.db
        .update(users)
        .set({ isPlatformAdmin: true })
        .where(eq(users.id, rawUser.id));

      logger.info(
        { userId: rawUser.id, email: userEmail },
        "Bootstrapped isPlatformAdmin=true via PLATFORM_ADMIN_EMAILS env var"
      );

      return next({ ctx });
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform administrator access required",
    });
  }
);

// ---------------------------------------------------------------------------
// Module middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates middleware that checks whether a module is enabled for the current tenant.
 * Modules use this to gate their procedures behind feature flags.
 *
 * @example
 * // In src/modules/review/review.router.ts:
 * const reviewProcedure = tenantProcedure.use(createModuleMiddleware("review-automation"));
 *
 * Phase 0: Stub — always passes through (all modules treated as enabled).
 * Phase 5: Will query TenantModule table to check the module is enabled.
 */
export function createModuleMiddleware(moduleSlug: string) {
  return middleware(async ({ ctx, next }) => {
    // TODO Phase 5: Check db.query.tenantModules.findFirst({ where: ... })
    logger.debug(
      { moduleSlug, tenantId: ctx.tenantId },
      "Module access check (stub — always passes)"
    );
    return next({ ctx });
  });
}
