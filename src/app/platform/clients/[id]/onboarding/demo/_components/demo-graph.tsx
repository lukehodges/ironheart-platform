"use client"

import { useEffect, useMemo, useRef } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "reactflow"
import "reactflow/dist/style.css"
import DemoNode, { type DemoNodeData } from "./demo-node"
import type { Density, DemoNode as DemoNodeType, EdgeStyle, LayoutDirection, Overlay } from "./types"
import type { NodeAggregates } from "./aggregates"

/* ---------- density-driven visual constants ---------- */

interface DensityConfig {
  xGap: number
  yGap: number
  size: (kind: DemoNodeType["kind"]) => { w: number; h: number }
  slotW: number
  slotH: number
}

const DENSITIES: Record<Density, DensityConfig> = {
  COMPACT: {
    xGap: 36,
    yGap: 28,
    size: (k) => {
      if (k === "ORG") return { w: 260, h: 70 }
      if (k === "DEPARTMENT") return { w: 250, h: 70 }
      if (k === "BUNDLE") return { w: 250, h: 70 }
      return { w: 250, h: 72 } // person / vacancy / contractor / advisor
    },
    // Pitch on each axis must accommodate the widest / tallest node at that
    // depth-layer, otherwise siblings or successive layers overlap.
    slotW: 260 + 36,
    slotH: 72 + 28,
  },
  COMFORTABLE: {
    xGap: 36,
    yGap: 88,
    size: (k) => {
      if (k === "ORG") return { w: 320, h: 90 }
      if (k === "PERSON" || k === "CONTRACTOR" || k === "ADVISOR") return { w: 280, h: 130 }
      return { w: 260, h: 108 }
    },
    slotW: 280 + 36,
    slotH: 130 + 88,
  },
  COLLAPSED: {
    xGap: 16,
    yGap: 44,
    size: (k) => {
      if (k === "ORG") return { w: 240, h: 64 }
      if (k === "DEPARTMENT") return { w: 220, h: 60 }
      return { w: 200, h: 58 }
    },
    slotW: 220 + 16,
    slotH: 60 + 44,
  },
}

const COLLAPSE_THRESHOLD = 4   // depts with >4 person-kind children auto-collapse in COLLAPSED density
const EMPTY_SET: Set<string> = new Set()

/* ---------- module-scope nodeTypes (avoid reactflow warning) ---------- */

const nodeTypes: NodeTypes = { demoNode: DemoNode }

/* ---------- edge style mapper ---------- */

function edgeStyleProps(style: EdgeStyle): React.CSSProperties {
  if (style === "DOTTED") {
    return { stroke: "var(--ih-ink-30)", strokeWidth: 1.5, strokeDasharray: "4 4" }
  }
  if (style === "MATRIX") {
    return { stroke: "var(--ih-info)", strokeWidth: 1.5, strokeDasharray: "2 6" }
  }
  return { stroke: "var(--ih-line)", strokeWidth: 1.5 }
}

/* ---------- tidy-tree layout ---------- */

interface LaidOut {
  nodes: Node<DemoNodeData>[]
  edges: Edge[]
  depthOf: Map<string, number>
  maxDepth: number
}

const PEOPLE_KINDS = new Set(["PERSON", "CONTRACTOR", "ADVISOR"])

