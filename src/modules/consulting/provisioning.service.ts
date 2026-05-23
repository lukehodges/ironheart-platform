/**
 * Consulting Provisioning Service
 *
 * Orchestrates client tenant provisioning when an engagement transitions
 * to CONTRACTED stage:
 *
 *   1. Create WorkOS Organization
 *   2. Create internal `tenants` row linked via `workosOrgId`
 *   3. Enable client module set on `tenant_modules`
 *   4. Update engagement: set `clientTenantId`
 *   5. Send WorkOS invitation to primary contact with `admin` role
 *   6. Emit `tenant/provisioned` Inngest event
 *
 * Architecture decisions:
 *   D-09  — WorkOS only; no magic links / PortalSession auth
 *   D-09.2 — Primary contact = admin role; 7-day invite expiry (WorkOS default)
 *   D-01  — Ironheart tenant resolved via IRONHEART_TENANT_ID env var or slug lookup
 *
 * MERGED from prior implementation:
 *   - Preserved: stage context (engagement stage is available but not enforced
 *     here — the caller / stage-transition hook decides when to invoke)
 *   - Replaced: platformService.provisionTenant() delegation with direct WorkOS +
 *     DB orchestration so we can store workosOrgId and send the invitation
 *   - Replaced: engagement/tenant-provisioned event with tenant/provisioned
 *   - Removed: throwing on already-provisioned (now idempotent — returns existing)
 *   - Removed: ironheartTenantId param (resolved internally via env var / DB)
 */

import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { inngest } from "@/shared/inngest";
import * as workos from "@/shared/workos";
import { tenants } from "@/shared/db/schema";
import { engagements, customers } from "@/shared/db/schema";
import { modules, tenantModules, organizationSettings } from "@/shared/db/schema";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { eq, inArray } from "drizzle-orm";

const log = logger.child({ module: "consulting.provisioning" });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESERVED_SLUGS = [
  "platform",
  "auth",
  "api",
  "book",
  "admin",
  "dashboard",
  "www",
  "app",
  "select-tenant",
];

/**
 * Modules enabled on every client tenant. These map to slug values in the
 * `modules` table. tenantModules uses a UUID FK (moduleId), so we do a
 * by-slug lookup at provisioning time.
 */
