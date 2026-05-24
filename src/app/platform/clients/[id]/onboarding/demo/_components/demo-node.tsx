"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Folder, Minus, Plus } from "lucide-react"
import type {
  AuditFlag,
  Density,
  DemoNode as DemoNodeType,
  FormStatus,
  InterviewStatus,
  LayoutDirection,
  Overlay,
} from "./types"
import type { NodeAggregates } from "./aggregates"

export interface DemoNodeData {
  node: DemoNodeType
  overlay: Overlay
  isSelected: boolean
  isFocused: boolean
  density?: Density
  direction?: LayoutDirection
  isCollapsed?: boolean
  hiddenCount?: number
  hasChildren?: boolean
  aggregates?: NodeAggregates
}

const AVATAR_PALETTE: Record<string, { bg: string; fg: string }> = {
  indigo:  { bg: "#3F4A8A", fg: "#FFFFFF" },
  amber:   { bg: "#B8860B", fg: "#FFFFFF" },
  rose:    { bg: "#B05670", fg: "#FFFFFF" },
  teal:    { bg: "#357C7A", fg: "#FFFFFF" },
  emerald: { bg: "#2F6F5C", fg: "#FFFFFF" },
  violet:  { bg: "#6A4C8A", fg: "#FFFFFF" },
  sky:     { bg: "#2A5DBF", fg: "#FFFFFF" },
  stone:   { bg: "#6A6258", fg: "#FFFFFF" },
}

