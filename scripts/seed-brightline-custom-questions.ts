import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Brightline custom-question seed (Slice 3 of "Custom-per-client questionnaire scope").
 *
 * Adds bespoke questions to Sarah Chen (founder/CEO) and Marcus Webb (head of ops)
 * on the test engagement so the Tuesday demo can show per-client questionnaire
 * variation. These get MERGED onto the resolved template at form-send time by
 * handleOnboardingPlanApproved.
 *
 * Idempotent: it replaces the extraQuestions array each run (no append duplication).
 */

const CEO_NODE_ID = "61ec3691-2245-4140-9bf9-ab7561b1da0a"          // Sarah Chen
const MARCUS_NODE_ID = "72911c49-9e89-4312-b902-dcdd725d1e36"       // Marcus Webb

type Q = {
  id: string
  label: string
  type: "TEXT" | "TEXTAREA" | "SELECT"
  options?: string[]
}

const SARAH_QUESTIONS: Q[] = [
  {
    id: "brightline-sarah-1",
    label: "What's the single decision you're worried about losing your grip on as you scale?",
    type: "TEXTAREA",
  },
  {
    id: "brightline-sarah-2",
    label: "If you took a 6-week sabbatical tomorrow, which call would Daniel get wrong without your input?",
    type: "TEXTAREA",
  },
]

const MARCUS_QUESTIONS: Q[] = [
  {
    id: "brightline-marcus-1",
    label: "Walk me through the worst breakdown in the ops chain in the last 6 months.",
    type: "TEXTAREA",
  },
  {
    id: "brightline-marcus-2",
    label: "Where do you feel most exposed if Priya stops being available?",
    type: "TEXTAREA",
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    const sarahResult = await sql`
      UPDATE "engagement_org_chart"
      SET "extra_questions" = ${JSON.stringify(SARAH_QUESTIONS)}::jsonb,
          "updatedAt" = now()
      WHERE "id" = ${CEO_NODE_ID}
      RETURNING "id", "label"
    `
    if (sarahResult.length === 0) {
      console.warn(`No node found for Sarah Chen (id=${CEO_NODE_ID}) — skipped`)
    } else {
      console.log(`Seeded ${SARAH_QUESTIONS.length} bespoke questions on '${sarahResult[0]?.label}'`)
    }

    const marcusResult = await sql`
      UPDATE "engagement_org_chart"
      SET "extra_questions" = ${JSON.stringify(MARCUS_QUESTIONS)}::jsonb,
          "updatedAt" = now()
      WHERE "id" = ${MARCUS_NODE_ID}
      RETURNING "id", "label"
    `
    if (marcusResult.length === 0) {
      console.warn(`No node found for Marcus Webb (id=${MARCUS_NODE_ID}) — skipped`)
    } else {
      console.log(`Seeded ${MARCUS_QUESTIONS.length} bespoke questions on '${marcusResult[0]?.label}'`)
    }

    console.log("Brightline custom-question seed complete")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
