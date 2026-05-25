/**
 * scripts/send-brightline-questionnaires.ts
 *
 * Tonight-critical demo prep: create realistic `completed_forms` rows
 * (≈ "form sends") for the Brightline test engagement so the prospect
 * portal at /test/dashboard/audit shows a coherent set of in-flight
 * questionnaires when they land via magic link.
 *
 * Background: Inngest CLI is broken on this branch (HANDOFF §b
 * — sdk_version_denied). The canonical send flow lives in
 * `handleOnboardingPlanApproved` (onboarding.events.ts). We mimic it
 * here by calling the repository / SQL directly via tsx.
 *
 * Idempotent: re-running is a no-op (matches by node id + email and
 * updates in place). NEVER touches nodes outside the 6 hand-picked
 * recipients.
 *
 * Run:
 *   npx tsx scripts/send-brightline-questionnaires.ts
 */

import { config } from "dotenv"
config({ path: ".env.local" })

import postgres from "postgres"
import { randomUUID } from "crypto"

const ENGAGEMENT_ID = "c950c06a-1b41-4f46-9c89-660845d96bee"

const DATABASE_URL = process.env.DATABASE_URL
const IRONHEART_TENANT_ID = process.env.IRONHEART_TENANT_ID
if (!DATABASE_URL) throw new Error("DATABASE_URL not set")
if (!IRONHEART_TENANT_ID) throw new Error("IRONHEART_TENANT_ID not set")

// Final status mix per prompt: 4 SENT, 1 IN_PROGRESS, 1 COMPLETED.
// Status here is the **chart node form_status enum**
// (NONE | PENDING | SENT | IN_PROGRESS | COMPLETED). The companion
// completed_forms.status is the DB FormStatus enum
// (PENDING | COMPLETED | EXPIRED | CANCELLED). We mirror both.
type Recipient = {
  label: string
  templateSlug: string
  fallbackEmail: string
  chartStatus: "SENT" | "IN_PROGRESS" | "COMPLETED"
  // Stub completion payload — kept tiny on purpose so it's obvious
  // this is a seed, not a real response.
  seededResponses?: Record<string, unknown>
}

const RECIPIENTS: Recipient[] = [
  {
    label: "Sarah Chen",
    templateSlug: "questionnaire-owner-director",
    fallbackEmail: "sarah.chen@brightline-logistics.example.com",
    chartStatus: "COMPLETED",
    seededResponses: {
      seedSource: "send-brightline-questionnaires.ts",
      headline_concerns:
        "Approval bottlenecks at director level. Lack of pipeline visibility. Onboarding takes 11+ days.",
      growth_trajectory: "+30% YoY for two consecutive years",
      bus_factor_risk: "High — most decisions still route through me.",
    },
  },
  {
    label: "Anya Petrova",
    templateSlug: "questionnaire-owner-director",
    fallbackEmail: "anya.petrova@brightline-logistics.example.com",
    chartStatus: "SENT",
  },
  {
    label: "Marcus Webb",
    templateSlug: "questionnaire-operations",
    fallbackEmail: "marcus.webb@brightline-logistics.example.com",
    chartStatus: "IN_PROGRESS",
    seededResponses: {
      seedSource: "send-brightline-questionnaires.ts",
      ops_partial_save: true,
      current_pain_points:
        "Provisioning is a spreadsheet checklist. Every contract needs Sarah's sign-off.",
    },
  },
  {
    label: "Jordan Reyes",
    templateSlug: "questionnaire-sales-marketing",
    fallbackEmail: "jordan.reyes@brightline-logistics.example.com",
    chartStatus: "SENT",
  },
  {
    label: "Maya Sridhar",
    templateSlug: "questionnaire-finance-admin",
    fallbackEmail: "maya.sridhar@brightline-logistics.example.com",
    chartStatus: "SENT",
  },
  {
    label: "Imogen Ferrara",
    templateSlug: "questionnaire-team-member",
    fallbackEmail: "imogen.ferrara@brightline-logistics.example.com",
    chartStatus: "SENT",
  },
]

function log(msg: string) {
  console.log(`  ${msg}`)
}

