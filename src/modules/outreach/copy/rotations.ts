/**
 * Locked rotation copy for cold-email composition.
 *
 * Port of Pipeline/Outreach/build_sendlist.py — kept BYTE-IDENTICAL to the
 * Python so behaviour parity is preserved while we phase the python tool out.
 *
 * To change the copy, edit it here. NEVER add ad-hoc rotations elsewhere.
 *
 * Style guards:
 *   - No em/en dashes (Alex's rule, 2026-06-09) — checked at render time
 *   - One operational observation per email, not identity/backstory/named-fees
 */

import type { LeadRecord } from "../outreach.types"

const DASH_RE = /\s*[—–]\s*/g

function noDash(text: string, label: string): { text: string; warning?: string } {
  if (text && (text.includes("—") || text.includes("–"))) {
    return {
      text: text.replace(DASH_RE, " - "),
      warning: `em/en-dash normalised to hyphen in: ${label}`,
    }
  }
  return { text }
}

// ── Locked copy (mirror of build_sendlist.py constants) ──────────────────────

export const IDENTITY: Record<"Alex" | "Luke", string> = {
  Alex: "Alex here - maths student at Bath, running a small operations studio on the side.",
  Luke: "Luke here - I'm a Computer Science student at the University of Bath.",
}

export const SUBJECTS: ReadonlyArray<string> = [
  "Hi {first}",
  "thoughts, {first}?",
  "a quick idea for you, {first}",
] as const

export const PROOFS = {
  auto: [
    "We recently helped a mobile medical clinic automate part of their workflow, saving around 15 hours a week.",
    "We recently worked with a mobile medical clinic, automating part of their operations and freeing up around 15 hours a week.",
  ],
  platform: [
    "We recently built an events company a custom tool that automated their bookings and follow-up, saving them around 10 hours a week.",
    "We recently built a custom system for an events company that took the manual bookings and follow-up off the team's plate, saving around 10 hours a week.",
  ],
} as const

export const OFFERS: ReadonlyArray<string> = [
  "I'm working with 2-3 {local}businesses this month to find the biggest time-drain and build the fix.",
  "I'm taking on 2-3 {local}businesses this month to pin down what costs the most time and fix it.",
  "I'm looking to partner with 2-3 {local}businesses this month, find the workflow costing the most hours, and build a fix around it.",
] as const

export const CTAS: ReadonlyArray<string> = [
  "Worth a 15-minute chat later this week?",
  "Worth a 15-minute call later this week?",
] as const

export const SIGNOFFS: ReadonlyArray<string> = [
  "Kind regards,",
  "Best,",
  "All the best,",
] as const

// ── Compose ──────────────────────────────────────────────────────────────────

export type Sender = "Alex" | "Luke"
export type ProofVariant = "auto" | "platform"

export interface ComposedEmail {
  subject: string
  body: string
  mailto: string
  warnings: string[]
}

export interface ComposeOptions {
  /** 0-based index inside the batch — used to rotate copy deterministically. */
  index: number
  sender: Sender
  proofVariant?: ProofVariant
  /** Bath/Bristol leads get the "local " prefix on the offer line. */
  local?: boolean
  /** Override the observation paragraph (the bespoke artefact you found). */
  observation?: string
}

function firstName(lead: LeadRecord): string {
  return lead.name.trim().split(/\s+/)[0] || lead.name
}

function mailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`
}

/**
 * Compose one email for a lead.
 *
 * If the lead has researchNotes, we treat the first paragraph as "the
 * observation" (operational artefact) and substitute it for {observation}.
 * If no observation, the email is still constructed but the observation
 * paragraph is replaced with a single-line note that the caller should fill
 * in by hand — that way no email gets sent without a real artefact.
 */
export function composeEmail(
  lead: LeadRecord,
  opts: ComposeOptions,
): ComposedEmail {
  const warnings: string[] = []
  const label = `${lead.company} / ${firstName(lead)}`
  const i = opts.index
  const sender = opts.sender
  const local = opts.local ? "local " : ""

  const first = firstName(lead)
  const subjectTemplate = SUBJECTS[i % SUBJECTS.length]
  const subject = subjectTemplate.replace("{first}", first)

  const observation =
    opts.observation ??
    (lead.researchNotes ? lead.researchNotes.split("\n\n")[0] : "[NO OBSERVATION — write the bespoke artefact you found before sending]")

  const proofs = PROOFS[opts.proofVariant ?? "auto"]
  const proof = proofs[i % proofs.length]
  const offer = OFFERS[i % OFFERS.length].replace("{local}", local)
  const cta = CTAS[i % CTAS.length]
  const signoff = SIGNOFFS[i % SIGNOFFS.length]
  const identity = IDENTITY[sender]

  const obsClean = noDash(observation, label)
  if (obsClean.warning) warnings.push(obsClean.warning)

  const body = [
    `Hi ${first},`,
    "",
    `${identity} ${proof}`,
    "",
    obsClean.text,
    "",
    offer,
    "",
    cta,
    "",
    signoff,
    sender,
  ].join("\n")

  return {
    subject,
    body,
    mailto: lead.email
      ? mailtoUrl(lead.email, subject, body)
      : "",
    warnings,
  }
}
