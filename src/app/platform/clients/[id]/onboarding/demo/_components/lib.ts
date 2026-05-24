import type { CoverageStats, DemoNode } from "./types"

const PEOPLE_KINDS = new Set(["PERSON", "CONTRACTOR", "ADVISOR"])
const INTERVIEW_ACTIVE = new Set(["TARGET", "INVITED", "SCHEDULED", "COMPLETED"])
const FORM_SENT = new Set(["SENT", "OPENED", "IN_PROGRESS", "COMPLETED"])

export function computeStats(nodes: DemoNode[]): CoverageStats {
  let mapped = 0
  let vacancies = 0
  let interviewTargets = 0
  let interviewsCompleted = 0
  let formsSent = 0
  let formsCompleted = 0
  let auditCritical = 0
  let totalPeople = 0

  for (const n of nodes) {
    if (n.kind === "VACANCY") {
      vacancies++
      totalPeople++
      continue
    }
    if (PEOPLE_KINDS.has(n.kind)) {
      totalPeople++
      mapped++
      if (INTERVIEW_ACTIVE.has(n.interviewStatus)) interviewTargets++
      if (n.interviewStatus === "COMPLETED") interviewsCompleted++
      if (FORM_SENT.has(n.formStatus)) formsSent++
      if (n.formStatus === "COMPLETED") formsCompleted++
      if (n.auditFlags.length > 0) auditCritical++
    }
  }

  // Heuristic coverage score: weighted blend
  // 40% mapped ratio, 30% interview progress, 20% form progress, 10% audit-critical identified
  const mappedRatio = totalPeople === 0 ? 0 : mapped / totalPeople
  const interviewRatio = interviewTargets === 0 ? 0 : interviewsCompleted / interviewTargets
  const formRatio = interviewTargets === 0 ? 0 : formsCompleted / interviewTargets
  const auditRatio = totalPeople === 0 ? 0 : Math.min(1, auditCritical / Math.max(1, Math.floor(totalPeople * 0.15)))

  const score = 0.4 * mappedRatio + 0.3 * interviewRatio + 0.2 * formRatio + 0.1 * auditRatio
  const coveragePct = Math.round(score * 100)

  return {
    totalPeople,
    mapped,
    vacancies,
    interviewTargets,
    interviewsCompleted,
    formsSent,
    formsCompleted,
    auditCritical,
    coveragePct,
  }
}

/** Generate a stable id for new demo nodes. */
export function makeNodeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

/** Map avatar colour keys to actual muted hex values. */
export const AVATAR_PALETTE: Record<string, { bg: string; fg: string }> = {
  indigo:  { bg: "#4F46E5", fg: "#fff" },
  amber:   { bg: "#B45309", fg: "#fff" },
  rose:    { bg: "#B91C5B", fg: "#fff" },
  teal:    { bg: "#0F766E", fg: "#fff" },
  emerald: { bg: "#047857", fg: "#fff" },
  violet:  { bg: "#6D28D9", fg: "#fff" },
  sky:     { bg: "#0369A1", fg: "#fff" },
  stone:   { bg: "#44403C", fg: "#fff" },
}

export function avatarColors(key: string | null): { bg: string; fg: string } {
  if (!key) return { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-65)" }
  return AVATAR_PALETTE[key] ?? AVATAR_PALETTE.stone!
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
