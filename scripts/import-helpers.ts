/**
 * Shared helpers for outreach CSV importers.
 *
 * Used by:
 *   - scripts/import-dnc.ts
 *   - scripts/import-send-list.ts
 *   - scripts/import-apollo.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/shared/db/schema";

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

export function makeDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });
  return { client, db };
}

export type ImportDb = ReturnType<typeof makeDb>["db"];

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

export interface CliFlags {
  file?: string;
  tenant?: string;
  dryRun: boolean;
}

export function parseFlags(argv: string[]): CliFlags {
  const args = argv.slice(2);
  const out: CliFlags = { dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--file" && args[i + 1]) {
      out.file = args[++i];
    } else if (a === "--tenant" && args[i + 1]) {
      out.tenant = args[++i];
    } else if (a === "--dry-run" || a === "--dryrun") {
      out.dryRun = true;
    }
  }
  if (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true") {
    out.dryRun = true;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the target tenant ID. Order of precedence:
 *   1. --tenant <slug> CLI flag
 *   2. DEFAULT_TENANT_SLUG env var
 *   3. IRONHEART_TENANT_ID env var (direct UUID)
 *   4. fallback: query tenants WHERE slug = 'ironheart'
 */
export async function resolveTenantId(
  db: ImportDb,
  slugFlag?: string,
): Promise<string> {
  const slug = slugFlag ?? process.env.DEFAULT_TENANT_SLUG;
  if (slug) {
    const [row] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);
    if (!row) throw new Error(`Tenant with slug '${slug}' not found`);
    return row.id;
  }
  if (process.env.IRONHEART_TENANT_ID) {
    return process.env.IRONHEART_TENANT_ID;
  }
  const [row] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "ironheart"))
    .limit(1);
  if (!row) {
    throw new Error(
      "Could not resolve tenant: no --tenant flag, DEFAULT_TENANT_SLUG, IRONHEART_TENANT_ID, or 'ironheart' tenant row",
    );
  }
  return row.id;
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

export function domainFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

export function domainFromWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  let s = url.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  // Strip path/query
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  return s || null;
}

export function companyNameFromDomain(domain: string): string {
  // 'kelpi.net' → 'Kelpi'
  const root = domain.split(".")[0] ?? domain;
  if (!root) return domain;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

/** Strip Excel's leading apostrophe that quotes numeric strings ('+44...). */
export function stripExcelQuote(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.startsWith("'") ? t.slice(1).trim() : t;
}

export function employeeBand(
  empCount: number | null | undefined,
): "1-2" | "3-15" | "15-50" | "50+" | null {
  if (empCount == null || Number.isNaN(empCount)) return null;
  if (empCount < 3) return "1-2";
  if (empCount < 15) return "3-15";
  if (empCount < 50) return "15-50";
  return "50+";
}

export const OWNER_SENIORITIES = new Set([
  "founder",
  "owner",
  "ceo",
  "co-founder",
]);

export const DECISION_MAKER_SENIORITIES = new Set([
  "founder",
  "owner",
  "ceo",
  "co-founder",
  "director",
  "managing director",
  "partner",
  "vp",
  "head",
  "chief",
  "c-suite",
  "c_suite",
  "c-level",
  "c_level",
  "vp_executive",
  "head_of",
]);

export function isOwnerSeniority(seniority: string | null | undefined): boolean {
  if (!seniority) return false;
  return OWNER_SENIORITIES.has(seniority.trim().toLowerCase());
}

export function isDecisionMakerSeniority(
  seniority: string | null | undefined,
): boolean {
  if (!seniority) return false;
  const s = seniority.trim().toLowerCase();
  if (DECISION_MAKER_SENIORITIES.has(s)) return true;
  // Heuristic for free-text seniority values like "Head of X"
  return (
    s.startsWith("head") ||
    s.includes("director") ||
    s.includes("vp") ||
    s.includes("chief")
  );
}
