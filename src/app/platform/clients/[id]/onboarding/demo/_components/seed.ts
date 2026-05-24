import type {
  AuditFlag,
  DemoActivity,
  DemoNode,
  EdgeStyle,
  FormStatus,
  InterviewStatus,
  NodeKind,
  Suggestion,
} from "./types"

/**
 * Northwind Analytics Ltd — fictional 60-person UK SaaS used for the
 * /onboarding/demo showcase. ~75 nodes total so every UX surface
 * (overlays, suggestions, shortlist) has realistic data to chew on.
 */

const AVATAR_COLORS = ["indigo", "amber", "rose", "teal", "emerald", "violet", "sky", "stone"] as const

interface PersonInit {
  id: string
  parentId: string
  name: string
  title: string
  kind?: NodeKind                  // default PERSON
  email?: string
  avatarColor?: string
  tenureYears?: number
  location?: string
  auditFlags?: AuditFlag[]
  interviewStatus?: InterviewStatus
  formStatus?: FormStatus
  notes?: string | null
  isFounder?: boolean
  isFractional?: boolean
  edgeStyle?: EdgeStyle
}

function person(init: PersonInit): DemoNode {
  return {
    id: init.id,
    parentId: init.parentId,
    kind: init.kind ?? "PERSON",
    name: init.name,
    title: init.title,
    email: init.email ?? slugEmail(init.name),
    avatarColor: init.avatarColor ?? pickColor(init.id),
    headcount: null,
    tenureYears: init.tenureYears ?? null,
    location: init.location ?? "London",
    edgeStyle: init.edgeStyle ?? (init.kind === "ADVISOR" ? "DOTTED" : "SOLID"),
    auditFlags: init.auditFlags ?? [],
    interviewStatus: init.interviewStatus ?? "NOT_TARGET",
    formStatus: init.formStatus ?? "NOT_SENT",
    notes: init.notes ?? null,
    isFounder: init.isFounder ?? false,
    isFractional: init.isFractional ?? false,
  }
}

function dept(id: string, parentId: string | null, name: string, headcount: number, notes?: string): DemoNode {
  return {
    id,
    parentId,
    kind: "DEPARTMENT",
    name,
    title: null,
    email: null,
    avatarColor: null,
    headcount,
    tenureYears: null,
    location: null,
    edgeStyle: "SOLID",
    auditFlags: [],
    interviewStatus: "NOT_TARGET",
    formStatus: "NOT_SENT",
    notes: notes ?? null,
    isFounder: false,
    isFractional: false,
  }
}

function vacancy(id: string, parentId: string, title: string, notes?: string): DemoNode {
  return {
    id,
    parentId,
    kind: "VACANCY",
    name: title,
    title,
    email: null,
    avatarColor: null,
    headcount: null,
    tenureYears: null,
    location: null,
    edgeStyle: "SOLID",
    auditFlags: [],
    interviewStatus: "NOT_TARGET",
    formStatus: "NOT_SENT",
    notes: notes ?? "Open requisition — recruiter assigned.",
    isFounder: false,
    isFractional: false,
  }
}

function pickColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!
}

function slugEmail(name: string): string {
  const parts = name.toLowerCase().split(/\s+/)
  return `${parts[0]}.${parts[parts.length - 1]}@northwind-analytics.co.uk`
}

// ── Tree definition (top-down) ──────────────────────────────────────────────

