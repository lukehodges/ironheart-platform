import { handleAuth } from "@workos-inc/authkit-nextjs";

/**
 * WorkOS AuthKit OAuth callback route.
 *
 * WorkOS redirects here after successful authentication.
 * handleAuth() exchanges the authorization code for a WorkOS session cookie.
 *
 * The session cookie is encrypted with WORKOS_COOKIE_PASSWORD.
 * After setting the cookie, WorkOS redirects to returnPathname (encoded in state).
 *
 * Route: GET /api/auth/callback?code=...&state=...
 */
export const GET = handleAuth();
