"use client"

import { useState } from "react"
import { Eye, Edit3 } from "lucide-react"

interface MarkdownEditorProps {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function MarkdownEditor({ value, onChange, disabled }: MarkdownEditorProps) {
  const [view, setView] = useState<"edit" | "preview">("edit")

  return (
    <div
      style={{
        borderRadius: "var(--ih-r-md)",
        border: "1px solid var(--ih-line)",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--ih-line)",
          background: "var(--ih-surface-2)",
        }}
      >
        {(["edit", "preview"] as const).map((v) => {
          const isActive = view === v
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                fontSize: 11,
                fontFamily: "var(--ih-font-sans)",
                background: isActive ? "var(--ih-surface)" : "transparent",
                border: "none",
                borderRight: isActive ? "1px solid var(--ih-line)" : "1px solid transparent",
                color: isActive ? "var(--ih-ink)" : "var(--ih-ink-50)",
                cursor: "pointer",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {v === "edit" ? <Edit3 size={11} /> : <Eye size={11} />}
              {v === "edit" ? "Edit" : "Preview"}
            </button>
          )
        })}
      </div>

      {view === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={30}
          placeholder="Report content (Markdown)…"
          style={{
            width: "100%",
            padding: 16,
            fontSize: 13,
            fontFamily: "var(--ih-font-mono)",
            lineHeight: 1.65,
            background: "var(--ih-surface)",
            color: "var(--ih-ink)",
            border: "none",
            resize: "vertical",
            outline: "none",
            opacity: disabled ? 0.5 : 1,
            boxSizing: "border-box",
            display: "block",
          }}
        />
      ) : (
        <div
          className="p-4 prose prose-sm max-w-none"
          style={{
            padding: 16,
            fontFamily: "var(--ih-font-sans)",
            fontSize: 14,
            color: "var(--ih-ink)",
            background: "var(--ih-surface)",
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  )
}

// Minimal markdown renderer — h1/h2/h3, paragraphs, bold, italic, lists
function renderMarkdown(md: string): string {
  if (!md) return "<p style='color:var(--ih-ink-40);font-style:italic'>Empty.</p>"

  let html = md
    // escape HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // headings
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    // list items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    // paragraph breaks
    .replace(/\n\n/g, "</p><p>")

  return `<p>${html}</p>`
}
