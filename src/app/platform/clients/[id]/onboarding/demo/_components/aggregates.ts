import type { DemoNode, FormStatus, InterviewStatus } from "./types"

/**
 * Per-node rollups computed from the entire subtree. Used to:
 *   - show "N people underneath" instead of "+N direct hidden children"
 *   - propagate child status onto collapsed parent cards (e.g. Go-to-Market
 *     shows an audit-critical dot if anyone under it is flagged)
 */
export interface NodeAggregates {
  /** Count of person-like nodes in the entire subtree (including self if person). */
  descendantPersonCount: number
  hasInterviewTarget: boolean
  hasInterviewScheduled: boolean
  hasInterviewCompleted: boolean
  hasFormSent: boolean
  hasFormInProgress: boolean
  hasFormCompleted: boolean
  hasAuditCritical: boolean
}

const PERSON_KINDS = new Set<DemoNode["kind"]>(["PERSON", "CONTRACTOR", "ADVISOR", "VACANCY"])

const INTERVIEW_TARGETED: ReadonlyArray<InterviewStatus> = ["TARGET", "INVITED", "SCHEDULED", "COMPLETED"]
const INTERVIEW_SCHEDULED: ReadonlyArray<InterviewStatus> = ["INVITED", "SCHEDULED", "COMPLETED"]
const FORM_SENT: ReadonlyArray<FormStatus> = ["SENT", "OPENED", "IN_PROGRESS", "COMPLETED"]
const FORM_IN_PROGRESS: ReadonlyArray<FormStatus> = ["OPENED", "IN_PROGRESS"]

export function computeAggregates(nodes: DemoNode[]): Map<string, NodeAggregates> {
  const childrenOf = new Map<string, DemoNode[]>()
  for (const n of nodes) {
    const k = n.parentId ?? "__root__"
    if (!childrenOf.has(k)) childrenOf.set(k, [])
    childrenOf.get(k)!.push(n)
  }

  const out = new Map<string, NodeAggregates>()

  function visit(n: DemoNode): NodeAggregates {
    const cached = out.get(n.id)
    if (cached) return cached

    let descendantPersonCount = PERSON_KINDS.has(n.kind) ? 1 : 0
    let hasInterviewTarget   = PERSON_KINDS.has(n.kind) && INTERVIEW_TARGETED.includes(n.interviewStatus)
    let hasInterviewScheduled= PERSON_KINDS.has(n.kind) && INTERVIEW_SCHEDULED.includes(n.interviewStatus)
    let hasInterviewCompleted= PERSON_KINDS.has(n.kind) && n.interviewStatus === "COMPLETED"
    let hasFormSent          = PERSON_KINDS.has(n.kind) && FORM_SENT.includes(n.formStatus)
    let hasFormInProgress    = PERSON_KINDS.has(n.kind) && FORM_IN_PROGRESS.includes(n.formStatus)
    let hasFormCompleted     = PERSON_KINDS.has(n.kind) && n.formStatus === "COMPLETED"
    let hasAuditCritical     = n.auditFlags.length > 0

    for (const c of childrenOf.get(n.id) ?? []) {
      const a = visit(c)
      descendantPersonCount += a.descendantPersonCount
      hasInterviewTarget    ||= a.hasInterviewTarget
      hasInterviewScheduled ||= a.hasInterviewScheduled
      hasInterviewCompleted ||= a.hasInterviewCompleted
      hasFormSent           ||= a.hasFormSent
      hasFormInProgress     ||= a.hasFormInProgress
      hasFormCompleted      ||= a.hasFormCompleted
      hasAuditCritical      ||= a.hasAuditCritical
    }

    const agg: NodeAggregates = {
      descendantPersonCount,
      hasInterviewTarget,
      hasInterviewScheduled,
      hasInterviewCompleted,
      hasFormSent,
      hasFormInProgress,
      hasFormCompleted,
      hasAuditCritical,
    }
    out.set(n.id, agg)
    return agg
  }

  for (const n of nodes) visit(n)
  return out
}
