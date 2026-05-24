"use client"

import { ChevronRight, Home } from "lucide-react"
import type { DemoNode } from "./types"

interface DrillBreadcrumbProps {
  nodes: DemoNode[]
  focusSubtreeId: string | null
  onNavigate: (id: string | null) => void
}

/**
 * Renders the path from the org root down to the currently focused subtree.
 * Click a crumb to jump up the chain. The "All" crumb resets to the full chart.
 */
export function DrillBreadcrumb({ nodes, focusSubtreeId, onNavigate }: DrillBreadcrumbProps): React.ReactElement | null {
  if (!focusSubtreeId) return null

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const chain: DemoNode[] = []
  let cur: DemoNode | undefined = byId.get(focusSubtreeId)
  while (cur) {
    chain.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }

  if (chain.length === 0) return null

  const subtreeCount = countDescendants(nodes, focusSubtreeId)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 24px",
        background: "color-mix(in srgb, var(--ih-accent) 4%, var(--ih-surface))",
        borderBottom: "1px solid var(--ih-line)",
        flexWrap: "wrap",
      }}
    >
      <Crumb label="All" onClick={() => onNavigate(null)} icon={<Home size={11} />} />
      {chain.map((n, i) => {
        const last = i === chain.length - 1
        return (
          <span key={n.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ChevronRight size={11} style={{ color: "var(--ih-ink-30)", flexShrink: 0 }} />
            <Crumb
              label={n.name}
              onClick={last ? undefined : () => onNavigate(n.id)}
              active={last}
            />
          </span>
        )
      })}
      <span
        className="ih-mono"
        style={{
          marginLeft: "auto",
          fontSize: 10,
          color: "var(--ih-ink-50)",
          letterSpacing: "0.05em",
        }}
      >
        Viewing {subtreeCount} node{subtreeCount === 1 ? "" : "s"} · double-click any department to drill deeper
      </span>
    </div>
  )
}

function Crumb({
  label,
  onClick,
  active,
  icon,
}: {
  label: string
  onClick?: () => void
  active?: boolean
  icon?: React.ReactNode
}): React.ReactElement {
  const clickable = !!onClick
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 6,
        background: active ? "var(--ih-surface)" : "transparent",
        border: active ? "1px solid var(--ih-line)" : "1px solid transparent",
        cursor: clickable ? "pointer" : "default",
        color: active ? "var(--ih-ink)" : "var(--ih-ink-65)",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        fontFamily: "var(--ih-font-sans)",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function countDescendants(nodes: DemoNode[], rootId: string): number {
  const childrenOf = new Map<string, string[]>()
  for (const n of nodes) {
    if (!n.parentId) continue
    if (!childrenOf.has(n.parentId)) childrenOf.set(n.parentId, [])
    childrenOf.get(n.parentId)!.push(n.id)
  }
  let count = 1
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    const kids = childrenOf.get(id) ?? []
    count += kids.length
    stack.push(...kids)
  }
  return count
}
