"use client"

/**
 * Prospect-side slim port of the demo shell. Mounts at
 * /[tenantSlug]/dashboard/onboarding (client portal). Same reactflow chart
 * canvas + breadcrumb + legend as the consultant view, but with a read-only
 * inspector and no overlay drawer chrome.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ReactFlowProvider } from "reactflow"
import { api } from "@/lib/trpc/react"
import DemoGraph, { type DemoGraphViewportApi } from "@/app/platform/clients/[id]/onboarding/demo/_components/demo-graph"
import { DemoToolbar } from "@/app/platform/clients/[id]/onboarding/demo/_components/demo-toolbar"
import { DrillBreadcrumb } from "@/app/platform/clients/[id]/onboarding/demo/_components/drill-breadcrumb"
import { FloatingLegend } from "@/app/platform/clients/[id]/onboarding/demo/_components/floating-legend"
import { bundleSiblings, normaliseTitle } from "@/app/platform/clients/[id]/onboarding/demo/_components/bundle"
import { computeAggregates } from "@/app/platform/clients/[id]/onboarding/demo/_components/aggregates"
import type { DemoNode, LayoutDirection } from "@/app/platform/clients/[id]/onboarding/demo/_components/types"
import { flattenChart, findRow } from "@/app/platform/clients/[id]/onboarding/_components/adapter"
import { PortalInspector } from "./portal-inspector"
import { PortalInspectorView } from "./portal-inspector-view"
import { Pencil, Check } from "lucide-react"

interface PortalShellProps {
  engagementId: string
  engagementTitle: string
  companyLabel: string
  tenantSlug: string
  stage: string | null
}

// Engagement stages BEFORE AUDITING — the chart is still in onboarding review.
const PRE_AUDIT_STAGES = new Set(["DISCOVERY", "PROPOSAL", "CONTRACTED", "ONBOARDING"])

export function PortalShell({ engagementId, engagementTitle, companyLabel, tenantSlug, stage }: PortalShellProps) {
  const utils = api.useUtils()
  const chartQuery = api.onboarding.clientGetChart.useQuery({ engagementId })

  const notifyMutation = api.onboarding.clientNotifyConsultantReady.useMutation({
    onSuccess: () => {
      utils.onboarding.clientGetActivity.invalidate({ engagementId })
    },
  })

  const [bannerOpen, setBannerOpen] = useState(true)
  // Mirror the consultant shell's view/edit toggle on the prospect portal so
  // arriving prospects see a polished read-only chart by default. Persisted
  // per engagement via localStorage.
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [direction, setDirection] = useState<LayoutDirection>("LR")
  const [bundleRoles, setBundleRoles] = useState(true)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [initialDepth, setInitialDepth] = useState(1)
  const [focusSubtreeId, setFocusSubtreeId] = useState<string | null>(null)
  const [notifyHint, setNotifyHint] = useState<string | null>(null)
  const revealSnapshotRef = useRef<{
    collapsedIds: Set<string>
    initialDepth: number
    focusSubtreeId: string | null
    viewport: { x: number; y: number; zoom: number } | null
  } | null>(null)
  const viewportApiRef = useRef<DemoGraphViewportApi | null>(null)

  const tree = chartQuery.data ?? []
  const nodes = useMemo<DemoNode[]>(() => flattenChart(tree), [tree])
  const graphNodes = useMemo(() => bundleSiblings(nodes, { enabled: bundleRoles }), [nodes, bundleRoles])
  const aggregates = useMemo(() => computeAggregates(nodes), [nodes])
  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null
  const selectedRow = selectedId ? findRow(tree, selectedId) : null

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) handleInspectorClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId, handleInspectorClose])

  // Hydrate + persist mode per engagement.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(`onboarding.mode.${engagementId}`)
      if (stored === "edit" || stored === "view") setMode(stored)
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId])
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(`onboarding.mode.${engagementId}`, mode)
    } catch {
      // no-op
    }
  }, [engagementId, mode])

  if (chartQuery.isLoading) {
    return (
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)", fontFamily: "var(--ih-font-sans)" }}>
        Loading your org chart…
      </div>
    )
  }

  if (chartQuery.error) {
    return (
      <div style={{ padding: 32, background: "var(--ih-bg)" }}>
        <h1 style={{ fontFamily: "var(--ih-font-serif)", fontSize: 26, marginBottom: 8, color: "var(--ih-ink)" }}>
          Chart unavailable
        </h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)" }}>{chartQuery.error.message}</p>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 32, maxWidth: 640 }}>
        <h1 className="ih-serif" style={{ fontSize: 24, color: "var(--ih-ink)", margin: 0 }}>No chart yet</h1>
        <p style={{ fontSize: 13, color: "var(--ih-ink-65)", marginTop: 8, lineHeight: 1.55 }}>
          Your consultant hasn&apos;t built your org chart yet. Once they do, you&apos;ll be able to
          add team members and confirm details here.
        </p>
      </div>
    )
  }

  const isPreAudit = stage == null || PRE_AUDIT_STAGES.has(stage)

  return (
    <ReactFlowProvider>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 560, background: "var(--ih-bg)" }}>
        {/* Pending-review banner */}
        {bannerOpen && isPreAudit && (
          <div
            style={{
              background: "rgba(184,134,11,0.07)",
              borderBottom: "1px solid rgba(184,134,11,0.3)",
              padding: "10px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--ih-ink)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--ih-warn)", fontWeight: 600, marginRight: 6 }}>★ Pending review by your consultant.</span>
              Add team members, edit roles, and confirm details. When ready, click <em>Notify consultant I&apos;m ready</em> below.
            </div>
            <button
              onClick={() => setBannerOpen(false)}
              style={{ fontSize: 11, color: "var(--ih-warn)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Got it
            </button>
          </div>
        )}

        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 28px",
            borderBottom: "1px solid var(--ih-line)",
            background: "var(--ih-surface)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="ih-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ih-ink-40)" }}>
              {engagementTitle} · org chart
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ih-ink)" }}>{companyLabel}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}
            title={mode === "edit" ? "Switch back to view mode" : "Switch to edit mode"}
            style={
              mode === "edit"
                ? {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: "var(--ih-ink)",
                    border: "1px solid var(--ih-ink)",
                    color: "#fff",
                    fontSize: 11.5,
                    fontFamily: "var(--ih-font-sans)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }
                : {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid var(--ih-line)",
                    color: "var(--ih-ink)",
                    fontSize: 11.5,
                    fontFamily: "var(--ih-font-sans)",
                    cursor: "pointer",
                  }
            }
          >
            {mode === "edit" ? <Check size={11} /> : <Pencil size={11} />}
            {mode === "edit" ? "Done" : "Edit"}
          </button>
          <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-50)" }}>
            {tenantSlug}.ironheart.app
          </span>
        </header>

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
          onOpenSearch={() => setNotifyHint("Search — coming soon ★")}
        />

        <DrillBreadcrumb nodes={nodes} focusSubtreeId={focusSubtreeId} onNavigate={setFocusSubtreeId} />

        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
          <DemoGraph
            nodes={graphNodes}
            aggregates={aggregates}
            selectedId={selectedId}
            focusedId={focusedId}
            focusSubtreeId={focusSubtreeId}
            overlay="NONE"
            direction={direction}
            initialDepth={initialDepth}
            toggledIds={collapsedIds}
            viewportApiRef={viewportApiRef}
            onSelect={handleSelect}
            onDrillIn={setFocusSubtreeId}
            onToggleCollapse={handleToggleCollapse}
          />

          <FloatingLegend />

          <aside
            aria-hidden={!selectedNode}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 380,
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
              mode === "edit" ? (
                <PortalInspector
                  node={selectedNode}
                  row={selectedRow}
                  engagementId={engagementId}
                  onClose={handleInspectorClose}
                />
              ) : (
                <PortalInspectorView
                  node={selectedNode}
                  row={selectedRow}
                  onClose={handleInspectorClose}
                />
              )
            )}
          </aside>
        </div>

        <footer
          style={{
            borderTop: "1px solid var(--ih-line)",
            padding: "10px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--ih-surface-2)",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 11, color: "var(--ih-ink-50)", margin: 0 }}>
            {notifyHint ?? "When the chart looks right, let your consultant know."}
          </p>
          <button
            onClick={() => {
              notifyMutation.mutate(
                { engagementId },
                {
                  onSuccess: () => setNotifyHint("Notification sent — your consultant will be in touch."),
                  onError: (err) => setNotifyHint(`Could not notify: ${err.message}`),
                },
              )
            }}
            disabled={notifyMutation.isPending}
            style={{
              borderRadius: 6,
              background: "var(--ih-accent)",
              border: "none",
              padding: "7px 16px",
              fontSize: 13,
              color: "#fff",
              cursor: notifyMutation.isPending ? "not-allowed" : "pointer",
              opacity: notifyMutation.isPending ? 0.6 : 1,
            }}
          >
            {notifyMutation.isPending ? "Notifying…" : "Notify consultant I'm ready"}
          </button>
        </footer>
      </div>
    </ReactFlowProvider>
  )
}
