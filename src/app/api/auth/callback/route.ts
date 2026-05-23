import { handleAuth } from "@workos-inc/authkit-nextjs";

/**
 * WorkOS AuthKit OAuth callback route.
 *
 * WorkOS redirects here after successful authentication.
 * handleAuth() exchanges the authorization code for a WorkOS session cookie.
 *
 * The session cookie is encrypted with WORKOS_COOKIE_PASSWORD.
 * After the session is saved, the user is sent to /auth/resolve where the
 * tenant routing logic determines the final destination:
 *   - Platform admin               → /platform
 *   - 0 org memberships            → /select-tenant?reason=no_tenants
 *   - Orgs but no internal tenants → /select-tenant?reason=unprovisioned
 *   - 1 matching tenant            → /[slug]/dashboard
 *   - Multiple tenants             → /select-tenant
 *
 * NOTE: handleAuth({ onSuccess }) is intentionally NOT used for routing.
 * The SDK defines onSuccess as `() => void | Promise<void>` — it cannot
 * return a redirect string. The redirect Response is created before onSuccess
 * fires (see node_modules/@workos-inc/authkit-nextjs/dist/esm/authkit-callback-route.js
 * line 80), so returning a value from onSuccess has no effect on the destination.
 * returnPathname: "/auth/resolve" is the correct override point.
 *
 * If the sign-in flow encoded a returnPathname in state (e.g. deep-link after
 * session expiry), the state value takes priority over our default and the user
 * bypasses /auth/resolve. That is intentional — the middleware in Task 6 will
 * re-check tenant access on every protected route.
 *
 * Route: GET /api/auth/callback?code=...&state=...
 */
export const GET = handleAuth({ returnPathname: "/auth/resolve" });