function avatarColors(key: string | null): { bg: string; fg: string } {
  if (key && AVATAR_PALETTE[key]) return AVATAR_PALETTE[key]
  return AVATAR_PALETTE.stone!
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

const AUDIT_CHIP: Record<AuditFlag, { bg: string; fg: string; border: string; label: string }> = {
  DPO:            { bg: "rgba(192,57,43,0.10)",  fg: "var(--ih-danger)", border: "rgba(192,57,43,0.30)",  label: "DPO" },
  FINANCE_OWNER:  { bg: "rgba(184,134,11,0.10)", fg: "var(--ih-warn)",   border: "rgba(184,134,11,0.30)", label: "FIN" },
  DATA_OWNER:     { bg: "rgba(42,93,191,0.10)",  fg: "var(--ih-info)",   border: "rgba(42,93,191,0.30)",  label: "DATA" },
  SECURITY_OWNER: { bg: "rgba(106,76,138,0.10)", fg: "#6A4C8A",          border: "rgba(106,76,138,0.30)", label: "SEC" },
  DECISION_MAKER: { bg: "var(--ih-surface-2)",   fg: "var(--ih-ink)",    border: "var(--ih-line-2)",      label: "DM" },
  FOUNDER:        { bg: "transparent",           fg: "var(--ih-ink-65)", border: "var(--ih-line-3)",      label: "FNDR" },
  PROCESS_OWNER:  { bg: "var(--ih-surface-2)",   fg: "var(--ih-ink-65)", border: "var(--ih-line-2)",      label: "PROC" },
}

function interviewDotColor(s: InterviewStatus): string | null {
  if (s === "COMPLETED") return "var(--ih-ok)"
  if (s === "SCHEDULED" || s === "INVITED") return "var(--ih-warn)"
  if (s === "TARGET") return "var(--ih-info)"
  if (s === "DECLINED") return "var(--ih-danger)"
  return null
}

function formDotColor(s: FormStatus): string | null {
  if (s === "COMPLETED") return "var(--ih-ok)"
  if (s === "IN_PROGRESS" || s === "OPENED") return "var(--ih-warn)"
  if (s === "SENT") return "var(--ih-info)"
  return null
}

function overlayTint(
  node: DemoNodeType,
  overlay: Overlay,
  aggregates?: NodeAggregates,
): { color: string | null; tint: string | null } {
  if (overlay === "NONE" || overlay === "REPORTING_DEPTH") return { color: null, tint: null }

  // For non-leaf branches, fold the descendant aggregate into "best of (self,
  // descendants)" so parents reflect the strongest state below them. A team
  // with one scheduled interview lights up the whole department.
  if (overlay === "INTERVIEW_COVERAGE") {
    const s = node.interviewStatus
    const completed = s === "COMPLETED" || aggregates?.hasInterviewCompleted
    const scheduled = s === "SCHEDULED" || s === "INVITED" || aggregates?.hasInterviewScheduled
    const target    = s === "TARGET"    || aggregates?.hasInterviewTarget
    if (completed) return { color: "var(--ih-ok)",   tint: "rgba(47,111,92,0.06)" }
    if (scheduled) return { color: "var(--ih-warn)", tint: "rgba(184,134,11,0.06)" }
    if (target)    return { color: "var(--ih-info)", tint: "rgba(42,93,191,0.06)" }
    return { color: "var(--ih-ink-30)", tint: null }
  }
  if (overlay === "FORM_STATUS") {
    const s = node.formStatus
    const completed = s === "COMPLETED" || aggregates?.hasFormCompleted
    const inProg    = s === "IN_PROGRESS" || s === "OPENED" || aggregates?.hasFormInProgress
    const sent      = s === "SENT" || aggregates?.hasFormSent
    if (completed) return { color: "var(--ih-ok)",   tint: "rgba(47,111,92,0.06)" }
    if (inProg)    return { color: "var(--ih-warn)", tint: "rgba(184,134,11,0.06)" }
    if (sent)      return { color: "var(--ih-info)", tint: "rgba(42,93,191,0.06)" }
    return { color: "var(--ih-ink-30)", tint: null }
  }
  if (overlay === "AUDIT_CRITICAL") {
    if (node.auditFlags.length > 0 || aggregates?.hasAuditCritical) {
      return { color: "var(--ih-accent)", tint: "var(--ih-accent-soft)" }
    }
    return { color: "var(--ih-ink-30)", tint: null }
  }
  if (overlay === "TENURE") {
    const t = node.tenureYears ?? 0
    if (t <= 0) return { color: "var(--ih-ink-30)", tint: null }
    const sat = Math.min(1, t / 6)
    return {
      color: `rgba(42,93,191,${0.35 + 0.55 * sat})`,
      tint: `rgba(42,93,191,${0.04 + 0.06 * sat})`,
    }
  }
  return { color: null, tint: null }
}

function DemoNodeImpl({ data }: NodeProps<DemoNodeData>) {
  const { node, overlay, isSelected, isFocused, density = "COMPACT", direction = "TB", isCollapsed = false, hasChildren = false, aggregates } = data
  // overlayTint reads aggregates so parents reflect "any descendant has X".
  // Always use the subtree person-count from aggregates instead of direct
  // children count. Falls back to 0 if aggregates haven't been computed yet.
  const peopleUnderneath = aggregates ? aggregates.descendantPersonCount - ((node.kind === "PERSON" || node.kind === "CONTRACTOR" || node.kind === "ADVISOR" || node.kind === "VACANCY") ? 1 : 0) : 0
  const tint = overlayTint(node, overlay, aggregates)
  const isPerson = node.kind === "PERSON" || node.kind === "CONTRACTOR" || node.kind === "ADVISOR" || node.kind === "EXTERNAL"
  const isCompact = density === "COMPACT" || density === "COLLAPSED"
  const isLR = direction === "LR"

  // Split into long-form border properties so applying an overlay-coloured
  // borderLeft doesn't clash with the `border` shorthand (React warns when
  // shorthand + longhand are set on the same style object).
  const borderColor = isSelected
    ? "var(--ih-accent)"
    : node.kind === "VACANCY"
      ? "var(--ih-warn)"
      : "var(--ih-line)"
  const borderStyle = node.kind === "VACANCY" ? "dashed" : "solid"
  const borderWidth = node.kind === "VACANCY" ? "1.5px" : "1px"

  const shadow = isSelected
    ? "0 0 0 2px color-mix(in srgb, var(--ih-accent) 25%, transparent)"
    : "0 1px 0 rgba(0,0,0,0.02)"

  const bg =
    node.kind === "ORG"
      ? "color-mix(in srgb, var(--ih-accent) 6%, var(--ih-surface))"
      : node.kind === "VACANCY"
        ? "color-mix(in srgb, var(--ih-warn) 4%, var(--ih-surface))"
        : tint.tint ?? "var(--ih-surface)"

  const leftBorder = tint.color
    ? { borderLeftStyle: "solid" as const, borderLeftColor: tint.color, borderLeftWidth: "4px" }
    : { borderLeftStyle: borderStyle as React.CSSProperties["borderLeftStyle"], borderLeftColor: borderColor, borderLeftWidth: borderWidth }

  const baseStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 8,
    background: bg,
    borderTopStyle: borderStyle as React.CSSProperties["borderTopStyle"],
    borderTopColor: borderColor,
    borderTopWidth: borderWidth,
    borderRightStyle: borderStyle as React.CSSProperties["borderRightStyle"],
    borderRightColor: borderColor,
    borderRightWidth: borderWidth,
    borderBottomStyle: borderStyle as React.CSSProperties["borderBottomStyle"],
    borderBottomColor: borderColor,
    borderBottomWidth: borderWidth,
    ...leftBorder,
    boxShadow: shadow,
    padding: node.kind === "ORG" ? (isCompact ? "10px 14px" : "14px 18px") : isCompact ? "6px 10px" : "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: isCompact ? 2 : 4,
    fontFamily: "var(--ih-font-sans)",
    // No overflow clipping here — the +/− toggle deliberately sits outside the
    // node's bounding box. Inner text spans handle their own ellipsis.
  }

  return (
    <div
      data-demo-node
      data-focused={isFocused ? "true" : undefined}
      className={isFocused ? "ih-demo-node-focused" : undefined}
      style={baseStyle}
    >
      <Handle type="target" position={isLR ? Position.Left : Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      {node.kind === "BUNDLE" ? (
        <BundleBody node={node} compact={isCompact} isCollapsed={isCollapsed} />
      ) : (
        <>
          {node.kind === "ORG" && <OrgBody node={node} compact={isCompact} peopleCount={peopleUnderneath} aggregates={aggregates} />}
          {node.kind === "DEPARTMENT" && <DeptBody node={node} compact={isCompact} peopleCount={peopleUnderneath} aggregates={aggregates} />}
          {isPerson && <PersonBody node={node} compact={isCompact} peopleCount={peopleUnderneath} aggregates={aggregates} isCollapsed={isCollapsed} />}
          {node.kind === "VACANCY" && <VacancyBody node={node} compact={isCompact} />}
        </>
      )}
      {/* Per-node +/- toggle when this branch has descendants */}
      {hasChildren && node.kind !== "BUNDLE" && <CollapseToggle isCollapsed={isCollapsed} />}
      <Handle type="source" position={isLR ? Position.Right : Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  )
}

function CollapseToggle({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <button
      data-expand
      type="button"
      aria-label={isCollapsed ? "Expand children" : "Collapse children"}
      title={isCollapsed ? "Expand children" : "Collapse children"}
      style={{
        position: "absolute",
        top: -10,
        right: -10,
        width: 22,
        height: 22,
        borderRadius: 999,
        border: "1px solid var(--ih-line-2)",
        background: "var(--ih-surface)",
        color: isCollapsed ? "var(--ih-accent)" : "var(--ih-ink-65)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        // High z so the chip sits above neighbouring nodes / edges / overlays.
        zIndex: 1000,
      }}
    >
      {isCollapsed ? <Plus size={12} /> : <Minus size={12} />}
    </button>
  )
}

function BundleBody({ node, compact, isCollapsed }: { node: DemoNodeType; compact: boolean; isCollapsed: boolean }) {
  const count = node.bundleMemberIds?.length ?? node.headcount ?? 0
  const title = node.title ?? "—"
  // Cap at 3 avatars so the role title has room and never truncates.
  const previewCount = Math.min(3, count)
  const overflow = count - previewCount
  const { bg, fg } = avatarColors(node.avatarColor)

  // EXPANDED view: bundle remains as a simple "header" card; the members
  // render as its children below. Click it (or the −) to re-collapse.
  if (!isCollapsed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          height: "100%",
          minWidth: 0,
          cursor: "pointer",
        }}
        title={`Click to regroup ${count} × ${title}`}
      >
        <span
          style={{
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            borderRadius: 5,
            background: "color-mix(in srgb, var(--ih-accent) 12%, transparent)",
            color: "var(--ih-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
          aria-hidden
        >
          ⋯
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 1 }}>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: "var(--ih-ink)", overflowWrap: "anywhere" }}>
            {title}
          </div>
          <div className="ih-mono" style={{ fontSize: compact ? 9.5 : 10, color: "var(--ih-ink-50)", letterSpacing: "0.04em" }}>
            {count} people · click to regroup
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: "100%",
        minWidth: 0,
        cursor: "pointer",
      }}
      title={`Click to expand ${count} × ${title}`}
    >
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {Array.from({ length: previewCount }).map((_, i) => (
          <span
            key={i}
            style={{
              width: compact ? 22 : 28,
              height: compact ? 22 : 28,
              borderRadius: "50%",
              background: bg,
              color: fg,
              border: "2px solid var(--ih-surface)",
              marginLeft: i === 0 ? 0 : -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? 9 : 10,
              fontWeight: 600,
              opacity: 1 - i * 0.15,
            }}
          >
            {i === 0 ? "✦" : ""}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className="ih-mono"
            style={{
              width: compact ? 22 : 28,
              height: compact ? 22 : 28,
              borderRadius: "50%",
              background: "var(--ih-surface-2)",
              color: "var(--ih-ink-65)",
              border: "2px solid var(--ih-surface)",
              marginLeft: -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? 9 : 10,
              fontWeight: 600,
            }}
          >
            +{overflow}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 2 }}>
        <div style={{ fontSize: compact ? 12.5 : 14, fontWeight: 600, color: "var(--ih-ink)", overflowWrap: "anywhere" }}>
          {title}
        </div>
        <div className="ih-mono" style={{ fontSize: compact ? 9.5 : 10.5, color: "var(--ih-ink-50)", letterSpacing: "0.04em" }}>
          {count} people · click to expand
        </div>
      </div>
    </div>
  )
}

