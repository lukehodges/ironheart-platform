/**
 * Demo-only types for the org-mapping showcase at
 * /platform/clients/[id]/onboarding/demo.
 *
 * These intentionally diverge from the production OrgChartTree shape so we can
 * iterate on the UX without coupling to schema migrations.
 */

// ── Node taxonomy ───────────────────────────────────────────────────────────

export type NodeKind =
  | "ORG"          // root: the company itself
  | "DEPARTMENT"   // structural team unit (e.g. Engineering, Sales)
  | "PERSON"       // full-time employee
  | "VACANCY"      // open role we know about but haven't filled
  | "CONTRACTOR"   // fractional / 1099 / agency
  | "ADVISOR"      // board / advisory — dotted-line to parent
  | "EXTERNAL"     // third-party stakeholder (auditor, supplier rep, etc.)
  | "BUNDLE"       // synthetic: aggregates 3+ same-title siblings into one card

// ── Audit relevance ─────────────────────────────────────────────────────────

export type AuditFlag =
  | "DECISION_MAKER"   // signs the SOW / owns the engagement
  | "FINANCE_OWNER"    // controls budget / payables
  | "DATA_OWNER"       // owns customer data / GDPR
  | "DPO"              // data protection officer (real or de-facto)
  | "SECURITY_OWNER"   // owns infosec / IT
  | "PROCESS_OWNER"    // owns a business-critical process being audited
  | "FOUNDER"          // founding employee — institutional context

// ── Interview lifecycle ─────────────────────────────────────────────────────

export type InterviewStatus =
  | "NOT_TARGET"   // not on the shortlist
  | "TARGET"       // proposed for interview, not yet contacted
  | "INVITED"      // invite sent
  | "SCHEDULED"    // session booked
  | "COMPLETED"    // session done
  | "DECLINED"     // they said no / unavailable

// ── Form / questionnaire status ─────────────────────────────────────────────

export type FormStatus =
  | "NOT_SENT"
  | "SENT"
  | "OPENED"
  | "IN_PROGRESS"
  | "COMPLETED"

// ── Coverage overlays ───────────────────────────────────────────────────────

export type Overlay =
  | "NONE"
  | "INTERVIEW_COVERAGE"   // recolour by interview status
  | "FORM_STATUS"          // recolour by questionnaire state
  | "AUDIT_CRITICAL"       // highlight nodes with audit flags
  | "TENURE"               // gradient by tenure (newest → most senior)
  | "REPORTING_DEPTH"      // distance from CEO

// ── Layout direction ────────────────────────────────────────────────────────

export type LayoutDirection =
  | "TB"   // top-down — classic org chart
  | "LR"   // left-to-right — depth flows horizontally, siblings stack vertically

// ── Display density ─────────────────────────────────────────────────────────

export type Density =
  | "COMPACT"      // small leaf nodes, tight gaps
  | "COMFORTABLE"  // generous sizing — best for small orgs
  | "COLLAPSED"    // small nodes + auto-collapse depts with >4 person-children

// ── Connection styles ───────────────────────────────────────────────────────

export type EdgeStyle =
  | "SOLID"     // direct report
  | "DOTTED"    // advisory / dotted-line
  | "MATRIX"    // cross-functional / matrixed reporting

// ── Core node shape ─────────────────────────────────────────────────────────

export interface DemoNode {
  id: string
  parentId: string | null
  kind: NodeKind

  // Display
  name: string                 // person name, vacancy title, or department name
  title: string | null         // job title for PERSON / CONTRACTOR / ADVISOR
  email: string | null
  avatarColor: string | null   // deterministic colour key, e.g. "indigo"

  // Department metadata
  headcount: number | null     // for DEPARTMENT: total people, including vacancies

  // Person metadata
  tenureYears: number | null
  location: string | null      // "London" / "Remote-UK" / etc.

  // Edge style from parent (default SOLID; ADVISOR auto-DOTTED)
  edgeStyle: EdgeStyle

  // Audit / engagement state
  auditFlags: AuditFlag[]
  interviewStatus: InterviewStatus
  formStatus: FormStatus
  notes: string | null         // free-text demo note for inspector

  // Demo-only metadata
  isFounder: boolean
  isFractional: boolean        // true for contractors who are fractional execs

  /** For BUNDLE nodes only: the underlying member node ids. */
  bundleMemberIds?: string[]
}

// ── Suggestions (AI-style hints) ────────────────────────────────────────────

export type SuggestionSeverity = "info" | "warn" | "critical"

export interface Suggestion {
  id: string
  severity: SuggestionSeverity
  title: string
  body: string
  /** Optional CTA — clicking it focuses the relevant node on the graph. */
  action?: {
    label: string
    nodeId?: string            // node to focus
    overlay?: Overlay          // overlay to enable
  }
}

// ── Activity log entries ────────────────────────────────────────────────────

export interface DemoActivity {
  id: string
  /** Human-readable timestamp baked into the seed to avoid SSR/CSR hydration drift. */
  when: string
  actor: string                // person name or "System"
  verb: string                 // "added", "marked as target", "sent form to"
  subject: string              // node label affected
  detail?: string
}

// ── Coverage stats (computed) ───────────────────────────────────────────────

export interface CoverageStats {
  totalPeople: number          // PERSON + CONTRACTOR + ADVISOR + VACANCY
  mapped: number               // count of named people (not VACANCY)
  vacancies: number
  interviewTargets: number     // status === TARGET | INVITED | SCHEDULED | COMPLETED
  interviewsCompleted: number  // status === COMPLETED
  formsSent: number
  formsCompleted: number
  auditCritical: number        // count with at least one audit flag
  coveragePct: number          // 0–100, overall completeness heuristic
}
