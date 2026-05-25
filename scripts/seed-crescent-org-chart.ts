import { config } from "dotenv"
import postgres from "postgres"
import { randomUUID, createHash } from "node:crypto"

config({ path: ".env.local" })
config({ path: ".env" })

/**
 * Slice 2 — Replace the Brightline test-engagement org chart with the
 * Crescent Moon Events Ltd 7-node structure and Simon's 8 audit-critical
 * pre-call questions. Audit + form + report artefacts on the engagement
 * are also wiped so Simon sees an empty, honest audit when he logs in.
 *
 * IRONHEART_TENANT_ID = engagement's host tenant (Luke's consultancy).
 * The chart engagement_id stays c950c06a-…; only its rows change.
 *
 * Idempotent. Re-running the script is a no-op once the seven nodes,
 * Simon's 8 questions, and zero audit/form artefacts are in place.
 */

const ENGAGEMENT_ID = "c950c06a-1b41-4f46-9c89-660845d96bee"
const HOST_TENANT_ID = "43cf4a66-4252-43e8-933e-9cfb73f12886" // Ironheart consultancy

// ── 8 audit questions for Simon ─────────────────────────────────────────────
// AUDIT-CRITICAL flag embedded as `[AUDIT-CRITICAL]` label prefix because the
// schema doesn't have a typed `audit_critical` field — keeping the spec's
// prefix preserves the signal verbatim for the form renderer.
const SIMON_QUESTIONS: Array<{ id: string; label: string; type: "TEXTAREA" }> = [
  {
    id: "crescent-simon-1",
    label:
      "[AUDIT-CRITICAL] Tim Dray and Laurie Reading appear on your site as Head Install and Sales/Marketing — but Companies House shows nil PAYE last two years. How do they sit in the business — shareholders, contracted, freelance? What happens to their work if one of them stops tomorrow?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-2",
    label:
      "[AUDIT-CRITICAL] Your Xero shows £121k of deferred income — that's customer deposits sitting against future events. When a deposit clears in Xero, what tells Rentman the booking is confirmed, and how often do those two disagree?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-3",
    label:
      "[AUDIT-CRITICAL] Walk me through two enquiries landing the same week for the same chandelier — Empire 3.5m, say. Who decides who gets it, on what information, and where does that decision live afterwards?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-4",
    label:
      "A £4k chandelier comes back chipped after a Kensington Palace install. From the moment the crew flag it on packdown — what's the path through insurance, write-down, Rentman inventory, and Xero?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-5",
    label:
      "Pricing — when did you last raise your day rate or hire fees, and what's stopping you doing it for the 2026/27 season?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-6",
    label:
      "Balance-due chasing — Bridgerton, BAFTA, a private wedding. What does the workflow look like from event-day to final-payment-cleared, and where does it stall?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-7",
    label:
      "Rentman has a crew module with mobile app, conflict detection, free crew accounts. You're using Excel instead. What does Excel give your live/master two-doc pattern that Rentman couldn't?",
    type: "TEXTAREA",
  },
  {
    id: "crescent-simon-8",
    label:
      "If you were unreachable for two weeks — Tim runs installs, Laurie takes enquiries — which decision would they get wrong without you, and which system would they not have a login for?",
    type: "TEXTAREA",
  },
]

// ── 7-node spec ─────────────────────────────────────────────────────────────
type NodeSpec = {
  key: "ROOT" | "SIMON" | "TIM" | "LAURIE" | "CREW" | "RENTMAN" | "XERO"
  label: string
  type: "DEPARTMENT" | "ROLE" | "PERSON"
  kind: "PERSON" | "VACANCY" | "CONTRACTOR" | "ADVISOR" | "EXTERNAL" | "BUNDLE"
  parentKey: NodeSpec["key"] | null
  flags: string[]
  interviewStatus: "NONE" | "TARGET" | "INVITED" | "SCHEDULED" | "COMPLETED"
  isFounder: boolean
  isFractional: boolean
  notes: string
  edgeStyle: "SOLID" | "DOTTED"
  email?: string
}

