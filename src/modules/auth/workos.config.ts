/**
 * WorkOS AuthKit configuration.
 *
 * WorkOS is a hosted auth service - it manages its own user records externally.
 * There is no database conflict with the Drizzle users table.
 *
 * Phase 0: Config scaffold only.
 * Phase 3: Wire WorkOS session into tRPC context and link WorkOS user IDs
 *           to Drizzle users table records via a userId mapping.
 *
 * Environment variables required:
 *   WORKOS_CLIENT_ID      - From WorkOS dashboard → API Keys
 *   WORKOS_API_KEY        - From WorkOS dashboard → API Keys
 *   WORKOS_REDIRECT_URI   - e.g., http://localhost:3000/api/auth/callback
 *   WORKOS_COOKIE_PASSWORD - 32+ char random string for cookie encryption
 *
 * @see https://workos.com/docs/user-management
 */

// The @workos-inc/authkit-nextjs SDK reads WORKOS_CLIENT_ID, WORKOS_API_KEY,
// WORKOS_REDIRECT_URI, and WORKOS_COOKIE_PASSWORD from the environment automatically.
// No explicit client instantiation is required for the AuthKit flow.
// This file documents the contract and exports the session helper type for use
// in the tRPC context (Phase 3).

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

export type WorkOSSession = {
  user: WorkOSUser;
  accessToken: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
};

/**
 * Sign-in URL for redirecting unauthenticated users.
 * Used by middleware and protected page layouts.
 * Full integration in Phase 3.
 */
export const AUTH_SIGNIN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/api/auth/callback";
