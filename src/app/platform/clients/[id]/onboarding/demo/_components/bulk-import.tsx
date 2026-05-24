"use client"

/**
 * Bulk-import side panel for the org-mapping demo.
 *
 * Paste a free-text block of "Name — Title — Manager" lines and we resolve
 * managers fuzzily against existing DemoNodes. The CSV tab is intentionally
 * non-functional (decorative drop-zone) — demo polish only.
 */

import * as React from "react"
import { useMemo, useState } from "react"
import { CheckIcon, ClipboardPasteIcon, FileSpreadsheetIcon, UploadCloudIcon, UsersIcon } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { DemoNode } from "./types"

// ── Public contract ──────────────────────────────────────────────────────────

export interface ImportRow {
  name: string
  title: string
  managerName: string | null
  email: string | null
}

interface BulkImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: DemoNode[]
  onImport: (rows: ImportRow[], parentId: string) => void
}

// ── Parsing ──────────────────────────────────────────────────────────────────

interface ParsedRow extends ImportRow {
  managerStatus: "matched" | "ambiguous" | "unresolved" | "empty"
  managerMatchCount: number
  raw: string
}

const SEPARATORS = [" — ", " - ", " | ", ", "] as const

function parseLine(line: string): { name: string; title: string; manager: string | null } | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  for (const sep of SEPARATORS) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep).map((s) => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        return { name: parts[0]!, title: parts[1]!, manager: parts[2] ?? null }
      }
    }
  }
  return null
}

function synthEmail(name: string): string {
  const parts = name.toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return `${parts[0]}@example.com`
  return `${parts[0]}.${parts[parts.length - 1]}@example.com`
}

function resolveManager(
  raw: string | null,
  nodes: DemoNode[],
): { managerName: string | null; status: ParsedRow["managerStatus"]; matchCount: number } {
  if (!raw) return { managerName: null, status: "empty", matchCount: 0 }
  const needle = raw.toLowerCase()
  const matches = nodes.filter((n) => n.name.toLowerCase().includes(needle))
  if (matches.length === 1) return { managerName: matches[0]!.name, status: "matched", matchCount: 1 }
  if (matches.length > 1) return { managerName: raw, status: "ambiguous", matchCount: matches.length }
  return { managerName: raw, status: "unresolved", matchCount: 0 }
}

function parseBlock(text: string, nodes: DemoNode[]): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((raw): ParsedRow | null => {
      const parsed = parseLine(raw)
      if (!parsed) return null
      const { managerName, status, matchCount } = resolveManager(parsed.manager, nodes)
      return {
        name: parsed.name,
        title: parsed.title,
        managerName,
        email: synthEmail(parsed.name) || null,
        managerStatus: status,
        managerMatchCount: matchCount,
        raw,
      }
    })
    .filter((row): row is ParsedRow => row !== null)
}

// ── Component ────────────────────────────────────────────────────────────────

const PLACEHOLDER = [
  "Priya Raman — Chief Operating Officer — Sarah Chen",
  "Daniel Park — VP Engineering — Sarah Chen",
  "Aisha Kapoor — Backend Squad Lead",
].join("\n")

const EYEBROW = "font-mono text-[10px] uppercase tracking-wider text-muted-foreground"

export function BulkImportSheet(p: BulkImportSheetProps): React.ReactElement {
  const { open, onOpenChange, nodes, onImport } = p

  const parentChoices = useMemo(
    () => nodes.filter((n) => n.kind === "ORG" || n.kind === "DEPARTMENT"),
    [nodes],
  )
  const orgRoot = parentChoices.find((n) => n.kind === "ORG") ?? parentChoices[0]

  const [text, setText] = useState("")
  const [parentId, setParentId] = useState<string>(orgRoot?.id ?? "")

  const parsed = useMemo(() => parseBlock(text, nodes), [text, nodes])

  function handleImport() {
    if (parsed.length === 0 || !parentId) return
    const rows: ImportRow[] = parsed.map(({ name, title, managerName, email }) => ({
      name, title, managerName, email,
    }))
    onImport(rows, parentId)
    setText("")
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[560px] flex-col p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b border-border px-6 pb-3 pt-5">
          <SheetTitle className="flex items-center gap-2">
            <UsersIcon size={16} />
            Bulk import people
          </SheetTitle>
          <SheetDescription>
            Paste a list or drop a CSV. Managers are matched against the existing chart.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="paste">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="paste">
                <ClipboardPasteIcon size={14} className="mr-1.5" />
                Paste
              </TabsTrigger>
              <TabsTrigger value="csv">
                <FileSpreadsheetIcon size={14} className="mr-1.5" />
                CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="px-6 pb-6 pt-4">
              <label className={`mb-1.5 block ${EYEBROW}`}>
                Paste people — one per line.{" "}
                <span className="font-sans text-[11px] normal-case tracking-normal text-muted-foreground">
                  Format: Name — Title — Manager (optional)
                </span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                className="h-[200px] w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-[12.5px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-4">
                <div className={`mb-1.5 ${EYEBROW}`}>
                  Preview · {parsed.length} {parsed.length === 1 ? "row" : "rows"}
                </div>
                <PreviewTable rows={parsed} />
              </div>
            </TabsContent>

            <TabsContent value="csv" className="px-6 pb-6 pt-4">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-background px-5 py-9 text-center text-muted-foreground">
                <UploadCloudIcon size={28} className="opacity-50" />
                <div className="text-sm">Drop a CSV here</div>
                <div className="font-mono text-[10px]">name, title, manager, email</div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <label className={EYEBROW}>Attach under</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            {parentChoices.map((n) => (
              <option key={n.id} value={n.id}>
                {n.kind === "ORG" ? `${n.name} (root)` : n.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsed.length === 0 || !parentId}
            className="whitespace-nowrap rounded-md border border-primary bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
          >
            Import {parsed.length || ""} {parsed.length === 1 ? "person" : "people"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Preview table ────────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
        Nothing parsed yet — start typing above.
      </div>
    )
  }

  return (
    <div className="max-h-[220px] overflow-y-auto overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted">
            <Th>Name</Th>
            <Th>Title</Th>
            <Th>Manager</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i === 0 ? "" : "border-t border-border"}>
              <Td>{row.name}</Td>
              <Td className="text-muted-foreground">{row.title}</Td>
              <Td><ManagerCell row={row} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2.5 py-1.5 align-top ${className ?? ""}`}>{children}</td>
}

function ManagerCell({ row }: { row: ParsedRow }) {
  if (row.managerStatus === "empty") {
    return <span className="italic text-muted-foreground/60">—</span>
  }
  if (row.managerStatus === "matched") {
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground/80">
        <CheckIcon size={12} className="text-emerald-600" />
        {row.managerName}
      </span>
    )
  }
  const note = row.managerStatus === "ambiguous" ? `${row.managerMatchCount} matches` : "Unresolved"
  const noteClass = row.managerStatus === "ambiguous" ? "text-amber-700" : "text-muted-foreground"
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="text-muted-foreground">{row.managerName}</span>
      <span className={`font-mono text-[9.5px] uppercase tracking-wider ${noteClass}`}>{note}</span>
    </span>
  )
}