const NODES: NodeSpec[] = [
  {
    key: "ROOT",
    label: "Crescent Moon Events Ltd",
    type: "DEPARTMENT",
    kind: "PERSON", // table default; root departments use PERSON kind across the codebase
    parentKey: null,
    flags: [],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "Luxury chandelier hire + event design. Est 2000, Ltd 2012 (08015208). Trowbridge HQ. Bridgerton/BAFTA/V&A credits. Est £500–800k turnover, 80–150 events/yr.",
    edgeStyle: "SOLID",
  },
  {
    key: "SIMON",
    label: "Simon Gerrard — Founder & Director",
    type: "PERSON",
    kind: "PERSON",
    parentKey: "ROOT",
    flags: ["FOUNDER", "DECISION_MAKER", "DATA_OWNER", "FINANCE_OWNER"],
    interviewStatus: "SCHEDULED",
    isFounder: true,
    isFractional: false,
    notes:
      "100% PSC. Single dispatcher; every booking flows through him. Bus-factor risk — verify Tuesday.",
    edgeStyle: "SOLID",
    email: "simon@crescent-moon.co.uk",
  },
  {
    key: "TIM",
    label: "Tim Dray — Head Install Manager",
    type: "PERSON",
    kind: "PERSON",
    parentKey: "ROOT",
    flags: ["PROCESS_OWNER"],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "Public-facing install lead per website. NIL PAYE on file — confirm Tuesday: employed, contracted, or shareholder?",
    edgeStyle: "SOLID",
  },
  {
    key: "LAURIE",
    label: "Laurie Reading — Sales & Marketing",
    type: "PERSON",
    kind: "PERSON",
    parentKey: "ROOT",
    flags: ["PROCESS_OWNER"],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "Public-facing sales/marketing per website. NIL PAYE on file — same status question as Tim.",
    edgeStyle: "SOLID",
  },
  {
    key: "CREW",
    label: "Freelance Install Crew",
    type: "DEPARTMENT",
    kind: "BUNDLE",
    parentKey: "ROOT",
    flags: [],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "8+ recurring freelance technicians per crew roster. No payroll; called per-job. Crew lead rotates.",
    edgeStyle: "SOLID",
  },
  {
    key: "RENTMAN",
    label: "Rentman",
    type: "ROLE",
    kind: "EXTERNAL",
    parentKey: "ROOT",
    flags: ["DATA_OWNER"],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "System of record: inventory + calendar + hire status + double-booking guard. Has a crew module but Excel used instead — open question.",
    edgeStyle: "DOTTED",
  },
  {
    key: "XERO",
    label: "Xero (+ Charlton Baker)",
    type: "ROLE",
    kind: "EXTERNAL",
    parentKey: "ROOT",
    flags: ["FINANCE_OWNER"],
    interviewStatus: "NONE",
    isFounder: false,
    isFractional: false,
    notes:
      "Deposits + invoicing. Deferred income £121,682 FY25 (+128% YoY). Charlton Baker (Trowbridge) = bookkeeping + year-end. No live link to Rentman.",
    edgeStyle: "DOTTED",
  },
]

