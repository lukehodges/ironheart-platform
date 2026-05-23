/**
 * WorkOS Management API — typed wrapper
 *
 * Provides a singleton WorkOS client and typed helper functions for:
 *   - Organization management (create)
 *   - User invitations (send, revoke, list pending)
 *   - User lookup and organization memberships
 *
 * Architecture decision D-09: WorkOS is the ONLY auth provider.
 * Architecture decision D-09.2: admin role for primary contact; member for
 *   additional users; invitation expiry defaults to 7 days (WorkOS default);
 *   resend invite is supported via the SDK directly.
 *
 * Error handling: ExternalServiceError does not exist in errors.ts. We extend
 * IronheartError with a new ExternalServiceError class defined here, using the
 * code "EXTERNAL_SERVICE_ERROR" which maps to INTERNAL_SERVER_ERROR in tRPC.
 * This is intentional — a WorkOS failure is an infrastructure error, not a
 * client error.
 */

import { WorkOS, DomainDataState } from "@workos-inc/node";
import { IronheartError } from "@/shared/errors";
import { logger } from "@/shared/logger";

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

export const workos: WorkOS = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID,
});

// ---------------------------------------------------------------------------
// Domain error
// ExternalServiceError is not in the shared errors catalogue yet. Defining it
// here co-located with its only current consumer. If/when it's promoted to
// shared/errors.ts, delete this definition and update the import.
// ---------------------------------------------------------------------------

export class ExternalServiceError extends IronheartError {
  constructor(
    public readonly service: string,
    message: string,
    public readonly context?: { cause?: unknown }
  ) {
    super(`[${service}] ${message}`, "EXTERNAL_SERVICE_ERROR");
    this.name = "ExternalServiceError";
    if (context?.cause && context.cause instanceof Error) {
      this.cause = context.cause;
    }
  }
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = logger.child({ module: "workos" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvitationState = "pending" | "accepted" | "expired" | "revoked";

// ---------------------------------------------------------------------------
// createOrganization
// ---------------------------------------------------------------------------

/**
 * Create a new WorkOS organization.
 *
 * Note: The WorkOS SDK accepts `domainData` (not `domains`) for domain
 * configuration. The domains parameter here is intentionally omitted from
 * the SDK call — pass domainData separately if needed. The spec asks for
 * `domains?: string[]` on params but the SDK requires DomainData objects
 * (with `domain` + optional `state`). We accept plain strings and map them.
 */
export async function createOrganization(params: {
  name: string;
  domains?: string[];
}): Promise<{ id: string; name: string; slug: string | null }> {
  const operation = "createOrganization";
  log.info({ operation, params: { name: params.name } }, "WorkOS call");

  try {
    const org = await workos.organizations.createOrganization({
      name: params.name,
      ...(params.domains && params.domains.length > 0
        ? {
            domainData: params.domains.map((domain) => ({
              domain,
              state: DomainDataState.Verified,
            })),
          }
        : {}),
    });

    // WorkOS Organization does not expose a `slug` field in v8 — the SDK
    // returns id, name, domains, etc. but no slug. We return null for slug
    // to satisfy the interface contract; callers should use `id` as the
    // stable identifier.
    return {
      id: org.id,
      name: org.name,
      slug: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// sendInvitation
// ---------------------------------------------------------------------------

export async function sendInvitation(params: {
  email: string;
  organizationId: string;
  roleSlug?: string;
  expiresInDays?: number;
}): Promise<{ id: string; email: string; expiresAt: string; state: string }> {
  const operation = "sendInvitation";
  log.info(
    { operation, params: { email: params.email, organizationId: params.organizationId } },
    "WorkOS call"
  );

  try {
    const invitation = await workos.userManagement.sendInvitation({
      email: params.email,
      organizationId: params.organizationId,
      roleSlug: params.roleSlug ?? "member",
      expiresInDays: params.expiresInDays ?? 7,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      state: invitation.state,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// revokeInvitation
// ---------------------------------------------------------------------------

export async function revokeInvitation(params: {
  invitationId: string;
}): Promise<void> {
  const operation = "revokeInvitation";
  log.info({ operation, params }, "WorkOS call");

  try {
    await workos.userManagement.revokeInvitation(params.invitationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// listPendingInvitations
// ---------------------------------------------------------------------------

/**
 * List pending invitations for an organization.
 *
 * Note: The WorkOS Invitation object does not expose `roleSlug` — only the
 * invitation send options include a role slug, but the stored invitation record
 * does not carry it back. We return `null` for `roleSlug` to honour the
 * interface contract. Callers that need role information must look it up via
 * organization memberships after the invitation is accepted.
 */
export async function listPendingInvitations(params: {
  organizationId: string;
}): Promise<
  Array<{
    id: string;
    email: string;
    state: string;
    expiresAt: string;
    roleSlug: string | null;
  }>
> {
  const operation = "listPendingInvitations";
  log.info({ operation, params }, "WorkOS call");

  try {
    const result = await workos.userManagement.listInvitations({
      organizationId: params.organizationId,
    });

    const invitations = await result.autoPagination();

    return invitations
      .filter((inv) => inv.state === "pending")
      .map((inv) => ({
        id: inv.id,
        email: inv.email,
        state: inv.state,
        expiresAt: inv.expiresAt,
        roleSlug: null, // SDK Invitation type does not expose roleSlug
      }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

export async function getUser(params: {
  workosUserId: string;
}): Promise<{
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
} | null> {
  const operation = "getUser";
  log.info({ operation, params: { workosUserId: params.workosUserId } }, "WorkOS call");

  try {
    const user = await workos.userManagement.getUser(params.workosUserId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch (err) {
    // WorkOS throws on 404 — return null for not-found rather than propagating
    const message = err instanceof Error ? err.message : String(err);
    if (
      err instanceof Error &&
      "status" in err &&
      (err as { status?: number }).status === 404
    ) {
      log.info({ operation, params }, "WorkOS user not found, returning null");
      return null;
    }

    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}

// ---------------------------------------------------------------------------
// getUserOrganizationMemberships
// ---------------------------------------------------------------------------

export async function getUserOrganizationMemberships(params: {
  workosUserId: string;
}): Promise<
  Array<{
    id: string;
    organizationId: string;
    userId: string;
    roleSlug: string;
    status: string;
  }>
> {
  const operation = "getUserOrganizationMemberships";
  log.info({ operation, params }, "WorkOS call");

  try {
    const result = await workos.userManagement.listOrganizationMemberships({
      userId: params.workosUserId,
    });

    const memberships = await result.autoPagination();

    return memberships.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      // m.role is RoleResponse { slug: string }
      roleSlug: m.role?.slug ?? "member",
      status: m.status,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ operation, error: err }, "WorkOS call failed");
    throw new ExternalServiceError("WorkOS", `${operation} failed: ${message}`, {
      cause: err,
    });
  }
}
