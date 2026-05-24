"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { ReactFlowProvider } from "reactflow"
import DemoGraph, { type DemoGraphViewportApi } from "./demo-graph"
import { DemoToolbar } from "./demo-toolbar"
import { DemoInspector } from "./demo-inspector"
import { DemoShortlist } from "./demo-shortlist"
import { DemoCommandPalette } from "./command-palette"
import { BulkImportSheet, type ImportRow } from "./bulk-import"
import { DemoSplash } from "./demo-splash"
import { DemoFormsList, DemoAuditList } from "./overlay-rail"
import { DrillBreadcrumb } from "./drill-breadcrumb"
import { FloatingSuggestions, SlideDrawer } from "./floating-suggestions"
import { FloatingOverlayMenu } from "./floating-overlay-menu"
import { FloatingLegend } from "./floating-legend"
import { bundleSiblings, normaliseTitle } from "./bundle"
import {
  NORTHWIND_ACTIVITY,
  NORTHWIND_NODES,
  NORTHWIND_SUGGESTIONS,
} from "./seed"
import { computeStats, makeNodeId } from "./lib"
import { computeAggregates } from "./aggregates"
import type {
  DemoActivity,
  DemoNode,
  LayoutDirection,
  NodeKind,
  Overlay,
  Suggestion,
} from "./types"

const COMPANY_NAME = "Northwind Analytics Ltd"

