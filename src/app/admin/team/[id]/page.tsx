"use client"

import { use, useMemo, useRef, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/shell"
import {
  ActivityTimeline, ConfirmDialog, EmailDraftDialog, InlineFormRow,
  NotificationToast, type ToastTone,
} from "@/components/shared"
import {
  mockTeam,
  STANDARD_MODULES,
  STATUS_META,
  type Document,
  type Goal,
  type Permission,
  type PermissionLevel,
  type Skill,
  type TeamMember,
  type TimeOffPlan,
} from "@/lib/mock/team"

/* ── Constants ───────────────────────────────────────────────────────────── */

type Tab =
  | "overview" | "capacity" | "skills" | "performance" | "timeoff"
  | "hierarchy" | "documents" | "equipment" | "permissions" | "audit"

const PERM_LEVELS: PermissionLevel[] = ["NONE", "VIEW", "EDIT", "ADMIN"]

/* ── Popover (reused, local) ─────────────────────────────────────────────── */

function Popover({
  trigger, children, align = "right", width = 200,
}: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="animate-pop-in" style={{
          position: "absolute", top: "calc(100% + 6px)", [align === "right" ? "right" : "left"]: 0,
          zIndex: 100, width, background: "var(--ih-surface)", border: "1px solid var(--ih-line)",
          borderRadius: "var(--ih-r-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 4,
        }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function PopoverHeader({ children }: { children: React.ReactNode }) {
  return <div className="ih-eyebrow" style={{ padding: "8px 10px 4px", fontSize: 9 }}>{children}</div>
}
function PopoverItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--ih-surface-2)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
        border: 0, background: "transparent",
        fontSize: 12, color: danger ? "var(--ih-danger)" : "var(--ih-ink)", cursor: "pointer",
        textAlign: "left", borderRadius: "var(--ih-r-sm)",
      }}>
      {children}
    </button>
  )
}

/* ── Small shared bits ───────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10, gap: 12 }}>
      <div>
        <div className="ih-eyebrow">{eyebrow}</div>
        <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

function DotsRow({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <div style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`ih-dot ${i < filled ? "ih-dot-accent" : "ih-dot-muted"}`} style={{ width: 6, height: 6 }} />
      ))}
    </div>
  )
}

function ProgressBar({ pct, tone = "var(--ih-ink)" }: { pct: number; tone?: string }) {
  return (
    <div style={{ width: "100%", height: 5, background: "var(--ih-surface-3)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: tone, transition: "width 0.2s" }} />
    </div>
  )
}

function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return <div style={{ width: "100%", height: 10, background: "var(--ih-surface-3)", borderRadius: 5 }} />
  }
  return (
    <div style={{ width: "100%", height: 10, background: "var(--ih-surface-3)", borderRadius: 5, overflow: "hidden", display: "flex" }}>
      {segments.map(s => (
        <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}h`} />
      ))}
    </div>
  )
}

/* ── Tab: Overview ───────────────────────────────────────────────────────── */