export const NORTHWIND_NODES: DemoNode[] = [
  // ── Root ────────────────────────────────────────────────────────────────
  {
    id: "org",
    parentId: null,
    kind: "ORG",
    name: "Northwind Analytics Ltd",
    title: null,
    email: null,
    avatarColor: null,
    headcount: 60,
    tenureYears: null,
    location: "London · Remote-UK",
    edgeStyle: "SOLID",
    auditFlags: [],
    interviewStatus: "NOT_TARGET",
    formStatus: "NOT_SENT",
    notes: "Series B UK SaaS · founded 2019 · 60 staff",
    isFounder: false,
    isFractional: false,
  },

  // ── Executive ───────────────────────────────────────────────────────────
  dept("exec", "org", "Executive", 4, "C-suite + fractional CFO"),
  person({
    id: "p-ceo",
    parentId: "exec",
    name: "Sarah Chen",
    title: "Chief Executive Officer",
    tenureYears: 6,
    auditFlags: ["DECISION_MAKER", "FOUNDER"],
    interviewStatus: "SCHEDULED",
    formStatus: "COMPLETED",
    isFounder: true,
    notes: "Founder. Owns engagement sign-off. Prefers async updates.",
  }),
  person({
    id: "p-cto",
    parentId: "exec",
    name: "Marcus Holloway",
    title: "Chief Technology Officer",
    tenureYears: 6,
    auditFlags: ["DATA_OWNER", "SECURITY_OWNER", "FOUNDER"],
    interviewStatus: "SCHEDULED",
    formStatus: "IN_PROGRESS",
    isFounder: true,
    notes: "Founder. Final say on tech stack + security posture.",
  }),
  person({
    id: "p-coo",
    parentId: "exec",
    name: "Priya Raman",
    title: "Chief Operating Officer",
    tenureYears: 3,
    auditFlags: ["PROCESS_OWNER", "DECISION_MAKER"],
    interviewStatus: "INVITED",
    formStatus: "SENT",
    notes: "Hired Q2 last year to professionalise ops. Day-to-day client lead.",
  }),
  person({
    id: "p-cfo",
    parentId: "exec",
    name: "James Whitfield",
    title: "Chief Financial Officer (fractional)",
    kind: "CONTRACTOR",
    tenureYears: 1,
    isFractional: true,
    auditFlags: ["FINANCE_OWNER"],
    interviewStatus: "TARGET",
    formStatus: "NOT_SENT",
    notes: "2 days/week. Routes via Priya for scheduling.",
  }),

  // ── Product & Engineering ──────────────────────────────────────────────
  dept("pe", "org", "Product & Engineering", 22, "Largest org. 8 squads."),

  // VP Engineering branch
  person({
    id: "p-vpe",
    parentId: "pe",
    name: "Daniel Park",
    title: "VP Engineering",
    tenureYears: 4,
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
    notes: "Owns delivery + headcount plan for engineering.",
  }),
  person({
    id: "p-staff",
    parentId: "p-vpe",
    name: "Tom Aldridge",
    title: "Staff Engineer",
    tenureYears: 5,
    auditFlags: ["DATA_OWNER"],
    interviewStatus: "TARGET",
    notes: "Reluctantly owns the data pipeline. Single point of failure.",
  }),

  dept("eng-be", "p-vpe", "Backend Squad", 4),
  person({ id: "p-be-lead", parentId: "eng-be", name: "Aisha Kapoor", title: "Backend Squad Lead", tenureYears: 3, interviewStatus: "TARGET" }),
  person({ id: "p-be1", parentId: "eng-be", name: "Oluwaseun Adeyemi", title: "Senior Backend Engineer", tenureYears: 2 }),
  person({ id: "p-be2", parentId: "eng-be", name: "Marta Kowalski", title: "Backend Engineer", tenureYears: 1 }),
  person({ id: "p-be3", parentId: "eng-be", name: "Ravi Subramanian", title: "Backend Engineer", tenureYears: 0.5, location: "Remote-UK" }),

  dept("eng-fe", "p-vpe", "Frontend Squad", 4),
  person({ id: "p-fe-lead", parentId: "eng-fe", name: "Liam O'Sullivan", title: "Frontend Squad Lead", tenureYears: 4, interviewStatus: "TARGET" }),
  person({ id: "p-fe1", parentId: "eng-fe", name: "Yuki Tanaka", title: "Senior Frontend Engineer", tenureYears: 3 }),
  person({ id: "p-fe2", parentId: "eng-fe", name: "Helena Moss", title: "Frontend Engineer", tenureYears: 1.5 }),
  person({ id: "p-fe3", parentId: "eng-fe", name: "Damir Volkov", title: "Frontend Engineer", tenureYears: 0.8, location: "Remote-UK" }),

  dept("eng-pl", "p-vpe", "Platform", 2),
  person({ id: "p-pl1", parentId: "eng-pl", name: "Nikos Demetriou", title: "Platform Engineer", tenureYears: 2, auditFlags: ["SECURITY_OWNER"] }),
  person({ id: "p-pl2", parentId: "eng-pl", name: "Esme Carrington", title: "Platform Engineer", tenureYears: 1 }),

  dept("eng-qa", "p-vpe", "QA", 3),
  person({ id: "p-qa-lead", parentId: "eng-qa", name: "Mei-Lin Tang", title: "QA Lead", tenureYears: 4, interviewStatus: "TARGET" }),
  person({ id: "p-qa1", parentId: "eng-qa", name: "Joe Pemberton", title: "QA Engineer", tenureYears: 2 }),
  person({ id: "p-qa2", parentId: "eng-qa", name: "Anya Petrova", title: "QA Engineer", tenureYears: 1 }),

  // VP Product branch
  person({
    id: "p-vpp",
    parentId: "pe",
    name: "Olivia Brooks",
    title: "VP Product",
    tenureYears: 2,
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "OPENED",
  }),
  person({ id: "p-pm1", parentId: "p-vpp", name: "Hugo Schneider", title: "Senior Product Manager", tenureYears: 3 }),
  person({ id: "p-pm2", parentId: "p-vpp", name: "Chiara Bianchi", title: "Product Manager", tenureYears: 1.5 }),
  person({ id: "p-pm3", parentId: "p-vpp", name: "Ade Akpan", title: "Product Manager", tenureYears: 0.5 }),
  dept("dsn", "p-vpp", "Design", 3),
  person({ id: "p-dsn-lead", parentId: "dsn", name: "Henrik Larsen", title: "Design Lead", tenureYears: 4 }),
  person({ id: "p-dsn1", parentId: "dsn", name: "Polly Mendez", title: "Product Designer", tenureYears: 2 }),
  person({ id: "p-dsn2", parentId: "dsn", name: "Theo Nakamura", title: "Product Designer", tenureYears: 1 }),

  // Vacancy
  vacancy("v-data", "pe", "Head of Data", "Open since Q1 — 4 candidates in pipeline."),

  // ── Go-to-Market ────────────────────────────────────────────────────────
  dept("gtm", "org", "Go-to-Market", 18, "Sales + Marketing + Customer Success."),
  person({
    id: "p-cro",
    parentId: "gtm",
    name: "Felix Romero",
    title: "Chief Revenue Officer",
    tenureYears: 2,
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
  }),

  dept("sales", "p-cro", "Sales", 8),
  person({ id: "p-ae-mgr", parentId: "sales", name: "Catherine Yu", title: "AE Manager", tenureYears: 3, interviewStatus: "TARGET" }),
  person({ id: "p-ae1", parentId: "p-ae-mgr", name: "Brendan O'Connor", title: "Account Executive", tenureYears: 2 }),
  person({ id: "p-ae2", parentId: "p-ae-mgr", name: "Naomi Foster", title: "Account Executive", tenureYears: 1.5 }),
  person({ id: "p-ae3", parentId: "p-ae-mgr", name: "Ravi Choudhury", title: "Account Executive", tenureYears: 1 }),
  person({ id: "p-ae4", parentId: "p-ae-mgr", name: "Tariq Hassan", title: "Account Executive", tenureYears: 0.5 }),
  person({ id: "p-sdr1", parentId: "sales", name: "Mollie Bramwell", title: "SDR", tenureYears: 1 }),
  person({ id: "p-sdr2", parentId: "sales", name: "Jin-Ho Park", title: "SDR", tenureYears: 0.8 }),
  person({ id: "p-sdr3", parentId: "sales", name: "Lucia Ferrara", title: "SDR", tenureYears: 0.5 }),

  dept("mkt", "p-cro", "Marketing", 4),
  person({ id: "p-mkt-head", parentId: "mkt", name: "Diana Markov", title: "Head of Marketing", tenureYears: 3, interviewStatus: "TARGET" }),
  person({ id: "p-mkt1", parentId: "p-mkt-head", name: "Will Penrose", title: "Content Lead", tenureYears: 2 }),
  person({ id: "p-mkt2", parentId: "p-mkt-head", name: "Sienna Wu", title: "Demand Gen Manager", tenureYears: 1 }),
  person({ id: "p-mkt3", parentId: "p-mkt-head", name: "Kofi Mensah", title: "Product Marketer", tenureYears: 1.5 }),

  dept("cs", "p-cro", "Customer Success", 5),
  person({
    id: "p-cs-head",
    parentId: "cs",
    name: "Ben Carrigan",
    title: "Head of Customer Success",
    tenureYears: 2,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "TARGET",
  }),
  person({ id: "p-csm1", parentId: "p-cs-head", name: "Imogen Vance", title: "Customer Success Manager", tenureYears: 2 }),
  person({ id: "p-csm2", parentId: "p-cs-head", name: "Adaeze Okonkwo", title: "Customer Success Manager", tenureYears: 1 }),
  person({ id: "p-csm3", parentId: "p-cs-head", name: "Felipe Castro", title: "Customer Success Manager", tenureYears: 0.5 }),
  person({ id: "p-spt", parentId: "p-cs-head", name: "Rosa Klein", title: "Support Lead", tenureYears: 1.5 }),

  // ── Operations ─────────────────────────────────────────────────────────
  dept("ops", "org", "Operations", 10, "Finance · People · IT · Legal"),
  person({
    id: "p-hop",
    parentId: "ops",
    name: "Hassan Mahmoud",
    title: "Head of Operations",
    tenureYears: 2,
    auditFlags: ["PROCESS_OWNER", "DECISION_MAKER"],
    interviewStatus: "TARGET",
    formStatus: "SENT",
  }),

  dept("fin", "p-hop", "Finance", 2),
  person({ id: "p-fin-mgr", parentId: "fin", name: "Geraldine Pike", title: "Finance Manager", tenureYears: 3, auditFlags: ["FINANCE_OWNER"], interviewStatus: "TARGET" }),
  person({ id: "p-fin1", parentId: "fin", name: "Quinn Devlin", title: "Finance Analyst", tenureYears: 1 }),

  dept("ppl", "p-hop", "People", 2),
  person({ id: "p-ppl-lead", parentId: "ppl", name: "Sophie Andersson", title: "People Lead", tenureYears: 3 }),
  person({ id: "p-ppl-rec", parentId: "ppl", name: "Eric Bamberg", title: "Senior Recruiter", tenureYears: 1.5 }),

  person({ id: "p-office", parentId: "p-hop", name: "Maya Sridhar", title: "Office Manager", tenureYears: 4 }),
  person({
    id: "p-itsec",
    parentId: "p-hop",
    name: "Connor Whitley",
    title: "IT & Security Lead (de-facto DPO)",
    tenureYears: 3,
    auditFlags: ["DPO", "SECURITY_OWNER", "DATA_OWNER"],
    interviewStatus: "TARGET",
    formStatus: "NOT_SENT",
    notes: "AUDIT-CRITICAL: doubles as DPO without formal appointment. Common SaaS gap.",
  }),
  person({ id: "p-revops", parentId: "p-hop", name: "Tara Vance", title: "RevOps Manager", tenureYears: 1.5 }),
  person({ id: "p-bizops", parentId: "p-hop", name: "Ezra Thorne", title: "BizOps Analyst", tenureYears: 1 }),
  person({
    id: "p-legal",
    parentId: "p-hop",
    name: "Margaret Ainsley",
    title: "Legal Counsel (fractional)",
    kind: "CONTRACTOR",
    tenureYears: 2,
    isFractional: true,
    auditFlags: ["PROCESS_OWNER"],
    interviewStatus: "INVITED",
    notes: "1 day/week. External firm Ainsley & Co.",
  }),

  // ── Board & Advisors ────────────────────────────────────────────────────
  dept("board", "org", "Board & Advisors", 6, "Dotted-line — not staff."),
  person({
    id: "a-chair",
    parentId: "board",
    name: "Sir Edward Pellatt",
    title: "Chair (NED)",
    kind: "ADVISOR",
    auditFlags: ["DECISION_MAKER"],
    interviewStatus: "TARGET",
    notes: "Ex-Sage CEO. Meets quarterly.",
  }),
  person({ id: "a-ned1", parentId: "board", name: "Lara Mendelson", title: "Non-Exec Director", kind: "ADVISOR", auditFlags: ["FINANCE_OWNER"], interviewStatus: "TARGET" }),
  person({ id: "a-ned2", parentId: "board", name: "David Okafor", title: "Non-Exec Director (Investor)", kind: "ADVISOR" }),
  person({ id: "a-adv1", parentId: "board", name: "Isabella Cruz", title: "Advisor — ex-Salesforce VP", kind: "ADVISOR" }),
  person({ id: "a-adv2", parentId: "board", name: "Yousef Nasr", title: "Advisor — Security", kind: "ADVISOR", auditFlags: ["SECURITY_OWNER"] }),
  person({ id: "a-adv3", parentId: "board", name: "Beatrix Lange", title: "Advisor — GTM", kind: "ADVISOR" }),
]

