/**
 * WorkOS AuthKit configuration.
 *
 * Required environment variables:
 *   WORKOS_CLIENT_ID       - From WorkOS dashboard → API Keys
 *   WORKOS_API_KEY         - From WorkOS dashboard → API Keys
 *   WORKOS_REDIRECT_URI    - http://localhost:3000/api/auth/callback (dev)
 *   WORKOS_COOKIE_PASSWORD - 32+ char random string (openssl rand -base64 32)
 *
 * @see https://workos.com/docs/user-management
 */

/** WorkOS user object shape (returned by getSession() from the SDK) */
export type WorkOSUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * WorkOS session shape - available in tRPC context after authentication.
 */
export type WorkOSSession = {
  user: WorkOSUser;
  accessToken: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
};

export const AUTH_SIGNIN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/api/auth/callback";
export const AUTH_SIGNOUT_REDIRECT = "/sign-in";

/**
 * Routes that do NOT require authentication.
 */
export const PUBLIC_ROUTES: string[] = [
  "/",
  "/sign-in",
  "/sign-out",
  "/api/auth/callback",
  "/api/inngest",
  "/api/trpc",
  "/book",
  "/confirmation",
  "/auth/account-not-found",
];

export const PUBLIC_ROUTE_PREFIXES: string[] = [
  "/book/",
  "/api/auth/",
  "/api/inngest",
  "/_next/",
];
