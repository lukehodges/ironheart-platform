"use client"

import {
  ArrowDownToLine,
  ArrowRightToLine,
  Group,
  Search,
} from "lucide-react"
import type { LayoutDirection } from "./types"

interface DemoToolbarProps {
  direction: LayoutDirection
  bundleRoles: boolean
  initialDepth: number
  onDirectionChange: (d: LayoutDirection) => void
  onBundleRolesChange: (b: boolean) => void
  onInitialDepthChange: (d: number) => void
  onOpenSearch: () => void
}

const MAX_DEPTH = 6

const DIRECTIONS: Array<{ key: LayoutDirection; label: string; icon: React.ComponentType<{ size?: number }>; hint: string }> = [
  { key: "TB", label: "Top-down",  icon: ArrowDownToLine,  hint: "Classic org chart" },
  { key: "LR", label: "Left-right", icon: ArrowRightToLine, hint: "Depth flows horizontally — better for wide orgs" },
]

export function DemoToolbar({
  direction,
  bundleRoles,
  initialDepth,
  onDirectionChange,
  onBundleRolesChange,
  onInitialDepthChange,
  onOpenSearch,
}: DemoToolbarProps) {
  const clampedDepth = Math.max(0, Math.min(MAX_DEPTH, initialDepth))

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 28px",
        background: "var(--ih-surface)",
        borderBottom: "1px solid var(--ih-line)",
      }}
    >
      <span className="ih-eyebrow" style={{ marginRight: 4 }}>
        Direction
      </span>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 2,
          padding: 2,
          background: "var(--ih-surface-2)",
          borderRadius: 8,
          border: "1px solid var(--ih-line)",
        }}
      >
        {DIRECTIONS.map((d) => {
          const active = direction === d.key
          const Icon = d.icon
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={active}
              title={d.hint}
              onClick={() => onDirectionChange(d.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                background: active ? "var(--ih-surface)" : "transparent",
                color: active ? "var(--ih-ink)" : "var(--ih-ink-65)",
                boxShadow: active ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
                cursor: "pointer",
                fontSize: 11.5,
                fontFamily: "var(--ih-font-sans)",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              <Icon size={12} />
              {d.label}
            </button>
          )
        })}
      </div>

      <span className="ih-eyebrow" style={{ marginLeft: 12, marginRight: 4 }}>
        Depth
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          border: "1px solid var(--ih-line)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--ih-surface-2)",
        }}
      >
        <button
          type="button"
          aria-label="Show fewer layers"
          title="Show fewer layers"
          onClick={() => onInitialDepthChange(Math.max(0, clampedDepth - 1))}
          disabled={clampedDepth <= 0}
          style={depthStepperBtn(clampedDepth <= 0)}
        >
          −
        </button>
        <span
          className="ih-mono"
          style={{
            minWidth: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
            background: "var(--ih-surface)",
            color: "var(--ih-ink)",
            fontSize: 12,
            borderLeft: "1px solid var(--ih-line)",
            borderRight: "1px solid var(--ih-line)",
          }}
          title="Layers visible before auto-collapse kicks in"
        >
          {clampedDepth}
        </span>
        <button
          type="button"
          aria-label="Show more layers"
          title="Show more layers"
          onClick={() => onInitialDepthChange(Math.min(MAX_DEPTH, clampedDepth + 1))}
          disabled={clampedDepth >= MAX_DEPTH}
          style={depthStepperBtn(clampedDepth >= MAX_DEPTH)}
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => onBundleRolesChange(!bundleRoles)}
        title="Bundle same-title siblings into one card (e.g. 3 SDRs)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: 12,
          padding: "5px 10px",
          borderRadius: 6,
          border: "1px solid var(--ih-line)",
          background: bundleRoles ? "var(--ih-ink)" : "transparent",
          color: bundleRoles ? "#fff" : "var(--ih-ink-65)",
          cursor: "pointer",
          fontSize: 11.5,
          fontFamily: "var(--ih-font-sans)",
          transition: "background 0.12s, color 0.12s",
        }}
      >
        <Group size={12} />
        Group roles
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={onOpenSearch}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          background: "transparent",
          border: "1px solid var(--ih-line)",
          cursor: "pointer",
          color: "var(--ih-ink-65)",
          fontSize: 12,
          fontFamily: "var(--ih-font-sans)",
        }}
      >
        <Search size={12} />
        Search
        <span
          className="ih-mono"
          style={{
            marginLeft: 6,
            padding: "1px 6px",
            borderRadius: 4,
            background: "var(--ih-surface-2)",
            border: "1px solid var(--ih-line)",
            fontSize: 10,
            color: "var(--ih-ink-50)",
          }}
        >
          ⌘K
        </span>
      </button>
    </div>
  )
}

function depthStepperBtn(disabled: boolean): React.CSSProperties {
  return {
    minWidth: 22,
    padding: "0 6px",
    border: "none",
    background: "transparent",
    color: disabled ? "var(--ih-ink-30)" : "var(--ih-ink-65)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontFamily: "var(--ih-font-mono)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
}