/** Compact pill showing the count of person-like descendants. */
function PeopleCount({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null
  return (
    <span
      className="ih-mono"
      style={{
        padding: "1px 6px",
        borderRadius: 999,
        fontSize: 10,
        letterSpacing: "0.04em",
        color: "var(--ih-ink-65)",
        background: "var(--ih-surface-2)",
        border: "1px solid var(--ih-line)",
        flexShrink: 0,
      }}
      title={label ? `${count} ${label}` : `${count} people in this branch`}
    >
      {count}
    </span>
  )
}

/** Aggregated-status dots for collapsed parents — surface child state. */
function AggregateStatusDots({ aggregates }: { aggregates?: NodeAggregates }) {
  if (!aggregates) return null
  const dots: Array<{ key: string; color: string; title: string }> = []
  if (aggregates.hasInterviewCompleted) {
    dots.push({ key: "iv-done", color: "var(--ih-ok)", title: "Has interviews completed below" })
  } else if (aggregates.hasInterviewScheduled) {
    dots.push({ key: "iv-sched", color: "var(--ih-warn)", title: "Has interviews scheduled below" })
  } else if (aggregates.hasInterviewTarget) {
    dots.push({ key: "iv-target", color: "var(--ih-info)", title: "Has interview targets below" })
  }
  if (aggregates.hasFormCompleted) {
    dots.push({ key: "fm-done", color: "var(--ih-ok)", title: "Has questionnaires completed below" })
  } else if (aggregates.hasFormInProgress) {
    dots.push({ key: "fm-prog", color: "var(--ih-warn)", title: "Has questionnaires in progress below" })
  } else if (aggregates.hasFormSent) {
    dots.push({ key: "fm-sent", color: "var(--ih-info)", title: "Has questionnaires sent below" })
  }
  if (aggregates.hasAuditCritical) {
    dots.push({ key: "audit", color: "var(--ih-accent)", title: "Has audit-critical people below" })
  }
  if (dots.length === 0) return null
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      {dots.map((d) => (
        <span
          key={d.key}
          title={d.title}
          style={{ width: 6, height: 6, borderRadius: "50%", background: d.color, display: "inline-block" }}
        />
      ))}
    </span>
  )
}

