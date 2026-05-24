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
    <div className="rounded-md border border-border">
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => setView("edit")}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs ${
            view === "edit"
              ? "bg-background border-r border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          onClick={() => setView("preview")}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs ${
            view === "preview"
              ? "bg-background border-r border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye size={12} /> Preview
        </button>
      </div>

      {view === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={30}
          placeholder="Report content (Markdown)…"
          className="w-full p-4 text-sm font-mono leading-relaxed bg-background border-0 resize-y focus:outline-none disabled:opacity-50"
        />
      ) : (
        <div
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  )
}

// Minimal markdown renderer — h1/h2/h3, paragraphs, bold, italic, lists
function renderMarkdown(md: string): string {
  if (!md) return "<p class='text-muted-foreground italic'>Empty.</p>"

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
