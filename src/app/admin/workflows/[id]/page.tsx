"use client"

import { Icon } from "@/components/shell"

/* ── Demo Data ─────────────────────────────────────────────────────────── */

type WFNode = {
  x: number; y: number; w: number; kind: string; title: string; sub: string;
  icon: "bolt" | "mail" | "clock" | "filter" | "sparkles" | "calendar" | "folder" | "check";
  selected?: boolean; live?: boolean;
}

const NODES: WFNode[] = [
  { x: 60, y: 200, w: 120, kind: "TRIGGER", title: "New booking", sub: "booking/created", icon: "bolt" },
  { x: 260, y: 200, w: 140, kind: "ACTION", title: "Send welcome email", sub: "to: client.email", icon: "mail" },
  { x: 480, y: 200, w: 130, kind: "WAIT", title: "Wait 24 hours", sub: "delay: 24h", icon: "clock" },
  { x: 700, y: 200, w: 130, kind: "IF", title: "Plan tier?", sub: "if plan = pro", icon: "filter", selected: true, live: true },
  { x: 920, y: 130, w: 140, kind: "ACTION", title: "Draft onboarding", sub: "claude \u00b7 tone:warm", icon: "sparkles", live: true },
  { x: 920, y: 310, w: 140, kind: "ACTION", title: "Send basic guide", sub: "template: lite-welcome", icon: "mail" },
]

const EDGES: { x1: number; y1: number; x2: number; y2: number; accent?: boolean }[] = [
  { x1: 180, y1: 240, x2: 260, y2: 240 },
  { x1: 400, y1: 240, x2: 480, y2: 240 },
  { x1: 610, y1: 240, x2: 700, y2: 240 },
  { x1: 830, y1: 225, x2: 920, y2: 170, accent: true },
  { x1: 830, y1: 255, x2: 920, y2: 350 },
]

type FieldConfig = { label: string; type: "select" | "input" | "code"; value: string; options?: string[] }
const INSPECTOR_FIELDS: FieldConfig[] = [
  { label: "field", type: "input", value: "client.plan" },
  { label: "operator", type: "select", value: "equals", options: ["equals", "not equals", "contains", "gt", "lt"] },
  { label: "value", type: "input", value: "pro" },
]

