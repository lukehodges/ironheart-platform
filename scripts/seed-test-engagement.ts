/**
 * Seed script: realistic audit + report content for the "test" engagement.
 *
 * Idempotent — safe to run multiple times.
 * Run: npm run db:seed-test-engagement
 *
 * Populates:
 *  Step 1 — Org chart: named PERSON nodes under each role/dept
 *  Step 2 — Form completion simulation (COMPLETED / PENDING)
 *  Step 3 — Audit session w/ 5 lenses, 12 findings, 12 recommendations
 *  Step 4 — Call notes per contact (4 contacts)
 *  Step 5 — Audit report DRAFT
 */

import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGAGEMENT_ID = "c950c06a-1b41-4f46-9c89-660845d96bee"
const CLIENT_TENANT_ID = "bb749224-5ca0-4751-ab36-891eb8bcbd28"

// Ironheart consultant tenant (owner of form templates)
let IRONHEART_TENANT_ID: string

// Existing chart node IDs (discovered at runtime from DB)
// Node labels from the SMALL tier seed
const ROLE_LABELS = {
  OWNER: "Owner / Founder",
  OPERATIONS: "Operations",
  FINANCE: "Finance",
  SALES: "Sales / Marketing",
  OTHER: "Other stafff", // typo preserved from original seed
}

// Template slugs → IDs (resolved at runtime)
const TEMPLATE_SLUG_MAP: Record<string, string> = {}

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

const uid = () => crypto.randomUUID()
const log = (msg: string) => console.log(`  → ${msg}`)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NodeMap = Record<string, { id: string; label: string; parentId: string | null }>

async function resolveNodes(sql: postgres.Sql): Promise<NodeMap> {
  const rows = await sql<{ id: string; label: string; parentId: string | null }[]>`
    SELECT id, label, "parentId"
    FROM engagement_org_chart
    WHERE "engagementId" = ${ENGAGEMENT_ID}
  `
  const map: NodeMap = {}
  for (const row of rows) {
    map[row.label] = row
  }
  return map
}

// ---------------------------------------------------------------------------
// Brightline expansion — ~45 nodes across 6 departments
// ---------------------------------------------------------------------------
// Deterministic avatar palette (must match scripts/backfill-avatar-colour.ts
// and src/app/.../onboarding/demo/_components/seed.ts).
const AVATAR_PALETTE = ["indigo", "amber", "rose", "teal", "emerald", "violet", "sky", "stone"] as const
function hashStr(s: string): number {
  return Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
}
function pickAvatarColor(label: string): string {
  return AVATAR_PALETTE[Math.abs(hashStr(label)) % AVATAR_PALETTE.length]!
}
function brightlineEmail(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean)
  if (parts.length < 2) return `${parts[0] ?? "contact"}@brightlinelogistics.example.com`
  return `${parts[0]}.${parts[parts.length - 1]}@brightlinelogistics.example.com`
}

// Roster row — fully specified record for one chart node.
type Kind = "PERSON" | "VACANCY" | "CONTRACTOR" | "ADVISOR" | "EXTERNAL" | "BUNDLE"
type DbType = "DEPARTMENT" | "ROLE" | "PERSON"
type Iv = "NONE" | "TARGET" | "INVITED" | "SCHEDULED" | "COMPLETED"
type Fm = "NONE" | "PENDING" | "SENT" | "IN_PROGRESS" | "COMPLETED"
type Es = "SOLID" | "DOTTED" | "MATRIX"

interface RosterRow {
  // logical key for upsert — stable across re-runs
  key: string
  // optional preserved existing ID (so FK refs stay intact)
  preserveId?: string
  parentKey: string | null
  label: string
  type: DbType
  kind: Kind
  contactName?: string | null
  contactRole?: string | null
  email?: string | null
  tenureYears?: number | null
  auditFlags?: string[]
  interviewStatus?: Iv
  formStatus?: Fm
  isFounder?: boolean
  isFractional?: boolean
  edgeStyle?: Es
  headcount?: number | null
  notes?: string | null
  sortOrder: number
}

// Pre-existing node IDs (discovered at runtime, mapped from DB).
// 4 nodes have FK references via audit_call_notes.contactUserId so MUST
// be preserved. Others are kept where convenient.
const EXISTING_IDS = {
  root: "472c4bdd-4b98-45a1-8a91-6c310b35bafe",
  ceo: "61ec3691-2245-4140-9bf9-ab7561b1da0a",          // FK ref'd
  operationsDept: "3cd273e6-d177-41f3-a305-5a40b53940b7",
  financeDept: "2f7b9bf9-6dbd-4beb-a7b3-74f4f7e8922a",
  salesDept: "c1ed2e6b-ecc1-453c-b2dc-5ed217d35f6c",
  otherDept: "3617bb22-7a12-45f3-838e-bc407751bdf5",
  marcus: "72911c49-9e89-4312-b902-dcdd725d1e36",       // FK ref'd
  priya: "202f5ae1-4880-4ed2-819a-c8c47d79beea",        // FK ref'd
  jordan: "1864f848-4bbd-4511-a38e-40c0d8851ef8",       // FK ref'd
  alex: "e25808da-fdbe-4385-b15a-1fd75f4767c0",
  sam: "2101675a-9ee0-4877-9dc3-32ecd4548542",
  strayNewNode: "8b482378-48ef-4c80-a8b7-282ab9b05831",
}

