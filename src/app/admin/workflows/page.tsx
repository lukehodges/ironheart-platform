"use client"

import { Icon } from "@/components/shell"

/* ── Workflow Canvas ─────────────────────────────────────────────────────── */

export default function WorkflowsPage() {
  return (
    <div style={{ margin: "-24px -24px 0", height: "calc(100vh - 64px)" }}>
      {/* Header bar with status + actions — handled inline since no Frame */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ih-eyebrow">Workflows</span>
          <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }}/>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Onboarding · Northwind</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="ih-pill ih-pill-ok" style={{ marginRight: 4 }}><span className="ih-dot ih-dot-ok"/> Active</span>
          <button className="ih-btn ih-btn-quiet ih-btn-sm"><Icon name="play" size={11}/> Test run</button>
          <button className="ih-btn ih-btn-ghost ih-btn-sm">History</button>
          <button className="ih-btn ih-btn-primary ih-btn-sm">Publish v3</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "calc(100% - 46px)" }}>
        {/* Canvas */}
        <div style={{ position: "relative", background: "var(--ih-surface-2)", overflow: "hidden", borderRight: "1px solid var(--ih-line)" }}>
          {/* Grid background */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.4,
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

          {/* Connection lines */}
          <svg style={{ position: "absolute", inset: 0 }}>
            <line x1="140" y1="170" x2="320" y2="170" stroke="var(--ih-line-2)" strokeWidth="1.5"/>
            <line x1="460" y1="170" x2="640" y2="170" stroke="var(--ih-line-2)" strokeWidth="1.5"/>
            <line x1="780" y1="170" x2="780" y2="290" stroke="var(--ih-line-2)" strokeWidth="1.5"/>
            <line x1="780" y1="170" x2="960" y2="170" stroke="var(--ih-accent)" strokeWidth="1.5"/>
            <line x1="780" y1="290" x2="620" y2="380" stroke="var(--ih-line-2)" strokeWidth="1.5"/>
            <line x1="780" y1="290" x2="940" y2="380" stroke="var(--ih-line-2)" strokeWidth="1.5"/>
          </svg>

          {/* Nodes */}
          {([
            { x: 40, y: 130, w: 100, kind: "TRIGGER", title: "New booking", sub: "from /bookings", icon: "bolt" as const, live: false },
            { x: 320, y: 130, w: 140, kind: "ACTION", title: "Create client folder", sub: "drive · synced", icon: "folder" as const, live: false },
            { x: 640, y: 130, w: 140, kind: "BRANCH", title: "Plan tier?", sub: "if plan = pro", icon: "filter" as const, live: true },
            { x: 960, y: 130, w: 140, kind: "AI", title: "Draft welcome", sub: "claude · tone:warm", icon: "sparkles" as const, live: true },
            { x: 520, y: 340, w: 120, kind: "ACTION", title: "Send simple welcome", sub: "tier = lite", icon: "mail" as const, live: false },
            { x: 880, y: 340, w: 120, kind: "ACTION", title: "Book kickoff", sub: "calendar · auto", icon: "calendar" as const, live: false },
          ]).map((n, i) => (
            <div key={i} style={{
              position: "absolute", left: n.x, top: n.y, width: n.w,
              background: "var(--ih-surface)", border: "1px solid " + (n.live ? "var(--ih-accent)" : "var(--ih-line-2)"),
              borderRadius: 10, padding: 12,
              boxShadow: n.live ? "0 0 0 4px var(--ih-accent-soft)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Icon name={n.icon} size={11} style={{ color: n.live ? "var(--ih-accent)" : "var(--ih-ink-50)" }}/>
                <span className="ih-mono" style={{ fontSize: 8.5, color: "var(--ih-ink-40)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{n.kind}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}>{n.title}</div>
              <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 4 }}>{n.sub}</div>
              {n.live && <span className="ih-pill ih-pill-accent" style={{ position: "absolute", top: -8, right: 8, fontSize: 8, padding: "2px 5px" }}><span className="ih-dot ih-dot-accent"/> live</span>}
            </div>
          ))}

          {/* Mini-map */}
          <div className="ih-card" style={{ position: "absolute", bottom: 16, left: 16, width: 200, height: 80, padding: 8, opacity: 0.95 }}>
            <div className="ih-eyebrow" style={{ fontSize: 8, marginBottom: 4 }}>Overview</div>
            <div style={{ position: "relative", height: 50, background: "var(--ih-surface-2)", borderRadius: 4 }}>
              <div style={{ position: "absolute", top: 8, left: 10, width: 50, height: 30, border: "1px solid var(--ih-accent)", borderRadius: 2 }}/>
              {[8, 30, 60, 90, 150].map((x, i) => <div key={i} style={{ position: "absolute", top: 18 + (i % 2) * 12, left: x, width: 18, height: 8, background: "var(--ih-ink-30)", borderRadius: 2 }}/>)}
            </div>
          </div>

          {/* Run state indicator */}
          <div className="ih-card" style={{ position: "absolute", bottom: 16, right: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14 }}>
            <span className="ih-dot ih-dot-accent" style={{ animation: "pulse 1.8s infinite" }}/>
            <div>
              <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>RUNNING /run_2041</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Branch · evaluating plan tier</div>
            </div>
            <span className="ih-mono" style={{ fontSize: 11, color: "var(--ih-ink-65)" }}>0.34s</span>
          </div>
        </div>

        {/* Inspector panel */}
        <div style={{ background: "var(--ih-surface-2)", padding: 18, overflowY: "auto" }}>
          <div style={{ marginBottom: 14 }}>
            <span className="ih-eyebrow">Selected · /node_3</span>
            <h2 className="ih-serif" style={{ margin: "6px 0 0", fontSize: 22, lineHeight: 1.1 }}>Plan tier? <span className="ih-italic-red">branch</span></h2>
          </div>

          {/* Condition card */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14, marginBottom: 10 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Condition</div>
            <div style={{ padding: 10, background: "var(--ih-surface-2)", borderRadius: 6, fontFamily: "var(--ih-font-mono)", fontSize: 11.5 }}>
              <span style={{ color: "var(--ih-accent)" }}>if</span> client.plan === <span style={{ color: "var(--ih-info)" }}>&apos;pro&apos;</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--ih-ink-65)" }}>Outcome → routes to <strong>Draft welcome</strong> (AI). Else routes to <strong>Send simple welcome</strong>.</div>
          </div>

          {/* Test inputs card */}
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

          {/* Last 5 runs card */}
          <div className="ih-card" style={{ background: "var(--ih-surface)", padding: 14 }}>
            <div className="ih-eyebrow" style={{ marginBottom: 10 }}>Last 5 runs</div>
            {([
              ["10:14", "ok", "204ms", "pro"],
              ["08:42", "ok", "189ms", "pro"],
              ["07:14", "ok", "312ms", "lite"],
              ["Mon", "fail", "timeout", "pro"],
              ["Mon", "ok", "178ms", "pro"],
            ] as const).map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 12px 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)", fontSize: 11.5 }}>
                <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>{r[0]}</span>
                <span className={`ih-dot ${r[1] === "ok" ? "ih-dot-ok" : "ih-dot-danger"}`}/>
                <span className="ih-mono" style={{ fontSize: 10.5, color: "var(--ih-ink-65)" }}>{r[3]}</span>
                <span className="ih-mono" style={{ fontSize: 10.5 }}>{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
