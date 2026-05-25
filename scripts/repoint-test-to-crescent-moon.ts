import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Slice 1 — Repoint the existing "test" tenant + customer + engagement to
 * Crescent Moon Events Ltd, ready for Simon Gerrard's login.
 *
 * Tenant slug `test` → `crescent-moon`, name `Test` → `Crescent Moon Events Ltd`.
 * Customer (John ‹luke.hodges.dev›) → Simon Gerrard ‹simon@crescent-moon.co.uk›
 *   with company "Crescent Moon Events Ltd" stored in `customers.notes`
 *   (per provisioning gotcha §h — no companyName column).
 * Engagement c950c06a-… stage → AUDITING.
 *
 * Idempotent: every UPDATE filters on the *current* target state so re-runs
 * are no-ops once applied. We also bail early if a *different* tenant already
 * owns slug `crescent-moon` (collision = fail-fast, never overwrite blind).
 *
 * WorkOS is NOT touched here — that stays manual per the brief.
 */

const ENGAGEMENT_ID = "c950c06a-1b41-4f46-9c89-660845d96bee"
const CLIENT_TENANT_ID = "bb749224-5ca0-4751-ab36-891eb8bcbd28" // current slug=test
const CUSTOMER_ID = "2df614b1-2d97-4ba8-989a-499eee81883e"

const NEW_SLUG = "crescent-moon"
const COMPANY_NAME = "Crescent Moon Events Ltd"
const FIRST_NAME = "Simon"
const LAST_NAME = "Gerrard"
const EMAIL = "simon@crescent-moon.co.uk"
const PHONE = "07976 369360"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    console.log("=== Idempotency check ===")
    const collision = await sql<
      { id: string; slug: string; name: string }[]
    >`SELECT id, slug, name FROM tenants WHERE slug = ${NEW_SLUG} AND id <> ${CLIENT_TENANT_ID}`
    if (collision.length > 0) {
      throw new Error(
        `Another tenant already owns slug '${NEW_SLUG}': ${JSON.stringify(collision[0])}`
      )
    }

    console.log("=== Step 1: Rename tenant ===")
    const tenantBefore = await sql<
      { id: string; slug: string; name: string }[]
    >`SELECT id, slug, name FROM tenants WHERE id = ${CLIENT_TENANT_ID}`
    if (tenantBefore.length === 0) {
      throw new Error(`Target tenant ${CLIENT_TENANT_ID} not found`)
    }
    console.log("Before:", tenantBefore[0])

    await sql`
      UPDATE tenants
      SET slug = ${NEW_SLUG},
          name = ${COMPANY_NAME},
          "updatedAt" = NOW()
      WHERE id = ${CLIENT_TENANT_ID}
        AND (slug <> ${NEW_SLUG} OR name <> ${COMPANY_NAME})
    `
    const tenantAfter = await sql<
      { id: string; slug: string; name: string }[]
    >`SELECT id, slug, name FROM tenants WHERE id = ${CLIENT_TENANT_ID}`
    console.log("After: ", tenantAfter[0])

    console.log("\n=== Step 2: Update customer (primary contact) ===")
    const customerBefore = await sql<
      {
        id: string
        firstName: string
        lastName: string
        email: string | null
        phone: string | null
        notes: string | null
      }[]
    >`SELECT id, "firstName", "lastName", email, phone, notes FROM customers WHERE id = ${CUSTOMER_ID}`
    if (customerBefore.length === 0) {
      throw new Error(`Customer ${CUSTOMER_ID} not found`)
    }
    console.log("Before:", customerBefore[0])

    await sql`
      UPDATE customers
      SET "firstName" = ${FIRST_NAME},
          "lastName"  = ${LAST_NAME},
          email       = ${EMAIL},
          phone       = ${PHONE},
          notes       = ${COMPANY_NAME},
          "updatedAt" = NOW()
      WHERE id = ${CUSTOMER_ID}
        AND (
             "firstName" <> ${FIRST_NAME}
          OR "lastName"  <> ${LAST_NAME}
          OR email IS DISTINCT FROM ${EMAIL}
          OR phone IS DISTINCT FROM ${PHONE}
          OR notes IS DISTINCT FROM ${COMPANY_NAME}
        )
    `
    const customerAfter = await sql<
      { firstName: string; lastName: string; email: string | null; phone: string | null; notes: string | null }[]
    >`SELECT "firstName", "lastName", email, phone, notes FROM customers WHERE id = ${CUSTOMER_ID}`
    console.log("After: ", customerAfter[0])

    console.log("\n=== Step 3: Advance engagement stage → AUDITING ===")
    const engBefore = await sql<
      { id: string; stage: string | null; title: string | null }[]
    >`SELECT id, stage, title FROM engagements WHERE id = ${ENGAGEMENT_ID}`
    if (engBefore.length === 0) {
      throw new Error(`Engagement ${ENGAGEMENT_ID} not found`)
    }
    console.log("Before:", engBefore[0])

    await sql`
      UPDATE engagements
      SET stage = 'AUDITING',
          title = ${`${COMPANY_NAME} — Operational Audit`},
          "updatedAt" = NOW()
      WHERE id = ${ENGAGEMENT_ID}
        AND (stage IS DISTINCT FROM 'AUDITING' OR title <> ${`${COMPANY_NAME} — Operational Audit`})
    `
    const engAfter = await sql<
      { id: string; stage: string | null; title: string | null }[]
    >`SELECT id, stage, title FROM engagements WHERE id = ${ENGAGEMENT_ID}`
    console.log("After: ", engAfter[0])

    // No stage history table in current schema — verified via information_schema lookup.
    // engagement_org_chart_activity is a chart-scoped activity feed, not an
    // engagement-stage audit log, so we leave it alone here.

    console.log("\nRepoint complete.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("✗ Failed:", err)
  if (err.cause) console.error("Cause:", err.cause)
  process.exit(1)
})