function OrgBody({ node, compact, peopleCount, aggregates }: { node: DemoNodeType; compact: boolean; peopleCount: number; aggregates?: NodeAggregates }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--ih-font-serif)", fontSize: compact ? 16 : 20, lineHeight: 1.1, color: "var(--ih-ink)", overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>
          {node.name}
        </span>
        <PeopleCount count={peopleCount} label="people" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {node.location && <span style={{ fontSize: compact ? 10 : 11, color: "var(--ih-ink-50)" }}>{node.location}</span>}
        <AggregateStatusDots aggregates={aggregates} />
      </div>
    </div>
  )
}

function DeptBody({ node, compact, peopleCount, aggregates }: { node: DemoNodeType; compact: boolean; peopleCount: number; aggregates?: NodeAggregates }) {
  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, height: "100%", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--ih-surface-2)", color: "var(--ih-ink-65)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Folder size={10} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ih-ink)", overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>
            {node.name}
          </span>
          <PeopleCount count={peopleCount} label="people" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", minHeight: 10 }}>
          <AggregateStatusDots aggregates={aggregates} />
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ih-ink-40)" }}>Department</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--ih-surface-2)", color: "var(--ih-ink-65)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Folder size={12} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ih-ink)", overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>
          {node.name}
        </span>
        <PeopleCount count={peopleCount} label="people" />
        <AggregateStatusDots aggregates={aggregates} />
      </div>
    </div>
  )
}

function Dot({ color, title }: { color: string; title?: string }) {
  return <span title={title} style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
}

