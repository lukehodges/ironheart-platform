import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    // ── engagement_org_chart ──────────────────────────────────────────────
    const orgChartExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'engagement_org_chart'
      LIMIT 1
    `

    if (orgChartExists.length > 0) {
      console.log("engagement_org_chart table already exists — skipping create")
    } else {
      await sql`
        CREATE TABLE IF NOT EXISTS "engagement_org_chart" (
          "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenantId"              uuid NOT NULL,
          "engagementId"          uuid NOT NULL REFERENCES "engagements"("id") ON DELETE CASCADE,
          "parentId"              uuid,
          "label"                 text NOT NULL,
          "type"                  text NOT NULL,
          "headcount"             integer,
          "contactUserId"         uuid,
          "contactEmail"          text,
          "contactName"           text,
          "contactRole"           text,
          "interviewMode"         text NOT NULL DEFAULT 'OWNER_ONLY',
          "sampleSize"            integer,
          "templateSlugOverride"  text,
          "sortOrder"             integer NOT NULL DEFAULT 0,
          "version"               integer NOT NULL DEFAULT 1,
          "lastEditedBy"          text NOT NULL,
          "lastEditedAt"          timestamp with time zone NOT NULL DEFAULT now(),
          "createdAt"             timestamp with time zone NOT NULL DEFAULT now(),
          "updatedAt"             timestamp with time zone NOT NULL DEFAULT now()
        )
      `
      console.log("✓ Created table engagement_org_chart")
    }

    // Indexes for engagement_org_chart (idempotent via IF NOT EXISTS)
    await sql`CREATE INDEX IF NOT EXISTS "idx_org_chart_engagement" ON "engagement_org_chart" ("engagementId")`
    console.log("✓ Index idx_org_chart_engagement — ok")

    await sql`CREATE INDEX IF NOT EXISTS "idx_org_chart_parent" ON "engagement_org_chart" ("parentId")`
    console.log("✓ Index idx_org_chart_parent — ok")

    await sql`CREATE INDEX IF NOT EXISTS "idx_org_chart_tenant" ON "engagement_org_chart" ("tenantId")`
    console.log("✓ Index idx_org_chart_tenant — ok")

    // ── engagement_org_chart_activity ─────────────────────────────────────
    const activityExists = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'engagement_org_chart_activity'
      LIMIT 1
    `

    if (activityExists.length > 0) {
      console.log("engagement_org_chart_activity table already exists — skipping create")
    } else {
      await sql`
        CREATE TABLE IF NOT EXISTS "engagement_org_chart_activity" (
          "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "engagementId"  uuid NOT NULL,
          "nodeId"        uuid,
          "actorType"     text NOT NULL,
          "actorId"       uuid,
          "actorName"     text NOT NULL,
          "action"        text NOT NULL,
          "fromValue"     jsonb,
          "toValue"       jsonb,
          "message"       text NOT NULL,
          "createdAt"     timestamp with time zone NOT NULL DEFAULT now()
        )
      `
      console.log("✓ Created table engagement_org_chart_activity")
    }

    // Indexes for engagement_org_chart_activity (idempotent via IF NOT EXISTS)
    await sql`CREATE INDEX IF NOT EXISTS "idx_org_chart_activity_engagement" ON "engagement_org_chart_activity" ("engagementId", "createdAt" DESC)`
    console.log("✓ Index idx_org_chart_activity_engagement — ok")

    console.log("\nDone.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
