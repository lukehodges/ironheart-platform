import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { eq, and } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { Ratelimit } from "@upstash/ratelimit";
import { db } from "@/shared/db";
import { tenants, users } from "@/shared/db/schema";
import { logger } from "@/shared/logger";
import { redis } from "@/shared/redis";
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
// Rate limiters (module-level — not per-request)
// ---------------------------------------------------------------------------

/**
 * IP-based rate limiter for public endpoints.
 * 60 requests per minute per IP+path.
 */
const ipRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:ip",
});

/**
 * User-based rate limiter for authenticated endpoints.
 * 300 requests per minute per userId+path.
 */
const userRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "1 m"),
  prefix: "rl:user",
});

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
  /** Unique identifier for this request — used for log correlation and Sentry context. */
  requestId: string;
  /** Raw Request object from the tRPC handler — used for header extraction. */
  req: Request;
};

/**
 * Create the request context.
 *
 * Called once per tRPC request. Responsible for:
 * 1. Retrieving the WorkOS session
 * 2. Resolving the tenant from subdomain, header, or session (with Redis cache)
 * 3. Generating a unique requestId for log correlation
 * 4. Providing db access
 */
export async function createContext({
  req,
}: {
  req: Request;
}): Promise<Context> {
  // Generate a unique request ID for log correlation.
  const requestId = crypto.randomUUID();

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

  // Resolve tenantId from slug — check Redis cache before hitting the DB.
  let tenantId = "default";
  if (tenantSlug !== "default") {
    const cacheKey = `tenant:slug:${tenantSlug}`;
    let resolvedTenantId: string | null = null;

    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        resolvedTenantId = cached;
        logger.debug({ tenantSlug, tenantId: resolvedTenantId, requestId }, "Tenant resolved from Redis cache");
      } else {
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.slug, tenantSlug),
          columns: { id: true },
        });
        if (tenant) {
          resolvedTenantId = tenant.id;
          await redis.setex(cacheKey, 300, resolvedTenantId); // 5-min TTL
          logger.debug({ tenantSlug, tenantId: resolvedTenantId, requestId }, "Tenant resolved from DB (cached)");
        } else {
          logger.warn({ tenantSlug, requestId }, "Tenant not found for slug");
        }
      }
    } catch (err) {
      logger.error({ tenantSlug, err, requestId }, "Failed to resolve tenantId from slug");
    }

    if (resolvedTenantId) {
      tenantId = resolvedTenantId;
    }
  }

  return {
    db,
    session,
    tenantId,
    tenantSlug,
    user: null,
    requestId,
    req,
  };
}

// ---------------------------------------------------------------------------
// tRPC initialisation
// ---------------------------------------------------------------------------

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    // Capture unexpected errors to Sentry (not user-facing errors like NOT_FOUND/BAD_REQUEST).
    if (
      error.code === "INTERNAL_SERVER_ERROR" ||
      (error.code === "FORBIDDEN" && error.cause?.name !== "ForbiddenError")
    ) {
      Sentry.captureException(error.cause ?? error, {
        extra: {
          path: shape.data?.path,
          requestId: ctx?.requestId,
          tenantId: ctx?.tenantId,
        },
        user: ctx?.session?.user
          ? { id: ctx.session.user.id, email: ctx.session.user.email }
          : undefined,
      });
    }
    return shape;
  },
});

// ---------------------------------------------------------------------------
// Logging middleware
// ---------------------------------------------------------------------------

const loggingMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  logger.info({ requestId: ctx.requestId, path, duration }, "tRPC request");
  return result;
});

// ---------------------------------------------------------------------------
// Rate limiting middleware
// ---------------------------------------------------------------------------

/**
 * IP-based rate limiting for public procedures.
 * Skipped when UPSTASH_REDIS_REST_URL is not set (development) or in test env.
 */
const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
  if (!process.env.UPSTASH_REDIS_REST_URL || process.env.NODE_ENV === "test") {
    return next();
  }
  const ip =
    ctx.req.headers.get("x-forwarded-for") ??
    ctx.req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const identifier = `${ip}:${path}`;
  const { success } = await ipRatelimit.limit(identifier);
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded",
    });
  }
  return next();
});

// ---------------------------------------------------------------------------
// Base exports
// ---------------------------------------------------------------------------

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

// ---------------------------------------------------------------------------
// Public procedure — rate limited per IP
// ---------------------------------------------------------------------------

export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(rateLimitMiddleware);

// ---------------------------------------------------------------------------
// Protected procedure — requires a WorkOS session
// ---------------------------------------------------------------------------

/**
 * Requires an authenticated WorkOS session.
 * Throws UNAUTHORIZED if session is null.
 */
export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(async ({ ctx, next }) => {
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
 * User record is loaded into context. Applies user-based rate limiting.
 */
export const tenantProcedure = protectedProcedure.use(
  async ({ ctx, next, path }) => {
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

    // User-based rate limiting — applied after user is resolved.
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.NODE_ENV !== "test") {
      const { success: userSuccess } = await userRatelimit.limit(`${userWithRoles.id}:${path}`);
      if (!userSuccess) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded",
        });
      }
    }

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