function PersonBody({ node, compact, peopleCount, aggregates, isCollapsed = false }: { node: DemoNodeType; compact: boolean; peopleCount: number; aggregates?: NodeAggregates; isCollapsed?: boolean }) {
  const { bg, fg } = avatarColors(node.avatarColor)
  const iDot = interviewDotColor(node.interviewStatus)
  const fDot = formDotColor(node.formStatus)
  const visible = node.auditFlags.slice(0, 1)
  const overflow = node.auditFlags.length - visible.length
  const tag = node.kind === "CONTRACTOR" && node.isFractional ? "Fractional" : node.kind === "ADVISOR" ? "Advisor" : null

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%", minWidth: 0 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.02em", flexShrink: 0 }}>
          {initials(node.name)}
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ih-ink)", lineHeight: 1.15, overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>{node.name}</span>
            {iDot && <Dot color={iDot} title={`Interview: ${node.interviewStatus}`} />}
            {fDot && <Dot color={fDot} title={`Form: ${node.formStatus}`} />}
          </div>
          {node.title && (
            <div style={{ fontSize: 10.5, color: "var(--ih-ink-65)", lineHeight: 1.15, overflowWrap: "anywhere" }}>
              {node.title}
              {tag && <span style={{ marginLeft: 6, color: "var(--ih-ink-40)" }}>· {tag}</span>}
            </div>
          )}
        </div>
        {/* Right cluster — original horizontal flow: audit chip · people count · aggregated dots */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {visible.length > 0 && (
            <span className="ih-mono" title={visible[0]} style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", padding: "1px 4px", borderRadius: 3, background: AUDIT_CHIP[visible[0]!].bg, color: AUDIT_CHIP[visible[0]!].fg, border: `1px solid ${AUDIT_CHIP[visible[0]!].border}`, lineHeight: 1.4 }}>
              {AUDIT_CHIP[visible[0]!].label}
              {overflow > 0 && `+${overflow}`}
            </span>
          )}
          {peopleCount > 0 && <PeopleCount count={peopleCount} label="reports" />}
          {isCollapsed && <AggregateStatusDots aggregates={aggregates} />}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", flexShrink: 0, fontFamily: "var(--ih-font-sans)" }}>
          {initials(node.name)}
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ih-ink)", lineHeight: 1.15, overflowWrap: "anywhere" }}>{node.name}</div>
          {node.title && (
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)", lineHeight: 1.2, overflowWrap: "anywhere" }}>{node.title}</div>
          )}
        </div>
        {tag && (
          <span className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, border: "1px solid var(--ih-line-2)", color: "var(--ih-ink-65)", background: "var(--ih-surface-2)", flexShrink: 0 }}>
            {tag}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", minHeight: 14, flexWrap: "nowrap", overflow: "hidden" }}>
        {iDot && <Dot color={iDot} title={`Interview: ${node.interviewStatus}`} />}
        {fDot && <Dot color={fDot} title={`Form: ${node.formStatus}`} />}
        {visible.map((flag) => {
          const chip = AUDIT_CHIP[flag]
          return (
            <span key={flag} className="ih-mono" title={flag} style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", padding: "1px 5px", borderRadius: 3, background: chip.bg, color: chip.fg, border: `1px solid ${chip.border}`, lineHeight: 1.4, flexShrink: 0 }}>
              {chip.label}
            </span>
          )
        })}
        {overflow > 0 && (
          <span className="ih-mono" style={{ fontSize: 8, letterSpacing: "0.08em", color: "var(--ih-ink-50)", padding: "1px 5px", borderRadius: 3, background: "var(--ih-surface-2)", border: "1px solid var(--ih-line)", flexShrink: 0 }}>
            +{overflow}
          </span>
        )}
        {peopleCount > 0 && <PeopleCount count={peopleCount} label="reports" />}
        {isCollapsed && <AggregateStatusDots aggregates={aggregates} />}
      </div>
    </div>
  )
}

function VacancyBody({ node, compact }: { node: DemoNodeType; compact: boolean }) {
  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ih-warn-soft)", color: "var(--ih-warn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", flexShrink: 0 }}>
          ?
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, fontStyle: "italic", color: "var(--ih-ink)", overflowWrap: "anywhere" }}>
            {node.title ?? node.name}
          </div>
          <div className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--ih-warn)" }}>Vacancy</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ih-warn)" }}>Open role</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ih-ink)", fontStyle: "italic", lineHeight: 1.2, overflowWrap: "anywhere" }}>
        {node.title ?? node.name}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <span className="ih-mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, background: "var(--ih-warn-soft)", color: "var(--ih-warn)", border: "1px solid rgba(184,134,11,0.30)" }}>
          Vacancy
        </span>
      </div>
    </div>
  )
}

export default memo(DemoNodeImpl)
