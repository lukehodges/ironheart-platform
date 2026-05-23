import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

const ENGAGEMENT_ID = process.env.ENGAGEMENT_ID ?? "c950c06a-1b41-4f46-9c89-660845d96bee"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    console.log("=== Engagement state BEFORE ===")
    const before = await sql`
      SELECT
        e.id, e.stage, e."tenantId", e."clientTenantId", e."customerId",
        c."firstName", c."lastName", c.email, c.notes as company,
        e.title, e."qualificationData", e."createdAt"
      FROM engagements e
      JOIN customers c ON c.id = e."customerId"
      WHERE e.id = ${ENGAGEMENT_ID}
    `
    console.log(JSON.stringify(before[0], null, 2))

    if (!before[0]) {
      console.error("Engagement not found")
      process.exit(1)
    }

    if (before[0].clientTenantId) {
      console.log("\n⚠️  Already has clientTenantId — already provisioned. Showing tenant state:")
      const tenant = await sql`
        SELECT id, slug, name, "workosOrgId", "createdAt"
        FROM tenants WHERE id = ${before[0].clientTenantId}
      `
      console.log(JSON.stringify(tenant[0], null, 2))
      return
    }

    console.log("\n=== Updating stage DISCOVERY → CONTRACTED ===")
    await sql`UPDATE engagements SET stage = 'CONTRACTED', "updatedAt" = NOW() WHERE id = ${ENGAGEMENT_ID}`
    console.log("✓ DB stage updated")

    console.log("\n=== Firing engagement/stage-changed Inngest event ===")
    // Send event via Inngest API directly
    const inngestEventKey = process.env.INNGEST_EVENT_KEY
    if (!inngestEventKey) {
      console.error("INNGEST_EVENT_KEY not set — cannot fire event")
      process.exit(1)
    }

    const isDev = !process.env.INNGEST_SIGNING_KEY || process.env.NODE_ENV !== "production"
    const inngestUrl = isDev
      ? "http://localhost:8288/e/" + inngestEventKey
      : "https://inn.gs/e/" + inngestEventKey

    console.log(`Posting to: ${inngestUrl.replace(inngestEventKey, "<key>")}`)

    const eventBody = {
      name: "engagement/stage-changed",
      data: {
        engagementId: ENGAGEMENT_ID,
        fromStage: "DISCOVERY",
        toStage: "CONTRACTED",
      },
    }

    const res = await fetch(inngestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    })

    const text = await res.text()
    console.log(`Response: ${res.status} ${text}`)

    if (!res.ok) {
      console.error("✗ Inngest event send failed")
      if (isDev) {
        console.log("\nIs the Inngest dev server running? Try: `npx inngest-cli dev` in another terminal")
      }
      process.exit(1)
    }

    console.log("✓ Event fired")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
