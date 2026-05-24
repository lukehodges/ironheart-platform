/**
 * Adapter — translates between the production OrgChartTree (DB-backed) and the
 * DemoNode shape used by the visual components imported from ../demo/_components.
 *
 * Notes:
 *  - DB has `type` (DEPARTMENT|ROLE|PERSON) and `kind` (PERSON|VACANCY|CONTRACTOR|
 *    ADVISOR|EXTERNAL|BUNDLE). The demo's NodeKind also has ORG|DEPARTMENT. We
 *    treat the synthetic engagement-root department as ORG, and any other
 *    DEPARTMENT-typed row as DEPARTMENT. PERSON-typed rows take their `kind`
 *    field. ROLE-typed rows are surfaced as VACANCY (open role).
 *  - Demo AuditFlag "SECURITY_OWNER" maps to backend "SECURITY" everywhere.
 *  - interviewStatus "NONE" (backend) ↔ "NOT_TARGET" (demo).
 *  - formStatus "NONE" (backend) ↔ "NOT_SENT" (demo); "PENDING" (backend) is
 *    bucketed with "NOT_SENT" for display (we keep the distinction only on the
 *    edit path via setFormStatus).
 */

import type { OrgChartTree, AuditFlag, NodeInterviewStatus, NodeFormStatus } from "@/modules/onboarding/onboarding.types"
import type {
  DemoNode,
  AuditFlag as DemoAuditFlag,
  InterviewStatus as DemoInterviewStatus,
  FormStatus as DemoFormStatus,
  NodeKind as DemoNodeKind,
} from "../demo/_components/types"

// ── flag mapping ────────────────────────────────────────────────────────────

export function backendFlagToDemo(f: AuditFlag): DemoAuditFlag {
  return f === "SECURITY" ? "SECURITY_OWNER" : (f as DemoAuditFlag)
}
export function demoFlagToBackend(f: DemoAuditFlag): AuditFlag {
  return f === "SECURITY_OWNER" ? "SECURITY" : (f as AuditFlag)
}

// ── status mapping ──────────────────────────────────────────────────────────

const INTERVIEW_BACKEND_TO_DEMO: Record<NodeInterviewStatus, DemoInterviewStatus> = {
  NONE: "NOT_TARGET",
  TARGET: "TARGET",
  INVITED: "INVITED",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
}

const INTERVIEW_DEMO_TO_BACKEND: Partial<Record<DemoInterviewStatus, NodeInterviewStatus>> = {
  NOT_TARGET: "NONE",
  TARGET: "TARGET",
  INVITED: "INVITED",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  // DECLINED has no backend equivalent — surface as TARGET on save (caller
  // should never need to use it from the production UI).
  DECLINED: "TARGET",
}

const FORM_BACKEND_TO_DEMO: Record<NodeFormStatus, DemoFormStatus> = {
  NONE: "NOT_SENT",
  // PENDING is a queued send (not yet dispatched). Surface as OPENED so the
  // FORM_STATUS overlay paints amber/warn rather than collapsing into the
  // grey NOT_SENT bucket — matches the spec colour key.
  PENDING: "OPENED",
  SENT: "SENT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
}

const FORM_DEMO_TO_BACKEND: Partial<Record<DemoFormStatus, NodeFormStatus>> = {
  NOT_SENT: "NONE",
  SENT: "SENT",
  OPENED: "SENT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
}

export function interviewToDemo(s: NodeInterviewStatus): DemoInterviewStatus {
  return INTERVIEW_BACKEND_TO_DEMO[s]
}
export function interviewToBackend(s: DemoInterviewStatus): NodeInterviewStatus {
  return INTERVIEW_DEMO_TO_BACKEND[s] ?? "NONE"
}
export function formToDemo(s: NodeFormStatus): DemoFormStatus {
  return FORM_BACKEND_TO_DEMO[s]
}
export function formToBackend(s: DemoFormStatus): NodeFormStatus {
  return FORM_DEMO_TO_BACKEND[s] ?? "NONE"
}

// ── node mapping ────────────────────────────────────────────────────────────

/**
 * Map a backend OrgChartTree row to a demo-visual DemoNode. The very top-level
 * DEPARTMENT row (no parent) is presented as ORG so it picks up the org-card
 * styling. All other DEPARTMENT rows render as DEPARTMENT cards.
 */
export function rowToDemoNode(row: OrgChartTree, isRoot: boolean): DemoNode {
  let kind: DemoNodeKind
  if (row.type === "DEPARTMENT") {
    kind = isRoot ? "ORG" : "DEPARTMENT"
  } else if (row.type === "ROLE") {
    // ROLE rows in the live schema are open roles (vacancies) — the seed
    // creates them when a team has unfilled positions.
    kind = "VACANCY"
  } else {
    // PERSON type: defer to depth-field kind (PERSON / CONTRACTOR / ADVISOR /
    // EXTERNAL / VACANCY / BUNDLE).
    kind = row.kind as DemoNodeKind
  }

  // Display name: contactName for persons, fall back to label.
  const displayName =
    (kind === "PERSON" || kind === "CONTRACTOR" || kind === "ADVISOR" || kind === "EXTERNAL")
      ? (row.contactName ?? row.label)
      : row.label
  const title = row.contactRole ?? (kind === "VACANCY" ? row.label : null)

  return {
    id: row.id,
    parentId: row.parentId,
    kind,
    name: displayName,
    title,
    email: row.email ?? row.contactEmail ?? null,
    avatarColor: row.avatarColor,
    headcount: row.headcount,
    tenureYears: row.tenureYears,
    location: null,
    edgeStyle: row.edgeStyle,
    auditFlags: row.auditFlags.map(backendFlagToDemo),
    interviewStatus: interviewToDemo(row.interviewStatus),
    formStatus: formToDemo(row.formStatus),
    notes: null,
    isFounder: row.isFounder,
    isFractional: row.isFractional,
  }
}

/** Flatten a backend tree to a DemoNode[] suitable for the demo graph. */
export function flattenChart(tree: OrgChartTree[]): DemoNode[] {
  const out: DemoNode[] = []
  function walk(rows: OrgChartTree[], depth: number) {
    for (const r of rows) {
      out.push(rowToDemoNode(r, depth === 0 && rows.length === 1 && r.parentId === null))
      if (r.children.length > 0) walk(r.children, depth + 1)
    }
  }
  walk(tree, 0)
  return out
}

/** Walk the tree and locate a node row by id. */
export function findRow(tree: OrgChartTree[], id: string): OrgChartTree | null {
  for (const n of tree) {
    if (n.id === id) return n
    const found = findRow(n.children, id)
    if (found) return found
  }
  return null
}