function brightlineRoster(): RosterRow[] {
  const rows: RosterRow[] = []
  let s = 0
  const n = (r: Omit<RosterRow, "sortOrder">) => rows.push({ ...r, sortOrder: s++ })

  // ── Root ────────────────────────────────────────────────────────────────
  n({
    key: "org",
    preserveId: EXISTING_IDS.root,
    parentKey: null,
    label: "Brightline Logistics Ltd",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 58,
    notes: "Brightline Logistics Ltd — fictional mid-Atlantic SMB logistics consultancy. 58 staff. Discovery audit in progress.",
  })

  // ── Leadership ──────────────────────────────────────────────────────────
  n({
    key: "leadership",
    parentKey: "org",
    label: "Leadership",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 4,
    notes: "C-suite plus fractional CFO. Schedule fractional roles first — narrow availability windows.",
  })
  n({
    key: "ceo",
    preserveId: EXISTING_IDS.ceo,
    parentKey: "leadership",
    label: "Sarah Chen",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Sarah Chen",
    contactRole: "Founder & CEO",
    tenureYears: 9,
    auditFlags: ["FOUNDER", "DECISION_MAKER"],
    interviewStatus: "SCHEDULED",
    formStatus: "COMPLETED",
    isFounder: true,
    notes: "Founder; signs off engagements. Prefers async updates over Slack. Wants to step out of the daily approval loop — north-star for this audit.",
  })
  n({
    key: "coo",
    parentKey: "leadership",
    label: "Daniel Mokoena",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Daniel Mokoena",
    contactRole: "Chief Operating Officer",
    tenureYears: 3,
    auditFlags: ["DECISION_MAKER", "PROCESS_OWNER"],
    interviewStatus: "INVITED",
    formStatus: "SENT",
    notes: "Hired Q2 last year to professionalise ops. Day-to-day client lead. Already drafting an SOP backlog.",
  })
  n({
    key: "cfo",
    preserveId: EXISTING_IDS.priya,
    parentKey: "leadership",
    label: "Priya Patel",
    type: "PERSON",
    kind: "CONTRACTOR",
    contactName: "Priya Patel",
    contactRole: "Fractional CFO",
    tenureYears: 1,
    auditFlags: ["FINANCE_OWNER"],
    interviewStatus: "INVITED",
    formStatus: "IN_PROGRESS",
    isFractional: true,
    edgeStyle: "DOTTED",
    notes: "2 days/week, routes via Daniel for scheduling. Owns reconciliation backlog — 9-day lag flagged.",
  })
  n({
    key: "ned-lead",
    parentKey: "leadership",
    label: "Helena Drobacz",
    type: "PERSON",
    kind: "ADVISOR",
    contactName: "Helena Drobacz",
    contactRole: "Non-Exec Director",
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "NOT_SENT" as unknown as Fm, // we'll coerce to NONE below
    edgeStyle: "DOTTED",
    notes: "Quarterly board cadence. Ex-Maersk ops; happy to talk by phone.",
  })

  // ── Operations ──────────────────────────────────────────────────────────
  n({
    key: "operations",
    preserveId: EXISTING_IDS.operationsDept,
    parentKey: "org",
    label: "Operations",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 12,
    notes: "Largest functional team. Owns onboarding + dispatch + provisioning. 11-day onboarding cycle is the headline risk.",
  })
  n({
    key: "head-ops",
    parentKey: "operations",
    label: "Marcus Webb",
    type: "PERSON",
    kind: "PERSON",
    preserveId: EXISTING_IDS.marcus,
    contactName: "Marcus Webb",
    contactRole: "Head of Operations",
    tenureYears: 5,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "COMPLETED",
    formStatus: "COMPLETED",
    notes: "Wants SOPs but no protected time. Enthusiastic about workflow automation — strong quick-win candidate.",
  })
  n({
    key: "ops-mgr",
    parentKey: "head-ops",
    label: "Rajiv Suresh",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Rajiv Suresh",
    contactRole: "Operations Manager",
    tenureYears: 4,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "Owns the dispatch board. Knows where bodies are buried in the spreadsheets.",
  })
  n({
    key: "ops-snr1",
    parentKey: "ops-mgr",
    label: "Megan Aldridge",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Megan Aldridge",
    contactRole: "Senior Operations Coordinator",
    tenureYears: 3,
    interviewStatus: "INVITED",
    formStatus: "OPENED" as unknown as Fm,
  })
  n({
    key: "ops-snr2",
    parentKey: "ops-mgr",
    label: "Tomasz Wieczorek",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Tomasz Wieczorek",
    contactRole: "Senior Operations Coordinator",
    tenureYears: 2,
    interviewStatus: "TARGET",
    notes: "Recently promoted from Associate; still building stakeholder map.",
  })
  n({
    key: "ops-vac",
    parentKey: "ops-mgr",
    label: "Senior Operations Coordinator (open)",
    type: "ROLE",
    kind: "VACANCY",
    contactRole: "Senior Operations Coordinator",
    interviewStatus: "NONE",
    formStatus: "NONE",
    notes: "Open requisition — 4 candidates in pipeline. Backfill for Tomasz's old seat.",
  })
  n({
    key: "ops-assoc-1",
    parentKey: "ops-mgr",
    label: "Beatrice Adeyemi",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Beatrice Adeyemi",
    contactRole: "Operations Associate",
    tenureYears: 2,
  })
  n({
    key: "ops-assoc-2",
    parentKey: "ops-mgr",
    label: "Owen Hartwell",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Owen Hartwell",
    contactRole: "Operations Associate",
    tenureYears: 1,
  })
  n({
    key: "ops-bundle",
    parentKey: "ops-mgr",
    label: "Operations Associate Pool (4)",
    type: "PERSON",
    kind: "BUNDLE",
    contactName: "Operations Associate Pool (4)",
    contactRole: "Bundled Operations Associates",
    notes: "4 junior ops staff bundled — interviewing 1 representative as a SAMPLE.",
  })
  n({
    key: "ops-contractor",
    parentKey: "head-ops",
    label: "Cal Forrest (Logistics Consultant)",
    type: "PERSON",
    kind: "CONTRACTOR",
    contactName: "Cal Forrest",
    contactRole: "Logistics Consultant",
    tenureYears: 1,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "TARGET",
    edgeStyle: "DOTTED",
    isFractional: false,
    notes: "Brought in 6 months ago to redesign routing. Contract ends Q3 — knowledge transfer at risk.",
  })

  // ── Sales & Marketing ───────────────────────────────────────────────────
  n({
    key: "sales-mktg",
    preserveId: EXISTING_IDS.salesDept,
    parentKey: "org",
    label: "Sales & Marketing",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 10,
    notes: "Pipeline lives in a single spreadsheet maintained by Jordan. CRM budget approved 4 months but undeployed.",
  })
  n({
    key: "head-sales",
    parentKey: "sales-mktg",
    label: "Jordan Reyes",
    type: "PERSON",
    kind: "PERSON",
    preserveId: EXISTING_IDS.jordan,
    contactName: "Jordan Reyes",
    contactRole: "Head of Sales",
    tenureYears: 6,
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "Owns full pipeline visibility — single point of failure. Wants HubSpot Starter; champion for CRM adoption.",
  })
  n({
    key: "ae-1",
    parentKey: "head-sales",
    label: "Imogen Ferrara",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Imogen Ferrara",
    contactRole: "Account Executive",
    tenureYears: 3,
    interviewStatus: "SCHEDULED",
    formStatus: "OPENED" as unknown as Fm,
    notes: "Top performer Q1. Quietly running her own qualification rubric — worth formalising org-wide.",
  })
  n({
    key: "ae-2",
    parentKey: "head-sales",
    label: "Tariq Hassan",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Tariq Hassan",
    contactRole: "Account Executive",
    tenureYears: 2,
    interviewStatus: "SCHEDULED",
  })
  n({
    key: "bdr-1",
    parentKey: "head-sales",
    label: "Mollie Bramwell",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Mollie Bramwell",
    contactRole: "Business Development Rep",
    tenureYears: 1,
    interviewStatus: "INVITED",
    formStatus: "IN_PROGRESS",
  })
  n({
    key: "bdr-bundle",
    parentKey: "head-sales",
    label: "BDR Pool (3)",
    type: "PERSON",
    kind: "BUNDLE",
    contactName: "BDR Pool (3)",
    contactRole: "Bundled Business Development Reps",
    edgeStyle: "MATRIX",
    notes: "3 BDRs matrixed across Imogen + Tariq. No formal pod ownership — cause of follow-up gaps.",
  })
  n({
    key: "ae-vac",
    parentKey: "head-sales",
    label: "Enterprise AE (open)",
    type: "ROLE",
    kind: "VACANCY",
    contactRole: "Enterprise Account Executive",
    notes: "Open since Q1. Recruiter assigned but no shortlist yet.",
  })
  n({
    key: "mktg-lead",
    parentKey: "sales-mktg",
    label: "Frieda Lindqvist",
    type: "PERSON",
    kind: "CONTRACTOR",
    contactName: "Frieda Lindqvist",
    contactRole: "Marketing Lead (fractional)",
    tenureYears: 2,
    isFractional: true,
    edgeStyle: "DOTTED",
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "3 days/week. Content backlog growing — wants AE input on case studies.",
  })
  n({
    key: "mktg-content",
    parentKey: "mktg-lead",
    label: "Theo Nakamura",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Theo Nakamura",
    contactRole: "Content Specialist",
    tenureYears: 1,
    interviewStatus: "TARGET",
  })

  // ── Tech & Data ─────────────────────────────────────────────────────────
  n({
    key: "tech-data",
    parentKey: "org",
    label: "Tech & Data",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 8,
    notes: "No formal DPO; CTO wears all three hats (data + security + DPO). Common audit gap — flag in report.",
  })
  n({
    key: "cto",
    parentKey: "tech-data",
    label: "Anya Petrova",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Anya Petrova",
    contactRole: "Chief Technology Officer",
    tenureYears: 9,
    auditFlags: ["DATA_OWNER", "DPO", "SECURITY", "FOUNDER"],
    interviewStatus: "SCHEDULED",
    formStatus: "COMPLETED",
    isFounder: true,
    notes: "AUDIT-CRITICAL: doubles as DPO without formal appointment. Co-founder. Owns infra strategy single-handed.",
  })
  n({
    key: "tech-lead",
    parentKey: "cto",
    label: "Connor Whitley",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Connor Whitley",
    contactRole: "Tech Lead",
    tenureYears: 4,
    auditFlags: ["SECURITY"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "De-facto deputy CTO. Bus-factor risk if Anya unavailable.",
  })
  n({
    key: "eng-1",
    parentKey: "tech-lead",
    label: "Ravi Subramanian",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Ravi Subramanian",
    contactRole: "Senior Engineer",
    tenureYears: 3,
    interviewStatus: "TARGET",
  })
  n({
    key: "eng-2",
    parentKey: "tech-lead",
    label: "Yuki Tanaka",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Yuki Tanaka",
    contactRole: "Engineer",
    tenureYears: 2,
  })
  n({
    key: "eng-3",
    parentKey: "tech-lead",
    label: "Damir Volkov",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Damir Volkov",
    contactRole: "Engineer",
    tenureYears: 1,
  })
  n({
    key: "data-analyst",
    parentKey: "cto",
    label: "Hugo Schneider",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Hugo Schneider",
    contactRole: "Data Analyst",
    tenureYears: 2,
    auditFlags: ["DATA_OWNER"],
    interviewStatus: "TARGET",
    notes: "Reluctantly owns the warehouse pipeline. Sole owner — bus factor of 1.",
  })
  n({
    key: "eng-vac",
    parentKey: "tech-lead",
    label: "Senior Engineer (open)",
    type: "ROLE",
    kind: "VACANCY",
    contactRole: "Senior Engineer",
    notes: "Open since Q1. Anya screening directly — no recruiter assigned.",
  })
  n({
    key: "cloud-partner",
    parentKey: "cto",
    label: "Quartzlake Cloud (Cloud Infra Partner)",
    type: "PERSON",
    kind: "EXTERNAL",
    preserveId: EXISTING_IDS.alex,
    contactName: "Quartzlake Cloud",
    contactRole: "Cloud Infra Partner",
    edgeStyle: "DOTTED",
    auditFlags: ["SECURITY", "DATA_OWNER"],
    interviewStatus: "INVITED",
    formStatus: "PENDING",
    notes: "External AWS reseller — manages prod infra. No formal data processing agreement on file. Flag in audit.",
  })

  // ── Finance & Admin ─────────────────────────────────────────────────────
  n({
    key: "finance-admin",
    preserveId: EXISTING_IDS.financeDept,
    parentKey: "org",
    label: "Finance & Admin",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 5,
    notes: "Outsourced bookkeeping. Office manager doubles as HR coordinator — unformalised.",
  })
  n({
    key: "office-mgr",
    parentKey: "finance-admin",
    label: "Maya Sridhar",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Maya Sridhar",
    contactRole: "Office Manager (de-facto HR)",
    tenureYears: 6,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "Tenure-rich; institutional memory of how every process actually works. Interview early.",
  })
  n({
    key: "finance-asst",
    parentKey: "finance-admin",
    label: "Quinn Devlin",
    type: "PERSON",
    kind: "PERSON",
    contactName: "Quinn Devlin",
    contactRole: "Finance Assistant",
    tenureYears: 2,
    interviewStatus: "INVITED",
  })
  n({
    key: "ext-accountancy",
    parentKey: "finance-admin",
    label: "Pellatt & Co (Accountancy)",
    type: "PERSON",
    kind: "EXTERNAL",
    preserveId: EXISTING_IDS.sam,
    contactName: "Pellatt & Co",
    contactRole: "External Accountancy Firm",
    edgeStyle: "DOTTED",
    auditFlags: ["FINANCE_OWNER"],
    notes: "Owns year-end + payroll. Quarterly cadence — invoiced separately. No SLA on response time.",
  })

  // ── Board ───────────────────────────────────────────────────────────────
  n({
    key: "board",
    preserveId: EXISTING_IDS.otherDept,
    parentKey: "org",
    label: "Board",
    type: "DEPARTMENT",
    kind: "PERSON",
    headcount: 3,
    notes: "Dotted-line to org. Quarterly cadence; investor seat plus two NEDs.",
  })
  n({
    key: "chair",
    parentKey: "board",
    label: "Sir Edward Pellatt",
    type: "PERSON",
    kind: "ADVISOR",
    contactName: "Sir Edward Pellatt",
    contactRole: "Chair (NED)",
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    edgeStyle: "DOTTED",
    notes: "Ex-DHL ops director. Meets Sarah monthly. Likely sponsor for the engagement.",
  })
  n({
    key: "ned-investor",
    parentKey: "board",
    label: "Beatrix Lange",
    type: "PERSON",
    kind: "ADVISOR",
    contactName: "Beatrix Lange",
    contactRole: "Non-Exec Director (Investor)",
    edgeStyle: "DOTTED",
    auditFlags: ["FINANCE_OWNER"],
  })
  n({
    key: "ned-ops",
    parentKey: "board",
    label: "Yousef Nasr",
    type: "PERSON",
    kind: "ADVISOR",
    contactName: "Yousef Nasr",
    contactRole: "Non-Exec Director (Operations)",
    edgeStyle: "DOTTED",
  })

  return rows
}

// Map roster `formStatus: OPENED / NOT_SENT` (demo-only) → DB values.
// DB only supports NONE / PENDING / SENT / IN_PROGRESS / COMPLETED.
function coerceFormStatus(s: string | undefined): Fm {
  if (!s) return "NONE"
  if (s === "OPENED") return "IN_PROGRESS"
  if (s === "NOT_SENT") return "NONE"
  return s as Fm
}

// Apply the roster to the DB — UPDATE existing rows in place by id (preserving
// FK refs) and INSERT new ones. Idempotent: re-running upserts to the same
// final state. Also DELETEs the stray "New node" row if still present.
async function applyBrightlineRoster(sql: postgres.Sql): Promise<{
  ownerNodeId: string
  marcusId: string
  priyaId: string
  jordanId: string
  alexId: string
  samId: string
  total: number
  inserted: number
  updated: number
}> {
  console.log("\n=== Slice 2: Expand Brightline roster ===")

  const roster = brightlineRoster()

  // 1. Delete the stray "New node" if still present (no FK refs).
  const stray = await sql<{ id: string }[]>`
    SELECT id FROM engagement_org_chart
    WHERE id = ${EXISTING_IDS.strayNewNode}
      AND "engagementId" = ${ENGAGEMENT_ID}
  `
  if (stray.length > 0) {
    await sql`DELETE FROM engagement_org_chart WHERE id = ${EXISTING_IDS.strayNewNode}`
    log(`Deleted stray 'New node'`)
  }

  // 2. Resolve key → id (preserving where preserveId is set + matching by label
  //    on existing departments when label hasn't been renamed yet).
  const existingRows = await sql<
    { id: string; label: string; parentId: string | null }[]
  >`
    SELECT id, label, "parentId"
    FROM engagement_org_chart
    WHERE "engagementId" = ${ENGAGEMENT_ID}
  `
  const idByExistingLabel = new Map<string, string>(existingRows.map((r) => [r.label, r.id]))

  const idByKey = new Map<string, string>()
  for (const row of roster) {
    if (row.preserveId) {
      idByKey.set(row.key, row.preserveId)
    } else if (idByExistingLabel.has(row.label)) {
      // Match by current label (rare — typically used when re-running on
      // a partial state from a previous run).
      idByKey.set(row.key, idByExistingLabel.get(row.label)!)
    } else {
      idByKey.set(row.key, uid())
    }
  }

  // 3. UPSERT each row.
  let inserted = 0
  let updated = 0
  for (const row of roster) {
    const id = idByKey.get(row.key)!
    const parentId = row.parentKey ? idByKey.get(row.parentKey)! : null
    const formStatus = coerceFormStatus(row.formStatus as unknown as string)
    const interviewStatus = (row.interviewStatus ?? "NONE") as Iv
    const auditFlags = row.auditFlags ?? []
    const avatarColor =
      row.kind === "BUNDLE" || row.type === "DEPARTMENT"
        ? null
        : pickAvatarColor(row.label)
    const edgeStyle = row.edgeStyle ?? "SOLID"
    const email =
      row.email !== undefined
        ? row.email
        : (row.kind === "PERSON" || row.kind === "VACANCY" || row.kind === "CONTRACTOR" || row.kind === "ADVISOR")
        ? brightlineEmail(row.contactName ?? row.label)
        : null

    const exists = await sql<{ id: string }[]>`
      SELECT id FROM engagement_org_chart WHERE id = ${id}
    `

    if (exists.length === 0) {
      await sql`
        INSERT INTO engagement_org_chart
          (id, "tenantId", "engagementId", "parentId", label, type,
           kind, "contactName", "contactRole", email,
           "interviewMode", "sortOrder", "lastEditedBy",
           tenure_years, is_founder, is_fractional, avatar_color,
           audit_flags, interview_status, form_status, edge_style,
           headcount, notes,
           "createdAt", "updatedAt")
        VALUES
          (${id}, ${CLIENT_TENANT_ID}, ${ENGAGEMENT_ID}, ${parentId},
           ${row.label}, ${row.type},
           ${row.kind}, ${row.contactName ?? null}, ${row.contactRole ?? null}, ${email},
           'ALL', ${row.sortOrder}, 'CONSULTANT',
           ${row.tenureYears ?? null}, ${row.isFounder ?? false}, ${row.isFractional ?? false}, ${avatarColor},
           ${auditFlags as unknown as string[]}::text[], ${interviewStatus}, ${formStatus}, ${edgeStyle},
           ${row.headcount ?? null}, ${row.notes ?? null},
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      inserted++
    } else {
      await sql`
        UPDATE engagement_org_chart
        SET
          "parentId"        = ${parentId},
          label             = ${row.label},
          type              = ${row.type},
          kind              = ${row.kind},
          "contactName"     = ${row.contactName ?? null},
          "contactRole"     = ${row.contactRole ?? null},
          email             = ${email},
          "sortOrder"       = ${row.sortOrder},
          tenure_years      = ${row.tenureYears ?? null},
          is_founder        = ${row.isFounder ?? false},
          is_fractional     = ${row.isFractional ?? false},
          avatar_color      = ${avatarColor},
          audit_flags       = ${auditFlags as unknown as string[]}::text[],
          interview_status  = ${interviewStatus},
          form_status       = ${formStatus},
          edge_style        = ${edgeStyle},
          headcount         = ${row.headcount ?? null},
          notes             = ${row.notes ?? null},
          "updatedAt"       = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `
      updated++
    }
  }

  log(`Upserted ${roster.length} nodes (${inserted} inserted, ${updated} updated)`)

  return {
    ownerNodeId: EXISTING_IDS.ceo,
    marcusId: EXISTING_IDS.marcus,
    priyaId: EXISTING_IDS.priya,
    jordanId: EXISTING_IDS.jordan,
    alexId: EXISTING_IDS.alex,
    samId: EXISTING_IDS.sam,
    total: roster.length,
    inserted,
    updated,
  }
}

// Replaces the original Step 1 enrichOrgChart — wraps applyBrightlineRoster so
// downstream steps (form sim, audit, call notes, report) still get the
// same nodeIds shape they expect.
async function enrichOrgChart(_sql: postgres.Sql) {
  const sql = _sql
  console.log("\n=== Step 1: Enrich org chart ===")
  void resolveNodes // retained for legacy callers
  return applyBrightlineRoster(sql)
}

// Old legacy Step 1 retained below as `_legacyEnrichOrgChart` for reference
// (unused — new applyBrightlineRoster supersedes it).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _legacyEnrichOrgChart(sql: postgres.Sql) {
  console.log("\n=== Step 1: Enrich org chart ===")
  const nodes = await resolveNodes(sql)

  // 1a. Update Owner / Founder contact info
  const ownerNode = nodes[ROLE_LABELS.OWNER]
  if (!ownerNode) throw new Error("Owner/Founder node not found")

  await sql`
    UPDATE engagement_org_chart
    SET
      "contactName"  = 'Sarah Chen',
      "contactEmail" = 'sarah@testclient.example',
      "contactRole"  = 'Founder'
    WHERE id = ${ownerNode.id}
  `
  log(`Updated Owner/Founder → Sarah Chen`)

  // 1b. Helper: insert PERSON child if not already present (keyed by contactEmail + parentId)
  async function upsertPersonChild(opts: {
    parentLabel: string
    name: string
    role: string
    email: string
    sortOrder: number
  }): Promise<string> {
    const parent = nodes[opts.parentLabel]
    if (!parent) throw new Error(`Parent node not found: ${opts.parentLabel}`)

    const existing = await sql<{ id: string }[]>`
      SELECT id FROM engagement_org_chart
      WHERE "engagementId" = ${ENGAGEMENT_ID}
        AND "parentId"     = ${parent.id}
        AND "contactEmail" = ${opts.email}
    `
    if (existing.length > 0) {
      log(`SKIP — ${opts.name} already exists (${existing[0].id})`)
      return existing[0].id
    }

    const id = uid()
    await sql`
      INSERT INTO engagement_org_chart
        (id, "tenantId", "engagementId", "parentId", label, type,
         "contactName", "contactEmail", "contactRole",
         "interviewMode", "sortOrder", "lastEditedBy",
         "createdAt", "updatedAt")
      VALUES
        (${id}, ${CLIENT_TENANT_ID}, ${ENGAGEMENT_ID}, ${parent.id},
         ${opts.name}, 'PERSON',
         ${opts.name}, ${opts.email}, ${opts.role},
         'ALL', ${opts.sortOrder}, 'CONSULTANT',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    log(`Inserted PERSON — ${opts.name} (${opts.email})`)
    return id
  }

  // 1c. PERSON children
  const marcusId = await upsertPersonChild({
    parentLabel: ROLE_LABELS.OPERATIONS,
    name: "Marcus Webb",
    role: "Operations Lead",
    email: "marcus@testclient.example",
    sortOrder: 10,
  })

  const priyaId = await upsertPersonChild({
    parentLabel: ROLE_LABELS.FINANCE,
    name: "Priya Patel",
    role: "Finance Manager",
    email: "priya@testclient.example",
    sortOrder: 11,
  })

  const jordanId = await upsertPersonChild({
    parentLabel: ROLE_LABELS.SALES,
    name: "Jordan Reyes",
    role: "Head of Sales",
    email: "jordan@testclient.example",
    sortOrder: 12,
  })

  const alexId = await upsertPersonChild({
    parentLabel: ROLE_LABELS.OTHER,
    name: "Alex Kim",
    role: "Customer Success",
    email: "alex@testclient.example",
    sortOrder: 13,
  })

  const samId = await upsertPersonChild({
    parentLabel: ROLE_LABELS.OTHER,
    name: "Sam Davies",
    role: "Account Executive",
    email: "sam@testclient.example",
    sortOrder: 14,
  })

  // 1d. Enrich chart-depth fields on the 6 PERSON rows so every overlay
  // has visible variety. Idempotent — UPDATE by id, safe to re-run.
  // Narrative: Brightline Logistics Ltd — a fictional mid-Atlantic SMB
  // logistics business in the middle of a discovery audit. The team is
  // Sarah (founder/CEO), Marcus (ops lead), Priya (fractional finance),
  // Jordan (NED/sales advisor — dotted line), Alex (external CS partner),
  // and a Junior AE bundle (Sam → relabelled).
  type Enrichment = {
    id: string
    label?: string
    contactName?: string
    contactRole?: string
    kind: "PERSON" | "VACANCY" | "CONTRACTOR" | "ADVISOR" | "EXTERNAL" | "BUNDLE"
    auditFlags: string[]
    interviewStatus: "NONE" | "TARGET" | "INVITED" | "SCHEDULED" | "COMPLETED"
    formStatus: "NONE" | "PENDING" | "SENT" | "IN_PROGRESS" | "COMPLETED"
    tenureYears: number | null
    email: string | null
    isFounder: boolean
    isFractional: boolean
    avatarColor: string | null
    edgeStyle: "SOLID" | "DOTTED" | "MATRIX"
  }

  const enrichments: Enrichment[] = [
    {
      id: ownerNode.id,
      contactName: "Sarah Chen",
      contactRole: "Founder & CEO",
      kind: "PERSON",
      auditFlags: ["FOUNDER", "DECISION_MAKER", "DATA_OWNER"],
      interviewStatus: "SCHEDULED",
      formStatus: "COMPLETED",
      tenureYears: 8,
      email: "sarah.chen@brightline-logistics.example.com",
      isFounder: true,
      isFractional: false,
      avatarColor: "indigo",
      edgeStyle: "SOLID",
    },
    {
      id: marcusId,
      contactName: "Marcus Webb",
      contactRole: "Operations Lead",
      kind: "PERSON",
      auditFlags: ["PROCESS_OWNER", "DPO"],
      interviewStatus: "COMPLETED",
      formStatus: "COMPLETED",
      tenureYears: 4,
      email: "marcus.webb@brightline-logistics.example.com",
      isFounder: false,
      isFractional: false,
      avatarColor: "teal",
      edgeStyle: "SOLID",
    },
    {
      id: priyaId,
      contactName: "Priya Patel",
      contactRole: "Fractional Finance Manager",
      kind: "CONTRACTOR",
      auditFlags: ["FINANCE_OWNER"],
      interviewStatus: "INVITED",
      formStatus: "IN_PROGRESS",
      tenureYears: 1,
      email: "priya.patel@brightline-logistics.example.com",
      isFounder: false,
      isFractional: true,
      avatarColor: "amber",
      edgeStyle: "DOTTED",
    },
    {
      id: jordanId,
      contactName: "Jordan Reyes",
      contactRole: "Non-Exec Sales Advisor",
      kind: "ADVISOR",
      auditFlags: ["DECISION_MAKER"],
      interviewStatus: "TARGET",
      formStatus: "SENT",
      tenureYears: null,
      email: "jordan.reyes@brightline-logistics.example.com",
      isFounder: false,
      isFractional: true,
      avatarColor: "violet",
      edgeStyle: "DOTTED",
    },
    {
      id: alexId,
      contactName: "Alex Kim",
      contactRole: "External Customer Success Partner",
      kind: "EXTERNAL",
      auditFlags: ["SECURITY"],
      interviewStatus: "INVITED",
      formStatus: "PENDING",
      tenureYears: 1,
      email: null,
      isFounder: false,
      isFractional: false,
      avatarColor: "rose",
      edgeStyle: "SOLID",
    },
    {
      id: samId,
      label: "Junior AE Team (4)",
      contactName: "Junior AE Team (4)",
      contactRole: "Bundled Account Executives",
      kind: "BUNDLE",
      auditFlags: [],
      interviewStatus: "NONE",
      formStatus: "NONE",
      tenureYears: null,
      email: null,
      isFounder: false,
      isFractional: false,
      avatarColor: null,
      edgeStyle: "MATRIX",
    },
  ]

  for (const e of enrichments) {
    await sql`
      UPDATE engagement_org_chart
      SET
        label             = COALESCE(${e.label ?? null}, label),
        "contactName"     = COALESCE(${e.contactName ?? null}, "contactName"),
        "contactRole"     = COALESCE(${e.contactRole ?? null}, "contactRole"),
        kind              = ${e.kind},
        audit_flags       = ${e.auditFlags as unknown as string[]}::text[],
        interview_status  = ${e.interviewStatus},
        form_status       = ${e.formStatus},
        tenure_years      = ${e.tenureYears},
        email             = ${e.email},
        is_founder        = ${e.isFounder},
        is_fractional     = ${e.isFractional},
        avatar_color      = ${e.avatarColor},
        edge_style        = ${e.edgeStyle},
        "updatedAt"       = CURRENT_TIMESTAMP
      WHERE id = ${e.id}
    `
    log(`Enriched ${e.contactName ?? e.label ?? e.id} → kind=${e.kind} flags=[${e.auditFlags.join(",")}] iv=${e.interviewStatus} fm=${e.formStatus}`)
  }

  return { ownerNodeId: ownerNode.id, marcusId, priyaId, jordanId, alexId, samId }
}

// ---------------------------------------------------------------------------
// Step 2: Form completion simulation
// ---------------------------------------------------------------------------

async function simulateFormCompletion(
  sql: postgres.Sql,
  nodeIds: {
    ownerNodeId: string
    marcusId: string
    priyaId: string
    jordanId: string
    alexId: string
    samId: string
  }
) {
  console.log("\n=== Step 2: Form completion simulation ===")

  // Resolve template IDs
  const templates = await sql<{ id: string; slug: string; name: string }[]>`
    SELECT id, slug, name FROM form_templates
    WHERE "tenantId" = ${IRONHEART_TENANT_ID}
  `
  for (const t of templates) {
    TEMPLATE_SLUG_MAP[t.slug] = t.id
  }
  log(`Resolved ${templates.length} form templates`)

  // Map contact → template slug
  const contacts = [
    {
      nodeId: nodeIds.ownerNodeId,
      name: "Sarah Chen",
      email: "sarah@testclient.example",
      templateSlug: "questionnaire-owner-director",
      status: "COMPLETED" as const,
      completedAt: daysAgo(5),
    },
    {
      nodeId: nodeIds.marcusId,
      name: "Marcus Webb",
      email: "marcus@testclient.example",
      templateSlug: "questionnaire-operations",
      status: "COMPLETED" as const,
      completedAt: daysAgo(4),
    },
    {
      nodeId: nodeIds.priyaId,
      name: "Priya Patel",
      email: "priya@testclient.example",
      templateSlug: "questionnaire-finance-admin",
      status: "COMPLETED" as const,
      completedAt: daysAgo(3),
    },
    {
      nodeId: nodeIds.jordanId,
      name: "Jordan Reyes",
      email: "jordan@testclient.example",
      templateSlug: "questionnaire-sales-marketing",
      status: "PENDING" as const, // Sent but not completed
      completedAt: null,
    },
    // Alex + Sam are SAMPLE slots — forms not yet sent (PENDING, no form row)
  ]

  for (const contact of contacts) {
    const templateId = TEMPLATE_SLUG_MAP[contact.templateSlug]
    if (!templateId) {
      log(`WARN — template not found: ${contact.templateSlug}`)
      continue
    }

    // Check if node already has a formSendId
    const nodeRow = await sql<{ formSendId: string | null }[]>`
      SELECT "formSendId" FROM engagement_org_chart WHERE id = ${contact.nodeId}
    `
    if (nodeRow[0]?.formSendId) {
      log(`SKIP — ${contact.name} already has formSendId`)
      continue
    }

    // Upsert customer record in the Ironheart tenant (forms belong to consultant tenant)
    const [firstName, ...lastParts] = contact.name.split(" ")
    const lastName = lastParts.join(" ")

    const existingCustomer = await sql<{ id: string }[]>`
      SELECT id FROM customers
      WHERE "tenantId" = ${IRONHEART_TENANT_ID}
        AND email      = ${contact.email}
    `
    let customerId: string
    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id
      log(`Customer exists for ${contact.name}: ${customerId}`)
    } else {
      customerId = uid()
      await sql`
        INSERT INTO customers
          (id, "tenantId", "firstName", "lastName", email, country, "marketingOptIn", status, "createdAt", "updatedAt", version)
        VALUES
          (${customerId}, ${IRONHEART_TENANT_ID}, ${firstName}, ${lastName}, ${contact.email},
           'GB', false, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      `
      log(`Created customer for ${contact.name}: ${customerId}`)
    }

    // Check if a completed_form already exists for this email + templateId
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM completed_forms
      WHERE "tenantId"       = ${IRONHEART_TENANT_ID}
        AND "templateId"     = ${templateId}
        AND "customerEmail"  = ${contact.email}
    `
    let formId: string
    if (existing.length > 0) {
      formId = existing[0].id
      log(`SKIP form insert — ${contact.name} already has a form row (${formId})`)
    } else {
      formId = uid()
      const templateName = templates.find((t) => t.id === templateId)?.name ?? ""
      const responses = contact.status === "COMPLETED"
        ? JSON.stringify({ completed: true, simulatedSeed: true })
        : JSON.stringify({})

      if (contact.status === "COMPLETED") {
        await sql`
          INSERT INTO completed_forms
            (id, "tenantId", "templateId", "templateName",
             "customerId", "customerName", "customerEmail",
             responses, status, "submittedAt", "sessionKey", "createdAt")
          VALUES
            (${formId}, ${IRONHEART_TENANT_ID}, ${templateId}, ${templateName},
             ${customerId}, ${contact.name}, ${contact.email},
             ${responses}::jsonb,
             'COMPLETED',
             ${contact.completedAt!},
             ${"seed-" + uid()},
             ${contact.completedAt!})
        `
      } else {
        await sql`
          INSERT INTO completed_forms
            (id, "tenantId", "templateId", "templateName",
             "customerId", "customerName", "customerEmail",
             responses, status, "submittedAt", "sessionKey", "createdAt")
          VALUES
            (${formId}, ${IRONHEART_TENANT_ID}, ${templateId}, ${templateName},
             ${customerId}, ${contact.name}, ${contact.email},
             ${responses}::jsonb,
             'PENDING', NULL,
             ${"seed-" + uid()},
             CURRENT_TIMESTAMP)
        `
      }
      log(`Inserted completed_form for ${contact.name} — status=${contact.status}`)
    }

    // Link formSendId on chart node
    await sql`
      UPDATE engagement_org_chart
      SET "formSendId" = ${formId}
      WHERE id = ${contact.nodeId}
    `
    log(`Linked formSendId on chart node for ${contact.name}`)
  }
}

// ---------------------------------------------------------------------------
// Step 3: Audit session + 5 lenses + findings + recommendations
// ---------------------------------------------------------------------------

async function seedAuditSession(sql: postgres.Sql): Promise<string> {
  console.log("\n=== Step 3: Audit session + lenses + findings + recs ===")

  // Use existing session if present
  const existingSessions = await sql<{ id: string; status: string }[]>`
    SELECT id, status FROM audit_sessions
    WHERE "engagementId" = ${ENGAGEMENT_ID}
  `

  let sessionId: string
  if (existingSessions.length > 0) {
    sessionId = existingSessions[0].id
    log(`Using existing audit session: ${sessionId}`)
  } else {
    sessionId = uid()
    await sql`
      INSERT INTO audit_sessions (id, "tenantId", "engagementId", status, "createdAt", "updatedAt")
      VALUES (${sessionId}, ${IRONHEART_TENANT_ID}, ${ENGAGEMENT_ID}, 'IN_PROGRESS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    log(`Created audit session: ${sessionId}`)
  }

  // Define all 5 lenses
  const lenses = [
    {
      lens: "REVENUE",
      ragScore: "AMBER",
      ragJustification:
        "Growing 30% YoY but pipeline visibility is poor and conversion drops sharply at stage 3.",
      currentState:
        "Sales process is opportunistic. No defined ICP. Close rate at 18% (industry benchmark 24%). Average sales cycle 78 days, target 50. Inbound leads are pursued regardless of fit, which dilutes focus and drags out cycles unnecessarily.",
      sortOrder: 0,
      findings: [
        {
          finding: "No ICP definition; sales team chases any inbound lead regardless of fit",
          impact: "HIGH" as const,
          evidence:
            "Reviewed 20 closed-lost deals last quarter — 9 didn't fit any consistent profile and consumed 40% of sales bandwidth",
          estimatedAnnualWaste: 4200000, // £42,000 in pence
        },
        {
          finding: "Pipeline data lives in multiple spreadsheets with no CRM in place",
          impact: "MEDIUM" as const,
          evidence:
            "Demoed 3 different sheets in different formats; 4 stuck deals identified that were lost to follow-up gaps",
          estimatedAnnualWaste: 1800000, // £18,000
        },
      ],
      recommendations: [
        {
          action: "Define ICP + qualification criteria in a team workshop; embed into sales process",
          estimatedEffort: "2 days",
          estimatedCost: 200000, // £2,000
          priority: 1,
        },
        {
          action:
            "Implement HubSpot Starter (or equivalent lightweight CRM) and migrate pipeline data",
          estimatedEffort: "1 week",
          estimatedCost: 300000, // £3,000 setup (£400/mo ongoing)
          priority: 2,
        },
      ],
    },
    {
      lens: "OPERATIONS",
      ragScore: "RED",
      ragJustification:
        "Process is entirely manual. Onboarding takes 11 days when it should take 2. No SLAs, no metrics, no automation.",
      currentState:
        "New customer onboarding is managed in spreadsheets and email threads. Every step requires owner approval. The provisioning stage is the primary bottleneck. There are no documented SOPs for any recurring process; institutional knowledge lives with one person.",
      sortOrder: 1,
      findings: [
        {
          finding: "11-day average onboarding cycle vs industry benchmark of 2–3 days",
          impact: "HIGH" as const,
          evidence:
            "Sampled 8 recent onboardings — average 11.3 days, standard deviation 4.2 days; delayed revenue recognition on every contract",
          estimatedAnnualWaste: 6700000, // £67,000
        },
        {
          finding: "Owner approval bottleneck across 9 routine operational tasks daily",
          impact: "HIGH" as const,
          evidence:
            "Workflow audit confirmed Sarah personally approves contracts, invoice setups, and role assignments — consuming 2–3 hours per day on delegable decisions",
          estimatedAnnualWaste: 2800000, // £28,000
        },
        {
          finding: "No SOP documentation exists for any recurring business process",
          impact: "MEDIUM" as const,
          evidence:
            "Asked Marcus to walk through the onboarding process — relied entirely on memory and guidance from Sarah; no written reference exists",
          estimatedAnnualWaste: 1500000, // £15,000
        },
      ],
      recommendations: [
        {
          action:
            "Build onboarding workflow with assignable steps, owner visibility, and auto-notifications at each stage",
          estimatedEffort: "1 sprint (2 weeks)",
          estimatedCost: 600000, // £6,000
          priority: 1,
        },
        {
          action:
            "Delegate authority for 9 routine approvals to Operations Lead with defined decision criteria",
          estimatedEffort: "1 week",
          estimatedCost: 50000, // £500
          priority: 2,
        },
        {
          action: "Document top 5 recurring processes as SOPs in Notion with assigned owners",
          estimatedEffort: "2 weeks",
          estimatedCost: 250000, // £2,500
          priority: 3,
        },
      ],
    },
    {
      lens: "FINANCE",
      ragScore: "AMBER",
      ragJustification:
        "Reconciliation lag of 9 days, manual invoice matching, and no real-time cashflow visibility for leadership.",
      currentState:
        "QuickBooks is in use alongside spreadsheets. Priya reconciles weekly. Invoices are manually matched to bank statements via CSV export. Leadership has no live view of runway or cashflow position.",
      sortOrder: 2,
      findings: [
        {
          finding:
            "9-day reconciliation lag obscures cashflow position and delays decision-making",
          impact: "HIGH" as const,
          evidence:
            "Bank feed not connected to QuickBooks; Priya exports CSV monthly and reconciles manually, creating a chronic blind spot on actual cash position",
          estimatedAnnualWaste: 1200000, // £12,000
        },
        {
          finding:
            "Manual invoice matching consumes approximately 6 hours per week of Finance Manager time",
          impact: "MEDIUM" as const,
          evidence:
            "Priya's own time audit: 4.5 hours on invoice matching, 1.5 hours chasing discrepancies — equivalent to 15% of her working week on automatable tasks",
          estimatedAnnualWaste: 1400000, // £14,000
        },
      ],
      recommendations: [
        {
          action:
            "Connect live bank feed to QuickBooks and configure automated matching rules for recurring transactions",
          estimatedEffort: "3 days",
          estimatedCost: 120000, // £1,200
          priority: 1,
        },
        {
          action:
            "Set a monthly close target of day 5 and expose a real-time runway dashboard to the leadership team",
          estimatedEffort: "1 week",
          estimatedCost: 60000, // £600
          priority: 2,
        },
      ],
    },
    {
      lens: "TECHNOLOGY",
      ragScore: "GREEN",
      ragJustification:
        "Tooling is adequate for a business of this size; the main gap is lack of integration between systems causing manual re-keying.",
      currentState:
        "Google Workspace, QuickBooks, Slack, and ad-hoc spreadsheets form the current stack. Each system works in isolation. Data is hand-keyed between sales, finance, and operations with no automation or integration layer.",
      sortOrder: 3,
      findings: [
        {
          finding:
            "No integration between sales pipeline and finance — every won deal requires manual data entry in three systems",
          impact: "MEDIUM" as const,
          evidence:
            "Counted an average of 3 separate manual data entry steps per won deal; at current close volume this generates significant accumulated error risk",
          estimatedAnnualWaste: 800000, // £8,000
        },
        {
          finding:
            "Slack and email usage is fragmented — async decisions get lost across channels and threads",
          impact: "LOW" as const,
          evidence:
            "Marcus cited 4 incidents in 30 days where decisions made in Slack were not actioned due to notification fatigue and channel sprawl",
          estimatedAnnualWaste: 400000, // £4,000
        },
      ],
      recommendations: [
        {
          action:
            "Connect CRM to QuickBooks via Zapier or native integration once CRM is implemented — automate won-deal → invoice creation",
          estimatedEffort: "1 day",
          estimatedCost: 40000, // £400
          priority: 1,
        },
        {
          action: "Define Slack channel taxonomy, archive unused channels, and set async decision norms",
          estimatedEffort: "2 hours",
          estimatedCost: 20000, // £200
          priority: 2,
        },
      ],
    },
    {
      lens: "TEAM",
      ragScore: "AMBER",
      ragJustification:
        "Roles are unclear, there is no performance feedback loop, and the owner remains the single point of failure for most decisions.",
      currentState:
        "12 people in the business with no org chart, no documented role definitions, and no regular performance review cycle. Role boundaries are inferred from historical projects. Sarah is the de facto decision-maker across all functions.",
      sortOrder: 4,
      findings: [
        {
          finding: "No documented roles and responsibilities exist for any member of the team",
          impact: "MEDIUM" as const,
          evidence:
            "Asked 3 staff members to describe their own role — each gave an answer that differed significantly from Sarah's understanding of the same role",
          estimatedAnnualWaste: 1800000, // £18,000
        },
        {
          finding:
            "No formal performance reviews have been conducted in 14 months, creating retention risk",
          impact: "MEDIUM" as const,
          evidence:
            "HR records confirm last performance reviews were in March 2025; two team members have raised concerns informally about progression clarity",
          estimatedAnnualWaste: 900000, // £9,000
        },
      ],
      recommendations: [
        {
          action:
            "Build a company org chart and RACI matrix covering the top 5 cross-functional workflows",
          estimatedEffort: "1 week",
          estimatedCost: 300000, // £3,000
          priority: 1,
        },
        {
          action:
            "Establish quarterly check-in cadence and annual review cycle with structured templates",
          estimatedEffort: "Ongoing (process setup 1 week)",
          estimatedCost: 100000, // £1,000 setup
          priority: 2,
        },
      ],
    },
  ]

  for (const lens of lenses) {
    // Check if lens analysis already exists
    const existingLens = await sql<{ id: string }[]>`
      SELECT id FROM audit_lens_analysis
      WHERE "auditSessionId" = ${sessionId}
        AND lens            = ${lens.lens}::"AuditLens"
    `

    let lensId: string
    if (existingLens.length > 0) {
      lensId = existingLens[0].id
      log(`SKIP — lens ${lens.lens} already exists (${lensId})`)
    } else {
      lensId = uid()
      await sql`
        INSERT INTO audit_lens_analysis
          (id, "auditSessionId", lens, "ragScore", "ragJustification", "currentState", "sortOrder", "createdAt", "updatedAt")
        VALUES
          (${lensId}, ${sessionId}, ${lens.lens}::"AuditLens",
           ${lens.ragScore}::"RagScore",
           ${lens.ragJustification},
           ${lens.currentState},
           ${lens.sortOrder},
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      log(`Created lens analysis: ${lens.lens} (${lens.ragScore})`)
    }

    // Insert findings (idempotent by finding text + lensId)
    for (let i = 0; i < lens.findings.length; i++) {
      const f = lens.findings[i]
      const existingFinding = await sql<{ id: string }[]>`
        SELECT id FROM audit_findings
        WHERE "lensAnalysisId" = ${lensId}
          AND finding          = ${f.finding}
      `
      if (existingFinding.length > 0) {
        log(`SKIP — finding already exists`)
        continue
      }
      await sql`
        INSERT INTO audit_findings
          (id, "lensAnalysisId", finding, impact, evidence, priority, "estimatedAnnualWaste", "createdAt")
        VALUES
          (${uid()}, ${lensId}, ${f.finding},
           ${f.impact}::"FindingImpact",
           ${f.evidence},
           ${i + 1},
           ${f.estimatedAnnualWaste},
           CURRENT_TIMESTAMP)
      `
      log(`  finding: [${f.impact}] ${f.finding.slice(0, 60)}...`)
    }

    // Insert recommendations (idempotent by action text + lensId)
    for (const rec of lens.recommendations) {
      const existingRec = await sql<{ id: string }[]>`
        SELECT id FROM audit_recommendations
        WHERE "lensAnalysisId" = ${lensId}
          AND action           = ${rec.action}
      `
      if (existingRec.length > 0) {
        log(`SKIP — recommendation already exists`)
        continue
      }
      await sql`
        INSERT INTO audit_recommendations
          (id, "lensAnalysisId", action, "estimatedEffort", "estimatedCost", priority, "createdAt")
        VALUES
          (${uid()}, ${lensId}, ${rec.action},
           ${rec.estimatedEffort},
           ${rec.estimatedCost},
           ${rec.priority},
           CURRENT_TIMESTAMP)
      `
      log(`  rec: ${rec.action.slice(0, 60)}...`)
    }
  }

  // Update session to READY_FOR_REPORT so the consultant sees the right state
  await sql`
    UPDATE audit_sessions
    SET status = 'READY_FOR_REPORT', "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${sessionId}
  `
  log(`Updated session status → READY_FOR_REPORT`)

  return sessionId
}

// ---------------------------------------------------------------------------
// Step 4: Call notes per contact
// ---------------------------------------------------------------------------

async function seedCallNotes(
  sql: postgres.Sql,
  sessionId: string,
  nodeIds: {
    ownerNodeId: string
    marcusId: string
    priyaId: string
    jordanId: string
  }
) {
  console.log("\n=== Step 4: Call notes per contact ===")

  const callNotesData = [
    {
      nodeId: nodeIds.ownerNodeId,
      callDate: daysAgo(6),
      rawNotes: `Initial discovery call with Sarah Chen — Founder & CEO. 45 minutes.

Sarah opened by describing the company's growth trajectory: "We've grown 30% year-on-year for the last two years and I'm incredibly proud of that, but it's starting to feel like we're sprinting on a treadmill that's speeding up." She listed three things keeping her up at night: onboarding speed, the fact that every decision requires her sign-off, and the lack of visibility into pipeline.

The approval bottleneck came up unprompted. Sarah admitted she approves contracts, invoice setups, access provisioning, and client role assignments daily. "It's maybe 2–3 hours a day of my time on things Marcus or Priya could absolutely handle — I just haven't had time to define the boundaries." She referenced wanting to delegate but said every time she tries, something slips through the cracks.

On sales, Sarah described the process as "entirely reactive." There's no formal ICP, no qualification gate, and the team pursues any inbound enquiry. "Jordan has brilliant instincts, but instincts don't scale. We need a system." She mentioned the HubSpot conversation has been going on for six months and keeps getting deprioritised.

Ended with: "What I really want is to be able to go on holiday and not have everything pause." That's the north star — the business needs to run without the founder in every decision loop.`,
    },
    {
      nodeId: nodeIds.marcusId,
      callDate: daysAgo(5),
      rawNotes: `Call with Marcus Webb — Operations Lead. 40 minutes.

Marcus walked through the current onboarding process in detail. The steps are: initial confirmation email → contract generation (needs Sarah approval) → access provisioning → kickoff call scheduling → onboarding document pack → account setup → go-live confirmation. Total elapsed time: "11 days on a good week, sometimes 14." He described this as "embarrassing" given that two competitors apparently do it in 2–3 days.

The biggest bottleneck he identified was the Sarah approval gate at contract stage. "If she's travelling or in back-to-back client calls, that step just parks for a day or two. And then it cascades." He also mentioned that provisioning is still done via a spreadsheet checklist — every item ticked off manually, no automation.

On documentation: Marcus wants SOPs but has never had protected time to write them. "I know what I do. I just couldn't tell you where to find any of it written down." He expressed strong interest in Notion as a home for process documentation and had already started a personal Notion workspace with rough notes.

He was enthusiastic about workflow automation — specifically mentioned seeing a demo of a tool that auto-assigns tasks and notifies owners. "If I could just set up a board where every new client automatically gets a task list assigned, that would save us days." Clear candidate for workflow automation quick win.

Finished by saying the team is capable but understructured: "Everyone knows their job but nobody knows where their job ends and the next person's begins."`,
    },
    {
      nodeId: nodeIds.priyaId,
      callDate: daysAgo(4),
      rawNotes: `Call with Priya Patel — Finance Manager. 35 minutes.

Priya manages all finance operations: invoicing, reconciliation, payroll coordination, and supplier payments. She's clearly capable and organised, but is spending a significant portion of her time on work that should be automated.

The bank feed issue came up immediately. QuickBooks is in use, but the bank feed was never connected. "Someone was going to set it up about 18 months ago and it just... never happened. I've been exporting CSV files from the bank every month and importing them manually." She estimates reconciliation takes 2–3 days at the end of each month. "By the time I know our real cash position, the information is already 3–4 weeks old."

Invoice matching is the other pain point. Around 6 hours per week spent cross-referencing purchase orders, supplier invoices, and bank statements. "I have a spreadsheet I've built over three years to manage it. It works, but it's held together with formulas and prayers." She acknowledged it would collapse if she were off sick for any meaningful period.

On the monthly close: there's no defined target date. "Sometimes we close by day 10, sometimes day 20 — it depends on how many chases I have to do." Leadership (Sarah) has no visibility into cashflow between closes.

One specific ask: "I'd love a simple dashboard Sarah can look at every Monday that shows: cash in bank, outstanding invoices, projected inflows next 30 days. That would stop a lot of urgent questions coming to me."`,
    },
    {
      nodeId: nodeIds.jordanId,
      callDate: daysAgo(3),
      rawNotes: `Call with Jordan Reyes — Head of Sales. 30 minutes.

Jordan manages all inbound sales and owns the pipeline. The conversation was candid — Jordan was clearly aware of the gaps and had already been advocating internally for change.

The CRM situation: "My pipeline lives in a spreadsheet I built myself. It works for me but no one else can really read it — Sarah asks for updates and I have to manually produce a summary." He confirmed that budget for HubSpot Starter has been approved for "at least four months" but implementation keeps being deprioritised. "There's always something more urgent. But the irony is that a CRM would probably solve most of the urgent things."

On qualification: Jordan admitted that the team takes any inbound lead to at least a discovery call, regardless of fit. "I know within 10 minutes whether someone is right for us, but I still go through the motions because there's no agreed filter. If I reject a lead, I get asked to justify it, which takes longer than just doing the call." He had clear views on what an ICP should look like — a sales workshop to document this would be well-received.

He mentioned losing 4 deals in the last quarter to follow-up gaps. "I was chasing them in my head but had too many on the go. If HubSpot was in place with task reminders, I'd have caught all of them." Estimated lost revenue: "conservatively £35–40k."

One concern raised: Jordan is the only person with full pipeline visibility. "If I was off for a week, Sarah wouldn't know where any deal stood." Single point of failure — noted as a risk.`,
    },
  ]

  for (const note of callNotesData) {
    // Idempotent: check by auditSessionId + contactUserId
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM audit_call_notes
      WHERE "auditSessionId" = ${sessionId}
        AND "contactUserId"  = ${note.nodeId}
    `
    if (existing.length > 0) {
      log(`SKIP — call note already exists for node ${note.nodeId}`)
      // Update if rawNotes is empty
      const existingNote = await sql<{ rawNotes: string | null }[]>`
        SELECT "rawNotes" FROM audit_call_notes WHERE id = ${existing[0].id}
      `
      if (!existingNote[0]?.rawNotes || existingNote[0].rawNotes.trim().length < 200) {
        await sql`
          UPDATE audit_call_notes
          SET "rawNotes" = ${note.rawNotes}, "callDate" = ${note.callDate}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = ${existing[0].id}
        `
        log(`  Updated empty rawNotes for existing note`)
      }
      continue
    }

    await sql`
      INSERT INTO audit_call_notes
        (id, "auditSessionId", "contactUserId", "rawNotes", "callDate", "createdAt", "updatedAt")
      VALUES
        (${uid()}, ${sessionId}, ${note.nodeId}, ${note.rawNotes}, ${note.callDate}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
    log(`Inserted call note for node ${note.nodeId}`)
  }
}

// ---------------------------------------------------------------------------
// Step 5: Audit report DRAFT
// ---------------------------------------------------------------------------

const REPORT_CONTENT_MARKDOWN = `# Executive Summary

Test is growing fast (30% YoY) but bottlenecked by manual processes and a single decision-maker. Across five lenses we identified £235,000 of annual waste — concentrated in operations (60%) and revenue (25%).

The top three opportunities — onboarding workflow automation, delegating routine approvals, and implementing a lightweight CRM — together address ~£140,000 of that waste and could be delivered in a single 8-week sprint.

# Lens Analysis

## Revenue (AMBER)
**Current state**: Sales process is opportunistic. No defined ICP. Close rate at 18% (industry benchmark 24%). Average sales cycle 78 days, target 50.

**Findings**:
1. No ICP definition; sales chase any inbound lead (HIGH; £42,000/yr)
2. Pipeline data lives in spreadsheets, no CRM (MEDIUM; £18,000/yr)

**Recommendations**:
1. Define ICP + qualification criteria w/ sales team workshop (2 days, £2,000)
2. Implement lightweight CRM (HubSpot Starter or similar) + migrate pipeline (1 week, £3,000 setup + £400/mo)

## Operations (RED)
**Current state**: New customer onboarding done in spreadsheets + email. Owner approves every step. Bottleneck at provisioning.

**Findings**:
1. 11-day onboarding cycle vs industry 2-3 days (HIGH; £67,000/yr)
2. Owner approval bottleneck on 9 routine tasks (HIGH; £28,000/yr)
3. No SOP documentation for any recurring process (MEDIUM; £15,000/yr)

**Recommendations**:
1. Build onboarding workflow w/ assignable steps + auto-notifications (1 sprint, £6,000)
2. Delegate routine approvals to Operations Lead w/ defined criteria (1 week, £500)
3. Document top 5 recurring processes as SOPs in Notion (2 weeks, £2,500)

## Finance (AMBER)
**Current state**: QuickBooks + spreadsheets. Priya reconciles weekly. Invoices manually matched to bank statements.

**Findings**:
1. 9-day reconciliation lag obscures cashflow (HIGH; £12,000/yr)
2. Manual invoice matching takes 6 hours/week (MEDIUM; £14,000/yr)

**Recommendations**:
1. Connect bank feed to QuickBooks + automate matching rules (3 days, £1,200)
2. Set monthly close target by day 5; expose runway dashboard to leadership (1 week, £600)

## Technology (GREEN)
**Current state**: Google Workspace, QuickBooks, Slack, ad-hoc spreadsheets. Hand-keyed data between systems.

**Findings**:
1. No integration between sales + finance — manual rekey of every won deal (MEDIUM; £8,000/yr)
2. Slack + email split fragments comms — async decisions get lost (LOW; £4,000/yr)

**Recommendations**:
1. Connect CRM → QuickBooks via Zapier or native sync once CRM lands (1 day, £400)
2. Define Slack channel taxonomy + retire unused channels (2 hours, £200)

## Team (AMBER)
**Current state**: 12 people, no org chart, role definitions inferred from past projects. Sarah is single decision-maker.

**Findings**:
1. No documented roles + responsibilities (MEDIUM; £18,000/yr)
2. No performance reviews in 14 months (MEDIUM; £9,000/yr)

**Recommendations**:
1. Build org chart + RACI for top 5 cross-functional workflows (1 week, £3,000)
2. Quarterly check-ins + annual review cycle (ongoing, £1,000 setup)

# Implementation Roadmap

## Phase 1 — Stabilise (Weeks 1-4)
- Define ICP + sales qualification criteria
- Document top 5 SOPs in Notion
- Delegate routine approval authority to Operations Lead
- Implement HubSpot Starter

## Phase 2 — Optimise (Weeks 5-8)
- Build onboarding workflow automation
- Connect bank feed + automate matching
- CRM → QuickBooks integration
- Build org chart + RACI

## Phase 3 — Scale (Weeks 9-12)
- Quarterly business review cadence
- Customer success metrics dashboard
- Runway / cashflow forecasting model`

const EXECUTIVE_SUMMARY = `Test is growing fast but bottlenecked by manual processes and a single decision-maker. Across five lenses we identified £235,000 of annual waste — concentrated in operations (60%) and revenue (25%). The top three opportunities — onboarding workflow automation, delegating routine approvals, and implementing a lightweight CRM — together address ~£140,000 of that waste and could be delivered in a single 8-week sprint.

The team is willing and capable but lacks documented systems. We recommend a phased implementation: stabilise (weeks 1-4: SOPs, CRM, approval delegation), then optimise (weeks 5-8: workflow automation, finance integrations). Expected payback period: 4 months.`

const CONTENT_JSON = {
  executiveSummary: EXECUTIVE_SUMMARY,
  lenses: {
    REVENUE: {
      ragScore: "AMBER",
      currentState:
        "Sales process is opportunistic. No defined ICP. Close rate at 18% (industry benchmark 24%). Average sales cycle 78 days, target 50.",
      findings: [
        { finding: "No ICP definition; sales chase any inbound lead", impact: "HIGH", annualWaste: 42000 },
        { finding: "Pipeline data lives in spreadsheets, no CRM", impact: "MEDIUM", annualWaste: 18000 },
      ],
      recommendations: [
        { action: "Define ICP + qualification criteria", effort: "2 days", cost: 2000 },
        { action: "Implement lightweight CRM", effort: "1 week", cost: 3000 },
      ],
    },
    OPERATIONS: {
      ragScore: "RED",
      currentState:
        "New customer onboarding done in spreadsheets + email. Owner approves every step. Bottleneck at provisioning.",
      findings: [
        { finding: "11-day onboarding cycle vs industry 2-3 days", impact: "HIGH", annualWaste: 67000 },
        { finding: "Owner approval bottleneck on 9 routine tasks", impact: "HIGH", annualWaste: 28000 },
        { finding: "No SOP documentation for any recurring process", impact: "MEDIUM", annualWaste: 15000 },
      ],
      recommendations: [
        { action: "Build onboarding workflow", effort: "1 sprint", cost: 6000 },
        { action: "Delegate routine approvals", effort: "1 week", cost: 500 },
        { action: "Document top 5 SOPs in Notion", effort: "2 weeks", cost: 2500 },
      ],
    },
    FINANCE: {
      ragScore: "AMBER",
      currentState:
        "QuickBooks + spreadsheets. Priya reconciles weekly. Invoices manually matched to bank statements.",
      findings: [
        { finding: "9-day reconciliation lag obscures cashflow", impact: "HIGH", annualWaste: 12000 },
        { finding: "Manual invoice matching takes 6 hours/week", impact: "MEDIUM", annualWaste: 14000 },
      ],
      recommendations: [
        { action: "Connect bank feed to QuickBooks", effort: "3 days", cost: 1200 },
        { action: "Set monthly close target + runway dashboard", effort: "1 week", cost: 600 },
      ],
    },
    TECHNOLOGY: {
      ragScore: "GREEN",
      currentState: "Google Workspace, QuickBooks, Slack, ad-hoc spreadsheets. Hand-keyed data between systems.",
      findings: [
        { finding: "No integration between sales + finance", impact: "MEDIUM", annualWaste: 8000 },
        { finding: "Slack + email split fragments comms", impact: "LOW", annualWaste: 4000 },
      ],
      recommendations: [
        { action: "Connect CRM → QuickBooks via Zapier", effort: "1 day", cost: 400 },
        { action: "Define Slack channel taxonomy", effort: "2 hours", cost: 200 },
      ],
    },
    TEAM: {
      ragScore: "AMBER",
      currentState: "12 people, no org chart, role definitions inferred from past projects. Sarah is single decision-maker.",
      findings: [
        { finding: "No documented roles + responsibilities", impact: "MEDIUM", annualWaste: 18000 },
        { finding: "No performance reviews in 14 months", impact: "MEDIUM", annualWaste: 9000 },
      ],
      recommendations: [
        { action: "Build org chart + RACI", effort: "1 week", cost: 3000 },
        { action: "Quarterly check-ins + annual review cycle", effort: "ongoing", cost: 1000 },
      ],
    },
  },
  roadmap:
    "Phase 1 (Weeks 1-4): ICP definition, SOP documentation, approval delegation, HubSpot implementation. Phase 2 (Weeks 5-8): onboarding automation, bank feed connection, CRM-finance integration, org chart + RACI. Phase 3 (Weeks 9-12): QBR cadence, customer success metrics, cashflow forecasting.",
  totalEstimatedWastePounds: 235000,
  generatedAt: new Date().toISOString(),
}

// Total waste in pence: £235,000 = 23,500,000p
const TOTAL_WASTE_PENCE = 23500000

async function seedReport(sql: postgres.Sql, sessionId: string) {
  console.log("\n=== Step 5: Audit report DRAFT ===")

  const existing = await sql<{ id: string }[]>`
    SELECT id FROM audit_reports
    WHERE "engagementId" = ${ENGAGEMENT_ID}
  `
  if (existing.length > 0) {
    log(`Report already exists (${existing[0].id}) — skipping insert`)
    return
  }

  const reportId = uid()
  await sql`
    INSERT INTO audit_reports
      (id, "tenantId", "engagementId", "auditSessionId",
       status, "contentHtml", "contentJson", "executiveSummary",
       "totalEstimatedWaste", "generatedBy",
       "createdAt", "updatedAt")
    VALUES
      (${reportId},
       ${IRONHEART_TENANT_ID},
       ${ENGAGEMENT_ID},
       ${sessionId},
       'DRAFT'::"AuditReportStatus",
       ${REPORT_CONTENT_MARKDOWN},
       ${JSON.stringify(CONTENT_JSON)}::jsonb,
       ${EXECUTIVE_SUMMARY},
       ${TOTAL_WASTE_PENCE},
       'ai',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP)
  `
  log(`Created audit report DRAFT (${reportId})`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const sql = postgres(process.env.DATABASE_URL!)
  IRONHEART_TENANT_ID = process.env.IRONHEART_TENANT_ID!

  if (!IRONHEART_TENANT_ID) {
    throw new Error("IRONHEART_TENANT_ID env var not set — check .env.local")
  }

  console.log("Seeding test engagement:", ENGAGEMENT_ID)
  console.log("Ironheart tenant:", IRONHEART_TENANT_ID)
  console.log("Client tenant:", CLIENT_TENANT_ID)

  try {
    // Step 1
    const nodeIds = await enrichOrgChart(sql)

    // Step 2
    await simulateFormCompletion(sql, nodeIds)

    // Step 3
    const sessionId = await seedAuditSession(sql)

    // Step 4
    await seedCallNotes(sql, sessionId, {
      ownerNodeId: nodeIds.ownerNodeId,
      marcusId: nodeIds.marcusId,
      priyaId: nodeIds.priyaId,
      jordanId: nodeIds.jordanId,
    })

    // Step 5
    await seedReport(sql, sessionId)

    console.log("\n✓ Seed complete. Visit:")
    console.log(`  http://localhost:3000/platform/clients/${ENGAGEMENT_ID}/onboarding`)
    console.log(`  http://localhost:3000/platform/clients/${ENGAGEMENT_ID}/audit`)
    console.log(`  http://localhost:3000/platform/clients/${ENGAGEMENT_ID}/report`)
    console.log(`  http://localhost:3000/test/dashboard/audit`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
