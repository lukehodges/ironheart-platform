"use client"

/**
 * Live-data port of the demo shell. Mounts at
 * /platform/clients/[id]/onboarding (consultant view). Uses the demo's pure
 * presentation components for the chart canvas + floating overlays + drill
 * breadcrumb + legend, but feeds them DemoNode-shaped data adapted from the
 * live OrgChartTree (see ./adapter.ts).
 *
 * Mutations route through the new tRPC procs:
 *   onboarding.seedChart        (Seed from tier)
 *   onboarding.approvePlan      (via existing PlanPreviewModal)
 *   onboarding.setInterviewStatus / setFormStatus from the overlay drawers
 *   onboarding.* via OnboardingInspector
 *
 * Deferred (visible "★ pending" placeholders that toast "coming soon"):
 *   - AI suggestions drawer
 *   - Cmd-K command palette (Add node)
 *   - Bulk import sheet (CSV / paste)
 *   - Google / HRIS sync
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Activity, Plus, Sparkles, Upload } from "lucide-react"
import { ReactFlowProvider } from "reactflow"
import { api } from "@/lib/trpc/react"
import DemoGraph, { type DemoGraphViewportApi } from "../demo/_components/demo-graph"
import { DemoToolbar } from "../demo/_components/demo-toolbar"
import { DrillBreadcrumb } from "../demo/_components/drill-breadcrumb"
import { FloatingOverlayMenu } from "../demo/_components/floating-overlay-menu"
import { FloatingLegend } from "../demo/_components/floating-legend"
import { SlideDrawer } from "../demo/_components/floating-suggestions"
import { bundleSiblings, normaliseTitle } from "../demo/_components/bundle"
import { computeAggregates } from "../demo/_components/aggregates"
import { computeStats } from "../demo/_components/lib"
import type { DemoNode, LayoutDirection, Overlay } from "../demo/_components/types"

import { OnboardingSplash } from "./onboarding-splash"
import { OnboardingInspector } from "./onboarding-inspector"
import { Shortlist, FormsList, AuditList } from "./overlay-lists"
import { flattenChart, findRow } from "./adapter"
import { PlanPreviewModal } from "@/components/onboarding/plan-preview-modal"
import { ActivityFeed } from "@/components/onboarding/activity-feed"

interface OnboardingShellProps {
  engagementId: string
  engagementTitle: string
  companyLabel: string
  clientTenantProvisioned: boolean
}

export function OnboardingShell({
  engagementId,
  engagementTitle,
  companyLabel,
  clientTenantProvisioned,
}: OnboardingShellProps) {
  const utils = api.useUtils()
  const chartQuery = api.onboarding.getChart.useQuery({ engagementId })
  const seedMutation = api.onboarding.seedChart.useMutation({
    onSuccess: () => utils.onboarding.getChart.invalidate({ engagementId }),
  })

  // shell-state
  const [view, setView] = useState<"splash" | "chart">("chart")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>("NONE")
  const [direction, setDirection] = useState<LayoutDirection>("LR")
  const [bundleRoles, setBundleRoles] = useState(true)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [initialDepth, setInitialDepth] = useState(1)
  const [focusSubtreeId, setFocusSubtreeId] = useState<string | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const revealSnapshotRef = useRef<{
    collapsedIds: Set<string>
    initialDepth: number
    focusSubtreeId: string | null
    viewport: { x: number; y: number; zoom: number } | null
  } | null>(null)
  const viewportApiRef = useRef<DemoGraphViewportApi | null>(null)

  // live-data → demo-shape
  const tree = chartQuery.data ?? []
  const nodes = useMemo<DemoNode[]>(() => flattenChart(tree), [tree])
  const isEmpty = nodes.length === 0

  // Switch to splash automatically when the chart is empty.
  useEffect(() => {
    if (chartQuery.isLoading) return
    if (isEmpty) setView("splash")
    else if (view === "splash") setView("chart")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty, chartQuery.isLoading])

  const graphNodes = useMemo(() => bundleSiblings(nodes, { enabled: bundleRoles }), [nodes, bundleRoles])
  const aggregates = useMemo(() => computeAggregates(nodes), [nodes])
  const stats = useMemo(() => computeStats(nodes), [nodes])

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null
  const selectedRow = selectedId ? findRow(tree, selectedId) : null

  // helpers
  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }, [])

  const handleSelect = useCallback((id: string) => {
    if (id.startsWith("bundle__")) {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }
    setSelectedId(id)
  }, [])

  const revealPath = useCallback(
    (targetId: string) => {
      const byId = new Map(nodes.map((n) => [n.id, n]))
      const hasKids = new Set<string>()
      for (const n of nodes) if (n.parentId) hasKids.add(n.parentId)
      const target = byId.get(targetId)
      if (!target) return
      if (!revealSnapshotRef.current) {
        revealSnapshotRef.current = {
          collapsedIds: new Set(collapsedIds),
          initialDepth,
          focusSubtreeId,
          viewport: viewportApiRef.current?.snapshot() ?? null,
        }
      }
      const chain: string[] = []
      let cur: DemoNode | undefined = target
      while (cur && cur.parentId) {
        chain.unshift(cur.parentId)
        const next = byId.get(cur.parentId)
        if (!next) break
        cur = next
      }
      const depthOf = new Map<string, number>()
      for (let i = 0; i < chain.length; i++) depthOf.set(chain[i]!, i)
      depthOf.set(target.id, chain.length)
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        for (const id of chain) {
          if (!hasKids.has(id)) continue
          const d = depthOf.get(id) ?? 0
          const defaultCollapsed = d >= initialDepth
          if (defaultCollapsed) next.add(id)
          else next.delete(id)
        }
        return next
      })
      if (bundleRoles && target.parentId && target.title) {
        const bundleId = `bundle__${target.parentId}__${normaliseTitle(target.title)}`
        setCollapsedIds((prev) => {
          if (prev.has(bundleId)) return prev
          const next = new Set(prev)
          next.add(bundleId)
          return next
        })
      }
    },
    [nodes, collapsedIds, initialDepth, focusSubtreeId, bundleRoles],
  )

  const handleFocus = useCallback(
    (id: string) => {
      revealPath(id)
      setFocusedId(id)
      setSelectedId(id)
      setTimeout(() => setFocusedId(null), 1800)
    },
    [revealPath],
  )

  const handleInspectorClose = useCallback(() => {
    setSelectedId(null)
    const snap = revealSnapshotRef.current
    if (snap) {
      setCollapsedIds(snap.collapsedIds)
      setInitialDepth(snap.initialDepth)
      setFocusSubtreeId(snap.focusSubtreeId)
      const targetViewport = snap.viewport
      revealSnapshotRef.current = null
      if (targetViewport) {
        requestAnimationFrame(() => {
          viewportApiRef.current?.restore(targetViewport, { duration: 420 })
        })
      }
    }
  }, [])

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        flashToast("Command palette — coming soon ★")
      } else if (e.key === "Escape") {
        if (selectedId) handleInspectorClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId, handleInspectorClose, flashToast])

  // ── render ────────────────────────────────────────────────────────────────

  if (chartQuery.isLoading) {
    return (
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)", fontFamily: "var(--ih-font-sans)" }}>
        Loading chart…
      </div>
    )
  }
  if (chartQuery.error) {
    return (
      <div style={{ padding: 32, background: "var(--ih-bg)" }}>
        <h1 style={{ fontFamily: "var(--ih-font-serif)", fontSize: 28, marginBottom: 8, color: "var(--ih-ink)" }}>
          Chart unavailable
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>{chartQuery.error.message}</p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 96px)",
          minHeight: 620,
          background: "var(--ih-bg)",
        }}
      >
        {view === "splash" || isEmpty ? (
          <OnboardingSplash
            companyName={companyLabel}
            isProvisioned={clientTenantProvisioned}
            isSeeding={seedMutation.isPending}
            onSeed={() => {
              if (!clientTenantProvisioned) {
                flashToast("Tenant not provisioned yet")
                return
              }
              seedMutation.mutate({ engagementId })
            }}
            onComingSoon={(label) => flashToast(`${label} — coming soon ★`)}
          />
        ) : (
          <>
            <SlimHeader
              engagementTitle={engagementTitle}
              companyName={companyLabel}
              coveragePct={stats.coveragePct}
              mapped={stats.mapped}
              total={stats.totalPeople}
              onApprove={() => setPlanOpen(true)}
              onActivity={() => setActivityOpen(true)}
              onComingSoon={(label) => flashToast(`${label} — coming soon ★`)}
            />
            <DemoToolbar
              direction={direction}
              bundleRoles={bundleRoles}
              initialDepth={initialDepth}
              onDirectionChange={setDirection}
              onBundleRolesChange={setBundleRoles}
              onInitialDepthChange={(d) => {
                setInitialDepth(d)
                setCollapsedIds(new Set())
              }}
              onOpenSearch={() => flashToast("Command palette — coming soon ★")}
            />

            <DrillBreadcrumb nodes={nodes} focusSubtreeId={focusSubtreeId} onNavigate={setFocusSubtreeId} />

            <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
              <DemoGraph
                nodes={graphNodes}
                aggregates={aggregates}
                selectedId={selectedId}
                focusedId={focusedId}
                focusSubtreeId={focusSubtreeId}
                overlay={overlay}
                direction={direction}
                initialDepth={initialDepth}
                toggledIds={collapsedIds}
                viewportApiRef={viewportApiRef}
                onSelect={handleSelect}
                onDrillIn={setFocusSubtreeId}
                onToggleCollapse={handleToggleCollapse}
              />

              <FloatingOverlayMenu overlay={overlay} onOverlayChange={setOverlay} />
              <FloatingLegend />

              {/* Left-side drawer for overlay shortcuts */}
              <SlideDrawer
                side="left"
                open={overlay === "INTERVIEW_COVERAGE" || overlay === "FORM_STATUS" || overlay === "AUDIT_CRITICAL"}
                onClose={() => setOverlay("NONE")}
                title={
                  overlay === "INTERVIEW_COVERAGE"
                    ? "Interview shortlist"
                    : overlay === "FORM_STATUS"
                      ? "Questionnaires"
                      : overlay === "AUDIT_CRITICAL"
                        ? "Audit-critical"
                        : ""
                }
              >
                {overlay === "INTERVIEW_COVERAGE" && <Shortlist nodes={nodes} engagementId={engagementId} onFocus={handleFocus} />}
                {overlay === "FORM_STATUS" && <FormsList nodes={nodes} engagementId={engagementId} onFocus={handleFocus} />}
                {overlay === "AUDIT_CRITICAL" && <AuditList nodes={nodes} onFocus={handleFocus} />}
              </SlideDrawer>

              {/* Activity drawer (right side, separate from inspector) */}
              <SlideDrawer side="right" open={activityOpen} onClose={() => setActivityOpen(false)} title="Activity" width={360}>
                <ActivityFeed mode="consultant" engagementId={engagementId} />
              </SlideDrawer>

              {/* Inspector */}
              <aside
                aria-hidden={!selectedNode}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 420,
                  maxWidth: "92%",
                  background: "var(--ih-surface)",
                  borderLeft: "1px solid var(--ih-line)",
                  boxShadow: selectedNode ? "-16px 0 38px -20px rgba(0,0,0,0.22)" : "none",
                  transform: selectedNode ? "translateX(0)" : "translateX(100%)",
                  transition: "transform 0.24s ease, box-shadow 0.24s ease",
                  overflowY: "auto",
                  zIndex: 40,
                }}
              >
                {selectedNode && selectedRow && (
                  <OnboardingInspector
                    node={selectedNode}
                    row={selectedRow}
                    allNodes={nodes}
                    engagementId={engagementId}
                    onClose={handleInspectorClose}
                    onFocusNode={handleFocus}
                  />
                )}
              </aside>
            </div>
          </>
        )}

        {planOpen && <PlanPreviewModal engagementId={engagementId} onClose={() => setPlanOpen(false)} />}

        {toast && (
          <div
            role="status"
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "9px 14px",
              borderRadius: 999,
              background: "var(--ih-ink)",
              color: "#fff",
              fontSize: 12.5,
              fontFamily: "var(--ih-font-sans)",
              boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
              zIndex: 60,
              maxWidth: "80%",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </ReactFlowProvider>
  )
}

