import { authkitMiddleware, authkit } from "@workos-inc/authkit-nextjs";
import { NextResponse, NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { extractSubdomainFromHostname } from "./tenant";
import {
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PREFIXES,
  AUTH_SIGNIN_PATH,
} from "./auth.config";
import {
  extractPotentialTenantSlug,
  getTenantBySlug,
  isMemberOfOrg,
} from "@/lib/auth/tenant-resolver";

// Emergency rollback: set AUTH_PROVIDER=legacy to disable WorkOS enforcement
// without a code deploy.
const AUTH_PROVIDER = process.env.AUTH_PROVIDER ?? "workos";

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function injectTenantHeaders(req: NextRequest): Headers {
  const requestHeaders = new Headers(req.headers);
  const overrideCookie = req.cookies.get("platform_tenant_slug")?.value;
  if (overrideCookie) {
    requestHeaders.set("x-tenant-slug", decodeURIComponent(overrideCookie));
    return requestHeaders;
  }
  const hostname = req.headers.get("host") ?? "";
  const subdomain = extractSubdomainFromHostname(hostname);
  if (subdomain) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }
  return requestHeaders;
}

// Build the WorkOS middleware once (module-level) so it is not re-instantiated
// on every request.
const workosMiddleware = authkitMiddleware({
  redirectUri: process.env.WORKOS_REDIRECT_URI ?? AUTH_SIGNIN_PATH,
});

export async function ironheartMiddleware(
  req: NextRequest,
  event: NextFetchEvent
): Promise<NextResponse | Response> {
  const { pathname } = req.nextUrl;

  // Inject tenant headers for all requests.
  const requestHeaders = injectTenantHeaders(req);

  // Legacy rollback path - no WorkOS auth enforcement.
  if (AUTH_PROVIDER === "legacy") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Public routes: pass through without auth check.
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Protected routes: delegate to WorkOS authkitMiddleware.
  // Construct a new NextRequest with the injected tenant headers so the
  // x-tenant-slug header is forwarded to RSC / route handlers downstream.
  // NextRequest(url, init) is the standard constructor in the Edge runtime.
  const modifiedReq = new NextRequest(req.url, {
    method: req.method,
    headers: requestHeaders,
    // body is omitted intentionally: middleware runs before the body is
    // consumed and cannot be streamed here in Edge.
  });

  const result = await workosMiddleware(modifiedReq, event);

  // authkitMiddleware returns NextMiddlewareResult which may be null/undefined
  // (meaning "pass through"). Normalise to a NextResponse.
  if (result == null) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // If authkitMiddleware issued a redirect (e.g. to sign-in), let it through
  // immediately — no tenant resolution needed.
  if (result.status >= 300 && result.status < 400) {
    return result;
  }

  // ---------------------------------------------------------------------------
  // Tenant resolution layer
  //
  // Only runs for /[tenantSlug]/* paths — i.e. the first path segment is not a
  // reserved top-level segment AND matches a tenant slug in the database.
  // ---------------------------------------------------------------------------
  const potentialSlug = extractPotentialTenantSlug(pathname);
  if (potentialSlug) {
    const tenant = await getTenantBySlug(potentialSlug);

    if (tenant) {
      // Retrieve the current session without triggering a redirect — authkit
      // reads the session cookie directly, same as withAuth() in RSCs.
      const { session } = await authkit(req);

      if (!session.user) {
        // No session — redirect to sign-in with return URL.
        const loginUrl = new URL("/sign-in", req.url);
        loginUrl.searchParams.set("returnPathname", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!tenant.workosOrgId) {
        // Tenant has no WorkOS org linked — shouldn't happen post-provisioning,
        // but guard gracefully.
        return NextResponse.redirect(
          new URL("/select-tenant?reason=unprovisioned", req.url)
        );
      }

      const member = await isMemberOfOrg(session.user.id, tenant.workosOrgId);
      if (!member) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      // Attach tenant identity headers for downstream RSC / route handlers.
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set("x-tenant-id", tenant.id);
      response.headers.set("x-tenant-slug", tenant.slug);
      response.headers.set("x-workos-org-id", tenant.workosOrgId);
      return response;
    }
  }

  return result;
}
