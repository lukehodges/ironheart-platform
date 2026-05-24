import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Phase 1.0 — chart depth columns on engagement_org_chart.
 *
 * Adds the columns the production org chart needs to hold the
 * demo's data depth (see src/app/platform/clients/[id]/onboarding/demo/_components/types.ts).
 *
 * Idempotent. Safe to re-run. Uses ADD COLUMN IF NOT EXISTS + ALTER TABLE ...
 * ADD CONSTRAINT IF NOT EXISTS (via DO block) for check constraints.
 */
async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url)

  try {
    // ── kind ────────────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'PERSON'
    `
    console.log("✓ kind column ready")

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'engagement_org_chart_kind_check'
        ) THEN
          ALTER TABLE "engagement_org_chart"
            ADD CONSTRAINT "engagement_org_chart_kind_check"
            CHECK ("kind" IN ('PERSON','VACANCY','CONTRACTOR','ADVISOR','EXTERNAL','BUNDLE'));
        END IF;
      END $$
    `
    console.log("✓ kind check constraint ready")

    // ── audit_flags ─────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "audit_flags" text[] NOT NULL DEFAULT '{}'
    `
    console.log("✓ audit_flags column ready")

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'engagement_org_chart_audit_flags_check'
        ) THEN
          ALTER TABLE "engagement_org_chart"
            ADD CONSTRAINT "engagement_org_chart_audit_flags_check"
            CHECK ("audit_flags" <@ ARRAY[
              'DECISION_MAKER','FINANCE_OWNER','DATA_OWNER','DPO',
              'SECURITY','PROCESS_OWNER','FOUNDER'
            ]::text[]);
        END IF;
      END $$
    `
    console.log("✓ audit_flags check constraint ready")

    // ── interview_status ────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "interview_status" text NOT NULL DEFAULT 'NONE'
    `
    console.log("✓ interview_status column ready")

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'engagement_org_chart_interview_status_check'
        ) THEN
          ALTER TABLE "engagement_org_chart"
            ADD CONSTRAINT "engagement_org_chart_interview_status_check"
            CHECK ("interview_status" IN ('NONE','TARGET','INVITED','SCHEDULED','COMPLETED'));
        END IF;
      END $$
    `
    console.log("✓ interview_status check constraint ready")

    // ── form_status ─────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "form_status" text NOT NULL DEFAULT 'NONE'
    `
    console.log("✓ form_status column ready")

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'engagement_org_chart_form_status_check'
        ) THEN
          ALTER TABLE "engagement_org_chart"
            ADD CONSTRAINT "engagement_org_chart_form_status_check"
            CHECK ("form_status" IN ('NONE','PENDING','SENT','IN_PROGRESS','COMPLETED'));
        END IF;
      END $$
    `
    console.log("✓ form_status check constraint ready")

    // ── tenure_years ────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "tenure_years" integer
    `
    console.log("✓ tenure_years column ready")

    // ── email ───────────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "email" text
    `
    console.log("✓ email column ready")

    // ── is_founder ──────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "is_founder" boolean NOT NULL DEFAULT false
    `
    console.log("✓ is_founder column ready")

    // ── is_fractional ───────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "is_fractional" boolean NOT NULL DEFAULT false
    `
    console.log("✓ is_fractional column ready")

    // ── avatar_color ────────────────────────────────────────────────────────
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "avatar_color" text
    `
    console.log("✓ avatar_color column ready")

    // ── edge_style (lives on the node, describes incoming edge from parent) ─
    // No dedicated edges table exists in this schema — children are stored via
    // parent_id only — so edge_style is a column on the node itself.
    await sql`
      ALTER TABLE "engagement_org_chart"
        ADD COLUMN IF NOT EXISTS "edge_style" text NOT NULL DEFAULT 'SOLID'
    `
    console.log("✓ edge_style column ready")

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'engagement_org_chart_edge_style_check'
        ) THEN
          ALTER TABLE "engagement_org_chart"
            ADD CONSTRAINT "engagement_org_chart_edge_style_check"
            CHECK ("edge_style" IN ('SOLID','DOTTED','MATRIX'));
        END IF;
      END $$
    `
    console.log("✓ edge_style check constraint ready")

    console.log("\n✓ apply-chart-depth complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