function OverviewTab({ m, onEmail, onSchedule }: { m: TeamMember; onEmail: () => void; onSchedule: () => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
      {/* About + contact */}
      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="About" title="Profile" action={
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onEmail}><Icon name="mail" size={11} /> Email</button>
        } />
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ih-ink-65)", marginTop: 0 }}>{m.about}</p>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, columnGap: 12, fontSize: 12, marginTop: 12 }}>
          <span style={{ color: "var(--ih-ink-50)" }}>Email</span>
          <span className="ih-mono">{m.email}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Phone</span>
          <span className="ih-mono">{m.phone}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Location</span>
          <span>{m.location}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Timezone</span>
          <span className="ih-mono">{m.timezone}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Employment</span>
          <span>{m.employment.type} · {m.employment.employmentNumber}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Started</span>
          <span>{m.employment.startedAt} · {m.employment.tenureLabel}</span>
          <span style={{ color: "var(--ih-ink-50)" }}>Compensation band</span>
          <span>{m.compensation.band} · <span style={{ color: "var(--ih-ink-50)" }}>{m.compensation.summary}</span></span>
        </div>
      </div>

      {/* Current assignments */}
      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="In flight" title="Current assignments" action={
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{m.assignments.length}</span>
        } />
        {m.assignments.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No active assignments.</div>}
        {m.assignments.map(a => (
          <Link key={a.engagementId} href={`/admin/clients/${a.engagementId}`}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)", textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 30 }} className="ih-num">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.allocationPct}</span>
              <span style={{ fontSize: 9, color: "var(--ih-ink-40)" }}>%</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{a.customerName}</div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{a.role} · {a.stage}</div>
            </div>
            <Icon name="arrowUpRight" size={11} style={{ color: "var(--ih-ink-30)" }} />
          </Link>
        ))}
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ width: "100%", marginTop: 10 }} onClick={onSchedule}>
          <Icon name="plus" size={10} /> Assign to engagement
        </button>
      </div>

      {/* Recent activity */}
      <div className="ih-card" style={{ gridColumn: "1 / -1", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
          <SectionHeader eyebrow="Last 14 events" title="Recent activity" />
        </div>
        <ActivityTimeline groups={[{
          label: "Recent",
          items: m.recentActivity.slice(0, 14).map(a => ({
            time: a.when,
            icon: a.type === "booking"     ? "calendar"
                : a.type === "task"        ? "check"
                : a.type === "deliverable" ? "sparkles"
                : a.type === "login"       ? "user"
                : a.type === "perm"        ? "shield"
                : a.type === "edit"        ? "sliders"
                : a.type === "message"     ? "mail"
                                            : "handshake",
            iconTone: a.tone,
            title: a.label,
            meta: a.related ? `${a.related.type} · ${a.related.label}` : undefined,
            link: a.related?.href,
          })),
        }]} />
      </div>

      {/* Upcoming time-off */}
      {(m.timeOff.upcoming.length > 0 || m.upcomingBookings.length > 0) && (
        <div className="ih-card" style={{ gridColumn: "1 / -1", padding: 18 }}>
          <SectionHeader eyebrow="Calendar" title="Upcoming" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Time off</div>
              {m.timeOff.upcoming.length === 0 && <div style={{ fontSize: 11.5, color: "var(--ih-ink-40)" }}>Nothing planned.</div>}
              {m.timeOff.upcoming.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px dashed var(--ih-line)" }}>
                  <span className="ih-mono" style={{ fontSize: 11, width: 100 }}>{p.from} → {p.to}</span>
                  <span style={{ flex: 1, fontSize: 12 }}>{p.reason}</span>
                  <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{p.days}d</span>
                </div>
              ))}
            </div>
            <div>
              <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Bookings this week</div>
              {m.upcomingBookings.length === 0 && <div style={{ fontSize: 11.5, color: "var(--ih-ink-40)" }}>No bookings.</div>}
              {m.upcomingBookings.slice(0, 5).map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px dashed var(--ih-line)" }}>
                  <span className="ih-mono" style={{ fontSize: 11, width: 80 }}>{b.time}</span>
                  <span style={{ flex: 1, fontSize: 12 }}>{b.title}</span>
                  <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{b.client} · {b.dur}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tab: Capacity ───────────────────────────────────────────────────────── */

function CapacityTab({ m }: { m: TeamMember }) {
  const billable = m.capacity.billableHoursThisWeek
  const admin    = m.capacity.adminHoursThisWeek
  const target   = m.capacity.weeklyHoursTarget
  const free     = Math.max(0, target - billable - admin)
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
      <div className="ih-card" style={{ padding: 18, gridColumn: "1 / -1" }}>
        <SectionHeader eyebrow="This week" title="Capacity allocation" action={
          <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>
            {billable + admin}/{target}h target · {m.capacity.utilizationPct}% util
          </span>
        } />
        <StackedBar segments={[
          { label: "Billable", value: billable, color: "var(--ih-ok)" },
          { label: "Admin",    value: admin,    color: "var(--ih-info)" },
          { label: "Free",     value: free,     color: "var(--ih-surface-3)" },
        ]} />
        <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
          {[
            { label: "Billable", v: `${billable}h`, c: "var(--ih-ok)" },
            { label: "Admin",    v: `${admin}h`,    c: "var(--ih-info)" },
            { label: "Free",     v: `${free}h`,     c: "var(--ih-ink-40)" },
            { label: "PTO balance", v: `${m.capacity.ptoBalanceDays}d`, c: "var(--ih-ink)" },
          ].map(s => (
            <div key={s.label}>
              <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 22, color: s.c, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="Allocations" title="Engagements" />
        {m.assignments.map(a => (
          <Link key={a.engagementId} href={`/admin/clients/${a.engagementId}`}
            style={{ display: "block", padding: "10px 0", borderBottom: "1px dashed var(--ih-line)", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{a.customerName}</span>
              <span className="ih-mono" style={{ fontSize: 11 }}>{a.allocationPct}%</span>
            </div>
            <ProgressBar pct={a.allocationPct} tone="var(--ih-accent)" />
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>{a.role} · {a.stage}</div>
          </Link>
        ))}
        {m.assignments.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No active assignments.</div>}
      </div>

      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="Calendar peek" title="Next 5 bookings" />
        {m.upcomingBookings.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No bookings.</div>}
        {m.upcomingBookings.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i === m.upcomingBookings.length - 1 ? 0 : "1px dashed var(--ih-line)" }}>
            <span className="ih-mono" style={{ fontSize: 11, width: 70, color: "var(--ih-ink-65)" }}>{b.time}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{b.title}</div>
              <div style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>{b.client}</div>
            </div>
            <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-40)" }}>{b.dur}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Tab: Skills & certifications ────────────────────────────────────────── */

function SkillsTab({ m, onAddSkill, onToastInfo }: { m: TeamMember; onAddSkill: (s: { name: string; group: string; level: string }) => void; onToastInfo: (msg: string) => void }) {
  const [adding, setAdding] = useState(false)

  /* group skills */
  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of m.skills) {
      const arr = map.get(s.group) ?? []
      arr.push(s)
      map.set(s.group, arr)
    }
    return Array.from(map.entries())
  }, [m.skills])

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="Proficiency" title="Skills" action={
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setAdding(v => !v)}>
            <Icon name="plus" size={11} /> Add skill
          </button>
        } />
        {adding && (
          <div style={{ marginBottom: 14 }}>
            <InlineFormRow
              fields={[
                { key: "name",  label: "Name",  type: "text",   placeholder: "Skill name…" },
                { key: "group", label: "Group", type: "select", options: ["Consulting", "Engineering", "Soft", "Tooling", "Finance", "Language"].map(g => ({ label: g, value: g })) },
                { key: "level", label: "Level (1–5)", type: "select", options: [1, 2, 3, 4, 5].map(v => ({ label: `L${v}`, value: String(v) })) },
              ]}
              onSave={(v) => { onAddSkill({ name: v.name, group: v.group || "Consulting", level: v.level || "3" }); setAdding(false) }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
        {grouped.map(([group, items]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>{group}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{s.name}</span>
                  <DotsRow filled={s.level} />
                  <span className="ih-mono" style={{ fontSize: 10, color: s.verifiedAt ? "var(--ih-ok)" : "var(--ih-ink-40)", width: 100, textAlign: "right" }}>
                    {s.verifiedAt ? `verified · ${s.verifiedAt}` : "unverified"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="Credentials" title="Certifications" />
        {m.certifications.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No certifications recorded.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {m.certifications.map(c => (
            <div key={c.name} className="ih-card" style={{ padding: 10, background: "var(--ih-surface-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon name="shield" size={11} style={{ color: c.expiringSoon ? "var(--ih-danger)" : "var(--ih-ink-50)" }} />
                <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{c.name}</span>
                {c.expiringSoon && <span className="ih-pill ih-pill-danger" style={{ fontSize: 9, padding: "1px 5px" }}>EXPIRING</span>}
              </div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>
                {c.issuer} · issued {c.issuedAt}{c.expiresAt ? ` · expires ${c.expiresAt}` : " · no expiry"}
              </div>
            </div>
          ))}
        </div>
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ width: "100%", marginTop: 10 }}
          onClick={() => onToastInfo("Certification upload dialog opened …")}>
          <Icon name="plus" size={10} /> Add certification
        </button>
      </div>
    </div>
  )
}

/* ── Tab: Performance ────────────────────────────────────────────────────── */

function PerformanceTab({
  m, goals, onAddGoal, onToastInfo,
}: {
  m: TeamMember; goals: Goal[];
  onAddGoal: (g: { title: string; dueAt: string }) => void;
  onToastInfo: (msg: string) => void;
}) {
  const [adding, setAdding] = useState(false)

  function ratingPill(rating: "EXCEEDS" | "MEETS" | "IMPROVING") {
    const tone = rating === "EXCEEDS" ? "ok" : rating === "MEETS" ? "info" : "warn"
    return <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 9 }}>{rating}</span>
  }
  function statusTone(status: Goal["status"]): string {
    return status === "ON_TRACK" ? "var(--ih-ok)" : status === "AT_RISK" ? "var(--ih-warn)" : status === "OFF_TRACK" ? "var(--ih-danger)" : "var(--ih-ink-50)"
  }
  function statusLabel(status: Goal["status"]): string {
    return status === "ON_TRACK" ? "On track" : status === "AT_RISK" ? "At risk" : status === "OFF_TRACK" ? "Off track" : "Done"
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="History" title="Reviews" />
        {m.reviews.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No reviews yet.</div>}
        {m.reviews.map((r, i) => (
          <div key={i} style={{ padding: "12px 0", borderBottom: i === m.reviews.length - 1 ? 0 : "1px dashed var(--ih-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span className="ih-mono" style={{ fontSize: 11, fontWeight: 500 }}>{r.period}</span>
              {ratingPill(r.rating)}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{r.reviewer}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--ih-ink-65)" }}>{r.summary}</p>
            <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ marginTop: 6, height: 22, fontSize: 10 }}
              onClick={() => onToastInfo(`Opened full review · ${r.period}`)}>
              View full review <Icon name="arrowUpRight" size={9} />
            </button>
          </div>
        ))}
        <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ marginTop: 10 }}
          onClick={() => onToastInfo("Performance review draft opened …")}>
          <Icon name="plus" size={10} /> Start new review
        </button>
      </div>

      <div className="ih-card" style={{ padding: 18 }}>
        <SectionHeader eyebrow="OKRs" title="Goals · current cycle" action={
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setAdding(v => !v)}>
            <Icon name="plus" size={11} /> Add goal
          </button>
        } />
        {adding && (
          <div style={{ marginBottom: 14 }}>
            <InlineFormRow
              fields={[
                { key: "title", label: "Title", type: "text", placeholder: "Goal title…" },
                { key: "dueAt", label: "Due",   type: "text", placeholder: "e.g. Sep 2026" },
              ]}
              onSave={(v) => { if (v.title.trim()) onAddGoal({ title: v.title, dueAt: v.dueAt || "Sep 2026" }); setAdding(false) }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
        {goals.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No active goals.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {goals.map(g => (
            <div key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{g.title}</span>
                <span className="ih-mono" style={{ fontSize: 10, color: statusTone(g.status) }}>{statusLabel(g.status)}</span>
                <span className="ih-num" style={{ fontSize: 11, color: "var(--ih-ink-65)", width: 30, textAlign: "right" }}>{g.progress}%</span>
              </div>
              <ProgressBar pct={g.progress} tone={statusTone(g.status)} />
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>due {g.dueAt}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Tab: Time off ───────────────────────────────────────────────────────── */

function TimeOffTab({
  m, onRequest, onToastInfo,
}: {
  m: TeamMember;
  onRequest: (p: { from: string; to: string; reason: string }) => void;
  onToastInfo: (msg: string) => void;
}) {
  const [adding, setAdding] = useState(false)

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {[
        { label: "PTO balance",      v: `${m.timeOff.balanceDays}d`, sub: `${m.timeOff.used}d used this year`, tone: "var(--ih-ink)" },
        { label: "Sick",              v: "Unlimited",                 sub: "policy applies",                      tone: "var(--ih-ink-50)" },
        { label: "Personal",          v: "5d",                        sub: "annual entitlement",                  tone: "var(--ih-ink-50)" },
      ].map(s => (
        <div key={s.label} className="ih-card" style={{ padding: 16 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
          <div className="ih-serif ih-num" style={{ fontSize: 28, lineHeight: 1, color: s.tone }}>{s.v}</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
        </div>
      ))}

      <div className="ih-card" style={{ padding: 18, gridColumn: "1 / -1" }}>
        <SectionHeader eyebrow="Planning" title="Upcoming time off" action={
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setAdding(v => !v)}>
            <Icon name="plus" size={11} /> Request time off
          </button>
        } />
        {adding && (
          <div style={{ marginBottom: 14 }}>
            <InlineFormRow
              fields={[
                { key: "from",   label: "From",   type: "text", placeholder: "e.g. Jun 24" },
                { key: "to",     label: "To",     type: "text", placeholder: "e.g. Jun 28" },
                { key: "reason", label: "Reason", type: "text", placeholder: "Holiday, family…" },
              ]}
              onSave={(v) => {
                if (v.from && v.to) onRequest({ from: v.from, to: v.to, reason: v.reason || "Time off" })
                else onToastInfo("From and to dates are required")
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
        {m.timeOff.upcoming.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>No upcoming time off.</div>}
        {m.timeOff.upcoming.map((p, i) => <TimeOffRow key={i} p={p} tone="info" />)}

        <div style={{ height: 16 }} />
        <SectionHeader eyebrow="History" title="Recent time off" />
        {m.timeOff.recent.length === 0 && <div style={{ fontSize: 12, color: "var(--ih-ink-40)" }}>Nothing in the last 12 months.</div>}
        {m.timeOff.recent.map((p, i) => <TimeOffRow key={i} p={p} tone="muted" />)}
      </div>
    </div>
  )
}

function TimeOffRow({ p, tone }: { p: TimeOffPlan; tone: "info" | "muted" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--ih-line)" }}>
      <span className={`ih-pill ih-pill-${tone}`} style={{ fontSize: 9, padding: "1px 5px" }}>{p.from}</span>
      <Icon name="arrowRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
      <span className="ih-mono" style={{ fontSize: 11 }}>{p.to}</span>
      <span style={{ flex: 1, fontSize: 12, marginLeft: 6 }}>{p.reason}</span>
      <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>{p.days}d</span>
    </div>
  )
}

/* ── Tab: Hierarchy (mini org chart) ─────────────────────────────────────── */

function HierarchyTab({ m }: { m: TeamMember }) {
  return (
    <div className="ih-card" style={{ padding: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Manager */}
        {m.manager ? (
          <>
            <Link href={`/admin/team/${m.manager.id}`} className="ih-card" style={{ padding: "8px 14px", textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 10 }}>
              <div className="ih-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{m.manager.initials}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.manager.name}</div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>manager</div>
              </div>
            </Link>
            <div style={{ width: 1, height: 24, background: "var(--ih-line-2)" }} />
          </>
        ) : (
          <div style={{ fontSize: 11, color: "var(--ih-ink-40)", marginBottom: 12 }}>No manager — top of hierarchy.</div>
        )}

        {/* Self */}
        <div className="ih-card" style={{
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
          background: "var(--ih-accent-soft)", borderColor: "var(--ih-accent)",
        }}>
          <div className="ih-avatar" style={{ width: 40, height: 40, fontSize: 14, background: "var(--ih-accent)", color: "var(--ih-accent-fg)" }}>{m.initials}</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-65)" }}>{m.role}</div>
          </div>
        </div>

        {/* Direct reports */}
        {m.directReports.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: "var(--ih-line-2)" }} />
            <div style={{ position: "relative", display: "flex", gap: 20, paddingTop: 0 }}>
              {m.directReports.length > 1 && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "var(--ih-line-2)" }} />
              )}
              {m.directReports.map(r => (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, height: 24, background: "var(--ih-line-2)" }} />
                  <Link href={`/admin/team/${r.id}`} className="ih-card" style={{ padding: "8px 12px", textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
                    <div className="ih-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{r.initials}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{r.name}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r.role}</div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {m.directReports.length === 0 && (
          <div style={{ marginTop: 24, fontSize: 11, color: "var(--ih-ink-40)" }}>No direct reports.</div>
        )}
      </div>
    </div>
  )
}

/* ── Tab: Documents ──────────────────────────────────────────────────────── */

function DocumentsTab({
  m, documents, onUpload,
}: {
  m: TeamMember;
  documents: Document[];
  onUpload: (d: { name: string; type: string }) => void;
}) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="ih-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHeader eyebrow={`${m.documents.length} on file`} title="Documents" />
        <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setAdding(v => !v)}>
          <Icon name="plus" size={11} /> Upload
        </button>
      </div>
      {adding && (
        <div style={{ padding: 14, borderBottom: "1px solid var(--ih-line)" }}>
          <InlineFormRow
            fields={[
              { key: "name", label: "Name",  type: "text",   placeholder: "Document name…" },
              { key: "type", label: "Type",  type: "select", options: [
                { label: "Contract", value: "CONTRACT" }, { label: "NDA", value: "NDA" },
                { label: "ID",       value: "ID" },       { label: "Training", value: "TRAINING" },
              ] },
            ]}
            onSave={(v) => { if (v.name && v.type) onUpload({ name: v.name, type: v.type }); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead style={{ background: "var(--ih-surface-2)" }}>
          <tr>
            {["Name", "Type", "Uploaded", "Expires", ""].map(h => (
              <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map(d => (
            <tr key={d.id} style={{ borderTop: "1px solid var(--ih-line)" }}>
              <td style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="file" size={12} style={{ color: "var(--ih-ink-50)" }} />
                {d.name}
              </td>
              <td style={{ padding: "10px 14px" }}>
                <span className="ih-pill" style={{ fontSize: 9 }}>{d.type}</span>
              </td>
              <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }} className="ih-mono">{d.uploadedAt}</td>
              <td style={{ padding: "10px 14px" }}>
                {d.expiresAt ? (
                  <span className="ih-mono" style={{ fontSize: 11, color: d.expiringSoon ? "var(--ih-danger)" : "var(--ih-ink-65)" }}>
                    {d.expiresAt} {d.expiringSoon && <span className="ih-pill ih-pill-danger" style={{ marginLeft: 6, fontSize: 8, padding: "1px 4px" }}>EXPIRING</span>}
                  </span>
                ) : <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>—</span>}
              </td>
              <td style={{ padding: "10px 14px", textAlign: "right" }}>
                <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 22, width: 22 }} title="Download">
                  <Icon name="download" size={11} />
                </button>
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>No documents on file.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ── Tab: Equipment ──────────────────────────────────────────────────────── */

function EquipmentTab({ m, onAssign }: { m: TeamMember; onAssign: (e: { type: string; model: string }) => void }) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="ih-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHeader eyebrow={`${m.equipment.length} assigned`} title="Equipment & licenses" />
        <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setAdding(v => !v)}>
          <Icon name="plus" size={11} /> Assign
        </button>
      </div>
      {adding && (
        <div style={{ padding: 14, borderBottom: "1px solid var(--ih-line)" }}>
          <InlineFormRow
            fields={[
              { key: "type",  label: "Type",  type: "select", options: [
                { label: "Laptop",  value: "LAPTOP" },  { label: "Phone",   value: "PHONE" },
                { label: "Monitor", value: "MONITOR" }, { label: "License", value: "LICENSE" },
              ] },
              { key: "model", label: "Model", type: "text", placeholder: "e.g. MacBook Pro 16\"…" },
            ]}
            onSave={(v) => { if (v.type && v.model) onAssign({ type: v.type, model: v.model }); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead style={{ background: "var(--ih-surface-2)" }}>
          <tr>
            {["Type", "Model", "Serial", "Assigned", "Status"].map(h => (
              <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.equipment.map(e => (
            <tr key={e.id} style={{ borderTop: "1px solid var(--ih-line)" }}>
              <td style={{ padding: "10px 14px" }}>
                <span className="ih-pill" style={{ fontSize: 9 }}>{e.type}</span>
              </td>
              <td style={{ padding: "10px 14px" }}>{e.model}</td>
              <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }} className="ih-mono">{e.serial ?? "—"}</td>
              <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }} className="ih-mono">{e.assignedAt}</td>
              <td style={{ padding: "10px 14px" }}>
                <span className={`ih-pill ih-pill-${e.status === "ACTIVE" ? "ok" : "muted"}`} style={{ fontSize: 9 }}>
                  {e.status === "ACTIVE" ? "Active" : "Returned"}
                </span>
              </td>
            </tr>
          ))}
          {m.equipment.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--ih-ink-40)", fontSize: 12 }}>No equipment assigned.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ── Tab: Permissions matrix ─────────────────────────────────────────────── */

function PermissionsTab({
  permissions, onChange,
}: {
  permissions: Permission[];
  onChange: (module: string, level: PermissionLevel) => void;
}) {
  const map = useMemo(() => new Map(permissions.map(p => [p.module, p.level])), [permissions])

  return (
    <div className="ih-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
        <SectionHeader eyebrow="RBAC" title="Module permissions" />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead style={{ background: "var(--ih-surface-2)" }}>
          <tr>
            <th className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>Module</th>
            {PERM_LEVELS.map(l => (
              <th key={l} className="ih-mono" style={{ textAlign: "center", padding: "8px 14px", fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, width: 80 }}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STANDARD_MODULES.map(mod => {
            const current = map.get(mod) ?? "NONE"
            return (
              <tr key={mod} style={{ borderTop: "1px solid var(--ih-line)" }}>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{mod}</td>
                {PERM_LEVELS.map(level => {
                  const checked = current === level
                  return (
                    <td key={level} style={{ padding: "10px 14px", textAlign: "center" }}>
                      <label style={{ display: "inline-flex", cursor: "pointer", padding: 4 }}>
                        <input
                          type="radio"
                          name={`perm-${mod}`}
                          checked={checked}
                          onChange={() => onChange(mod, level)}
                          style={{ accentColor: "var(--ih-accent)" }}
                        />
                      </label>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── Tab: Audit log (filtered to member) ─────────────────────────────────── */

function AuditTab({ m }: { m: TeamMember }) {
  return (
    <div className="ih-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
        <SectionHeader eyebrow={`${m.recentActivity.length} events`} title="Audit log" action={
          <Link href={`/admin/audit?actor=${m.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}>
            Full audit <Icon name="arrowUpRight" size={10} />
          </Link>
        } />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead style={{ background: "var(--ih-surface-2)" }}>
          <tr>
            {["When", "Type", "Event", "Related"].map(h => (
              <th key={h} className="ih-mono" style={{ textAlign: "left", padding: "8px 14px", fontSize: 10, color: "var(--ih-ink-50)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.recentActivity.map(a => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--ih-line)" }}>
              <td style={{ padding: "10px 14px", color: "var(--ih-ink-65)" }} className="ih-mono">{a.when}</td>
              <td style={{ padding: "10px 14px" }}>
                <span className={`ih-pill ih-pill-${a.tone}`} style={{ fontSize: 9 }}>{a.type}</span>
              </td>
              <td style={{ padding: "10px 14px" }}>{a.label}</td>
              <td style={{ padding: "10px 14px" }}>
                {a.related ? (
                  <Link href={a.related.href} style={{ fontSize: 11.5, color: "var(--ih-info)", textDecoration: "none" }}>
                    {a.related.label} <Icon name="arrowUpRight" size={9} />
                  </Link>
                ) : <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Right rail ──────────────────────────────────────────────────────────── */

function RightRail({
  m, onEmail, onSchedule, onRecognise, onFeedback,
}: {
  m: TeamMember; onEmail: () => void; onSchedule: () => void; onRecognise: () => void; onFeedback: () => void;
}) {
  return (
    <aside style={{ width: 280, flexShrink: 0, padding: "0 0 0 16px", borderLeft: "1px solid var(--ih-line)", position: "sticky", top: 60 }}>
      <div className="ih-card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Snapshot</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--ih-line)", borderRadius: "var(--ih-r-sm)", overflow: "hidden" }}>
          {[
            { l: "Util.",       v: `${m.capacity.utilizationPct}%`, c: m.capacity.utilizationPct >= 90 ? "var(--ih-danger)" : "var(--ih-ink)" },
            { l: "Billable",    v: `${m.capacity.billableHoursThisWeek}h`, c: "var(--ih-ink)" },
            { l: "PTO",         v: `${m.capacity.ptoBalanceDays}d`, c: "var(--ih-ink)" },
            { l: "Reports",     v: String(m.directReports.length), c: "var(--ih-ink)" },
          ].map(s => (
            <div key={s.l} style={{ background: "var(--ih-surface)", padding: "8px 10px" }}>
              <div className="ih-eyebrow" style={{ fontSize: 8 }}>{s.l}</div>
              <div className="ih-serif ih-num" style={{ fontSize: 18, color: s.c, lineHeight: 1.1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ih-card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Assignments shortcuts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {m.assignments.length === 0 && <div style={{ fontSize: 11, color: "var(--ih-ink-40)" }}>None active.</div>}
          {m.assignments.slice(0, 4).map(a => (
            <Link key={a.engagementId} href={`/admin/clients/${a.engagementId}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--ih-r-sm)", textDecoration: "none", color: "inherit", background: "var(--ih-surface-2)" }}>
              <span className="ih-num" style={{ fontSize: 10, width: 28, color: "var(--ih-ink-50)" }}>{a.allocationPct}%</span>
              <span style={{ fontSize: 11.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.customerName}</span>
              <Icon name="arrowUpRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
            </Link>
          ))}
        </div>
      </div>

      <div className="ih-card" style={{ padding: 14 }}>
        <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Quick actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onSchedule}>
            <Icon name="calendar" size={11} /> Schedule 1:1
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onRecognise}>
            <Icon name="star" size={11} /> Send recognition
          </button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onFeedback}>
            <Icon name="chat" size={11} /> Request feedback
          </button>
          <Link href={`/admin/calendar?owner=${m.id}`} className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none", justifyContent: "center" }}>
            <Icon name="clock" size={11} /> View their calendar
          </Link>
          <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={onEmail}>
            <Icon name="mail" size={11} /> Email
          </button>
        </div>
      </div>
    </aside>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

interface PageProps { params: Promise<{ id: string }> }

export default function TeamMemberDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const member = useMemo(() => mockTeam.getById(id), [id])

  const [tab, setTab] = useState<Tab>("overview")
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null)
  const [emailDraft, setEmailDraft] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  /* local mutations (mock-state) ----------------------------------------- */
  const [skills, setSkills] = useState<Skill[]>(() => member?.skills ?? [])
  const [goals, setGoals] = useState<Goal[]>(() => member?.goals ?? [])
  const [documents, setDocuments] = useState<Document[]>(() => member?.documents ?? [])
  const [equipment, setEquipment] = useState(() => member?.equipment ?? [])
  const [timeOffUpcoming, setTimeOffUpcoming] = useState(() => member?.timeOff.upcoming ?? [])
  const [permissions, setPermissions] = useState<Permission[]>(() => member?.permissions ?? [])

  if (!member) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 14, marginBottom: 10 }}>Team member not found.</div>
        <Link href="/admin/team" className="ih-btn ih-btn-accent ih-btn-sm" style={{ textDecoration: "none" }}>
          <Icon name="chevronLeft" size={11} /> Back to team
        </Link>
      </div>
    )
  }

  /* derived ---------------------------------------------------------------- */
  const liveMember: TeamMember = {
    ...member, skills, goals, documents, equipment, permissions,
    timeOff: { ...member.timeOff, upcoming: timeOffUpcoming },
  }
  const lastWord = member.name.split(" ").slice(-1)[0]
  const rest = member.name.split(" ").slice(0, -1).join(" ")

  function openEmail() {
    setEmailDraft({
      to: member!.email,
      subject: `Catching up · ${member!.name.split(" ")[0]}`,
      body: `Hi ${member!.name.split(" ")[0]},\n\n`,
    })
  }
  function onSchedule() {
    setToast({ message: `Booking pre-filled · 1:1 with ${member!.name}`, tone: "info" })
  }
  function onRecognise() {
    setToast({ message: `Recognition sent to ${member!.name}`, tone: "ok" })
  }
  function onFeedback() {
    setToast({ message: `Feedback form sent to ${member!.name}`, tone: "info" })
  }

  /* mutations -------------------------------------------------------------- */
  function addSkill(s: { name: string; group: string; level: string }) {
    setSkills(prev => [...prev, { name: s.name, group: s.group, level: (Math.max(1, Math.min(5, Number(s.level))) || 3) as 1 | 2 | 3 | 4 | 5, verifiedAt: null }])
    setToast({ message: `Skill added · ${s.name}`, tone: "ok" })
  }
  function addGoal(g: { title: string; dueAt: string }) {
    setGoals(prev => [...prev, { id: `g-new-${prev.length + 1}`, title: g.title, status: "ON_TRACK", progress: 0, dueAt: g.dueAt }])
    setToast({ message: `Goal added · ${g.title}`, tone: "ok" })
  }
  function uploadDoc(d: { name: string; type: string }) {
    setDocuments(prev => [...prev, { id: `d${prev.length + 1}`, name: d.name, type: d.type as Document["type"], uploadedAt: "May 2026", expiresAt: null, expiringSoon: false }])
    setToast({ message: `Uploaded · ${d.name}`, tone: "ok" })
  }
  function assignEquipment(e: { type: string; model: string }) {
    setEquipment(prev => [...prev, { id: `e${prev.length + 1}`, type: e.type as Equipment["type"], model: e.model, assignedAt: "May 2026", status: "ACTIVE" }])
    setToast({ message: `Equipment assigned · ${e.model}`, tone: "ok" })
  }
  function requestTimeOff(p: { from: string; to: string; reason: string }) {
    setTimeOffUpcoming(prev => [...prev, { ...p, days: 1 }])
    setToast({ message: `Time-off request submitted · ${p.from} → ${p.to}`, tone: "info" })
  }
  function updatePermission(module: string, level: PermissionLevel) {
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.module === module)
      if (idx === -1) return [...prev, { module, level }]
      const next = [...prev]
      next[idx] = { module, level }
      return next
    })
    setToast({ message: `Permission updated · ${module} → ${level}`, tone: "ok" })
  }

  const TABS: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "overview",    label: "Overview" },
    { id: "capacity",    label: "Capacity & assignments", count: liveMember.assignments.length },
    { id: "skills",      label: "Skills & certifications", count: liveMember.skills.length },
    { id: "performance", label: "Performance", count: liveMember.reviews.length },
    { id: "timeoff",     label: "Time off" },
    { id: "hierarchy",   label: "Hierarchy", count: liveMember.directReports.length },
    { id: "documents",   label: "Documents", count: documents.length },
    { id: "equipment",   label: "Equipment", count: equipment.length },
    { id: "permissions", label: "Permissions" },
    { id: "audit",       label: "Audit" },
  ]

  const statusMeta = STATUS_META[member.status]

  return (
    <div style={{ margin: "-24px -24px" }}>
      {/* Header band */}
      <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--ih-line)", background: "var(--ih-bg)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <Link href="/admin/team" className="ih-btn ih-btn-quiet ih-btn-sm" style={{ padding: "2px 6px", textDecoration: "none" }}>
            <Icon name="chevronLeft" size={12} /> Team
          </Link>
          <span className="ih-eyebrow">/{member.id} · member</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
            <div className="ih-avatar" style={{ width: 88, height: 88, borderRadius: 16, fontSize: 30, background: "var(--ih-surface-2)", color: "var(--ih-ink)", fontFamily: "var(--ih-font-serif)", fontStyle: "italic" }}>
              {member.initials}
            </div>
            <div>
              <h1 className="ih-serif" style={{ margin: 0, fontSize: 38, lineHeight: 1 }}>
                {rest}{rest && " "}<span className="ih-italic-red">{lastWord}</span>
              </h1>
              <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--ih-ink-65)" }}>{member.title} · {member.department}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className={`ih-pill ${statusMeta.tone !== "muted" ? `ih-pill-${statusMeta.tone}` : ""}`} style={{ fontSize: 9 }}>{statusMeta.label}</span>
                <span className="ih-pill ih-mono" style={{ fontSize: 9 }}>{member.level}</span>
                <span className="ih-pill" style={{ fontSize: 9 }}>{member.employment.type}</span>
                <span className="ih-pill" style={{ fontSize: 9 }}>{member.employment.tenureLabel}</span>
                {member.manager && (
                  <Link href={`/admin/team/${member.manager.id}`} className="ih-pill" style={{ fontSize: 9, textDecoration: "none", color: "var(--ih-ink-65)" }}>
                    reports to {member.manager.name}
                  </Link>
                )}
                {member.tags.map(t => <span key={t} className="ih-pill" style={{ fontSize: 9, textTransform: "lowercase" }}>#{t}</span>)}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 11.5, color: "var(--ih-ink-50)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="mail" size={10} /> {member.email}</span>
                <span className="ih-mono" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="phone" size={10} /> {member.phone}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="building" size={10} /> {member.location}</span>
                <span className="ih-mono" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={10} /> {member.timezone}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={openEmail}>
              <Icon name="mail" size={11} /> Email
            </button>
            <button className="ih-btn ih-btn-ghost ih-btn-sm" onClick={() => setToast({ message: `Calling ${member.phone} …`, tone: "info" })}>
              <Icon name="phone" size={11} /> Call
            </button>
            <button className="ih-btn ih-btn-accent ih-btn-sm" onClick={onSchedule}>
              <Icon name="calendar" size={11} /> Schedule 1:1
            </button>
            <Popover align="right" width={200} trigger={
              <button className="ih-btn ih-btn-quiet ih-btn-icon" style={{ height: 30, width: 30 }}>
                <Icon name="moreH" size={12} />
              </button>
            }>{(close) => (
              <>
                <PopoverHeader>Profile</PopoverHeader>
                <PopoverItem onClick={() => { setToast({ message: "Profile edit form opened …", tone: "info" }); close() }}>Edit profile</PopoverItem>
                <PopoverItem onClick={() => { setTab("permissions"); close() }}>Adjust permissions</PopoverItem>
                <PopoverItem onClick={() => { onRecognise(); close() }}>Send recognition</PopoverItem>
                <div style={{ height: 1, background: "var(--ih-line)", margin: "4px 0" }} />
                <PopoverItem onClick={() => { setToast({ message: `${member.name} marked on leave`, tone: "warn" }); close() }}>Mark on leave</PopoverItem>
                <PopoverItem danger onClick={() => { setArchiveOpen(true); close() }}>Archive member</PopoverItem>
              </>
            )}</Popover>
          </div>
        </div>
      </div>

      {/* Top stat row */}
      <div style={{ padding: "14px 28px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "var(--ih-line)", borderBottom: "1px solid var(--ih-line)" }}>
        {[
          { label: "Utilization",        v: `${member.capacity.utilizationPct}%`, sub: "this week",               tone: member.capacity.utilizationPct >= 90 ? "var(--ih-danger)" : "var(--ih-ok)" },
          { label: "Billable hours",      v: `${member.capacity.billableHoursThisWeek}h`, sub: "of " + member.capacity.weeklyHoursTarget + "h target", tone: "var(--ih-ink)" },
          { label: "Active engagements",  v: String(member.assignments.length),  sub: "in flight",               tone: "var(--ih-ink)" },
          { label: "PTO balance",         v: `${member.capacity.ptoBalanceDays}d`, sub: `${member.timeOff.used}d used this year`, tone: "var(--ih-ink)" },
          { label: "Direct reports",      v: String(member.directReports.length), sub: member.directReports.length ? "team size" : "none",            tone: member.directReports.length ? "var(--ih-ink)" : "var(--ih-ink-50)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--ih-bg)", padding: "12px 16px" }}>
            <div className="ih-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{s.label}</div>
            <div className="ih-serif ih-num" style={{ fontSize: 28, lineHeight: 1, color: s.tone }}>{s.v}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 28px", display: "flex", gap: 0, borderBottom: "1px solid var(--ih-line)", background: "var(--ih-bg)", position: "sticky", top: 0, zIndex: 2, overflowX: "auto" }} className="scrollbar-thin">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: 0, padding: "12px 14px", fontSize: 12.5,
            color: tab === t.id ? "var(--ih-ink)" : "var(--ih-ink-50)",
            fontWeight: tab === t.id ? 500 : 400, cursor: "pointer",
            borderBottom: tab === t.id ? "2px solid var(--ih-accent)" : "2px solid transparent",
            marginBottom: -1, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Body — main content + right rail */}
      <div style={{ padding: "24px 28px 48px", display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "overview"    && <OverviewTab    m={liveMember} onEmail={openEmail} onSchedule={onSchedule} />}
          {tab === "capacity"    && <CapacityTab    m={liveMember} />}
          {tab === "skills"      && <SkillsTab      m={liveMember} onAddSkill={addSkill} onToastInfo={msg => setToast({ message: msg, tone: "info" })} />}
          {tab === "performance" && <PerformanceTab m={liveMember} goals={goals} onAddGoal={addGoal} onToastInfo={msg => setToast({ message: msg, tone: "info" })} />}
          {tab === "timeoff"     && <TimeOffTab     m={liveMember} onRequest={requestTimeOff} onToastInfo={msg => setToast({ message: msg, tone: "warn" })} />}
          {tab === "hierarchy"   && <HierarchyTab   m={liveMember} />}
          {tab === "documents"   && <DocumentsTab   m={liveMember} documents={documents} onUpload={uploadDoc} />}
          {tab === "equipment"   && <EquipmentTab   m={liveMember} onAssign={assignEquipment} />}
          {tab === "permissions" && <PermissionsTab permissions={permissions} onChange={updatePermission} />}
          {tab === "audit"       && <AuditTab       m={liveMember} />}
        </div>

        <RightRail m={liveMember} onEmail={openEmail} onSchedule={onSchedule} onRecognise={onRecognise} onFeedback={onFeedback} />
      </div>

      {/* Email dialog */}
      {emailDraft && (
        <EmailDraftDialog
          open
          onClose={() => setEmailDraft(null)}
          to={emailDraft.to}
          subject={emailDraft.subject}
          body={emailDraft.body}
          onSend={() => { setToast({ message: `Email sent to ${emailDraft.to}`, tone: "ok" }); setEmailDraft(null) }}
        />
      )}

      {/* Archive confirm */}
      <ConfirmDialog
        open={archiveOpen}
        title={`Archive ${member.name}?`}
        description="The member will be hidden from active lists but retained for audit. You can restore later from settings."
        confirmLabel="Archive"
        confirmTone="danger"
        onConfirm={() => { setToast({ message: `Archived ${member.name}`, tone: "warn" }); setArchiveOpen(false); router.push("/admin/team") }}
        onCancel={() => setArchiveOpen(false)}
      />

      {toast && <NotificationToast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  )
}

/* Type alias for compactness inside file. */
type Equipment = TeamMember["equipment"][number]