export function DemoShell(): React.ReactElement {
  const [view, setView] = useState<"splash" | "chart">("splash")
  const [nodes, setNodes] = useState<DemoNode[]>(NORTHWIND_NODES)
  const [activity, setActivity] = useState<DemoActivity[]>(NORTHWIND_ACTIVITY)
  const [suggestions] = useState<Suggestion[]>(NORTHWIND_SUGGESTIONS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<Overlay>("NONE")
  const [direction, setDirection] = useState<LayoutDirection>("LR")
  const [bundleRoles, setBundleRoles] = useState(true)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [initialDepth, setInitialDepth] = useState(1)
  const [focusSubtreeId, setFocusSubtreeId] = useState<string | null>(null)

  /**
   * Snapshot of expansion state taken the first time a rail / suggestion /
   * command-palette click forces the chart to reveal a buried node. Closing
   * the inspector restores it, so jumping to "Connor Whitley" doesn't leave
   * the rest of the org permanently unfolded.
   */
  const revealSnapshotRef = useRef<{
    collapsedIds: Set<string>
    initialDepth: number
    focusSubtreeId: string | null
    viewport: { x: number; y: number; zoom: number } | null
  } | null>(null)

  /** Imperative handle into the reactflow viewport (set by a child of the
   *  ReactFlowProvider; null until DemoGraph mounts in chart view). */
  const viewportApiRef = useRef<DemoGraphViewportApi | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const stats = useMemo(() => computeStats(nodes), [nodes])
  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null

  // Apply role bundling before handing data to the graph. Pure transform —
  // members still live in `nodes` for the rail / inspector / shortlist.
  const graphNodes = useMemo(
    () => bundleSiblings(nodes, { enabled: bundleRoles }),
    [nodes, bundleRoles],
  )
  // Compute subtree rollups over the *raw* nodes (BUNDLE synthetic ids inherit
  // a member's id for fallback). Used by the graph for descendant-people
  // counts and aggregated status indicators on collapsed parents.
  const aggregates = useMemo(() => computeAggregates(nodes), [nodes])

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback((id: string) => {
    // Clicking a synthetic bundle expands / collapses it (bundles aren't
    // real entities with an inspector view).
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

  /**
   * Expand the minimum set of ancestors required to reveal `targetId`. Walks
   * the parent chain in the raw `nodes` list (which still contains every
   * person even when bundling is on), forces each ancestor to "expanded", and
   * if the target sits inside a role-bundle in the graph view, also marks
   * that bundle expanded. Snapshots prior state once per reveal session so
   * the inspector's close handler can revert.
   */
  const revealPath = useCallback(
    (targetId: string) => {
      const byId = new Map(nodes.map((n) => [n.id, n]))
      const hasKids = new Set<string>()
      for (const n of nodes) if (n.parentId) hasKids.add(n.parentId)
      const target = byId.get(targetId)
      if (!target) return

      // Snapshot once.
      if (!revealSnapshotRef.current) {
        revealSnapshotRef.current = {
          collapsedIds: new Set(collapsedIds),
          initialDepth,
          focusSubtreeId,
          viewport: viewportApiRef.current?.snapshot() ?? null,
        }
      }

      // Walk ancestor chain from root → target's parent.
      const chain: string[] = []
      let cur = target
      while (cur.parentId) {
        chain.unshift(cur.parentId)
        const next = byId.get(cur.parentId)
        if (!next) break
        cur = next
      }

      // Depth lookup via the same root-down walk.
      const depthOf = new Map<string, number>()
      for (let i = 0; i < chain.length; i++) depthOf.set(chain[i]!, i)
      depthOf.set(target.id, chain.length)

      setCollapsedIds((prev) => {
        const next = new Set(prev)
        for (const id of chain) {
          if (!hasKids.has(id)) continue
          const d = depthOf.get(id) ?? 0
          const defaultCollapsed = d >= initialDepth
          // Force expanded: XOR semantics — if default would collapse it, add
          // it to the toggled set; otherwise make sure it's NOT in the set.
          if (defaultCollapsed) next.add(id)
          else next.delete(id)
        }
        return next
      })

      // If target sits inside a role-bundle, force the bundle expanded too.
      // Bundles use the same collapsedIds XOR semantics as any other node;
      // since their default is collapsed, adding to the set flips to expanded.
      if (bundleRoles && target.parentId && target.title) {
        const bundleId = `bundle__${target.parentId}__${normaliseTitle(target.title)}`
        setCollapsedIds((prev) => {
          if (prev.has(bundleId)) return prev
          const next = new Set(prev)
          next.add(bundleId)
          return next
        })
      }

      // If currently drilled into a subtree that doesn't contain the target,
      // step back out so the reveal is visible.
      if (focusSubtreeId) {
        const inSubtree = (id: string): boolean => {
          let walker: DemoNode | undefined = byId.get(id)
          while (walker) {
            if (walker.id === focusSubtreeId) return true
            if (!walker.parentId) return false
            walker = byId.get(walker.parentId)
          }
          return false
        }
        if (!inSubtree(target.id)) setFocusSubtreeId(null)
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

  /** Closing the inspector reverts any chart expansion done by handleFocus
   *  AND returns the viewport (zoom + pan) to where it was pre-reveal. */
  const handleInspectorClose = useCallback(() => {
    setSelectedId(null)
    const snap = revealSnapshotRef.current
    if (snap) {
      setCollapsedIds(snap.collapsedIds)
      setInitialDepth(snap.initialDepth)
      setFocusSubtreeId(snap.focusSubtreeId)
      // Restore viewport AFTER the layout state revert has had a frame to
      // settle, otherwise reactflow re-fits during the same tick and wins.
      const targetViewport = snap.viewport
      revealSnapshotRef.current = null
      if (targetViewport) {
        requestAnimationFrame(() => {
          viewportApiRef.current?.restore(targetViewport, { duration: 420 })
        })
      }
    }
  }, [])

  const pushActivity = useCallback((verb: string, subject: string, detail?: string) => {
    setActivity((prev) => [
      {
        id: makeNodeId("act"),
        when: "just now",
        actor: "You",
        verb,
        subject,
        detail,
      },
      ...prev,
    ])
  }, [])

  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }, [])

  const handleUpdate = useCallback(
    (id: string, patch: Partial<DemoNode>) => {
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
      const target = nodes.find((n) => n.id === id)
      if (!target) return
      if (patch.interviewStatus && patch.interviewStatus !== target.interviewStatus) {
        pushActivity(`marked as ${patch.interviewStatus.toLowerCase()}`, target.name)
      }
      if (patch.formStatus && patch.formStatus !== target.formStatus) {
        pushActivity(`changed form status to ${patch.formStatus.toLowerCase()}`, target.name)
      }
    },
    [nodes, pushActivity],
  )

  const handleAdd = useCallback(
    (parentId: string, name: string, title: string, kind: NodeKind) => {
      const id = makeNodeId(kind === "VACANCY" ? "v" : "p")
      const newNode: DemoNode = {
        id,
        parentId,
        kind,
        name: kind === "VACANCY" ? title : name,
        title: title || null,
        email: null,
        avatarColor: kind === "VACANCY" ? null : pickAvatarColour(name),
        headcount: null,
        tenureYears: null,
        location: "London",
        edgeStyle: "SOLID",
        auditFlags: [],
        interviewStatus: "NOT_TARGET",
        formStatus: "NOT_SENT",
        notes: null,
        isFounder: false,
        isFractional: kind === "CONTRACTOR",
      }
      setNodes((prev) => [...prev, newNode])
      const parent = nodes.find((n) => n.id === parentId)
      pushActivity(
        `added ${kind.toLowerCase()}`,
        newNode.name,
        parent ? `under ${parent.name}` : undefined,
      )
      flashToast(`Added ${newNode.name}`)
      handleFocus(id)
    },
    [nodes, pushActivity, flashToast, handleFocus],
  )

  const handleImport = useCallback(
    (rows: ImportRow[], parentId: string) => {
      const newNodes: DemoNode[] = rows.map((r) => ({
        id: makeNodeId("p"),
        parentId,
        kind: "PERSON",
        name: r.name,
        title: r.title,
        email: r.email,
        avatarColor: pickAvatarColour(r.name),
        headcount: null,
        tenureYears: null,
        location: "London",
        edgeStyle: "SOLID",
        auditFlags: [],
        interviewStatus: "NOT_TARGET",
        formStatus: "NOT_SENT",
        notes: null,
        isFounder: false,
        isFractional: false,
      }))
      setNodes((prev) => [...prev, ...newNodes])
      pushActivity(`bulk-imported`, `${rows.length} people`)
      flashToast(`Imported ${rows.length} people`)
    },
    [pushActivity, flashToast],
  )

  const handleReset = useCallback(() => {
    if (!confirm("Reset demo to its initial state? Any local changes will be lost.")) return
    setNodes(NORTHWIND_NODES)
    setActivity(NORTHWIND_ACTIVITY)
    setSelectedId(null)
    setFocusedId(null)
    setOverlay("NONE")
    setDirection("LR")
    setCollapsedIds(new Set())
    setBundleRoles(true)
    setInitialDepth(1)
    setFocusSubtreeId(null)
    setView("splash")
    flashToast("Demo reset")
  }, [flashToast])

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSync = useCallback(
    (source: "google" | "hris" | "csv") => {
      const labels = {
        google: "Synced 14 contacts from Google Workspace",
        hris: "Connected HRIS · pulled 60 employees",
        csv: "Opening CSV importer…",
      }
      flashToast(labels[source])
      pushActivity(`synced from`, source === "google" ? "Google Workspace" : source.toUpperCase())
    },
    [flashToast, pushActivity],
  )

  const handleSuggestionAction = useCallback(
    (s: Suggestion) => {
      if (s.action?.nodeId) handleFocus(s.action.nodeId)
      if (s.action?.overlay) setOverlay(s.action.overlay)
    },
    [handleFocus],
  )

  // ── keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (e.key === "Escape") {
        if (selectedId) handleInspectorClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId, handleInspectorClose])

  // ── render ───────────────────────────────────────────────────────────────

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
        {view === "splash" ? (
          <DemoSplash
            companyName={COMPANY_NAME}
            stats={stats}
            onStart={() => setView("chart")}
            onOpenBulkImport={() => setImportOpen(true)}
            onReset={handleReset}
            onSync={(source) => {
              handleSync(source)
              setView("chart")
            }}
          />
        ) : (
          <>
            <SlimHeader
              companyName={COMPANY_NAME}
              coveragePct={stats.coveragePct}
              mapped={stats.mapped}
              total={stats.totalPeople}
              onBack={() => setView("splash")}
              onOpenCommandPalette={() => setPaletteOpen(true)}
              onOpenBulkImport={() => setImportOpen(true)}
            />
            <DemoToolbar
              direction={direction}
              bundleRoles={bundleRoles}
              initialDepth={initialDepth}
              onDirectionChange={setDirection}
              onBundleRolesChange={setBundleRoles}
              onInitialDepthChange={(d) => {
                setInitialDepth(d)
                // Clear per-node overrides so the new depth value takes effect cleanly.
                setCollapsedIds(new Set())
              }}
              onOpenSearch={() => setPaletteOpen(true)}
            />

            <DrillBreadcrumb
              nodes={nodes}
              focusSubtreeId={focusSubtreeId}
              onNavigate={setFocusSubtreeId}
            />

            {/* Main canvas — graph occupies the entire width. All supplementary
                content (suggestions, overlay lists, legend) slides in as a
                drawer over the canvas, so the chart never has to share screen
                real estate with persistent panels. */}
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

              {/* Floating affordances over the canvas */}
              <FloatingOverlayMenu
                overlay={overlay}
                onOverlayChange={(o) => {
                  // Opening an overlay-with-drawer auto-dismisses the suggestions
                  // drawer (they share the left edge).
                  if (o === "INTERVIEW_COVERAGE" || o === "FORM_STATUS" || o === "AUDIT_CRITICAL") {
                    setSuggestionsOpen(false)
                  }
                  setOverlay(o)
                }}
              />
              <FloatingSuggestions
                suggestions={suggestions}
                open={suggestionsOpen}
                onOpenChange={(next) => {
                  if (next && (overlay === "INTERVIEW_COVERAGE" || overlay === "FORM_STATUS" || overlay === "AUDIT_CRITICAL")) {
                    setOverlay("NONE")
                  }
                  setSuggestionsOpen(next)
                }}
                onAction={handleSuggestionAction}
              />
              <FloatingLegend />

              {/* Overlay drawer — slides in from the LEFT so it never clashes
                  with the right-side inspector when both are open. */}
              <SlideDrawer
                side="left"
                open={overlay === "INTERVIEW_COVERAGE" || overlay === "FORM_STATUS" || overlay === "AUDIT_CRITICAL"}
                onClose={() => setOverlay("NONE")}
                title={overlay === "INTERVIEW_COVERAGE" ? "Interview shortlist" : overlay === "FORM_STATUS" ? "Questionnaires" : overlay === "AUDIT_CRITICAL" ? "Audit-critical" : ""}
              >
                {overlay === "INTERVIEW_COVERAGE" && (
                  <DemoShortlist
                    nodes={nodes}
                    onFocus={handleFocus}
                    onConfirm={(id) => handleUpdate(id, { interviewStatus: "INVITED" })}
                    onSkip={(id) => handleUpdate(id, { interviewStatus: "NOT_TARGET" })}
                  />
                )}
                {overlay === "FORM_STATUS" && (
                  <DemoFormsList
                    nodes={nodes}
                    onFocus={handleFocus}
                    onSend={(id) => handleUpdate(id, { formStatus: "SENT" })}
                  />
                )}
                {overlay === "AUDIT_CRITICAL" && (
                  <DemoAuditList nodes={nodes} onFocus={handleFocus} />
                )}
              </SlideDrawer>

              {/* Inspector — slides in from the right with the highest z so it
                  always overlays any left-side drawer / floating pill. */}
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
                {selectedNode && (
                  <DemoInspector
                    node={selectedNode}
                    allNodes={nodes}
                    onClose={handleInspectorClose}
                    onUpdate={handleUpdate}
                    onFocusNode={handleFocus}
                  />
                )}
              </aside>
            </div>
          </>
        )}

        {/* command palette + import sheet */}
        <DemoCommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          nodes={nodes}
          selectedId={selectedId}
          onAddPerson={(parentId, name, title) => handleAdd(parentId, name, title, "PERSON")}
          onAddVacancy={(parentId, title) => handleAdd(parentId, "", title, "VACANCY")}
          onAddContractor={(parentId, name, title) => handleAdd(parentId, name, title, "CONTRACTOR")}
          onMarkInterviewTarget={(id) => handleUpdate(id, { interviewStatus: "TARGET" })}
          onFocusNode={handleFocus}
          onSetOverlay={setOverlay}
        />

        <BulkImportSheet
          open={importOpen}
          onOpenChange={setImportOpen}
          nodes={nodes}
          onImport={handleImport}
        />

        {/* toast */}
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
              zIndex: 50,
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

// ── slim header used in chart mode ──────────────────────────────────────────

function SlimHeader({
  companyName,
  coveragePct,
  mapped,
  total,
  onBack,
  onOpenCommandPalette,
  onOpenBulkImport,
}: {
  companyName: string
  coveragePct: number
  mapped: number
  total: number
  onBack: () => void
  onOpenCommandPalette: () => void
  onOpenBulkImport: () => void
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
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--ih-line)",
          cursor: "pointer",
          color: "var(--ih-ink-65)",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        <ArrowLeft size={11} />
        Overview
      </button>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          className="ih-mono"
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ih-ink-40)",
          }}
        >
          Org chart · live demo
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ih-ink)" }}>
          {companyName}
        </span>
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
        onClick={onOpenBulkImport}
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--ih-line)",
          cursor: "pointer",
          color: "var(--ih-ink-65)",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        Import
      </button>
      <button
        type="button"
        onClick={onOpenCommandPalette}
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          background: "var(--ih-ink)",
          border: "1px solid var(--ih-ink)",
          cursor: "pointer",
          color: "#fff",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Add
        <span className="ih-mono" style={{ fontSize: 9.5, opacity: 0.7 }}>⌘K</span>
      </button>
    </header>
  )
}

// ── tiny recent-activity card (no need for its own file) ────────────────────

function RecentActivity({ activity }: { activity: DemoActivity[] }): React.ReactElement {
  return (
    <section
      className="ih-card"
      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}
    >
      <span className="ih-eyebrow">Recent activity</span>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {activity.length === 0 && (
          <li style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>Nothing yet.</li>
        )}
        {activity.map((a) => (
          <li key={a.id} style={{ display: "flex", gap: 8, fontSize: 11.5, lineHeight: 1.4 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: "var(--ih-ink-30)",
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--ih-ink)" }}>
                <strong style={{ fontWeight: 600 }}>{a.actor}</strong>{" "}
                <span style={{ color: "var(--ih-ink-65)" }}>{a.verb}</span>{" "}
                <strong style={{ fontWeight: 500 }}>{a.subject}</strong>
              </div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 2 }}>
                {a.when}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function pickAvatarColour(seed: string): string {
  const colours = ["indigo", "amber", "rose", "teal", "emerald", "violet", "sky", "stone"]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return colours[h % colours.length]!
}