function layoutTree(
  flat: DemoNodeType[],
  overlay: Overlay,
  selectedId: string | null,
  focusedId: string | null,
  density: Density,
  toggledIds: Set<string>,
  direction: LayoutDirection,
  initialDepth: number,
  aggregates: Map<string, NodeAggregates>,
): LaidOut {
  const cfg = DENSITIES[density]
  // In TB, depth grows along y and siblings allocate slots along x.
  // In LR, depth grows along x and siblings allocate slots along y.
  // Slot pitch on the cross axis = widest/tallest node + gap, taken from cfg.
  const mainPitch = direction === "LR" ? cfg.slotW : cfg.slotH
  const crossPitch = direction === "LR" ? cfg.slotH : cfg.slotW
  const childrenOf = new Map<string, DemoNodeType[]>()
  for (const n of flat) {
    const key = n.parentId ?? "__root__"
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(n)
  }
  const roots = childrenOf.get("__root__") ?? []

  // Default-collapsed = node has children AND
  //   (its depth >= initialDepth, OR it triggers the COLLAPSED-density rule).
  // The user can XOR-flip any node via `toggledIds`: membership in that set
  // inverts whatever the default would have been.
  const hasKids = (n: DemoNodeType) => (childrenOf.get(n.id) ?? []).length > 0
  const isDefaultCollapsed = (n: DemoNodeType, depth: number): boolean => {
    if (!hasKids(n)) return false
    // Bundles always start collapsed regardless of depth — they're meant to
    // act as a single "3 SDR" card by default until the user opts to expand.
    if (n.kind === "BUNDLE") return true
    if (depth >= initialDepth) return true
    if (density === "COLLAPSED" && n.kind === "DEPARTMENT") {
      const personKids = (childrenOf.get(n.id) ?? []).filter((c) => PEOPLE_KINDS.has(c.kind) || c.kind === "VACANCY")
      if (personKids.length > COLLAPSE_THRESHOLD) return true
    }
    return false
  }
  const isCollapsed = (n: DemoNodeType, depth: number): boolean => {
    const def = isDefaultCollapsed(n, depth)
    return toggledIds.has(n.id) ? !def : def
  }

  // Two-pass tidy-tree placement: descend into children first, then place the
  // parent at the midpoint of its first and last child's centres. This pulls
  // parents off the geometric centre of their *total* subtree extent and onto
  // the centre of their *immediate* children — which keeps edges from
  // ballooning across sibling columns when the tree is unbalanced.
  const nodes: Node<DemoNodeData>[] = []
  const edges: Edge[] = []
  const depthOf = new Map<string, number>()
  let cursor = 0
  let maxDepth = 0

  function place(n: DemoNodeType, depth: number, parentId: string | null, siblingIndex: number): number {
    depthOf.set(n.id, depth)
    if (depth > maxDepth) maxDepth = depth

    const collapsed = isCollapsed(n, depth)
    const kidsForCount = childrenOf.get(n.id) ?? []
    const hiddenCount = collapsed ? kidsForCount.length : 0
    const hasChildren = kidsForCount.length > 0

    let centerSlot: number
    if (collapsed || kidsForCount.length === 0) {
      // Leaf-or-collapsed: occupy the next slot.
      centerSlot = cursor + 0.5
      cursor += 1
    } else {
      // Internal: place children first, then sit above their midpoint.
      const childCentres: number[] = []
      for (let i = 0; i < kidsForCount.length; i++) {
        childCentres.push(place(kidsForCount[i]!, depth + 1, n.id, i))
      }
      centerSlot = (childCentres[0]! + childCentres[childCentres.length - 1]!) / 2
    }

    const size = cfg.size(n.kind)
    const sizeCross = direction === "LR" ? size.h : size.w
    const mainCoord = depth * mainPitch
    const crossCoord = centerSlot * crossPitch - sizeCross / 2
    const x = direction === "LR" ? mainCoord : crossCoord
    const y = direction === "LR" ? crossCoord : mainCoord

    // Cascade fade-in: each node delays slightly based on depth + sibling index
    // so newly-revealed subtrees ripple open instead of popping in flat.
    const animationDelay = Math.min(700, depth * 45 + siblingIndex * 28)

    nodes.push({
      id: n.id,
      type: "demoNode",
      position: { x, y },
      width: size.w,
      height: size.h,
      style: { width: size.w, height: size.h, animationDelay: `${animationDelay}ms` },
      data: {
        node: n,
        overlay,
        isSelected: selectedId === n.id,
        isFocused: focusedId === n.id,
        density,
        isCollapsed: collapsed,
        hiddenCount,
        hasChildren,
        aggregates: aggregates.get(n.id),
      },
      sourcePosition: direction === "LR" ? Position.Right : Position.Bottom,
      targetPosition: direction === "LR" ? Position.Left : Position.Top,
      selectable: true,
      draggable: false,
    })

    if (parentId) {
      const style = edgeStyleProps(n.edgeStyle)
      edges.push({
        id: `${parentId}__${n.id}`,
        source: parentId,
        target: n.id,
        // `step` = sharp right-angle elbows. Looks cleaner than `smoothstep`
        // on unbalanced trees where parents sit far from a given child column.
        type: "step",
        style,
      })
    }

    return centerSlot
  }
  for (let i = 0; i < roots.length; i++) place(roots[i]!, 0, null, i)

  return { nodes, edges, depthOf, maxDepth }
}

/* ---------- depth overlay tinting (applied to nodes after layout) ---------- */

