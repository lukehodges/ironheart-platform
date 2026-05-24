"use client"

/**
 * DemoInspector — right-rail inspector for the org-mapping demo at
 * /platform/clients/[id]/onboarding/demo. Pure presentation; mutations
 * are routed through props (no tRPC).
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Mail, Send, CheckCircle2, AlertCircle, Circle, CircleDot, UserPlus, Users, Building2, UserCog, ShieldCheck, Crown, Wallet, Database, Lock, Workflow, Sparkles, ChevronRight } from "lucide-react"
import type { AuditFlag, DemoNode, FormStatus, InterviewStatus, NodeKind } from "./types"

// ── colour map for avatar tokens ─────────────────────────────────────────

const AVATAR_HEX: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: "#E4E4F3", fg: "#3F3D8C" },
  amber: { bg: "#F4E9D0", fg: "#7A5910" },
  rose: { bg: "#F2DEE2", fg: "#8C3147" },
  teal: { bg: "#D6E8E5", fg: "#2F6F5C" },
  emerald: { bg: "#D8E8DD", fg: "#2F6F4C" },
  violet: { bg: "#E6DEEF", fg: "#5A3F84" },
  sky: { bg: "#D8E5EF", fg: "#2A5DBF" },
  stone: { bg: "#E5E2DA", fg: "#4A4740" },
}

const avatarColors = (key: string | null) => (key && AVATAR_HEX[key]) || { bg: "var(--ih-surface-2)", fg: "var(--ih-ink-65)" }
const initialsOf = (name: string) => name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

// ── status meta tables ───────────────────────────────────────────────────

const INTERVIEW_META: Record<InterviewStatus, { label: string; tone: string; bg: string; border: string }> = {
  NOT_TARGET: { label: "Not on shortlist", tone: "var(--ih-ink-50)", bg: "var(--ih-surface-2)", border: "var(--ih-line)" },
  TARGET: { label: "Marked as target", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", border: "rgba(42,93,191,0.3)" },
  INVITED: { label: "Invite sent", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", border: "rgba(184,134,11,0.3)" },
  SCHEDULED: { label: "Session scheduled", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", border: "rgba(42,93,191,0.3)" },
  COMPLETED: { label: "Interview done", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)", border: "rgba(47,111,92,0.3)" },
  DECLINED: { label: "Declined", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)", border: "rgba(192,57,43,0.3)" },
}

const FORM_META: Record<FormStatus, { label: string; tone: string }> = {
  NOT_SENT: { label: "Not sent", tone: "var(--ih-ink-50)" },
  SENT: { label: "Sent", tone: "var(--ih-info)" },
  OPENED: { label: "Opened", tone: "var(--ih-info)" },
  IN_PROGRESS: { label: "In progress", tone: "var(--ih-warn)" },
  COMPLETED: { label: "Completed", tone: "var(--ih-ok)" },
}

const FORM_ORDER: FormStatus[] = ["NOT_SENT", "SENT", "OPENED", "IN_PROGRESS", "COMPLETED"]
const FORM_TIMELINE: FormStatus[] = ["SENT", "OPENED", "IN_PROGRESS", "COMPLETED"]
const formReached = (current: FormStatus, target: FormStatus) => FORM_ORDER.indexOf(current) >= FORM_ORDER.indexOf(target)

const AUDIT_META: Record<AuditFlag, { label: string; explain: string; tone: string; bg: string; Icon: React.ComponentType<{ size?: number }> }> = {
  DECISION_MAKER: { label: "Decision maker", explain: "Signs the SOW and owns engagement scope.", tone: "var(--ih-accent)", bg: "var(--ih-accent-soft)", Icon: Crown },
  FINANCE_OWNER: { label: "Finance owner", explain: "Controls budget and payables.", tone: "var(--ih-warn)", bg: "var(--ih-warn-soft)", Icon: Wallet },
  DATA_OWNER: { label: "Data owner", explain: "Owns customer data — GDPR exposure.", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", Icon: Database },
  DPO: { label: "DPO", explain: "Data Protection Officer — GDPR sign-off.", tone: "var(--ih-danger)", bg: "var(--ih-danger-soft)", Icon: ShieldCheck },
  SECURITY_OWNER: { label: "Security owner", explain: "Owns infosec, IT, and access policy.", tone: "var(--ih-info)", bg: "var(--ih-info-soft)", Icon: Lock },
  PROCESS_OWNER: { label: "Process owner", explain: "Owns a business-critical process under audit.", tone: "var(--ih-ok)", bg: "var(--ih-ok-soft)", Icon: Workflow },
  FOUNDER: { label: "Founder", explain: "Institutional context — original team.", tone: "var(--ih-ink-65)", bg: "var(--ih-surface-2)", Icon: Sparkles },
}

const KIND_ICON: Record<NodeKind, React.ComponentType<{ size?: number }>> = {
  ORG: Building2, DEPARTMENT: Users, PERSON: UserCog, VACANCY: UserPlus, CONTRACTOR: UserCog, ADVISOR: UserCog, EXTERNAL: UserCog, BUNDLE: Users,
}

// ── shared style helpers ─────────────────────────────────────────────────

const SOFT_BUTTON: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--ih-line-2)",
  background: "var(--ih-surface)",
  fontSize: 12,
  color: "var(--ih-ink)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--ih-font-sans)",
}

// ── component ────────────────────────────────────────────────────────────

interface DemoInspectorProps {
  node: DemoNode | null
  onClose: () => void
  onUpdate: (id: string, patch: Partial<DemoNode>) => void
  onFocusNode: (id: string) => void
  allNodes: DemoNode[]
}

export function DemoInspector({ node, onClose, onUpdate, onFocusNode, allNodes }: DemoInspectorProps): React.ReactElement {
  if (!node) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22, height: "100%", justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--ih-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ih-ink-40)" }}>
          <CircleDot size={18} />
        </div>
        <p className="ih-eyebrow" style={{ color: "var(--ih-ink-50)", margin: 0 }}>Inspector</p>
        <p style={{ fontSize: 13, color: "var(--ih-ink-65)", textAlign: "center", maxWidth: 220, lineHeight: 1.45, margin: 0 }}>
          Select a node on the chart to see contact details, interview state, and audit relevance.
        </p>
      </div>
    )
  }
  return <InspectorBody key={node.id} node={node} onClose={onClose} onUpdate={onUpdate} onFocusNode={onFocusNode} allNodes={allNodes} />
}

function InspectorBody({ node, onClose, onUpdate, onFocusNode, allNodes }: { node: DemoNode } & Omit<DemoInspectorProps, "node">): React.ReactElement {
  const KindIcon = KIND_ICON[node.kind]

  const { manager, directReports } = useMemo(() => {
    const byId = new Map(allNodes.map((n) => [n.id, n]))
    const mgr = node.parentId ? byId.get(node.parentId) ?? null : null
    const reports = allNodes.filter((n) => n.parentId === node.id)
    return { manager: mgr, directReports: reports }
  }, [allNodes, node.id, node.parentId])

  const deptStats = useMemo(() => {
    if (node.kind !== "DEPARTMENT") return null
    const byParent = new Map<string, DemoNode[]>()
    for (const n of allNodes) {
      if (!n.parentId) continue
      if (!byParent.has(n.parentId)) byParent.set(n.parentId, [])
      byParent.get(n.parentId)!.push(n)
    }
    const descendants: DemoNode[] = []
    const stack: DemoNode[] = [node]
    while (stack.length) {
      const cur = stack.pop()!
      for (const k of byParent.get(cur.id) ?? []) { descendants.push(k); stack.push(k) }
    }
    return {
      people: descendants.filter((n) => n.kind === "PERSON" || n.kind === "CONTRACTOR" || n.kind === "ADVISOR").length,
      vacancies: descendants.filter((n) => n.kind === "VACANCY").length,
    }
  }, [allNodes, node])

  const orgStats = useMemo(() => {
    if (node.kind !== "ORG") return null
    return {
      depts: allNodes.filter((n) => n.kind === "DEPARTMENT" && n.parentId === node.id).length,
      people: allNodes.filter((n) => n.kind === "PERSON" || n.kind === "CONTRACTOR" || n.kind === "ADVISOR").length,
    }
  }, [allNodes, node])

  // Notes — local state debounced into onUpdate
  const [notesDraft, setNotesDraft] = useState<string>(node.notes ?? "")
  const debounceRef = useRef<number | null>(null)
  useEffect(() => { setNotesDraft(node.notes ?? "") }, [node.id])
  useEffect(() => {
    if ((node.notes ?? "") === notesDraft) return
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { onUpdate(node.id, { notes: notesDraft || null }) }, 400)
    return () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current) }
  }, [notesDraft, node.id, node.notes, onUpdate])

  const isPersonish = node.kind === "PERSON" || node.kind === "CONTRACTOR" || node.kind === "ADVISOR"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      {/* top bar — sticky so the close X stays reachable while the body scrolls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: -22,
          marginTop: -22,
          marginLeft: -22,
          marginRight: -22,
          paddingTop: 14,
          paddingBottom: 10,
          paddingLeft: 22,
          paddingRight: 22,
          background: "color-mix(in srgb, var(--ih-surface) 92%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderBottom: "1px solid var(--ih-line)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <KindIcon size={13} />
          <span className="ih-eyebrow">{node.kind.toLowerCase()}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close inspector"
          style={{ width: 30, height: 30, borderRadius: 6, background: "var(--ih-surface)", border: "1px solid var(--ih-line-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ih-ink-65)", zIndex: 21 }}>
          <X size={14} />
        </button>
      </div>

      {isPersonish && <ContactPill node={node} />}
      {node.kind === "VACANCY" && <VacancyHeader node={node} />}
      {node.kind === "DEPARTMENT" && deptStats && <DepartmentHeader node={node} stats={deptStats} />}
      {node.kind === "ORG" && orgStats && <OrgHeader node={node} stats={orgStats} />}

      {node.auditFlags.length > 0 && (
        <Section title="Audit relevance">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {node.auditFlags.map((flag) => {
              const meta = AUDIT_META[flag]
              const Icon = meta.Icon
              return (
                <div key={flag} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${meta.tone === "var(--ih-ink-65)" ? "var(--ih-line)" : meta.bg}`, background: meta.bg }}>
                  <span style={{ color: meta.tone, marginTop: 1, flexShrink: 0 }}><Icon size={13} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: meta.tone }}>{meta.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ih-ink-65)", marginTop: 1, lineHeight: 1.4 }}>{meta.explain}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {(isPersonish || node.kind === "VACANCY") && (
        <Section title="Interview"><InterviewBlock node={node} onUpdate={onUpdate} /></Section>
      )}

      {isPersonish && (
        <Section title="Questionnaire"><QuestionnaireBlock node={node} onUpdate={onUpdate} /></Section>
      )}

      {(manager || directReports.length > 0) && (
        <Section title="Reporting">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {manager && (
              <button type="button" onClick={() => onFocusNode(manager.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--ih-line)", background: "var(--ih-surface)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", textAlign: "left", color: "var(--ih-ink)", fontFamily: "var(--ih-font-sans)" }}>
                <SmallAvatar node={manager} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ih-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>Reports to</div>
                  <div style={{ fontSize: 12.5, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{manager.name}</div>
                </div>
                <ChevronRight size={12} style={{ color: "var(--ih-ink-40)" }} />
              </button>
            )}
            {directReports.length > 0 && (
              <div>
                <div className="ih-eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Direct reports · {directReports.length}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {directReports.slice(0, 5).map((r) => (
                    <button key={r.id} type="button" onClick={() => onFocusNode(r.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 999, border: "1px solid var(--ih-line)", background: "var(--ih-surface)", cursor: "pointer", fontFamily: "var(--ih-font-sans)", color: "var(--ih-ink)", fontSize: 11.5, maxWidth: "100%" }}>
                      <SmallAvatar node={r} size={18} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    </button>
                  ))}
                  {directReports.length > 5 && (
                    <span style={{ fontSize: 11.5, color: "var(--ih-ink-50)", alignSelf: "center" }}>+{directReports.length - 5} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Notes">
        <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Add private notes — autosaves." rows={4}
          style={{ width: "100%", borderRadius: 8, border: "1px solid var(--ih-line)", padding: "8px 10px", fontSize: 12.5, background: "var(--ih-surface)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-sans)", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.45 }} />
      </Section>
    </div>
  )
}

// ── headers per kind ─────────────────────────────────────────────────────

function ContactPill({ node }: { node: DemoNode }): React.ReactElement {
  const { bg, fg } = avatarColors(node.avatarColor)
  const initials = initialsOf(node.name)
  const sub = [node.location, node.tenureYears != null ? `${node.tenureYears}y tenure` : null].filter(Boolean).join(" · ")
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, background: "var(--ih-surface)", border: "1px solid var(--ih-line)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em", flexShrink: 0 }}>
        {initials || "—"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="ih-serif" style={{ fontSize: 16, color: "var(--ih-ink)", lineHeight: 1.2 }}>{node.name}</span>
          {node.isFounder && <TinyTag label="Founder" tone="var(--ih-accent)" bg="var(--ih-accent-soft)" />}
          {node.isFractional && <TinyTag label="Fractional" tone="var(--ih-warn)" bg="var(--ih-warn-soft)" />}
        </div>
        {node.title && <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", marginTop: 2 }}>{node.title}</div>}
        {sub && <div className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)", marginTop: 4 }}>{sub}</div>}
        {node.email && (
          <a href={`mailto:${node.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ih-ink-65)", textDecoration: "none", marginTop: 6 }}>
            <Mail size={11} />{node.email}
          </a>
        )}
      </div>
    </div>
  )
}

function VacancyHeader({ node }: { node: DemoNode }): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 10, background: "var(--ih-surface)", border: "1.5px dashed var(--ih-line-3)" }}>
      <TinyTag label="Open role" tone="var(--ih-warn)" bg="var(--ih-warn-soft)" />
      <h2 className="ih-serif" style={{ fontSize: 18, margin: 0, color: "var(--ih-ink)", lineHeight: 1.25 }}>{node.title || node.name}</h2>
      <button type="button" style={{ ...SOFT_BUTTON, alignSelf: "flex-start", marginTop: 4 }}>
        <UserPlus size={11} />Connect to a candidate
      </button>
    </div>
  )
}

function DepartmentHeader({ node, stats }: { node: DemoNode; stats: { people: number; vacancies: number } }): React.ReactElement {
  return (
    <div>
      <h2 className="ih-serif" style={{ fontSize: 22, margin: 0, color: "var(--ih-ink)", lineHeight: 1.2 }}>{node.name}</h2>
      <p style={{ fontSize: 12.5, color: "var(--ih-ink-50)", marginTop: 6 }}>
        <Users size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
        {stats.people} {stats.people === 1 ? "person" : "people"} · {stats.vacancies} {stats.vacancies === 1 ? "vacancy" : "vacancies"}
      </p>
      <button type="button" style={{ ...SOFT_BUTTON, marginTop: 10 }}><UserPlus size={11} />Add person</button>
    </div>
  )
}

function OrgHeader({ node, stats }: { node: DemoNode; stats: { depts: number; people: number } }): React.ReactElement {
  return (
    <div>
      <h2 className="ih-serif" style={{ fontSize: 22, margin: 0, color: "var(--ih-ink)", lineHeight: 1.2 }}>{node.name}</h2>
      <p style={{ fontSize: 12.5, color: "var(--ih-ink-50)", marginTop: 6 }}>{stats.people} people across {stats.depts} departments</p>
      {node.location && <p className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)", marginTop: 4 }}>{node.location}</p>}
    </div>
  )
}

// ── interview / questionnaire blocks ─────────────────────────────────────

function InterviewBlock({ node, onUpdate }: { node: DemoNode; onUpdate: (id: string, patch: Partial<DemoNode>) => void }): React.ReactElement {
  const meta = INTERVIEW_META[node.interviewStatus]
  const set = (s: InterviewStatus) => onUpdate(node.id, { interviewStatus: s })
  const actions: { status: InterviewStatus; label: string }[] = [
    { status: "TARGET", label: "Mark target" },
    { status: "INVITED", label: "Send invite" },
    { status: "SCHEDULED", label: "Mark scheduled" },
    { status: "COMPLETED", label: "Mark completed" },
    { status: "NOT_TARGET", label: "Skip" },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ border: `1px solid ${meta.border}`, background: meta.bg, borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: meta.tone, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: meta.tone }}>{meta.label}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {actions.map(({ status, label }) => {
          const active = node.interviewStatus === status
          return (
            <button key={status} type="button" onClick={() => set(status)} disabled={active}
              style={{
                padding: "5px 9px", borderRadius: 6, fontSize: 11.5, fontFamily: "var(--ih-font-sans)",
                border: active ? `1px solid ${INTERVIEW_META[status].tone}` : "1px solid var(--ih-line)",
                background: active ? INTERVIEW_META[status].bg : "var(--ih-surface)",
                color: active ? INTERVIEW_META[status].tone : "var(--ih-ink-65)",
                cursor: active ? "default" : "pointer", opacity: active ? 1 : 0.95,
              }}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QuestionnaireBlock({ node, onUpdate }: { node: DemoNode; onUpdate: (id: string, patch: Partial<DemoNode>) => void }): React.ReactElement {
  const meta = FORM_META[node.formStatus]
  const sent = node.formStatus !== "NOT_SENT"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: meta.tone, flexShrink: 0 }}>
          {node.formStatus === "COMPLETED" ? <CheckCircle2 size={13} /> : node.formStatus === "NOT_SENT" ? <AlertCircle size={13} /> : <Send size={13} />}
        </span>
        <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: meta.tone }}>{meta.label}</div>
        {node.email && (
          <button type="button" onClick={() => onUpdate(node.id, { formStatus: "SENT" })}
            style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid var(--ih-line-2)", background: "var(--ih-surface)", fontSize: 11.5, color: "var(--ih-ink)", cursor: "pointer", fontFamily: "var(--ih-font-sans)" }}>
            {sent ? "Resend" : "Send now"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {FORM_TIMELINE.map((step, i) => {
          const reached = formReached(node.formStatus, step)
          const isLast = i === FORM_TIMELINE.length - 1
          return (
            <div key={step} style={{ display: "flex", alignItems: "center", flex: isLast ? "0 0 auto" : 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ color: reached ? "var(--ih-ok)" : "var(--ih-ink-30)", display: "flex" }}>
                  {reached ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                </span>
                <span className="ih-mono" style={{ fontSize: 9, color: reached ? "var(--ih-ink-65)" : "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{FORM_META[step].label}</span>
              </div>
              {!isLast && <div style={{ flex: 1, height: 1, background: reached ? "var(--ih-ok)" : "var(--ih-line)", marginTop: -10, marginInline: 4 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── shared bits ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <p className="ih-eyebrow" style={{ marginBottom: 8 }}>{title}</p>
      {children}
    </div>
  )
}

function TinyTag({ label, tone, bg }: { label: string; tone: string; bg: string }): React.ReactElement {
  return (
    <span className="ih-mono"
      style={{ padding: "1px 6px", borderRadius: 999, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: tone, background: bg, border: `1px solid ${bg === "var(--ih-surface-2)" ? "var(--ih-line)" : "transparent"}`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  )
}

function SmallAvatar({ node, size }: { node: DemoNode; size: number }): React.ReactElement {
  const { bg, fg } = avatarColors(node.avatarColor)
  const initials = initialsOf(node.name || node.title || "—")
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.max(8, Math.floor(size * 0.42)), fontWeight: 600, flexShrink: 0 }}>
      {initials || "—"}
    </div>
  )
}
