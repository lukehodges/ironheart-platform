/**
 * Tenant resolution helpers for middleware.
 *
 * Extracted as a standalone module so they can be unit-tested without
 * constructing a full NextRequest / NextFetchEvent chain.
 */

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { tenants, type Tenant } from "@/shared/db/schemas/tenant.schema";
import { redis } from "@/shared/redis";
import { getUserOrganizationMemberships } from "@/shared/workos";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Top-level path segments that are never tenant slugs.
 * Must stay in sync with Next.js app-dir layout and auth.config.ts.
 */
export const RESERVED_TOP_LEVEL = new Set([
  "platform",
  "api",
  "auth",
  "_next",
  "public",
  "book",
  "sign-in",
  "sign-out",
  "select-tenant",
  "admin",
  "dashboard",
  "signup",
  "confirmation",
  "review",
  "forms",
  "products",
  "portal",
  "mockups",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
]);

const MEMBERSHIP_CACHE_TTL_SEC = 5 * 60; // 5 minutes

// ---------------------------------------------------------------------------
// Tenant slug extraction
// ---------------------------------------------------------------------------

/**
 * Given a URL pathname, extract the first path segment if it looks like a
 * potential tenant slug (i.e. it is not a reserved top-level segment).
 *
 * Returns `null` for root `/`, reserved segments, or empty strings.
 */
export function extractPotentialTenantSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const first = segments[0];
  if (RESERVED_TOP_LEVEL.has(first)) return null;
  return first;
}

// ---------------------------------------------------------------------------
// DB lookup
// ---------------------------------------------------------------------------

/**
 * Look up a tenant row by slug.
 * Returns `null` if no tenant exists with that slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });
  return tenant ?? null;
}

// ---------------------------------------------------------------------------
// WorkOS membership check (Redis-cached)
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `workosUserId` is a member of `workosOrgId`.
 *
 * Result is cached in Redis for `MEMBERSHIP_CACHE_TTL_SEC` seconds to avoid
 * hammering the WorkOS API on every request.
 */
export async function isMemberOfOrg(
  workosUserId: string,
  workosOrgId: string
): Promise<boolean> {
  const cacheKey = `membership:${workosUserId}:${workosOrgId}`;

  const cached = await redis.get<string>(cacheKey);
  if (cached === "yes") return true;
  if (cached === "no") return false;

  const memberships = await getUserOrganizationMemberships({ workosUserId });
  const member = memberships.some((m) => m.organizationId === workosOrgId);

  await redis.set(cacheKey, member ? "yes" : "no", {
    ex: MEMBERSHIP_CACHE_TTL_SEC,
  });

  return member;
}