// ── Suggestions (AI-style hints) ───────────────────────────────────────────

export const NORTHWIND_SUGGESTIONS: Suggestion[] = [
  {
    id: "sug-dpo",
    severity: "critical",
    title: "IT lead is de-facto DPO with no formal appointment",
    body: "Connor Whitley wears two hats. For GDPR audit purposes, the DPO role usually needs to be explicitly designated. Common SaaS gap — flag early.",
    action: { label: "Focus Connor", nodeId: "p-itsec" },
  },
  {
    id: "sug-eng-span",
    severity: "warn",
    title: "8 engineers reporting through 4 squad leads — no eng manager layer",
    body: "VP Engineering has only squad leads under them. If you're auditing delivery process, ask whether there's a missing middle-management layer here.",
    action: { label: "Focus VP Eng", nodeId: "p-vpe" },
  },
  {
    id: "sug-bus-factor",
    severity: "warn",
    title: "Tom Aldridge owns the data pipeline alone (bus-factor of 1)",
    body: "Staff Engineer Tom is the sole owner of the data pipeline. Add him to the interview shortlist — he likely surfaces architecture risk fast.",
    action: { label: "Focus Tom", nodeId: "p-staff" },
  },
  {
    id: "sug-vacancy",
    severity: "info",
    title: "Head of Data vacancy still open since Q1",
    body: "Worth asking who's owning data strategy in the interim — useful to surface during the kick-off interview with Sarah.",
    action: { label: "Focus vacancy", nodeId: "v-data" },
  },
  {
    id: "sug-fractional",
    severity: "info",
    title: "Two fractional execs (CFO + Legal) — schedule them first",
    body: "Fractional roles have narrow availability windows. Lock their interview slots before everyone else.",
    action: { label: "Show fractional", overlay: "AUDIT_CRITICAL" },
  },
]

