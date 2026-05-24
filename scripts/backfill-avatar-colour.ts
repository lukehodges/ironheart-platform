import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Phase 1.x — backfill avatar_color on null person-like rows.
 *
 * For any PERSON/CONTRACTOR/ADVISOR/EXTERNAL node across ALL engagements
 * with a NULL avatar_color, assign a deterministic colour from a fixed
 * palette by hash(label) % 8. Idempotent — only touches NULL rows.
 *
 * The hash + palette must match scripts/seed-test-engagement.ts and the
 * demo seed at src/app/.../onboarding/demo/_components/seed.ts.
 */

const PALETTE = ["indigo", "amber", "rose", "teal", "emerald", "violet", "sky", "stone"] as const

function hashStr(s: string): number {
  return Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
}

function pickColour(seed: string): string {
  return PALETTE[Math.abs(hashStr(seed)) % PALETTE.length]!
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    // Backfill anything that displays as a card on the chart — PERSON/ROLE
    // typed nodes regardless of kind (BUNDLE rows live under type=PERSON,
    // VACANCY rows under type=ROLE — both deserve a deterministic colour).
    const rows = await sql<{ id: string; label: string }[]>`
      SELECT id, label FROM engagement_org_chart
      WHERE avatar_color IS NULL
        AND (
          kind IN ('PERSON', 'CONTRACTOR', 'ADVISOR', 'EXTERNAL')
          OR type IN ('PERSON', 'ROLE')
        )
    `
    console.log(`Found ${rows.length} rows with NULL avatar_color`)

    let updated = 0
    for (const r of rows) {
      const colour = pickColour(r.label || r.id)
      await sql`
        UPDATE engagement_org_chart
        SET avatar_color = ${colour}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = ${r.id} AND avatar_color IS NULL
      `
      updated++
    }

    console.log(`✓ backfilled ${updated} rows`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