// ── slim header ─────────────────────────────────────────────────────────────

function SlimHeader({
  engagementTitle,
  companyName,
  coveragePct,
  mapped,
  total,
  onApprove,
  onActivity,
  onComingSoon,
}: {
  engagementTitle: string
  companyName: string
  coveragePct: number
  mapped: number
  total: number
  onApprove: () => void
  onActivity: () => void
  onComingSoon: (label: string) => void
}): React.ReactElement {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 24px",
        borderBottom: "1px solid var(--ih-line)",
        background: "var(--ih-surface)",
      }}
    >
      <a
        href="./"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--ih-line)",
          color: "var(--ih-ink-65)",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={11} />
        Hub
      </a>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span className="ih-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ih-ink-40)" }}>
          {engagementTitle} · onboarding
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ih-ink)" }}>{companyName}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>
          Coverage <strong className="ih-num" style={{ color: "var(--ih-accent)", fontWeight: 600 }}>{coveragePct}%</strong>
        </span>
        <span style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>
          Mapped <strong className="ih-num" style={{ color: "var(--ih-ink)", fontWeight: 600 }}>{mapped}/{total}</strong>
        </span>
      </div>
      <button
        type="button"
        onClick={() => onComingSoon("AI suggestions")}
        title="AI suggestions"
        style={pillBtn()}
      >
        <Sparkles size={11} />
        Suggestions <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginLeft: 4 }}>★</span>
      </button>
      <button
        type="button"
        onClick={() => onComingSoon("Bulk import")}
        title="Bulk import"
        style={pillBtn()}
      >
        <Upload size={11} />
        Import <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", marginLeft: 4 }}>★</span>
      </button>
      <button
        type="button"
        onClick={() => onComingSoon("Add node")}
        title="Command palette · Cmd+K"
        style={pillBtn()}
      >
        <Plus size={11} />
        Add <span className="ih-mono" style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>⌘K ★</span>
      </button>
      <button type="button" onClick={onActivity} title="Activity" style={pillBtn()}>
        <Activity size={11} />
        Activity
      </button>
      <button
        type="button"
        onClick={onApprove}
        style={{
          padding: "5px 12px",
          borderRadius: 6,
          background: "var(--ih-accent)",
          border: "1px solid var(--ih-accent)",
          color: "#fff",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Approve plan
      </button>
    </header>
  )
}

function pillBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 10px",
    borderRadius: 6,
    border: "1px solid var(--ih-line)",
    background: "transparent",
    color: "var(--ih-ink-65)",
    cursor: "pointer",
    fontSize: 11.5,
    fontFamily: "var(--ih-font-sans)",
  }
}
