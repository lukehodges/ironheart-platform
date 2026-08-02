/**
 * Idempotently applies the multi-source lead intelligence schema additions:
 *   - outreach_lead_source_records  (raw JSONB per provider)
 *   - outreach_lead_provenance      (lead ↔ source join, overlap detector)
 *   - outreach_lead_tags            (origin-tagged metadata for A/B analytics)
 *   - ALTER outreach_leads ADD COLUMN IF NOT EXISTS "twentyOppId" text
 *
 * Safe to re-run — every statement is CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 * Does NOT use drizzle-kit; mirrors the exact column names from outreach.schema.ts.
 *
 *   DATABASE_URL=postgres://dev:dev@localhost:5433/ironheart_platform_dev \
 *   npx tsx --tsconfig tsconfig.json scripts/apply-intelligence-schema.ts
 */

import postgres from "postgres"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is required")

const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
const sql = postgres(DATABASE_URL, { ssl: isLocal ? false : "require", max: 1 })

async function main() {
  console.log("── APPLYING INTELLIGENCE SCHEMA ──")

  // -------------------------------------------------------------------------
  // outreach_lead_source_records
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_lead_source_records (
      "id"         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "tenantId"   uuid        NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "source"     text        NOT NULL,
      "email"      text,
      "raw"        jsonb       NOT NULL,
      "importedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_source_records_tenantId_source_idx
      ON outreach_lead_source_records ("tenantId", "source")
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_source_records_tenantId_email_idx
      ON outreach_lead_source_records ("tenantId", "email")
  `
  console.log("  ✓ outreach_lead_source_records")

  // -------------------------------------------------------------------------
  // outreach_lead_provenance
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_lead_provenance (
      "id"             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "tenantId"       uuid        NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "leadId"         uuid        NOT NULL REFERENCES outreach_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "sourceRecordId" uuid        NOT NULL REFERENCES outreach_lead_source_records(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "createdAt"      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT lead_provenance_leadId_sourceRecordId_key UNIQUE ("leadId", "sourceRecordId")
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_provenance_tenantId_leadId_idx
      ON outreach_lead_provenance ("tenantId", "leadId")
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_provenance_tenantId_sourceRecordId_idx
      ON outreach_lead_provenance ("tenantId", "sourceRecordId")
  `
  console.log("  ✓ outreach_lead_provenance")

  // -------------------------------------------------------------------------
  // outreach_lead_tags
  // -------------------------------------------------------------------------
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_lead_tags (
      "id"         uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      "tenantId"   uuid         NOT NULL REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "leadId"     uuid         NOT NULL REFERENCES outreach_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
      "namespace"  text         NOT NULL,
      "value"      text         NOT NULL,
      "origin"     text         NOT NULL,
      "confidence" numeric(5,4),
      "createdAt"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_tags_tenantId_namespace_value_idx
      ON outreach_lead_tags ("tenantId", "namespace", "value")
  `
  await sql`
    CREATE INDEX IF NOT EXISTS lead_tags_tenantId_leadId_idx
      ON outreach_lead_tags ("tenantId", "leadId")
  `
  console.log("  ✓ outreach_lead_tags")

  // -------------------------------------------------------------------------
  // ALTER outreach_leads — add twentyOppId if not already present
  // -------------------------------------------------------------------------
  await sql`
    ALTER TABLE outreach_leads
      ADD COLUMN IF NOT EXISTS "twentyOppId" text
  `
  console.log("  ✓ outreach_leads.twentyOppId (ADD COLUMN IF NOT EXISTS)")

  console.log("\n✅  Intelligence schema applied (idempotent).")
  await sql.end()
}

main().catch(async (e) => {
  console.error(e)
  await sql.end()
  process.exit(1)
})
