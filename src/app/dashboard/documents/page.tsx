"use client"

import { Icon } from "@/components/shell"
import type { IconName } from "@/components/shell/icon"

/* ── Demo data ──────────────────────────────────────────────────────────── */

interface DocFile {
  name: string
  date: string
  size: string
}

interface DocCategory {
  label: string
  icon: IconName
  files: DocFile[]
}

const CATEGORIES: DocCategory[] = [
  {
    label: "Proposals",
    icon: "file",
    files: [
      { name: "Northwind Q2 Proposal v2", date: "12 Mar 2026", size: "340 KB" },
    ],
  },
  {
    label: "Contracts",
    icon: "handshake",
    files: [
      { name: "Engagement contract", date: "01 Apr 2026", size: "128 KB" },
    ],
  },
  {
    label: "Reports",
    icon: "chart",
    files: [
      { name: "Audit summary v3", date: "28 Apr 2026", size: "1.2 MB" },
    ],
  },
  {
    label: "Deliverables",
    icon: "folder",
    files: [
      { name: "Sprint 3 deliverables pack", date: "22 Apr 2026", size: "4.8 MB" },
    ],
  },
]

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DocumentsPage() {
  const totalFiles = CATEGORIES.reduce((n, c) => n + c.files.length, 0)

  return (
    <div style={{ padding: "40px 40px 64px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 className="ih-serif" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>Your documents</h1>
      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ih-ink-50)", lineHeight: 1.5 }}>
        {totalFiles} files across {CATEGORIES.length} categories
      </p>

      {/* Category cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 32 }}>
        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="ih-card" style={{ overflow: "hidden" }}>
            {/* Category header */}
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--ih-line)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <Icon name={cat.icon} size={14} style={{ color: "var(--ih-ink-50)" }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{cat.label}</h3>
              <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
                {cat.files.length} {cat.files.length === 1 ? "file" : "files"}
              </span>
            </div>

            {/* File rows */}
            {cat.files.map((file, i) => (
              <div
                key={file.name}
                style={{
                  padding: "16px 24px",
                  borderTop: i === 0 ? "none" : "1px solid var(--ih-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: "var(--ih-surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Icon name="file" size={14} style={{ color: "var(--ih-ink-50)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</div>
                    <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2 }}>
                      {file.date} &middot; {file.size}
                    </div>
                  </div>
                </div>
                <button className="ih-btn ih-btn-ghost ih-btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="download" size={11} />
                  Download
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Security note */}
      <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8, color: "var(--ih-ink-40)" }}>
        <Icon name="shield" size={13} />
        <span style={{ fontSize: 12 }}>All files are stored securely in your project folder</span>
      </div>
    </div>
  )
}