// ── Activity log ────────────────────────────────────────────────────────────

export const NORTHWIND_ACTIVITY: DemoActivity[] = [
  { id: "act-1", when: "4m ago",   actor: "Luke Hodges",        verb: "marked as interview target", subject: "Connor Whitley", detail: "Audit-critical: de-facto DPO" },
  { id: "act-2", when: "11m ago",  actor: "Sarah Chen",         verb: "completed questionnaire",    subject: "Sarah Chen" },
  { id: "act-3", when: "38m ago",  actor: "System",             verb: "synced 12 contacts from",    subject: "Google Workspace", detail: "All new contacts attached to existing nodes by email." },
  { id: "act-4", when: "2h ago",   actor: "Luke Hodges",        verb: "added vacancy",              subject: "Head of Data", detail: "Open since Q1 — 4 candidates in pipeline." },
  { id: "act-5", when: "4h ago",   actor: "Priya Raman (client)", verb: "opened the chart",         subject: "Org chart" },
  { id: "act-6", when: "yesterday", actor: "Luke Hodges",       verb: "imported via paste",         subject: "GTM team", detail: "18 nodes added in one paste." },
  { id: "act-7", when: "2d ago",   actor: "Luke Hodges",        verb: "created engagement",         subject: "Northwind Q2 audit" },
]

// ── Computed lookups ───────────────────────────────────────────────────────

export function buildIndex(nodes: DemoNode[]): {
  byId: Map<string, DemoNode>
  childrenOf: Map<string, DemoNode[]>
  roots: DemoNode[]
} {
  const byId = new Map<string, DemoNode>()
  const childrenOf = new Map<string, DemoNode[]>()
  for (const n of nodes) {
    byId.set(n.id, n)
    if (!childrenOf.has(n.parentId ?? "__root__")) childrenOf.set(n.parentId ?? "__root__", [])
    childrenOf.get(n.parentId ?? "__root__")!.push(n)
  }
  return {
    byId,
    childrenOf,
    roots: childrenOf.get("__root__") ?? [],
  }
}
