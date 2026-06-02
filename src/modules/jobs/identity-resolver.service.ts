/**
 * Identity resolver — turn (source, externalId) or (tenant, email) into
 * an internal contact/company pair.
 *
 * Lookup chain:
 *   1. identities table — (tenantId, source, externalId) → entity_id
 *   2. contacts.email — match against tenantId scope
 *   3. autoCreate=true → mint company (from email domain) + contact, write
 *      identity row, return the pair
 *   4. otherwise return null
 *
 * resolveCompany is symmetric but keyed by domain.
 */

import { db } from "@/shared/db";
import { identities, contacts, companies } from "@/shared/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "jobs.identity-resolver" });

// ---------------------------------------------------------------------------
// resolveContact
// ---------------------------------------------------------------------------

export interface ResolveContactInput {
  tenantId: string;
  email?: string;
  externalId?: string;
  source: string;
  autoCreate?: boolean;
}

export interface ResolveContactResult {
  contactId: string;
  companyId: string;
}

export async function resolveContact(
  input: ResolveContactInput,
): Promise<ResolveContactResult | null> {
  const { tenantId, source, email, externalId, autoCreate = false } = input;

  // 1. identities table lookup
  if (externalId) {
    const idRows = await db
      .select()
      .from(identities)
      .where(
        and(
          eq(identities.tenantId, tenantId),
          eq(identities.source, source),
          eq(identities.externalId, externalId),
          eq(identities.entityType, "contact"),
        ),
      )
      .limit(1);

    if (idRows[0]) {
      // identities.entityId is the contact id; fetch company via contacts row
      const contactRow = await db
        .select({
          id: contacts.id,
          companyId: contacts.companyId,
        })
        .from(contacts)
        .where(
          and(eq(contacts.id, idRows[0].entityId), eq(contacts.tenantId, tenantId)),
        )
        .limit(1);

      if (contactRow[0]) {
        return { contactId: contactRow[0].id, companyId: contactRow[0].companyId };
      }
      // Identity points at a non-existent contact — fall through to email path
    }
  }

  // 2. contacts.email lookup
  if (email) {
    const contactRows = await db
      .select({ id: contacts.id, companyId: contacts.companyId })
      .from(contacts)
      .where(
        and(eq(contacts.tenantId, tenantId), eq(contacts.email, email.toLowerCase())),
      )
      .limit(1);

    if (contactRows[0]) {
      // Backfill identity row so next lookup hits the fast path
      if (externalId) {
        await db
          .insert(identities)
          .values({
            tenantId,
            entityType: "contact",
            entityId: contactRows[0].id,
            source,
            externalId,
          })
          .onConflictDoNothing({
            target: [identities.tenantId, identities.source, identities.externalId],
          });
      }
      return { contactId: contactRows[0].id, companyId: contactRows[0].companyId };
    }
  }

  // 3. autoCreate path
  if (autoCreate && email) {
    const company = await resolveCompany({
      tenantId,
      domain: extractDomain(email),
      source,
      autoCreate: true,
    });
    if (!company) {
      log.warn(
        { tenantId, email, source },
        "autoCreate contact: resolveCompany returned null — bailing",
      );
      return null;
    }

    const [created] = await db
      .insert(contacts)
      .values({
        tenantId,
        companyId: company.companyId,
        fullName: email.split("@")[0] ?? email,
        email: email.toLowerCase(),
      })
      .returning({ id: contacts.id, companyId: contacts.companyId });

    if (!created) {
      log.error({ tenantId, email }, "autoCreate contact: insert returned nothing");
      return null;
    }

    if (externalId) {
      await db
        .insert(identities)
        .values({
          tenantId,
          entityType: "contact",
          entityId: created.id,
          source,
          externalId,
        })
        .onConflictDoNothing({
          target: [identities.tenantId, identities.source, identities.externalId],
        });
    }

    log.info(
      { tenantId, contactId: created.id, companyId: created.companyId, source },
      "Auto-created contact via identity resolver",
    );
    return { contactId: created.id, companyId: created.companyId };
  }

  return null;
}

// ---------------------------------------------------------------------------
// resolveCompany
// ---------------------------------------------------------------------------

export interface ResolveCompanyInput {
  tenantId: string;
  domain?: string;
  externalId?: string;
  source: string;
  autoCreate?: boolean;
  /** Used as company.name on autoCreate when domain is empty (e.g. gmail address). */
  fallbackName?: string;
}

export interface ResolveCompanyResult {
  companyId: string;
}

export async function resolveCompany(
  input: ResolveCompanyInput,
): Promise<ResolveCompanyResult | null> {
  const { tenantId, domain, externalId, source, autoCreate = false, fallbackName } =
    input;

  // 1. identities lookup
  if (externalId) {
    const idRows = await db
      .select()
      .from(identities)
      .where(
        and(
          eq(identities.tenantId, tenantId),
          eq(identities.source, source),
          eq(identities.externalId, externalId),
          eq(identities.entityType, "company"),
        ),
      )
      .limit(1);

    if (idRows[0]) {
      return { companyId: idRows[0].entityId };
    }
  }

  // 2. companies.domain lookup
  if (domain) {
    const companyRows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.domain, domain)))
      .limit(1);

    if (companyRows[0]) {
      if (externalId) {
        await db
          .insert(identities)
          .values({
            tenantId,
            entityType: "company",
            entityId: companyRows[0].id,
            source,
            externalId,
          })
          .onConflictDoNothing({
            target: [identities.tenantId, identities.source, identities.externalId],
          });
      }
      return { companyId: companyRows[0].id };
    }
  }

  // 3. autoCreate
  if (autoCreate) {
    const name = fallbackName ?? domain ?? `Unknown (${source})`;
    const [created] = await db
      .insert(companies)
      .values({
        tenantId,
        name,
        domain: domain ?? null,
      })
      .returning({ id: companies.id });

    if (!created) {
      log.error({ tenantId, domain, source }, "autoCreate company: insert returned nothing");
      return null;
    }

    if (externalId) {
      await db
        .insert(identities)
        .values({
          tenantId,
          entityType: "company",
          entityId: created.id,
          source,
          externalId,
        })
        .onConflictDoNothing({
          target: [identities.tenantId, identities.source, identities.externalId],
        });
    }

    log.info(
      { tenantId, companyId: created.id, domain, source },
      "Auto-created company via identity resolver",
    );
    return { companyId: created.id };
  }

  return null;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return email.toLowerCase();
  return email.slice(at + 1).toLowerCase();
}