async function main() {
  const sql = postgres(DATABASE_URL!)
  try {
    console.log("=== Brightline questionnaire send (demo prep) ===")
    console.log(`Engagement: ${ENGAGEMENT_ID}`)

    // 1. Resolve engagement + client tenant
    const engRows = await sql<
      { id: string; clientTenantId: string | null; title: string }[]
    >`
      SELECT id, "clientTenantId", title FROM engagements WHERE id=${ENGAGEMENT_ID}
    `
    if (engRows.length === 0) throw new Error(`Engagement ${ENGAGEMENT_ID} not found`)
    const eng = engRows[0]
    if (!eng.clientTenantId)
      throw new Error(`Engagement ${ENGAGEMENT_ID} has no clientTenantId`)
    log(`engagement: "${eng.title}" → client tenant ${eng.clientTenantId}`)

    // 2. Resolve all template ids by slug from Ironheart tenant
    const slugs = [...new Set(RECIPIENTS.map((r) => r.templateSlug))]
    const tplRows = await sql<{ id: string; slug: string; name: string }[]>`
      SELECT id, slug, name FROM form_templates
      WHERE "tenantId"=${IRONHEART_TENANT_ID} AND slug = ANY(${slugs})
    `
    const tplBySlug = new Map(tplRows.map((t) => [t.slug, t]))
    for (const slug of slugs) {
      if (!tplBySlug.has(slug))
        throw new Error(`Template slug "${slug}" missing on Ironheart tenant`)
    }
    log(`resolved ${tplBySlug.size} templates from Ironheart tenant`)

    // 3. Process each recipient
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const r of RECIPIENTS) {
      // Find chart node by label + engagement
      const nodeRows = await sql<
        {
          id: string
          contactName: string | null
          contactEmail: string | null
          formSendId: string | null
          form_status: string
        }[]
      >`
        SELECT id, "contactName", "contactEmail", "formSendId", form_status
        FROM engagement_org_chart
        WHERE "engagementId"=${ENGAGEMENT_ID} AND label=${r.label}
        LIMIT 1
      `
      if (nodeRows.length === 0) {
        log(`⚠️  no chart node found for "${r.label}" — skipping`)
        skipped++
        continue
      }
      const node = nodeRows[0]
      const tpl = tplBySlug.get(r.templateSlug)!
      const email = node.contactEmail ?? r.fallbackEmail

      // Resolve-or-create customer on CLIENT tenant
      const existingCustomer = await sql<{ id: string }[]>`
        SELECT id FROM customers
        WHERE "tenantId"=${eng.clientTenantId} AND email=${email}
        LIMIT 1
      `
      let customerId: string
      if (existingCustomer.length > 0) {
        customerId = existingCustomer[0].id
      } else {
        const parts = (node.contactName ?? r.label).trim().split(/\s+/)
        const firstName = parts[0] ?? r.label
        const lastName = parts.slice(1).join(" ") || ""
        const [created] = await sql<{ id: string }[]>`
          INSERT INTO customers
            (id, "tenantId", "firstName", "lastName", email, country,
             "marketingOptIn", status, "createdAt", "updatedAt", version)
          VALUES
            (${randomUUID()}, ${eng.clientTenantId}, ${firstName}, ${lastName},
             ${email}, 'GB', false, 'ACTIVE',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
          RETURNING id
        `
        customerId = created.id
        log(`  + created customer for ${r.label} (${email})`)
      }

      // Build payload mirrors for the form_send (completed_forms row).
      // For chartStatus COMPLETED → DB status COMPLETED + submittedAt set.
      // For SENT / IN_PROGRESS → DB status PENDING (the DB enum has no
      // SENT or IN_PROGRESS values; the chart-node enum carries the
      // finer-grained state for the UI).
      const dbStatus: "PENDING" | "COMPLETED" =
        r.chartStatus === "COMPLETED" ? "COMPLETED" : "PENDING"
      const responsesJson = JSON.stringify(r.seededResponses ?? {})
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const submittedAt = r.chartStatus === "COMPLETED" ? new Date() : null

      if (node.formSendId) {
        // Idempotent path: update existing form row + chart node in place
        await sql`
          UPDATE completed_forms SET
            "templateId" = ${tpl.id},
            "templateName" = ${tpl.name},
            "customerId" = ${customerId},
            "customerName" = ${node.contactName ?? r.label},
            "customerEmail" = ${email},
            responses = ${responsesJson}::jsonb,
            status = ${dbStatus},
            "submittedAt" = ${submittedAt},
            "expiresAt" = ${expiresAt}
          WHERE id = ${node.formSendId}
        `
        await sql`
          UPDATE engagement_org_chart SET
            form_status = ${r.chartStatus},
            "contactEmail" = COALESCE("contactEmail", ${email}),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = ${node.id}
        `
        log(`  ↻ updated existing send for ${r.label} → ${r.chartStatus}`)
        updated++
      } else {
        const formSendId = randomUUID()
        const sessionKey = randomUUID()
        await sql`
          INSERT INTO completed_forms
            (id, "tenantId", "templateId", "templateName",
             "customerId", "customerName", "customerEmail",
             responses, status, "submittedAt", "sessionKey", "expiresAt",
             "createdAt")
          VALUES
            (${formSendId}, ${IRONHEART_TENANT_ID}, ${tpl.id}, ${tpl.name},
             ${customerId}, ${node.contactName ?? r.label}, ${email},
             ${responsesJson}::jsonb, ${dbStatus}, ${submittedAt},
             ${sessionKey}, ${expiresAt},
             CURRENT_TIMESTAMP)
        `
        await sql`
          UPDATE engagement_org_chart SET
            "formSendId" = ${formSendId},
            form_status = ${r.chartStatus},
            "contactEmail" = COALESCE("contactEmail", ${email}),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = ${node.id}
        `
        log(`  + sent ${tpl.slug} to ${r.label} → ${r.chartStatus}`)
        inserted++
      }
    }

    // 4. Verification summary
    const totalNow = await sql<{ count: bigint }[]>`
      SELECT count(*)::bigint FROM completed_forms cf
      JOIN engagement_org_chart oc ON oc."formSendId" = cf.id
      WHERE oc."engagementId" = ${ENGAGEMENT_ID}
    `
    const mix = await sql<{ form_status: string; count: bigint }[]>`
      SELECT form_status, count(*)::bigint FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID} AND "formSendId" IS NOT NULL
      GROUP BY form_status ORDER BY form_status
    `

    console.log(`\n— Summary —`)
    console.log(`  inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`)
    console.log(`  total form-sends linked to engagement: ${totalNow[0].count}`)
    for (const row of mix) console.log(`  ${row.form_status}: ${row.count}`)
    console.log(`✓ done.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("✗ failed:", err)
  process.exit(1)
})