function applyReportingDepthOverlay(
  rfNodes: Node<DemoNodeData>[],
  depthOf: Map<string, number>,
  maxDepth: number,
  overlay: Overlay,
): Node<DemoNodeData>[] {
  if (overlay !== "REPORTING_DEPTH" || maxDepth === 0) return rfNodes
  return rfNodes.map((n) => {
    const depth = depthOf.get(n.id) ?? 0
    // Map depth to a tint: deeper = lighter blue
    const t = depth / maxDepth // 0..1
    const sat = 1 - t * 0.7
    const color = `rgba(42,93,191,${0.20 + 0.55 * sat})`
    const tint = `rgba(42,93,191,${0.02 + 0.05 * sat})`
    return {
      ...n,
      data: {
        ...n.data,
        // smuggle depth-derived colors as a pseudo overlay by mutating the node's wrapper style
      },
      style: {
        ...n.style,
        // we paint via a left border on the wrapper directly
        borderLeft: `4px solid ${color}`,
        background: tint,
        borderRadius: 8,
      },
    }
  })
}

/* ---------- internal focus controller ---------- */

function FocusController({
  focusedId,
  positions,
}: {
  focusedId: string | null | undefined
  positions: Map<string, { x: number; y: number; w: number; h: number }>
}) {
  const rf = useReactFlow()
  useEffect(() => {
    if (!focusedId) return
    const p = positions.get(focusedId)
    if (!p) return
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    rf.setCenter(cx, cy, { zoom: 1.2, duration: 500 })
  }, [focusedId, positions, rf])
  return null
}

/**
 * After a +/− toggle, fit the viewport to the clicked node plus everything
 * underneath it that's now visible. This gives the user both anchoring (the
 * clicked node stays in frame) AND context (newly-revealed children all land
 * in view without manual pan/zoom).
 *
 * Why not a true screen-pixel pin? CSS transition easing on node transforms
 * doesn't perfectly match setViewport's d3-zoom easing, and per-node
 * animation delays (the cascade) make the layout settle at staggered times.
 * Trying to keep one node mathematically static through that produces visible
 * drift. Fit-to-subtree side-steps the timing problem entirely.
 */
function PinController({
  positions,
  pinRef,
  allNodes,
}: {
  positions: Map<string, { x: number; y: number; w: number; h: number }>
  pinRef: React.MutableRefObject<{ id: string; wasCollapsed: boolean } | null>
  allNodes: DemoNodeType[]
}) {
  const rf = useReactFlow()
  useEffect(() => {
    const pin = pinRef.current
    if (!pin) return
    pinRef.current = null

    const byId = new Map<string, DemoNodeType>()
    const childrenOf = new Map<string, string[]>()
    for (const n of allNodes) {
      byId.set(n.id, n)
      if (!n.parentId) continue
      if (!childrenOf.has(n.parentId)) childrenOf.set(n.parentId, [])
      childrenOf.get(n.parentId)!.push(n.id)
    }

    // EXPANDED a node → frame the subtree (clicked node + everything underneath).
    // COLLAPSED a node → frame the parent's subtree, so the user zooms back to
    // the context they came from. Falls back to the node itself if there's no
    // parent in view (e.g. drilled-in subtree root).
    const clicked = byId.get(pin.id)
    const focusId = pin.wasCollapsed
      ? pin.id
      : clicked?.parentId && positions.has(clicked.parentId)
        ? clicked.parentId
        : pin.id

    const ids: Array<{ id: string }> = []
    const stack = [focusId]
    while (stack.length) {
      const id = stack.pop()!
      if (!positions.has(id)) continue
      ids.push({ id })
      for (const c of childrenOf.get(id) ?? []) stack.push(c)
    }
    if (ids.length === 0) return

    // Slight delay so layout transitions can begin first; fitView animates on
    // top with its own easing.
    requestAnimationFrame(() => {
      rf.fitView({
        nodes: ids,
        padding: 0.2,
        duration: 420,
        maxZoom: 1.2,
        minZoom: 0.3,
      })
    })
  }, [positions, pinRef, rf, allNodes])
  return null
}

/**
 * Bridges the reactflow viewport API up to a ref the shell holds. Lives inside
 * the ReactFlow component so it can call `useReactFlow()`; assigns the imperative
 * snapshot / restore helpers onto the ref on mount, clears them on unmount.
 */
