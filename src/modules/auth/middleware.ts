import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse, NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { extractSubdomainFromHostname } from "./tenant";
import {
  PUBLIC_ROUTES,
  PUBLIC_ROUTE_PREFIXES,
  AUTH_SIGNIN_PATH,
} from "./auth.config";

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

  return result;
}
