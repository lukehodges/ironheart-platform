/**
 * Tenant detection utilities.
 *
 * Resolution order:
 *   1. X-Tenant-Slug header (set by middleware from subdomain)
 *   2. platform_tenant_slug cookie
 *   3. DEFAULT_TENANT_SLUG environment variable
 */

export function extractTenantSlugFromRequest(req: Request): {
  slug: string | null;
  source: "header" | "cookie" | "default" | null;
} {
  const headerSlug = req.headers.get("x-tenant-slug");
  if (headerSlug) return { slug: headerSlug, source: "header" };

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/platform_tenant_slug=([^;]+)/);
  if (cookieMatch?.[1]) {
    return { slug: decodeURIComponent(cookieMatch[1]), source: "cookie" };
  }

  const defaultSlug = process.env.DEFAULT_TENANT_SLUG;
  if (defaultSlug) return { slug: defaultSlug, source: "default" };

  return { slug: null, source: null };
}

/**
 * Extract subdomain from hostname.
 * "cotswolds.ironheart.app" → "cotswolds"
 * "localhost:3000" → null
 */
export function extractSubdomainFromHostname(hostname: string): string | null {
  const host = hostname.split(":")[0];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split(".");
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  const reserved = ["www", "app", "api", "localhost", "staging", "preview"];
  if (!subdomain || reserved.includes(subdomain)) return null;
  return subdomain;
}

export function tenantCacheKey(slug: string): string {
  return `tenant:slug:${slug}`;
}

export function isPublicPath(pathname: string, publicPaths: string[]): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}
