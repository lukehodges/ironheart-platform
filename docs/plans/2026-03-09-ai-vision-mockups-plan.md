# AI Vision Mockups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing AI assistant mockup with 7 polished pitch-deck pages (landing + 5 phases + infrastructure diagram) that tell the story of Ironheart's AI-native platform roadmap to a CEO audience.

**Architecture:** All pages are static Next.js server components under `src/app/admin/brokerage-mockups/ai-assistant/`. No API calls. All data is hardcoded mock data. Shared subcomponents live in a `_components/` folder alongside the pages. Existing `page.tsx` (current AI assistant) is replaced by the landing page.

**Tech Stack:** Next.js 16 app router, React 19, Tailwind 4, shadcn/ui components (`Card`, `Badge`, `Button`, `Separator`, `Avatar`), Lucide React icons. Pattern: `"use client"` only when needed for interactivity; prefer server components.

**Reference files:**
- Design doc: `docs/plans/2026-03-09-ai-vision-mockups-design.md`
- Existing pattern: `src/app/admin/brokerage-mockups/ai-assistant/page.tsx`
- Import pattern: `src/app/admin/brokerage-mockups/dashboard/page.tsx`
- Index page to update: `src/app/admin/brokerage-mockups/page.tsx`

---

## Wave 1 — Shared Components + Index Update (parallel)

### Task 1: Shared AI mockup components

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/_components/phase-nav.tsx`
- Create: `src/app/admin/brokerage-mockups/ai-assistant/_components/streaming-tool-call.tsx`
- Create: `src/app/admin/brokerage-mockups/ai-assistant/_components/approval-card.tsx`
- Create: `src/app/admin/brokerage-mockups/ai-assistant/_components/entity-card.tsx`

**Step 1: Create phase navigation component**

`src/app/admin/brokerage-mockups/ai-assistant/_components/phase-nav.tsx`:
```tsx
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PhaseNavProps {
  current: "A" | "B" | "C" | "D" | "F"
  title: string
  subtitle: string
}

const PHASES = [
  { id: "A", label: "Phase A", title: "Read-only Intelligence", href: "/admin/brokerage-mockups/ai-assistant/phase-a" },
  { id: "B", label: "Phase B", title: "Actionable Agent", href: "/admin/brokerage-mockups/ai-assistant/phase-b" },
  { id: "C", label: "Phase C", title: "Workflow Intelligence", href: "/admin/brokerage-mockups/ai-assistant/phase-c" },
  { id: "D", label: "Phase D", title: "Memory & Context", href: "/admin/brokerage-mockups/ai-assistant/phase-d" },
  { id: "F", label: "Phase F", title: "Autonomous Operations", href: "/admin/brokerage-mockups/ai-assistant/phase-f" },
]

