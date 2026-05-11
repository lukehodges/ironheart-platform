"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Icon, type IconName } from "./icon"

/* ── Demo data ──────────────────────────────────────────────── */

interface ResultRecord {
  kind: "record"
  icon: IconName
  type: string
  title: string
  meta: string
  tone?: string
}
interface ResultAction {
  kind: "action"
  icon: IconName
  title: string
  sub: string
  shortcut: string
}

type ResultItem = ResultRecord | ResultAction

const RECORDS: ResultRecord[] = [
  { kind: "record", icon: "user",      type: "Client",     title: "Northwind Co.",                  meta: "/cli_204 · active · Q2 retainer · sprint 4", tone: "accent" },
  { kind: "record", icon: "handshake", type: "Engagement", title: "Northwind · Q2 retainer",        meta: "/eng_0481 · sprint 4 of 6",                  tone: "accent" },
  { kind: "record", icon: "calendar",  type: "Booking",    title: "Northwind sprint review",        meta: "Tue 13 May · 11:30",                         tone: "info" },
  { kind: "record", icon: "invoice",   type: "Invoice",    title: "Northwind · /inv_2027",          meta: "Paid · Mar 28",                               tone: "ok" },
  { kind: "record", icon: "workflow",  type: "Workflow",   title: "Onboarding · Northwind",         meta: "/wf_204 · 100% ok",                           tone: "ok" },
]

const ACTIONS: ResultAction[] = [
  { kind: "action", icon: "plus",     title: "New booking with Northwind",           sub: "Run Northwind kickoff template",           shortcut: "⌘B" },
  { kind: "action", icon: "invoice",  title: "Create draft invoice for Northwind",   sub: "Latest retainer template",                 shortcut: "⌘I" },
  { kind: "action", icon: "sparkles", title: "Ask copilot about Northwind",          sub: "Summarise activity since last touch",      shortcut: "⌘." },
  { kind: "action", icon: "mail",     title: "Send Northwind a chase email",         sub: "Friendly · re: /inv_2041",                 shortcut: "⌘E" },
]

/* ── Component ──────────────────────────────────────────────── */

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("north")
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Filter demo results
  const q = query.toLowerCase()
  const filteredRecords = RECORDS.filter(
    (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.meta.toLowerCase().includes(q),
  )
  const filteredActions = ACTIONS.filter(
    (r) => r.title.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q),
  )
  const topMatch = filteredRecords[0] ?? null
  const otherRecords = filteredRecords.slice(1)
  const totalResults = filteredRecords.length + filteredActions.length

  // Global ⌘K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === "Escape" && open) {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  // Autofocus input when opened
  useEffect(() => {
    if (open) {
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Arrow key navigation
  const allCount = (topMatch ? 1 : 0) + otherRecords.length + filteredActions.length
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % allCount)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + allCount) % allCount)
      }
    },
    [allCount],
  )

  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(14, 16, 19, 0.18)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        paddingTop: 80,
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          width: 680,
          maxHeight: 560,
          background: "var(--ih-surface)",
          border: "1px solid var(--ih-line-2)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(14,16,19,0.18), 0 8px 24px rgba(14,16,19,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--ih-line)",
            gap: 10,
          }}
        >
          <Icon name="search" size={15} style={{ color: "var(--ih-ink-40)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            className="ih-input"
            style={{
              border: 0,
              padding: 0,
              height: 22,
              fontSize: 16,
              fontFamily: "var(--ih-font-serif)",
              flex: 1,
              background: "transparent",
              outline: "none",
              color: "var(--ih-ink)",
            }}
            placeholder="Search records, actions, people..."
          />
          <span className="ih-pill">in: all</span>
          <span className="ih-kbd">esc</span>
        </div>

        {/* Results */}
        <div className="scrollbar-thin" style={{ flex: 1, overflowY: "auto" }}>
          {totalResults === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ih-ink-40)", fontSize: 13 }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Top match */}
          {topMatch && (
            <>
              <div className="ih-eyebrow" style={{ padding: "12px 18px 6px" }}>Top match</div>
              <div
                style={{
                  padding: "10px 18px",
                  background: activeIndex === 0 ? "var(--ih-accent-soft-2)" : "transparent",
                  borderLeft: activeIndex === 0 ? "2px solid var(--ih-accent)" : "2px solid transparent",
                  display: "grid",
                  gridTemplateColumns: "30px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name={topMatch.icon} size={16} style={{ color: "var(--ih-accent)" }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{topMatch.title}</div>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginTop: 2 }}>
                    {topMatch.meta}
                  </div>
                </div>
                <span className="ih-kbd">↵</span>
              </div>
            </>
          )}

          {/* Records group */}
          {otherRecords.length > 0 && (
            <>
              <div className="ih-eyebrow" style={{ padding: "12px 18px 6px" }}>
                Records · {otherRecords.length}
              </div>
              {otherRecords.map((r, i) => {
                const idx = (topMatch ? 1 : 0) + i
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 18px",
                      display: "grid",
                      gridTemplateColumns: "30px 80px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      borderTop: "1px solid var(--ih-line)",
                      background: activeIndex === idx ? "var(--ih-accent-soft-2)" : "transparent",
                      borderLeft: activeIndex === idx ? "2px solid var(--ih-accent)" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name={r.icon} size={14} style={{ color: "var(--ih-ink-50)" }} />
                    <span
                      className="ih-mono"
                      style={{ fontSize: 10, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.1em" }}
                    >
                      {r.type}
                    </span>
                    <div>
                      <div style={{ fontSize: 12.5 }}>{r.title}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                        {r.meta}
                      </div>
                    </div>
                    <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-30)" }}>→</span>
                  </div>
                )
              })}
            </>
          )}

          {/* Actions group */}
          {filteredActions.length > 0 && (
            <>
              <div
                className="ih-eyebrow"
                style={{ padding: "12px 18px 6px", borderTop: "1px solid var(--ih-line)" }}
              >
                Actions
              </div>
              {filteredActions.map((r, i) => {
                const idx = (topMatch ? 1 : 0) + otherRecords.length + i
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 18px",
                      display: "grid",
                      gridTemplateColumns: "30px 1fr 24px",
                      gap: 12,
                      alignItems: "center",
                      borderTop: "1px solid var(--ih-line)",
                      background: activeIndex === idx ? "var(--ih-accent-soft-2)" : "transparent",
                      borderLeft: activeIndex === idx ? "2px solid var(--ih-accent)" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Icon
                      name={r.icon}
                      size={14}
                      style={{ color: r.icon === "sparkles" ? "var(--ih-accent)" : "var(--ih-ink-50)" }}
                    />
                    <div>
                      <div style={{ fontSize: 12.5 }}>{r.title}</div>
                      <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                        {r.sub}
                      </div>
                    </div>
                    <span className="ih-kbd">{r.shortcut}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--ih-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10.5,
            color: "var(--ih-ink-40)",
          }}
        >
          <span>
            <span className="ih-kbd">↑↓</span> navigate &nbsp;·&nbsp;{" "}
            <span className="ih-kbd">↵</span> open &nbsp;·&nbsp;{" "}
            <span className="ih-kbd">⌘↵</span> open in new tab
          </span>
          <span className="ih-mono">{totalResults} results</span>
        </div>
      </div>
    </div>
  )
}