function avatarColorFor(label: string): string {
  // Deterministic HSL palette across 12 buckets — stable across re-runs.
  const hash = createHash("sha1").update(label).digest()
  const hue = hash.readUInt16BE(0) % 360
  return `hsl(${hue}, 70%, 55%)`
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { onnotice: () => {} })

  try {
    // ── Idempotency short-circuit ────────────────────────────────────────────
    // If the chart already matches the spec (7 nodes, labels match, Simon has
    // 8 questions) AND audit/form/report tables are already empty, the seed
    // has been applied — bail out so re-runs print zero changes.
    const expectedLabels = NODES.map((n) => n.label).sort()
    const existing = await sql<{ label: string; q_count: number }[]>`
      SELECT label,
             jsonb_array_length(
               CASE WHEN jsonb_typeof(extra_questions) = 'array'
                    THEN extra_questions
                    ELSE '[]'::jsonb
               END
             ) AS q_count
      FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const existingLabels = existing.map((r) => r.label).sort()
    const simonRow = existing.find((r) => r.label.startsWith("Simon Gerrard"))
    const simonQCount = Number(simonRow?.q_count ?? 0)

    const [{ count: auditSessionCount }] = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM audit_sessions WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const [{ count: auditReportCount }] = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM audit_reports WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const [{ count: formTemplateCount }] = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM form_templates WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const remainingFormSends = await sql<{ id: string }[]>`
      SELECT "formSendId" AS id FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID} AND "formSendId" IS NOT NULL
    `

    if (
      existing.length === NODES.length &&
      JSON.stringify(existingLabels) === JSON.stringify(expectedLabels) &&
      simonQCount === SIMON_QUESTIONS.length &&
      Number(auditSessionCount) === 0 &&
      Number(auditReportCount) === 0 &&
      Number(formTemplateCount) === 0 &&
      remainingFormSends.length === 0
    ) {
      console.log(
        `Chart already matches spec (7 nodes, ${SIMON_QUESTIONS.length} Simon questions, audit/form artefacts empty) — nothing to do.`
      )
      return
    }

    console.log("=== Step 0: Wipe audit + form artefacts on this engagement ===")

    // Audit sessions / lenses / findings / recs / call notes
    const sessions = await sql<{ id: string }[]>`
      SELECT id FROM audit_sessions WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const sessionIds = sessions.map((s) => s.id)
    if (sessionIds.length > 0) {
      const lenses = await sql<{ id: string }[]>`
        SELECT id FROM audit_lens_analysis WHERE "auditSessionId" IN ${sql(sessionIds)}
      `
      const lensIds = lenses.map((l) => l.id)
      if (lensIds.length > 0) {
        const f = await sql`DELETE FROM audit_findings WHERE "lensAnalysisId" IN ${sql(lensIds)}`
        const r = await sql`DELETE FROM audit_recommendations WHERE "lensAnalysisId" IN ${sql(lensIds)}`
        console.log(`  audit_findings deleted: ${f.count}, audit_recommendations: ${r.count}`)
      }
      const la = await sql`DELETE FROM audit_lens_analysis WHERE "auditSessionId" IN ${sql(sessionIds)}`
      const acn = await sql`DELETE FROM audit_call_notes WHERE "auditSessionId" IN ${sql(sessionIds)}`
      console.log(`  audit_lens_analysis deleted: ${la.count}, audit_call_notes: ${acn.count}`)
    }
    const rep = await sql`DELETE FROM audit_reports WHERE "engagementId" = ${ENGAGEMENT_ID}`
    const as = await sql`DELETE FROM audit_sessions WHERE "engagementId" = ${ENGAGEMENT_ID}`
    console.log(`  audit_reports deleted: ${rep.count}, audit_sessions: ${as.count}`)

    // Completed forms reachable via chart.formSendId
    const formSendIds = (
      await sql<{ formSendId: string | null }[]>`
        SELECT "formSendId" FROM engagement_org_chart
        WHERE "engagementId" = ${ENGAGEMENT_ID} AND "formSendId" IS NOT NULL
      `
    )
      .map((r) => r.formSendId)
      .filter((id): id is string => id !== null)
    if (formSendIds.length > 0) {
      // null the FK first so the DELETE doesn't have stale pointers if anything errors mid-script
      await sql`
        UPDATE engagement_org_chart
        SET "formSendId" = NULL, "updatedAt" = NOW()
        WHERE "engagementId" = ${ENGAGEMENT_ID}
      `
      const cf = await sql`DELETE FROM completed_forms WHERE id IN ${sql(formSendIds)}`
      console.log(`  completed_forms deleted: ${cf.count}`)
    } else {
      console.log("  completed_forms deleted: 0 (none referenced)")
    }

    // Engagement-scoped form_templates (per-client clones)
    const ftDel = await sql`
      DELETE FROM form_templates WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    console.log(`  form_templates (engagement-scoped) deleted: ${ftDel.count}`)

    console.log("\n=== Step 1: Wipe org chart for this engagement ===")
    // Chart activity rows first (no cascade on engagementId).
    const actDel = await sql`
      DELETE FROM engagement_org_chart_activity WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    const chartDel = await sql`
      DELETE FROM engagement_org_chart WHERE "engagementId" = ${ENGAGEMENT_ID}
    `
    console.log(`  chart_activity deleted: ${actDel.count}, chart_nodes: ${chartDel.count}`)

    console.log("\n=== Step 2: Insert 7-node Crescent structure ===")
    const ids = new Map<NodeSpec["key"], string>()
    for (const n of NODES) ids.set(n.key, randomUUID())

    let sortOrder = 0
    for (const n of NODES) {
      const id = ids.get(n.key)!
      const parentId = n.parentKey ? ids.get(n.parentKey)! : null
      const extraQuestions = n.key === "SIMON" ? SIMON_QUESTIONS : []
      await sql`
        INSERT INTO engagement_org_chart (
          id, "tenantId", "engagementId", "parentId",
          label, type, kind,
          "interviewMode", "lastEditedBy",
          audit_flags, interview_status,
          is_founder, is_fractional,
          avatar_color, edge_style,
          notes, email,
          extra_questions,
          "sortOrder"
        ) VALUES (
          ${id}, ${HOST_TENANT_ID}, ${ENGAGEMENT_ID}, ${parentId},
          ${n.label}, ${n.type}, ${n.kind},
          ${"OWNER_ONLY"}, ${"CONSULTANT"},
          ${n.flags as unknown as string[]}, ${n.interviewStatus},
          ${n.isFounder}, ${n.isFractional},
          ${avatarColorFor(n.label)}, ${n.edgeStyle},
          ${n.notes}, ${n.email ?? null},
          ${sql.json(extraQuestions)},
          ${sortOrder++}
        )
      `
      console.log(`  + ${n.key.padEnd(8)} ${n.label}`)
    }

    console.log("\nSeed complete.")
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("✗ Failed:", err)
  if (err.cause) console.error("Cause:", err.cause)
  process.exit(1)
})