const RECENT_RUNS: readonly [string, "ok" | "fail", string, string][] = [
  ["10:14", "ok", "204ms", "pro"],
  ["08:42", "ok", "189ms", "pro"],
  ["07:14", "ok", "312ms", "lite"],
  ["Mon", "fail", "timeout", "pro"],
  ["Mon", "ok", "178ms", "pro"],
]

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function WorkflowEditorPage() {
  return (
    <div style={{ margin: "-24px -24px 0", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/admin/workflows" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
            <Icon name="chevronLeft" size={12}/>
            <span className="ih-eyebrow">Workflows</span>
          </a>
          <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
          <span style={{ fontSize: 13, fontWeight: 500 }}>WF-204 &middot; Onboarding Northwind</span>
          <span className="ih-pill ih-pill-ok" style={{ marginLeft: 6 }}><span className="ih-dot ih-dot-ok"/> Active &middot; v3</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="play" size={11}/> Test run</button>
          <a href="/admin/workflows/wf-204/executions" className="ih-btn ih-btn-ghost ih-btn-sm" style={{ textDecoration: "none" }}><Icon name="clock" size={11}/> History</a>
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="folder" size={11}/> Clone</button>
          <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ color: "var(--ih-danger)" }}><Icon name="x" size={11}/> Delete</button>
          <div style={{ width: 1, height: 20, background: "var(--ih-line)", margin: "0 4px" }}/>
          <button className="ih-btn ih-btn-primary ih-btn-sm"><Icon name="check" size={11}/> Save &amp; publish</button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", flex: 1, overflow: "hidden" }}>
        {/* ── Canvas ──────────────────────────────────────────── */}
        <div style={{ position: "relative", background: "var(--ih-surface-2)", overflow: "hidden", borderRight: "1px solid var(--ih-line)" }}>
          {/* Dot grid */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.35,
            backgroundImage: "radial-gradient(circle, var(--ih-ink-30) 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
          }}/>

          {/* Toolbar */}
          <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", zIndex: 2 }}>
            <div className="ih-card" style={{ display: "flex", padding: 4, gap: 2 }}>
              {([
                ["bolt", "Trigger"],
                ["sliders", "Action"],
                ["filter", "Branch"],
                ["clock", "Delay"],
                ["sparkles", "AI step"],
                ["mail", "Notify"],
              ] as const).map(([i, l]) => (
                <button key={l} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 26 }}><Icon name={i} size={11}/> {l}</button>
              ))}
            </div>
            <div className="ih-card" style={{ display: "flex", padding: 4, gap: 2 }}>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 26 }}>Fit</button>
              <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ height: 26 }}>100%</button>
              <span className="ih-kbd" style={{ alignSelf: "center" }}>&#8984;+</span>
            </div>
          </div>

          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0 }}>
            {EDGES.map((e, i) => (
              <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke={e.accent ? "var(--ih-accent)" : "var(--ih-line-2)"} strokeWidth="1.5"/>
            ))}
          </svg>

          {/* Nodes */}
          {NODES.map((n, i) => (
            <div key={i} style={{
              position: "absolute", left: n.x, top: n.y, width: n.w,
              background: "var(--ih-surface)",
              border: `1.5px solid ${n.selected ? "var(--ih-accent)" : n.live ? "var(--ih-accent)" : "var(--ih-line-2)"}`,
              borderRadius: 10, padding: 12,
              boxShadow: n.selected ? "0 0 0 4px var(--ih-accent-soft)" : n.live ? "0 0 0 3px var(--ih-accent-soft)" : "0 1px 3px rgba(0,0,0,.04)",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon name={n.icon} size={11} style={{ color: n.selected || n.live ? "var(--ih-accent)" : "var(--ih-ink-50)" }}/>
                <span className="ih-mono" style={{ fontSize: 8.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{n.kind}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}>{n.title}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 4 }}>{n.sub}</div>
              {n.selected && <span className="ih-pill ih-pill-accent" style={{ position: "absolute", top: -8, right: 8, fontSize: 8, padding: "2px 5px" }}>selected</span>}
              {n.live && !n.selected && <span className="ih-pill ih-pill-accent" style={{ position: "absolute", top: -8, right: 8, fontSize: 8, padding: "2px 5px" }}><span className="ih-dot ih-dot-accent"/> live</span>}
            </div>
          ))}

          {/* Mini-map */}
          <div className="ih-card" style={{ position: "absolute", bottom: 16, left: 16, width: 200, height: 80, padding: 8, opacity: 0.95 }}>
            <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>Overview</div>
            <div style={{ position: "relative", height: 50, background: "var(--ih-surface-2)", borderRadius: 4 }}>
              <div style={{ position: "absolute", top: 8, left: 10, width: 50, height: 30, border: "1px solid var(--ih-accent)", borderRadius: 2 }}/>
              {[8, 30, 52, 74, 110, 140].map((x, i) => <div key={i} style={{ position: "absolute", top: 18 + (i % 2) * 12, left: x, width: 18, height: 8, background: "var(--ih-ink-30)", borderRadius: 2 }}/>)}
            </div>
          </div>

          {/* Run indicator */}
          <div className="ih-card" style={{ position: "absolute", bottom: 16, right: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14 }}>
            <span className="ih-dot ih-dot-accent" style={{ animation: "pulse 1.8s infinite" }}/>
            <div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>RUNNING /run_2041</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Branch &middot; evaluating plan tier</div>
            </div>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>0.34s</span>
          </div>
        </div>

        {/* ── Inspector panel ────────────────────────────────── */}
        <div style={{ background: "var(--ih-surface-2)", padding: 18, overflowY: "auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <span className="ih-eyebrow">Selected &middot; node_4</span>
            <h2 className="ih-serif" style={{ margin: "6px 0 0", fontSize: 22, lineHeight: 1.1 }}>Plan tier? <span className="ih-italic-red">branch</span></h2>
          </div>

          {/* Condition */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Condition</div>
            <div style={{ padding: 10, background: "var(--ih-surface-2)", borderRadius: 6, fontFamily: "var(--ih-font-mono)", fontSize: 11.5 }}>
              <span style={{ color: "var(--ih-accent)" }}>if</span> client.plan === <span style={{ color: "var(--ih-info)" }}>&apos;pro&apos;</span>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {INSPECTOR_FIELDS.map((f) => (
                <div key={f.label}>
                  <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>{f.label}</div>
                  {f.type === "select" ? (
                    <select className="ih-input" defaultValue={f.value}>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="ih-input" defaultValue={f.value}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ih-ink-65)" }}>
              <strong>True</strong> &rarr; Draft onboarding (AI)&ensp;|&ensp;<strong>False</strong> &rarr; Send basic guide
            </div>
          </div>

          {/* Test inputs */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Test inputs</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>client.plan</div>
                <select className="ih-input" defaultValue="pro">
                  <option>pro</option>
                  <option>lite</option>
                </select>
              </div>
              <div>
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)", marginBottom: 4 }}>client.name</div>
                <input className="ih-input" defaultValue="Northwind Co."/>
              </div>
              <button className="ih-btn ih-btn-primary ih-btn-sm" style={{ marginTop: 6 }}><Icon name="play" size={11}/> Run from here</button>
            </div>
          </div>

          {/* Recent runs */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Last 5 runs</div>
            {RECENT_RUNS.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 12px 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 11.5 }}>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r[0]}</span>
                <span className={`ih-dot ${r[1] === "ok" ? "ih-dot-ok" : "ih-dot-danger"}`}/>
                <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>{r[3]}</span>
                <span className="ih-mono" style={{ fontSize: 10.5 }}>{r[2]}</span>
              </div>
            ))}
          </div>

          {/* Node metadata */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Node metadata</div>
            {([
              ["ID", "node_4"],
              ["Type", "IF (branch)"],
              ["Created", "Apr 18, 2026"],
              ["Last modified", "May 8, 2026"],
              ["Handle true", "node_5 (Draft onboarding)"],
              ["Handle false", "node_6 (Send basic guide)"],
            ] as const).map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 11.5 }}>
                <span style={{ color: "var(--ih-ink-50)" }}>{k}</span>
                <span className="ih-mono" style={{ fontSize: 10.5 }}>{v}</span>
              </div>
            ))}
            <button className="ih-btn ih-btn-quiet ih-btn-sm" style={{ marginTop: 10, color: "var(--ih-danger)", width: "100%" }}><Icon name="x" size={11}/> Delete node</button>
          </div>
        </div>
      </div>
    </div>
  )
}