function ViewportBridge({ apiRef }: { apiRef: React.MutableRefObject<DemoGraphViewportApi | null> }) {
  const rf = useReactFlow()
  useEffect(() => {
    apiRef.current = {
      snapshot: () => {
        const v = rf.getViewport()
        return { x: v.x, y: v.y, zoom: v.zoom }
      },
      restore: (v, opts) => {
        rf.setViewport({ x: v.x, y: v.y, zoom: v.zoom }, { duration: opts?.duration ?? 420 })
      },
    }
    return () => {
      apiRef.current = null
    }
  }, [rf, apiRef])
  return null
}

/** Re-runs fitView whenever density (and therefore total layout extent) changes
 *  OR when the drill-in subtree changes. */
function RefitOnDensity({
  density,
  subtreeKey,
  direction,
  initialDepth,
}: {
  density: Density
  subtreeKey: string
  direction: LayoutDirection
  initialDepth: number
}) {
  const rf = useReactFlow()
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.05, maxZoom: 1.0, duration: 350 }), 30)
    return () => clearTimeout(t)
  }, [density, subtreeKey, direction, initialDepth, rf])
  return null
}

/* ---------- main component ---------- */

export interface DemoGraphViewportApi {
  /** Read the current viewport { x, y, zoom }. */
  snapshot: () => { x: number; y: number; zoom: number }
  /** Restore a previously captured viewport, with a smooth tween. */
  restore: (v: { x: number; y: number; zoom: number }, opts?: { duration?: number }) => void
}

interface DemoGraphProps {
  nodes: DemoNodeType[]
  /** Subtree rollups (descendant counts, propagated status flags). */
  aggregates: Map<string, NodeAggregates>
  selectedId: string | null
  focusedId?: string | null
  /** Restrict the visible graph to this node and its descendants. */
  focusSubtreeId?: string | null
  overlay?: Overlay
  density?: Density
  direction?: LayoutDirection
  /** Children of nodes deeper than this auto-collapse on first render. */
  initialDepth?: number
  /** Per-node XOR overrides on the default collapsed state. */
  toggledIds?: Set<string>
  showMiniMap?: boolean
  /** Optional handle the shell can use to read / set the viewport from outside
   *  the ReactFlowProvider (e.g. snapshot before reveal, restore on close). */
  viewportApiRef?: React.MutableRefObject<DemoGraphViewportApi | null>
  onSelect: (id: string) => void
  onDrillIn?: (id: string) => void
  onToggleCollapse?: (id: string) => void
}