const CLIENT_MODULE_SET = [
  "client-portal",
  "onboarding",
  "audit-view",
  "forms",
  "bookings",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProvisionResult {
  tenantId: string;
  slug: string;
  workosOrgId: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const provisioningService = {
  /**
   * Provision a client tenant for an engagement.
   *
   * Resolves the Ironheart tenant internally (IRONHEART_TENANT_ID env var or
   * slug="ironheart" lookup). The PROVISIONED tenant is the CLIENT's tenant,
   * distinct from Luke's Ironheart platform tenant.
   *
   * Idempotent: if `engagement.clientTenantId` is already set and the tenant
   * row exists, returns the existing result without creating duplicates.
   */
  async provisionClientTenant(engagementId: string): Promise<ProvisionResult> {
    log.info({ engagementId }, "Provisioning client tenant");

    // Resolve the Ironheart (operator) tenant ID to scope the engagement query
    const ironheartTenantId = await resolveIronheartTenantId();

    // --- Load engagement ---
    const engagementRows = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .limit(1);
    const engagement = engagementRows[0] ?? null;

    if (!engagement) {
      throw new NotFoundError("Engagement", engagementId);
    }

    // Scope check — engagement must belong to Ironheart tenant
    if (engagement.tenantId !== ironheartTenantId) {
      throw new NotFoundError("Engagement", engagementId);
    }

    // --- IDEMPOTENT guard ---
    if (engagement.clientTenantId) {
      const existingRows = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, engagement.clientTenantId))
        .limit(1);
      const existing = existingRows[0] ?? null;

      if (existing) {
        log.info(
          { engagementId, tenantId: existing.id },
          "Client tenant already provisioned — returning existing"
        );
        return {
          tenantId: existing.id,
          slug: existing.slug,
          workosOrgId: existing.workosOrgId ?? "",
        };
      }
    }

    // --- Load customer ---
    const customerRows = await db
      .select()
      .from(customers)
      .where(eq(customers.id, engagement.customerId))
      .limit(1);
    const customer = customerRows[0] ?? null;

    if (!customer) {
      throw new NotFoundError("Customer", engagement.customerId);
    }

    // Company name: stored in customer.notes per Task 2 tech-debt comment in
    // consulting.service.ts. Fall back to firstName + lastName if not present.
    const companyName =
      customer.notes?.trim() ||
      `${customer.firstName} ${customer.lastName ?? ""}`.trim();

    if (!companyName) {
      throw new BadRequestError(
        "Customer has no company name — cannot generate tenant slug"
      );
    }

    // Primary contact email is required for WorkOS invitation
    if (!customer.email) {
      throw new BadRequestError(
        "Customer has no email address — cannot send WorkOS invitation"
      );
    }
    const contactEmail = customer.email;

    // --- Generate slug ---
    const slug = await this.generateUniqueSlug(companyName);

    // --- Create WorkOS organization ---
    const workosOrg = await workos.createOrganization({ name: companyName });

    // --- Transaction: tenant row + org settings + modules + engagement link ---
    const now = new Date();
    const newTenantId = crypto.randomUUID();

    const result = await db.transaction(async (tx) => {
      // 1. Insert tenant row
      const [tenant] = await tx
        .insert(tenants)
        .values({
          id: newTenantId,
          name: companyName,
          slug,
          workosOrgId: workosOrg.id,
          plan: "STARTER",
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!tenant) {
        throw new Error("Failed to insert tenant row");
      }

      // 2. Create organizationSettings row with sensible defaults
      await tx.insert(organizationSettings).values({
        tenantId: tenant.id,
        businessName: companyName,
        email: contactEmail,
        timezone: "Europe/London",
        currency: "GBP",
        dateFormat: "dd/MM/yyyy",
        timeFormat: "HH:mm",
        weekStartsOn: 1,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Enable client module set — tenantModules uses moduleId UUID FK,
      //    so we must look up modules by slug first (same pattern as platform.service.ts)
      const moduleRows =
        CLIENT_MODULE_SET.length > 0
          ? await tx
              .select({ id: modules.id, slug: modules.slug })
              .from(modules)
              .where(inArray(modules.slug, CLIENT_MODULE_SET))
          : [];

      for (const mod of moduleRows) {
        await tx.insert(tenantModules).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          moduleId: mod.id,
          isEnabled: true,
          config: {},
          createdAt: now,
          updatedAt: now,
        });
      }

      // 4. Link engagement to the new client tenant
      await tx
        .update(engagements)
        .set({ clientTenantId: tenant.id, updatedAt: now })
        .where(eq(engagements.id, engagementId));

      return tenant;
    });

    // --- Send WorkOS invitation (outside transaction — external call) ---
    let invitation: { id: string; email: string } | null = null;
    try {
      const sent = await workos.sendInvitation({
        email: contactEmail,
        organizationId: workosOrg.id,
        roleSlug: "admin",
        // expiresInDays defaults to 7 per D-09.2 / workos.ts wrapper default
      });
      invitation = { id: sent.id, email: sent.email };
      log.info(
        { engagementId, tenantId: result.id, invitationId: sent.id },
        "WorkOS invitation sent"
      );
    } catch (err) {
      log.error(
        { err, engagementId, tenantId: result.id },
        "Failed to send WorkOS invitation — tenant provisioned, invite must be resent manually"
      );
      // Don't roll back the tenant; the invite can be resent via the UI
    }

    // --- Emit Inngest event ---
    await inngest.send({
      name: "tenant/provisioned",
      data: {
        engagementId,
        tenantId: result.id,
        workosOrgId: workosOrg.id,
        invitedEmail: contactEmail,
        invitationId: invitation?.id ?? null,
      },
    });

    log.info(
      { engagementId, tenantId: result.id, workosOrgId: workosOrg.id },
      "Client tenant provisioned"
    );

    return {
      tenantId: result.id,
      slug: result.slug,
      workosOrgId: workosOrg.id,
    };
  },

  /**
   * Generate a URL-safe slug from a company name, guaranteed unique in the DB.
   * Avoids the RESERVED_SLUGS list.
   */
  async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    if (!base) {
      throw new BadRequestError(`Cannot generate slug from name: "${name}"`);
    }

    // Check reserved list
    if (RESERVED_SLUGS.includes(base)) {
      return this.tryNumberedSlug(base, 2);
    }

    // Check DB uniqueness
    const existingRows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, base))
      .limit(1);
    const existing = existingRows[0] ?? null;

    if (!existing) return base;

    return this.tryNumberedSlug(base, 2);
  },

  /**
   * Append a numeric suffix until we find a unique slug.
   * Tries up to 100 variants before giving up.
   */
  async tryNumberedSlug(base: string, start: number): Promise<string> {
    for (let i = start; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (RESERVED_SLUGS.includes(candidate)) continue;

      const existingRows = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, candidate))
        .limit(1);
      const existing = existingRows[0] ?? null;

      if (!existing) return candidate;
    }
    throw new BadRequestError(
      `Could not generate unique slug for base "${base}" — tried up to 100 variants`
    );
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the Ironheart operator tenant ID.
 * Mirrors the same pattern in consulting.service.ts (Task 2).
 */
async function resolveIronheartTenantId(): Promise<string> {
  if (process.env.IRONHEART_TENANT_ID) {
    return process.env.IRONHEART_TENANT_ID;
  }

  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, "ironheart"))
    .limit(1);
  const row = rows[0] ?? null;

  if (!row) {
    throw new BadRequestError(
      "Ironheart tenant not provisioned; set IRONHEART_TENANT_ID env var or create tenant with slug 'ironheart'"
    );
  }

  return row.id;
}