export function PhaseNav({ current, title, subtitle }: PhaseNavProps) {
  const idx = PHASES.findIndex((p) => p.id === current)
  const prev = idx > 0 ? PHASES[idx - 1] : null
  const next = idx < PHASES.length - 1 ? PHASES[idx + 1] : null

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/admin/brokerage-mockups/ai-assistant" className="hover:text-foreground transition-colors">
            AI Platform Vision
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{title}</span>
        </div>

        {/* Phase stepper */}
        <div className="hidden md:flex items-center gap-1">
          {PHASES.map((p) => (
            <Link key={p.id} href={p.href}>
              <Badge
                variant={p.id === current ? "default" : "outline"}
                className="text-xs cursor-pointer"
              >
                {p.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          {prev ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={prev.href}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {prev.label}
              </Link>
            </Button>
          ) : (
            <div className="w-20" />
          )}
          {next ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={next.href}>
                {next.label}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>

      {/* Phase subtitle */}
      <div className="max-w-7xl mx-auto px-6 pb-3">
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}
```

**Step 2: Create streaming tool call component**

`src/app/admin/brokerage-mockups/ai-assistant/_components/streaming-tool-call.tsx`:
```tsx
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

interface ToolCallStep {
  type: "status" | "tool_call" | "tool_result" | "error"
  label: string
  detail?: string
}

interface StreamingToolCallProps {
  steps: ToolCallStep[]
}

export function StreamingToolCall({ steps }: StreamingToolCallProps) {
  return (
    <div className="space-y-1.5 my-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <div className="mt-0.5 shrink-0">
            {step.type === "tool_result" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : step.type === "error" ? (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            ) : step.type === "tool_call" ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/60 bg-primary/10" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className={
              step.type === "tool_call"
                ? "font-mono text-foreground"
                : step.type === "tool_result"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : step.type === "error"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
            }>
              {step.label}
            </span>
            {step.detail && (
              <span className="text-muted-foreground ml-1.5">— {step.detail}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Create approval card component**

`src/app/admin/brokerage-mockups/ai-assistant/_components/approval-card.tsx`:
```tsx
import { AlertTriangle, Clock, CheckCircle2, XCircle, Edit2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ApprovalCardProps {
  title: string
  details: { label: string; value: string }[]
  impact?: string
  reasoning?: string
  expiresIn?: string
  tier?: "confirm" | "escalate"
  locked?: boolean  // true = Phase B teaser shown in Phase A (greyed out)
  lockedMessage?: string
}

export function ApprovalCard({
  title,
  details,
  impact,
  reasoning,
  expiresIn = "28m 15s",
  tier = "confirm",
  locked = false,
  lockedMessage,
}: ApprovalCardProps) {
  return (
    <div className={`rounded-xl border ${
      locked
        ? "border-border/50 bg-muted/20 opacity-60"
        : tier === "escalate"
          ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
          : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
    } p-4 my-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : tier === "escalate" ? (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {locked ? (
          <Badge variant="outline" className="text-xs shrink-0">Phase B</Badge>
        ) : (
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${tier === "escalate" ? "border-red-300 text-red-600" : "border-amber-300 text-amber-600"}`}
          >
            {tier === "escalate" ? "ESCALATE" : "CONFIRM"}
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 mb-3">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="text-foreground font-medium">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Impact */}
      {impact && (
        <div className="rounded-lg bg-background/60 border border-border px-3 py-2 text-xs text-muted-foreground mb-3">
          <span className="font-medium text-foreground">Impact: </span>{impact}
        </div>
      )}

      {/* Reasoning expand */}
      {reasoning && (
        <details className="mb-3">
          <summary className="text-xs text-primary cursor-pointer hover:underline">Why did you suggest this? ↓</summary>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{reasoning}</p>
        </details>
      )}

      {/* Actions */}
      {locked ? (
        <p className="text-xs text-muted-foreground italic">{lockedMessage ?? "Approval flows unlock in Phase B"}</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
          {expiresIn && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Expires in {expiresIn}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create entity card component**

`src/app/admin/brokerage-mockups/ai-assistant/_components/entity-card.tsx`:
```tsx
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EntityCardProps {
  type: string
  title: string
  subtitle?: string
  fields: { label: string; value: string; highlight?: boolean }[]
  href?: string
  badge?: { label: string; variant?: "default" | "secondary" | "outline" }
}

export function EntityCard({ type, title, subtitle, fields, href, badge }: EntityCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 my-2">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{type}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <Badge variant={badge.variant ?? "outline"} className="text-xs shrink-0">{badge.label}</Badge>
        )}
      </div>
      <div className="space-y-1">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className={f.highlight ? "font-semibold text-primary" : "text-foreground"}>{f.value}</span>
          </div>
        ))}
      </div>
      {href && (
        <div className="mt-3 pt-3 border-t border-border">
          <Link href={href} className="text-xs text-primary hover:underline flex items-center gap-1">
            View full record <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 5: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/_components/
git commit -m "feat(mockups): add shared AI mockup components (PhaseNav, StreamingToolCall, ApprovalCard, EntityCard)"
```

---

### Task 2: Update brokerage-mockups index page

**Files:**
- Modify: `src/app/admin/brokerage-mockups/page.tsx`

**Step 1: Read the current file** (already done above — file uses a `sections` array of objects)

**Step 2: Add AI Platform Vision entry to the sections array**

In `src/app/admin/brokerage-mockups/page.tsx`, add `Brain` to the Lucide import and add a new section entry. Find the sections array and add at the end (before any closing bracket):

```tsx
// Add Brain to lucide imports
import { Brain } from "lucide-react"

// Add to sections array (append as last entry):
{
  href: "/admin/brokerage-mockups/ai-assistant",
  title: "AI Platform Vision",
  description: "Pitch-deck style walkthrough of the 5-phase AI roadmap. Read-only intelligence → autonomous overnight operations. Includes infrastructure architecture diagram.",
  stat: "5 phases",
  color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
  icon: Brain,
},
```

**Step 3: Commit**
```bash
git add src/app/admin/brokerage-mockups/page.tsx
git commit -m "feat(mockups): add AI Platform Vision entry to brokerage-mockups index"
```

---

## Wave 2 — All Pages (parallel, 7 tasks independent of each other)

### Task 3: Landing page

**Files:**
- Overwrite: `src/app/admin/brokerage-mockups/ai-assistant/page.tsx`

**Step 1: Write the landing page**

This replaces the current file entirely. Key sections:
1. Header with Brain icon + title + subtitle
2. Horizontal phase timeline (5 cards in a grid)
3. Before/After value strip
4. Capability heatmap (6 rows × 5 phases)
5. Infrastructure diagram thumbnail card

```tsx
import Link from "next/link"
import {
  Brain,
  ChevronRight,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  Database,
  Moon,
  Search,
  GitBranch,
  Network,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ─── Phase data ───────────────────────────────────────────────────────────────

const phases = [
  {
    id: "A",
    href: "/admin/brokerage-mockups/ai-assistant/phase-a",
    title: "Read-only Intelligence",
    tagline: "The agent reads everything, recommends intelligently, touches nothing.",
    status: "In Development" as const,
    deliverables: [
      "Chat with streaming tool calls across all 7 modules",
      "BNG-specific entity cards (sites, deals, units)",
      "Real-time tool call audit log + token usage",
    ],
    icon: Search,
    color: "border-blue-200 dark:border-blue-800",
    badgeColor: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200",
  },
  {
    id: "B",
    href: "/admin/brokerage-mockups/ai-assistant/phase-b",
    title: "Actionable Agent",
    tagline: "Three-tier approval system gives you control over every action.",
    status: "Planned Q2" as const,
    deliverables: [
      "CONFIRM approval cards with approve / edit / reject",
      "Trust ratchet: tools auto-promote after 50 approvals",
      "Compensation stack: undo any reversible action",
    ],
    icon: CheckCircle2,
    color: "border-emerald-200 dark:border-emerald-800",
    badgeColor: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200",
  },
  {
    id: "C",
    href: "/admin/brokerage-mockups/ai-assistant/phase-c",
    title: "Workflow Intelligence",
    tagline: "Describe a process in plain English. The agent builds the workflow.",
    status: "Planned Q2" as const,
    deliverables: [
      "Natural language → visual workflow generation",
      "AI_DECISION nodes with confidence scoring",
      "Self-healing: agent diagnoses and recovers failures",
    ],
    icon: GitBranch,
    color: "border-violet-200 dark:border-violet-800",
    badgeColor: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200",
  },
  {
    id: "D",
    href: "/admin/brokerage-mockups/ai-assistant/phase-d",
    title: "Memory & Context",
    tagline: "The agent remembers what you taught it, cites its sources, learns from corrections.",
    status: "Planned Q3" as const,
    deliverables: [
      "Cross-session memory: 'Last time you were on Deal D-0089...'",
      "Knowledge base: upload BNG docs, agent cites them",
      "Correction learning: 47 business rules, counting",
    ],
    icon: Database,
    color: "border-amber-200 dark:border-amber-800",
    badgeColor: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200",
  },
  {
    id: "F",
    href: "/admin/brokerage-mockups/ai-assistant/phase-f",
    title: "Autonomous Operations",
    tagline: "The Ghost Operator works overnight. You review the briefing at 8am.",
    status: "Planned Q3" as const,
    deliverables: [
      "Ghost Operator: confirms bookings, processes invoices at 2am",
      "Morning briefing: overnight summary + today's priorities",
      "Compliance copilot: blocks stage transitions on missing docs",
    ],
    icon: Moon,
    color: "border-rose-200 dark:border-rose-800",
    badgeColor: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200",
  },
]

// ─── Capability heatmap ───────────────────────────────────────────────────────

const capabilities = [
  { label: "Read & Reason", phases: [true, true, true, true, true] },
  { label: "Approve & Act", phases: [false, true, true, true, true] },
  { label: "Workflow Intelligence", phases: [false, false, true, true, true] },
  { label: "Memory & Context", phases: [false, false, false, true, true] },
  { label: "Autonomous Operations", phases: [false, false, false, false, true] },
  { label: "Cross-vertical Scale", phases: [true, true, true, true, true] },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIVisionLandingPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Platform Vision</h1>
            <p className="text-muted-foreground">Five phases from read-only intelligence to autonomous overnight operations</p>
          </div>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The Roadmap</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {phases.map((phase, idx) => (
            <div key={phase.id} className={`relative rounded-2xl border-2 ${phase.color} bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
              {/* Phase ID */}
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted text-lg font-bold text-foreground">
                  {phase.id}
                </div>
                <Badge variant="outline" className={`text-xs ${phase.badgeColor}`}>{phase.status}</Badge>
              </div>

              {/* Title + tagline */}
              <div>
                <p className="font-semibold text-foreground text-sm leading-tight">{phase.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{phase.tagline}</p>
              </div>

              {/* Deliverables */}
              <ul className="space-y-1 flex-1">
                {phase.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={phase.href}>
                <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
                  Preview Phase {phase.id}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>

              {/* Connector arrow between cards */}
              {idx < phases.length - 1 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Before/After strip */}
      <div className="rounded-2xl border border-border bg-muted/30 p-6">
        <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Time to answer: "Which Solent sites have unallocated BDUs?"</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">45 min</p>
            <p className="text-sm text-muted-foreground mt-1">Manual — open 4 spreadsheets, cross-reference, email the ecologist</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-3xl font-bold text-primary">2.3 sec</p>
            <p className="text-sm text-muted-foreground mt-1">Phase A — agent queries all modules, returns ranked entity cards</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">0 sec</p>
            <p className="text-sm text-muted-foreground mt-1">Phase F — Ghost Operator monitors this overnight, briefing at 8am</p>
          </div>
        </div>
      </div>

      {/* Capability heatmap */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capability Unlock Map</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-48">Capability</th>
                {phases.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">{p.id}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {capabilities.map((cap, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{cap.label}</td>
                  {cap.phases.map((active, j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      {active ? (
                        <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infrastructure thumbnail */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted">
              <Network className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Architecture Diagram</p>
              <p className="text-sm text-muted-foreground">AI agent internals + how it powers BNG brokerage</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/brokerage-mockups/ai-assistant/infrastructure">
              View diagram <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
        {/* Mini diagram preview */}
        <div className="bg-muted/50 border-t border-border px-6 py-4 flex items-center gap-4 overflow-x-auto">
          {["User", "tRPC + Next.js", "Trigger.dev", "Claude API", "Module Registry", "Data Layer"].map((node, i, arr) => (
            <div key={node} className="flex items-center gap-3 shrink-0">
              <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                {node}
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
```

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/page.tsx
git commit -m "feat(mockups): add AI Platform Vision landing page with phase timeline, heatmap, and infrastructure thumbnail"
```

---

### Task 4: Phase A page — Read-only Intelligence

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/phase-a/page.tsx`

**Step 1: Write the page**

Three-column layout. Left 40%: chat panel with streaming tool call cascade + site entity cards + Phase B teaser (locked approval card) + tool timeout edge case. Right 60%: session list (top), tool call log (middle), token usage bar (bottom).

```tsx
"use client"

import Link from "next/link"
import { Brain, Search, ChevronRight, Activity, Clock, Zap, User, Bot, Sparkles, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PhaseNav } from "../_components/phase-nav"
import { StreamingToolCall } from "../_components/streaming-tool-call"
import { EntityCard } from "../_components/entity-card"
import { ApprovalCard } from "../_components/approval-card"

// ─── Mock data ────────────────────────────────────────────────────────────────

const toolSteps = [
  { type: "status" as const, label: "Searching BNG sites in Solent catchment..." },
  { type: "tool_call" as const, label: "sites.list({ region: 'Solent', limit: 100 })" },
  { type: "tool_result" as const, label: "✓ Found 47 habitat sites", detail: "ranked by area" },
  { type: "status" as const, label: "Calculating unallocated biodiversity units..." },
  { type: "tool_call" as const, label: "sites.calculateUnallocated({ siteIds: [...] })" },
  { type: "tool_result" as const, label: "✓ 8 sites with surplus ≥ 30 BDUs identified" },
  { type: "status" as const, label: "Matching to active developer requirements..." },
  { type: "tool_call" as const, label: "deals.list({ status: 'active', catchment: 'Solent' })" },
  { type: "tool_result" as const, label: "✓ 12 matching developer requirements found" },
]

const timeoutSteps = [
  { type: "status" as const, label: "Searching NE registration records..." },
  { type: "error" as const, label: "Service taking longer than expected — retrying with narrower query" },
  { type: "tool_call" as const, label: "compliance.list({ region: 'Solent', limit: 20 })" },
  { type: "tool_result" as const, label: "✓ Retrieved — 14 records in Solent catchment" },
]

const siteCards = [
  {
    title: "Manor Fields (S-0005)",
    subtitle: "North Hampshire · 26.7 ha",
    fields: [
      { label: "Total improvement BDUs", value: "203 units" },
      { label: "Unallocated", value: "203 units", highlight: true },
      { label: "Habitat type", value: "Lowland Meadow (High)" },
      { label: "Nearest developer need", value: "Taylor Wimpey · 8 km" },
    ],
    badge: { label: "94% match", variant: "default" as const },
  },
  {
    title: "Whiteley Farm (S-0001)",
    subtitle: "Solent · 18.4 ha",
    fields: [
      { label: "Total improvement BDUs", value: "115 units" },
      { label: "Unallocated", value: "52 units", highlight: true },
      { label: "Habitat type", value: "Lowland Grassland (Medium)" },
      { label: "Nearest developer need", value: "Bellway Homes · 12 km" },
    ],
    badge: { label: "87% match", variant: "secondary" as const },
  },
  {
    title: "Hamble Wetlands (S-0004)",
    subtitle: "Eastern Solent · 31.2 ha",
    fields: [
      { label: "Total improvement BDUs", value: "289 units" },
      { label: "Unallocated", value: "38 units", highlight: true },
      { label: "Habitat type", value: "Reedbeds (Very High)" },
      { label: "Nearest developer need", value: "Persimmon · 6 km" },
    ],
    badge: { label: "82% match", variant: "secondary" as const },
  },
]

const sessions = [
  { title: "Solent unallocated BDU analysis", time: "Today, 8:02 AM", turns: "current" },
  { title: "Fareham Woodland registration status", time: "Yesterday, 4:15 PM", turns: "6 turns" },
  { title: "Q1 compliance gap review", time: "7 Mar, 2:30 PM", turns: "12 turns" },
  { title: "Taylor Wimpey supply matching", time: "6 Mar, 10:00 AM", turns: "8 turns" },
]

const toolLog = [
  { name: "sites.list", calls: 2, status: "✓" },
  { name: "sites.calculateUnallocated", calls: 1, status: "✓" },
  { name: "deals.list", calls: 1, status: "✓" },
  { name: "compliance.list", calls: 1, status: "⚠ timeout → retry" },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhaseAPage() {
  return (
    <div className="min-h-screen">
      <PhaseNav
        current="A"
        title="Phase A — Read-only Intelligence"
        subtitle="The agent queries all 7 modules, reasons across them, and returns insights. It cannot write, create, or modify anything."
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Chat panel (left, 3 cols) ── */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Live session — 9 March 2026, 8:02 AM</CardTitle>
                  </div>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Read-only mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Viewing: BNG Portfolio Dashboard · Page context active
                </p>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-border/50">

                  {/* User message */}
                  <div className="px-4 py-4 bg-muted/30">
                    <div className="flex gap-3 flex-row-reverse">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-foreground/10 text-xs"><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="text-xs text-muted-foreground">8:02 AM</span>
                          <span className="text-xs font-medium text-foreground">You</span>
                        </div>
                        <div className="inline-block text-left rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
                          Which BNG sites in the Solent catchment have the most unallocated biodiversity units, and which active developers could they serve?
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent response */}
                  <div className="px-4 py-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs"><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-foreground">AI Assistant</span>
                          <span className="text-xs text-muted-foreground">8:02 AM</span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
                          {/* Streaming tool calls */}
                          <p className="text-xs text-muted-foreground italic mb-2">Reasoning across modules...</p>
                          <StreamingToolCall steps={toolSteps} />

                          <Separator className="my-3" />

                          <p className="text-sm text-foreground mb-1">
                            Found <strong>8 Solent sites</strong> with surplus BDUs matched against <strong>12 active developer requirements</strong>. Top 3 by unallocated supply:
                          </p>

                          {/* Entity cards */}
                          {siteCards.map((card, i) => (
                            <EntityCard
                              key={i}
                              type="Habitat Site"
                              title={card.title}
                              subtitle={card.subtitle}
                              fields={card.fields}
                              href="/admin/brokerage-mockups/sites"
                              badge={card.badge}
                            />
                          ))}

                          {/* Tool timeout edge case */}
                          <Separator className="my-3" />
                          <p className="text-xs text-muted-foreground italic mb-2">Checking NE compliance records...</p>
                          <StreamingToolCall steps={timeoutSteps} />
                          <p className="text-sm text-foreground mt-2">All 3 sites have current NE registration. <strong>Manor Fields</strong> is the strongest match — same NCA, LNRS-aligned habitat types, closest proximity to Taylor Wimpey&apos;s requirement.</p>

                          {/* Phase B teaser */}
                          <Separator className="my-3" />
                          <ApprovalCard
                            title="Create comparison quote for Taylor Wimpey"
                            details={[
                              { label: "Site", value: "Manor Fields (S-0005)" },
                              { label: "Units", value: "30 area BDUs" },
                              { label: "Unit price", value: "£3,000" },
                              { label: "Total value", value: "£90,000" },
                            ]}
                            locked
                            lockedMessage="Approval flows and write actions unlock in Phase B. In Phase A, the agent can only query and recommend."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm text-muted-foreground">Ask anything about your portfolio, sites, deals, or compliance...</span>
                    <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-lg shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right panels (2 cols) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Session list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Session History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {sessions.map((s, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                      {i === 0 && <Badge variant="default" className="text-xs shrink-0">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.time} · {s.turns}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tool call log */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Tool Call Log</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {toolLog.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-foreground">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{t.calls}x</Badge>
                        <span className="text-muted-foreground">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Token usage */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Session Token Usage</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium text-foreground">12,450 / 50,000</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "24.9%" }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>System prompt: 500</div>
                  <div>User context: 200</div>
                  <div>Conversation: 3,200</div>
                  <div>Tool schemas: 8,550</div>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Budget healthy — 75% remaining
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/phase-a/
git commit -m "feat(mockups): add Phase A — Read-only Intelligence mockup"
```

---

### Task 5: Phase B page — Actionable Agent

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/phase-b/page.tsx`

**Step 1: Write the page**

Three-column layout. Chat shows: morning briefing → approval card with "Why did you draft this?" expandable → edit flow description → approval confirmation + undo affordance → trust ratchet notification as a subtle card. Right panel: approval queue (3 items with countdown timers), recent auto actions, undo stack.

Key UI elements to include:
- CONFIRM approval card (full, not locked) with impact + reasoning + [Approve][Edit][Reject] buttons + expiry timer
- "Why did you draft this?" collapsible showing reasoning chain
- Post-approval: "✅ Sent" message + "[Undo — available until 9pm]" link
- Trust ratchet suggestion card (non-blocking, in right panel)
- Right panel approval queue with countdown timers on each pending action

Follows same import and structure pattern as Phase A. Use `PhaseNav current="B"`.

All mock data hardcoded. Session tokens show higher usage (42,000/50,000) showing the agent has done more work. Right panel: 3 approval queue items (compliance reminder, quote creation, site visit reschedule) each with different time-remaining. Recent auto actions show 4 AUTO-tier actions that ran without approval. Undo stack shows 2 reversible completed actions.

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/phase-b/
git commit -m "feat(mockups): add Phase B — Actionable Agent mockup with approval cards and trust ratchet"
```

---

### Task 6: Phase C page — Workflow Intelligence

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/phase-c/page.tsx`

**Step 1: Write the page**

Three-column layout. Chat shows: NL workflow generation with clarifying question → user answers → inline compact workflow preview (ASCII/CSS node diagram) → what-if simulator result ("12 deals would have been blocked instead of 2"). Right panel tabs: workflow graph preview (full nodes + edges with AI_DECISION in gold) + active automations with ⚡ AI node indicators.

Key UI elements:
- Clarifying question card from agent (styled differently from approval card — informational, not action)
- Inline compact workflow diagram using CSS flexbox/grid nodes (no external lib): TRIGGER → AI_DECISION → two branches (passed/missing)
- What-if simulator result as a comparison table
- Right panel: full workflow graph (5-6 nodes in vertical layout with connecting lines using CSS borders) + "Active Automations" list showing which workflows have AI nodes
- Edge case visible: cycle detection warning card

Use `PhaseNav current="C"`. All mock data hardcoded.

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/phase-c/
git commit -m "feat(mockups): add Phase C — Workflow Intelligence mockup with NL generation and AI_DECISION nodes"
```

---

### Task 7: Phase D page — Memory & Context

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/phase-d/page.tsx`

**Step 1: Write the page**

Three-column layout. Chat shows: cross-session opener ("Welcome back — last week you were on Deal D-0089...") → knowledge base citation inline in agent response (two cited chunks with similarity scores) → conflict detection card (user changed a rule, 4 live deals impacted with [Update all 4] button).

Key UI elements:
- Cross-session banner at top of chat: "Resumed from 3 Mar session — Deal D-0089, Bellway Homes"
- KB citation component: small expandable citation badges under agent text (document name, chunk number, similarity %)
- Conflict detection card (amber border, lists 4 affected deals with deal IDs, three action buttons)
- RAG conflict edge case: agent surfaces two contradicting chunks and asks user to resolve
- Right panel: Memory layers panel (3 stacked boxes: Redis/PG/pgvector with token counts and cadence), Corrections learned list (last 5 rules), KB status (42 docs, 8,347 chunks, last indexed 2h ago)

Use `PhaseNav current="D"`. All mock data hardcoded.

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/phase-d/
git commit -m "feat(mockups): add Phase D — Memory & Context mockup with cross-session memory and KB citations"
```

---

### Task 8: Phase F page — Autonomous Operations

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/phase-f/page.tsx`

**Step 1: Write the page**

Three-column layout. Chat shows morning briefing as first message (auto-loaded at 8am): overnight autonomous summary (3 confirmed bookings, 1 review published, 1 invoice processed) + needs-attention section (1 mixed review draft, 1 aging deal, 1 self-corrected error at 3:14am with "[What I've learned →]"). Right panel: overnight timeline (horizontal visual with 8 colour-coded action blocks from 11pm–7am, each with hover label), Ghost Operator confidence gauge (96.4% / radial display), compliance copilot card (3 compliance gaps).

Key UI elements:
- Morning briefing styled like a rich assistant message with clear ✓ / ⚠ sections
- 3:14am error card showing: what happened, how it was caught and corrected, what was learned — transparent accountability
- Overnight timeline: a horizontal strip with labelled time markers (11pm, 12am, 2am, 4am, 6am, 7am) and coloured blocks (green=auto, amber=queued, red=error→corrected)
- Ghost Operator confidence: large number "96.4%" with subtitle "1,847 autonomous decisions" + trend note
- Compliance copilot: table of 3 gaps (site, type, days overdue, action assigned)

Use `PhaseNav current="F"`. All mock data hardcoded.

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/phase-f/
git commit -m "feat(mockups): add Phase F — Autonomous Operations mockup with Ghost Operator and morning briefing"
```

---

### Task 9: Infrastructure diagram page

**Files:**
- Create: `src/app/admin/brokerage-mockups/ai-assistant/infrastructure/page.tsx`

**Step 1: Write the page**

Two sections on a dark-ish background (or use a slightly darker muted background within the card):

**Section 1 — AI Agent Architecture (swim lane diagram)**
Build entirely with Tailwind CSS — no external diagram library. Use a horizontal swim-lane layout:
- 6 vertical lanes, each labelled at top: User | tRPC + Next.js | Trigger.dev | Claude API | Module Registry | Data Layer
- Between lanes: arrows built with CSS (`→` characters or border tricks)
- Key nodes as rounded boxes in each lane
- Approval gate branch: forked path in the Trigger.dev lane showing `wait.forToken()` → approval card → resume
- Insets as small cards in the bottom half of the section: Memory Layers (3 stacked coloured boxes), Trust Ratchet micro-diagram (promotion/demotion arrows), Fail-safe branches (4 orange paths)

**Section 2 — How This Powers BNG**
A linear flow diagram below the architecture, showing one end-to-end BNG journey:
- Developer submits 30-unit requirement → Agent matches to 3 Solent sites → Draft quote created → Deal enters pipeline → Compliance copilot monitors stage transitions → Ghost Operator processes invoice overnight → Morning briefing surfaces closed deal
- Each step as a styled card with connecting arrows
- Three callout boxes: "Parcel-level allocation", "Multi-tenant isolation", "Cross-vertical: Nutrients / Carbon / Real Estate / Energy"

Navigation: Breadcrumb back to landing page. No PhaseNav (this is the infra page, not a phase).

All CSS-only, no diagram library. Use `bg-muted/50` for lane backgrounds, primary colour for flow arrows, module-specific colours for the bottom BNG section.

**Step 2: Commit**
```bash
git add src/app/admin/brokerage-mockups/ai-assistant/infrastructure/
git commit -m "feat(mockups): add infrastructure architecture diagram page (AI agent + BNG application layers)"
```

---

## Wave 3 — Final verification

### Task 10: Verify all pages render

**Step 1: Check all routes exist**
```bash
ls src/app/admin/brokerage-mockups/ai-assistant/
# Expected: page.tsx  phase-a/  phase-b/  phase-c/  phase-d/  phase-f/  infrastructure/  _components/
```

**Step 2: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -50
```
Fix any type errors. Common issues:
- Missing `"use client"` directive on pages that use client hooks
- Icon not imported (check all Lucide imports)
- Badge `variant` prop values must be `"default" | "secondary" | "outline" | "destructive"`

**Step 3: Build check**
```bash
npx next build 2>&1 | tail -30
```

**Step 4: Commit fixes if any**
```bash
git add -p
git commit -m "fix(mockups): resolve TypeScript/build errors in AI vision mockup pages"
```

---

## Execution note

These 7 pages are independent — Tasks 3–9 can all run in parallel as subagents. Task 1 (shared components) and Task 2 (index update) should complete first (Wave 1) since the phase pages import from `_components/`.

Recommended parallel execution:
- Wave 1: Tasks 1 + 2 in parallel
- Wave 2: Tasks 3–9 in parallel (7 subagents)
- Wave 3: Task 10 (verification, single pass)