export default function DemoGraph({
  nodes,
  aggregates,
  selectedId,
  focusedId = null,
  focusSubtreeId = null,
  overlay = "NONE",
  density = "COMPACT",
  direction = "TB",
  initialDepth = 1,
  toggledIds,
  showMiniMap = true,
  viewportApiRef,
  onSelect,
  onDrillIn,
  onToggleCollapse,
}: DemoGraphProps) {
  const toggled = toggledIds ?? EMPTY_SET
  // `wasCollapsed`: true means the click EXPANDED the node (its prior state was
  // collapsed). False means the click COLLAPSED it. PinController uses this to
  // decide whether to frame the clicked node's subtree (expand) or step out and
  // frame the parent's subtree (collapse — "go back to the previous context").
  const pinRef = useRef<{ id: string; wasCollapsed: boolean } | null>(null)

  // Filter nodes to the focus subtree if requested.
  const visibleNodes = useMemo(() => {
    if (!focusSubtreeId) return nodes
    const childrenOf = new Map<string, DemoNodeType[]>()
    for (const n of nodes) {
      const key = n.parentId ?? "__root__"
      if (!childrenOf.has(key)) childrenOf.set(key, [])
      childrenOf.get(key)!.push(n)
    }
    const root = nodes.find((n) => n.id === focusSubtreeId)
    if (!root) return nodes
    // BFS gather descendants; re-parent root to null so layout treats it as the new top.
    const collected: DemoNodeType[] = []
    const stack: DemoNodeType[] = [root]
    while (stack.length) {
      const n = stack.shift()!
      collected.push(n.id === root.id ? { ...n, parentId: null } : n)
      for (const c of childrenOf.get(n.id) ?? []) stack.push(c)
    }
    return collected
  }, [nodes, focusSubtreeId])

  const { rfNodes, rfEdges, positions } = useMemo(() => {
    const laid = layoutTree(visibleNodes, overlay, selectedId, focusedId, density, toggled, direction, initialDepth, aggregates)
    const finalNodes = applyReportingDepthOverlay(laid.nodes, laid.depthOf, laid.maxDepth, overlay)
    // Bubble `direction` into each node's data so the custom renderer can pick the right handle sides.
    const withDir = finalNodes.map((n) => ({ ...n, data: { ...n.data, direction } }))
    const positions = new Map<string, { x: number; y: number; w: number; h: number }>()
    for (const n of withDir) {
      positions.set(n.id, {
        x: n.position.x,
        y: n.position.y,
        w: (n.width as number) ?? 260,
        h: (n.height as number) ?? 108,
      })
    }
    return { rfNodes: withDir, rfEdges: laid.edges, positions }
  }, [visibleNodes, overlay, selectedId, focusedId, density, toggled, direction, initialDepth, aggregates])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <style jsx global>{`
        /* Ease reactflow nodes between layout positions (expand / collapse / density / direction).
           NOTE: only animate transform — animating opacity here would interrupt the enter fade-in. */
        .react-flow__node {
          transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Every reactflow node fades in on mount. Reactflow re-mounts nodes that
           reappear after a parent expand, so children animate in rather than snap.
           Opacity-only keyframe — animating transform would clash with the inline
           translate(x, y) reactflow uses for positioning. */
        .react-flow__node {
          animation: ih-demo-node-pop 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes ih-demo-node-pop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Edges fade in alongside their newly-revealed children. */
        .react-flow__edge {
          transition: opacity 220ms ease;
          animation: ih-demo-edge-fade 260ms ease both;
        }
        @keyframes ih-demo-edge-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Make sure the +/- chip always rises above sibling nodes / edges. */
        .react-flow__node button[data-expand] { z-index: 1000; }
        @keyframes ih-demo-focus-pulse {
          0% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--ih-accent) 60%, transparent);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--ih-accent) 0%, transparent);
            transform: scale(1.06);
          }
          100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--ih-accent) 0%, transparent);
            transform: scale(1);
          }
        }
        .ih-demo-node-focused {
          animation: ih-demo-focus-pulse 1.6s ease-in-out infinite;
          outline: 3px solid color-mix(in srgb, var(--ih-accent) 60%, transparent);
          outline-offset: 1px;
        }
      `}</style>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.05, maxZoom: 1.0, minZoom: 0.15 }}
        minZoom={0.12}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(e, n) => {
          const target = e.target as HTMLElement | null
          if (target?.closest("[data-expand]")) {
            // Read the node's pre-toggle collapsed state so PinController knows
            // whether to fit forward (into the subtree) or backward (to the
            // parent's context).
            const data = n.data as DemoNodeData | undefined
            pinRef.current = { id: n.id, wasCollapsed: !!data?.isCollapsed }
            onToggleCollapse?.(n.id)
            return
          }
          onSelect(n.id)
        }}
        onNodeDoubleClick={(_e, n) => {
          // Double-click a department or org to drill into that subtree.
          const node = visibleNodes.find((v) => v.id === n.id)
          if (!node) return
          if (node.kind === "DEPARTMENT" || node.kind === "ORG") {
            onDrillIn?.(n.id)
          }
        }}
      >
        <Background gap={20} size={1} color="var(--ih-line)" />
        <Controls showInteractive={false} />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            style={{ background: "var(--ih-surface)", border: "1px solid var(--ih-line)", borderRadius: 8 }}
            nodeColor={(n) => {
              const data = n.data as DemoNodeData | undefined
              if (!data) return "var(--ih-ink-30)"
              const k = data.node.kind
              if (k === "ORG") return "var(--ih-accent)"
              if (k === "DEPARTMENT") return "var(--ih-ink-65)"
              if (k === "VACANCY") return "var(--ih-warn)"
              return "var(--ih-info)"
            }}
            nodeStrokeWidth={0}
            maskColor="rgba(14,16,19,0.06)"
          />
        )}
        <FocusController focusedId={focusedId} positions={positions} />
        <PinController positions={positions} pinRef={pinRef} allNodes={visibleNodes} />
        {viewportApiRef && <ViewportBridge apiRef={viewportApiRef} />}
        <RefitOnDensity density={density} subtreeKey={focusSubtreeId ?? "__all__"} direction={direction} initialDepth={initialDepth} />
      </ReactFlow>
    </div>
  )
}
