# Outreach Sequences Page — Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Sequences page at `/admin/outreach/sequences` with filter bar, A/B test spotlight, sequence cards grid, and a full-featured sequence editor slide-over (Settings, Steps, Contacts, Performance tabs).

**Architecture:** Standalone Next.js page route with co-located `_components/` directory. The editor slide-over uses Dialog for the panel and Tabs for sub-views. Steps editor is extracted into its own component to keep files under ~300 lines. All data flows through existing `api.outreach.*` tRPC hooks — no new backend work needed.

**Tech Stack:** React 19, tRPC React Query hooks, Tailwind 4, Lucide icons, Sonner toasts

**Spec:** `docs/superpowers/specs/2026-03-21-outreach-ui-design.md` (Section 4: Sequences)

**Depends on:** Plan 1 (Backend Extensions) — completed, Plan 2 (Dashboard UI) — completed/in-progress

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/admin/outreach/sequences/page.tsx` | Create | Sequences page — filter bar, A/B spotlight, cards grid |
| `src/app/admin/outreach/sequences/_components/sequence-card.tsx` | Create | Individual sequence card with stats + actions |
| `src/app/admin/outreach/sequences/_components/ab-test-spotlight.tsx` | Create | Side-by-side A/B comparison section |
| `src/app/admin/outreach/sequences/_components/sequence-editor.tsx` | Create | Editor slide-over shell — Settings + Performance tabs |
| `src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx` | Create | Steps tab — step list with expand/collapse, variable pills |
| `src/app/admin/outreach/sequences/_components/editor-contacts-tab.tsx` | Create | Contacts tab — mini table of enrolled contacts |
| `src/components/layout/sidebar-nav.tsx` | Modify | Add "Sequences" sub-link under Outreach |

---

### Task 1: A/B Test Spotlight component

**Files:**
- Create: `src/app/admin/outreach/sequences/_components/ab-test-spotlight.tsx`

- [ ] **Step 1: Create the A/B Test Spotlight component**

Create `src/app/admin/outreach/sequences/_components/ab-test-spotlight.tsx`:

```tsx
"use client"

import { Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ABSequence {
  id: string
  name: string
  sector: string
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
}

interface ABTestSpotlightProps {
  variantA: ABSequence
  variantB: ABSequence
}

export function ABTestSpotlight({ variantA, variantB }: ABTestSpotlightProps) {
  const winner = variantA.replyRate >= variantB.replyRate ? "A" : "B"
  // Simplified confidence — hardcoded for now, real calculation post-MVP
  const totalSamples = variantA.totalSent + variantB.totalSent
  const confidence = Math.min(95, Math.round(50 + totalSamples * 0.3))

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">A/B Test Spotlight</p>
          <Badge variant="secondary" className="text-[10px]">{variantA.sector}</Badge>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {[
            { seq: variantA, variant: "A" },
            { seq: variantB, variant: "B" },
          ].map(({ seq, variant }) => (
            <Card key={seq.id} className={winner === variant ? "border-emerald-300 bg-emerald-50/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-foreground">{seq.name}</p>
                  {winner === variant && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                      WINNING
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalSent}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Reply Rate</p>
                    <p className="text-lg font-bold font-mono text-foreground">{seq.replyRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Replied</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalReplied}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Converted</p>
                    <p className="text-sm font-semibold font-mono">{seq.totalConverted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confidence meter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">Statistical confidence</p>
            <p className="text-xs font-medium font-mono">{confidence}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/ab-test-spotlight.tsx
git commit -m "feat(outreach): add A/B test spotlight component for sequences page"
```

---

### Task 2: Sequence Card component

**Files:**
- Create: `src/app/admin/outreach/sequences/_components/sequence-card.tsx`

- [ ] **Step 1: Create the Sequence Card component**

Create `src/app/admin/outreach/sequences/_components/sequence-card.tsx`:

```tsx
"use client"

import { Mail, Linkedin, Phone, Pause, Play, Eye, Copy, Archive } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/trpc/react"
import type { OutreachStep, OutreachChannel } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SequenceCardData {
  id: string
  name: string
  sector: string
  isActive: boolean
  archivedAt: Date | null
  abVariant: string | null
  pairedSequenceId: string | null
  steps: OutreachStep[]
  totalSent: number
  totalReplied: number
  replyRate: number
  totalConverted: number
  conversionRate: number
}

type SequenceStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"

interface SequenceCardProps {
  sequence: SequenceCardData
  onEdit: (sequenceId: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatus(seq: { isActive: boolean; archivedAt: Date | null }): SequenceStatus {
  if (seq.archivedAt) return "ARCHIVED"
  return seq.isActive ? "ACTIVE" : "PAUSED"
}

const STATUS_STYLES: Record<SequenceStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  PAUSED: { label: "Paused", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-500 border-slate-200" },
}

const CHANNEL_ICONS: Record<OutreachChannel, React.ElementType> = {
  EMAIL: Mail,
  LINKEDIN_REQUEST: Linkedin,
  LINKEDIN_MESSAGE: Linkedin,
  CALL: Phone,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SequenceCard({ sequence, onEdit }: SequenceCardProps) {
  const utils = api.useUtils()
  const status = getStatus(sequence)
  const style = STATUS_STYLES[status]

  const updateSequence = api.outreach.updateSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      void utils.outreach.sequenceAnalytics.invalidate()
    },
  })

  const archiveSequence = api.outreach.archiveSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      toast.success(`${sequence.name} archived`)
    },
  })

  function handleTogglePause() {
    updateSequence.mutate(
      { sequenceId: sequence.id, isActive: !sequence.isActive },
      {
        onSuccess: () => {
          toast.success(sequence.isActive ? `${sequence.name} paused` : `${sequence.name} resumed`)
        },
      },
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <button
            className="text-sm font-medium text-foreground truncate hover:underline text-left"
            onClick={() => onEdit(sequence.id)}
          >
            {sequence.name}
          </button>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <Badge variant="secondary" className="text-[10px]">{sequence.sector}</Badge>
            <Badge className={`text-[10px] ${style.className}`}>{style.label}</Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Sent</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalSent}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Replied</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalReplied}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Reply Rate</p>
            <p className="text-sm font-semibold font-mono">{sequence.replyRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Converted</p>
            <p className="text-sm font-semibold font-mono">{sequence.totalConverted}</p>
          </div>
        </div>

        {/* Step flow visualization */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto py-1">
          {sequence.steps.map((step, i) => {
            const Icon = CHANNEL_ICONS[step.channel] ?? Mail
            return (
              <div key={step.position} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                    {step.delayDays}d
                  </span>
                )}
                <div className="flex items-center justify-center w-7 h-7 rounded-full border bg-muted/50 shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-1.5 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(sequence.id)}
          >
            <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
            Edit
          </Button>
          {status !== "ARCHIVED" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleTogglePause}
                disabled={updateSequence.isPending}
              >
                {status === "ACTIVE" ? (
                  <><Pause className="h-3 w-3 mr-1" aria-hidden="true" /> Pause</>
                ) : (
                  <><Play className="h-3 w-3 mr-1" aria-hidden="true" /> Resume</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => archiveSequence.mutate({ sequenceId: sequence.id })}
                disabled={archiveSequence.isPending}
              >
                <Archive className="h-3 w-3 mr-1" aria-hidden="true" />
                Archive
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/sequence-card.tsx
git commit -m "feat(outreach): add sequence card component with stats, step flow, and actions"
```

---

### Task 3: Editor — Steps tab

**Files:**
- Create: `src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx`

- [ ] **Step 1: Create the Steps tab component**

Create `src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx`:

```tsx
"use client"

import { useState, useRef, useCallback } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2, Mail, Linkedin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { OutreachStep, OutreachChannel } from "@/modules/outreach/outreach.types"

interface EditorStepsTabProps {
  steps: OutreachStep[]
  onChange: (steps: OutreachStep[]) => void
}

const CHANNELS: { value: OutreachChannel; label: string; icon: React.ElementType }[] = [
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "LINKEDIN_REQUEST", label: "LinkedIn Request", icon: Linkedin },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message", icon: Linkedin },
  { value: "CALL", label: "Call", icon: Phone },
]

const TEMPLATE_VARS = ["{{firstName}}", "{{lastName}}", "{{company}}", "{{sector}}"]

export function EditorStepsTab({ steps, onChange }: EditorStepsTabProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(
    steps.length > 0 ? steps[0].position : null,
  )
  const bodyRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map())

  const updateStep = useCallback(
    (position: number, patch: Partial<OutreachStep>) => {
      onChange(
        steps.map((s) => (s.position === position ? { ...s, ...patch } : s)),
      )
    },
    [steps, onChange],
  )

  const removeStep = useCallback(
    (position: number) => {
      const filtered = steps.filter((s) => s.position !== position)
      // Reindex positions
      const reindexed = filtered.map((s, i) => ({ ...s, position: i + 1 }))
      onChange(reindexed)
      setExpandedStep(null)
    },
    [steps, onChange],
  )

  const addStep = useCallback(() => {
    const newStep: OutreachStep = {
      position: steps.length + 1,
      channel: "EMAIL",
      delayDays: 3,
      bodyMarkdown: "",
    }
    onChange([...steps, newStep])
    setExpandedStep(newStep.position)
  }, [steps, onChange])

  function insertVariable(position: number, variable: string) {
    const textarea = bodyRefs.current.get(position)
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const step = steps.find((s) => s.position === position)
    if (!step) return

    const before = step.bodyMarkdown.substring(0, start)
    const after = step.bodyMarkdown.substring(end)
    const newBody = before + variable + after

    updateStep(position, { bodyMarkdown: newBody })

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + variable.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const isExpanded = expandedStep === step.position
        const ChannelMeta = CHANNELS.find((c) => c.value === step.channel)

        return (
          <div key={step.position} className="border rounded-lg">
            {/* Collapsed header */}
            <button
              className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedStep(isExpanded ? null : step.position)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Step {step.position}</span>
              <Badge variant="secondary" className="text-[10px]">
                {ChannelMeta?.label ?? step.channel}
              </Badge>
              {step.delayDays > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{step.delayDays}d delay
                </span>
              )}
              {step.subject && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {step.subject}
                </span>
              )}
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t">
                <div className="pt-3 grid grid-cols-2 gap-3">
                  {/* Channel */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Channel
                    </label>
                    <Select
                      value={step.channel}
                      onValueChange={(v) =>
                        updateStep(step.position, { channel: v as OutreachChannel })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value}>
                            {ch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delay Days */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Delay (days)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(e) =>
                        updateStep(step.position, {
                          delayDays: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Subject (email only) */}
                {step.channel === "EMAIL" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Subject
                    </label>
                    <Input
                      value={step.subject ?? ""}
                      onChange={(e) =>
                        updateStep(step.position, { subject: e.target.value || undefined })
                      }
                      placeholder="Email subject line..."
                      className="h-8 text-sm"
                    />
                  </div>
                )}

                {/* Body with variable pills */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Body
                  </label>
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors font-mono"
                        onClick={() => insertVariable(step.position, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    ref={(el) => {
                      if (el) bodyRefs.current.set(step.position, el)
                      else bodyRefs.current.delete(step.position)
                    }}
                    value={step.bodyMarkdown}
                    onChange={(e) =>
                      updateStep(step.position, { bodyMarkdown: e.target.value })
                    }
                    placeholder="Write your message..."
                    rows={5}
                    className="text-sm font-mono"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Internal Notes
                  </label>
                  <Textarea
                    value={step.notes ?? ""}
                    onChange={(e) =>
                      updateStep(step.position, { notes: e.target.value || undefined })
                    }
                    placeholder="Notes for your reference..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Remove step */}
                {steps.length > 1 && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeStep(step.position)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove Step
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Step button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addStep}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx
git commit -m "feat(outreach): add steps tab component with expand/collapse, variable pills"
```

---

### Task 4: Editor — Contacts tab

**Files:**
- Create: `src/app/admin/outreach/sequences/_components/editor-contacts-tab.tsx`

- [ ] **Step 1: Create the Contacts tab component**

Create `src/app/admin/outreach/sequences/_components/editor-contacts-tab.tsx`:

```tsx
"use client"

import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface EditorContactsTabProps {
  sequenceId: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  REPLIED: "bg-emerald-100 text-emerald-700",
  BOUNCED: "bg-red-100 text-red-700",
  OPTED_OUT: "bg-slate-100 text-slate-500",
  CONVERTED: "bg-purple-100 text-purple-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
}

export function EditorContactsTab({ sequenceId }: EditorContactsTabProps) {
  const { data, isLoading } = api.outreach.listContacts.useQuery({
    sequenceId,
    limit: 50,
  })

  const contacts = data?.contacts ?? data ?? []

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No contacts enrolled in this sequence yet.
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Step</TableHead>
            <TableHead className="text-xs">Next Due</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact: Record<string, unknown>) => {
            const id = contact.id as string
            const name =
              (contact.customerFirstName as string ?? "") +
              " " +
              (contact.customerLastName as string ?? "")
            const status = (contact.status as string) ?? "ACTIVE"
            const step = (contact.currentStep as number) ?? 1
            const nextDue = contact.nextDueAt
              ? new Date(contact.nextDueAt as string).toLocaleDateString()
              : "—"

            return (
              <TableRow key={id}>
                <TableCell className="text-sm">{name.trim() || "Unknown"}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${STATUS_COLORS[status] ?? ""}`}
                  >
                    {status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-mono">{step}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{nextDue}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/editor-contacts-tab.tsx
git commit -m "feat(outreach): add contacts tab for sequence editor"
```

---

### Task 5: Sequence Editor slide-over (shell + Settings + Performance)

**Files:**
- Create: `src/app/admin/outreach/sequences/_components/sequence-editor.tsx`

- [ ] **Step 1: Create the Sequence Editor component**

Create `src/app/admin/outreach/sequences/_components/sequence-editor.tsx`. This contains the Dialog shell, tabs, Settings tab (inline), and Performance tab (inline). Steps and Contacts tabs delegate to their own components.

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EditorStepsTab } from "./editor-steps-tab"
import { EditorContactsTab } from "./editor-contacts-tab"
import type { OutreachStep } from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SequenceEditorProps {
  sequenceId: string | null // null = create mode
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormState {
  name: string
  description: string
  sector: string
  targetIcp: string
  isActive: boolean
  steps: OutreachStep[]
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  sector: "",
  targetIcp: "",
  isActive: true,
  steps: [{ position: 1, channel: "EMAIL", delayDays: 0, bodyMarkdown: "" }],
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SequenceEditor({ sequenceId, open, onOpenChange }: SequenceEditorProps) {
  const isCreateMode = sequenceId === null
  const utils = api.useUtils()

  // Fetch sequence data when editing
  const sequenceQuery = api.outreach.getSequenceById.useQuery(
    { sequenceId: sequenceId! },
    { enabled: !!sequenceId && open },
  )

  // Analytics for this sequence
  const analyticsQuery = api.outreach.sequenceAnalytics.useQuery(
    {},
    { enabled: !!sequenceId && open },
  )

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [activeTab, setActiveTab] = useState("settings")

  // Populate form when sequence data loads
  useEffect(() => {
    if (sequenceQuery.data) {
      const seq = sequenceQuery.data
      setForm({
        name: seq.name,
        description: seq.description ?? "",
        sector: seq.sector,
        targetIcp: seq.targetIcp ?? "",
        isActive: seq.isActive,
        steps: seq.steps.length > 0 ? seq.steps : EMPTY_FORM.steps,
      })
    } else if (isCreateMode && open) {
      setForm(EMPTY_FORM)
      setActiveTab("settings")
    }
  }, [sequenceQuery.data, isCreateMode, open])

  // Mutations
  const createSequence = api.outreach.createSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      toast.success("Sequence created")
    },
    onError: (err) => toast.error(err.message),
  })

  const updateSequence = api.outreach.updateSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate()
      void utils.outreach.sequenceAnalytics.invalidate()
      toast.success("Sequence saved")
    },
    onError: (err) => toast.error(err.message),
  })

  const isSaving = createSequence.isPending || updateSequence.isPending

  const handleSave = useCallback(
    (closeAfter: boolean) => {
      if (!form.name.trim()) {
        toast.error("Name is required")
        return
      }
      if (!form.sector.trim()) {
        toast.error("Sector is required")
        return
      }
      if (form.steps.length === 0) {
        toast.error("At least one step is required")
        return
      }
      // Validate each step has a body
      const emptyBody = form.steps.find((s) => !s.bodyMarkdown.trim())
      if (emptyBody) {
        toast.error(`Step ${emptyBody.position} needs a body`)
        return
      }

      if (isCreateMode) {
        createSequence.mutate(
          {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            sector: form.sector.trim(),
            targetIcp: form.targetIcp.trim() || undefined,
            isActive: form.isActive,
            steps: form.steps,
          },
          {
            onSuccess: () => {
              if (closeAfter) onOpenChange(false)
            },
          },
        )
      } else {
        updateSequence.mutate(
          {
            sequenceId: sequenceId!,
            name: form.name.trim(),
            description: form.description.trim() || null,
            sector: form.sector.trim(),
            targetIcp: form.targetIcp.trim() || null,
            isActive: form.isActive,
            steps: form.steps,
          },
          {
            onSuccess: () => {
              if (closeAfter) onOpenChange(false)
            },
          },
        )
      }
    },
    [form, isCreateMode, sequenceId, createSequence, updateSequence, onOpenChange],
  )

  // Get analytics for this specific sequence
  const seqAnalytics = (analyticsQuery.data ?? []).find(
    (a) => a.sequenceId === sequenceId,
  )

  const isLoadingSequence = !isCreateMode && sequenceQuery.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle>
            {isCreateMode ? "New Sequence" : form.name || "Edit Sequence"}
          </DialogTitle>
        </DialogHeader>

        {isLoadingSequence ? (
          <div className="px-5 py-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : (
          <>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mx-5 w-fit">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="steps">Steps ({form.steps.length})</TabsTrigger>
                {!isCreateMode && (
                  <>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                  </>
                )}
              </TabsList>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Name *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Recruitment - Cold Email v2"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Description
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="What is this sequence for?"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Sector *
                    </label>
                    <Input
                      value={form.sector}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sector: e.target.value }))
                      }
                      placeholder="e.g. Recruitment"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Target ICP
                    </label>
                    <Textarea
                      value={form.targetIcp}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, targetIcp: e.target.value }))
                      }
                      placeholder="Describe the ideal customer profile..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={form.isActive ? "active" : "paused"}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, isActive: v === "active" }))
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Steps Tab */}
                <TabsContent value="steps" className="mt-0">
                  <EditorStepsTab
                    steps={form.steps}
                    onChange={(steps) => setForm((f) => ({ ...f, steps }))}
                  />
                </TabsContent>

                {/* Contacts Tab */}
                {!isCreateMode && sequenceId && (
                  <TabsContent value="contacts" className="mt-0">
                    <EditorContactsTab sequenceId={sequenceId} />
                  </TabsContent>
                )}

                {/* Performance Tab */}
                {!isCreateMode && (
                  <TabsContent value="performance" className="mt-0">
                    {analyticsQuery.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }, (_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : seqAnalytics ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="border rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Total Sent</p>
                            <p className="text-xl font-bold font-mono">
                              {seqAnalytics.totalSent}
                            </p>
                          </div>
                          <div className="border rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Replied</p>
                            <p className="text-xl font-bold font-mono">
                              {seqAnalytics.totalReplied}
                            </p>
                          </div>
                          <div className="border rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Reply Rate</p>
                            <p className="text-xl font-bold font-mono">
                              {seqAnalytics.replyRate.toFixed(1)}%
                            </p>
                          </div>
                          <div className="border rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Converted</p>
                            <p className="text-xl font-bold font-mono">
                              {seqAnalytics.totalConverted}
                            </p>
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">
                            Conversion Rate
                          </p>
                          <p className="text-xl font-bold font-mono">
                            {seqAnalytics.conversionRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          No performance data yet. Start sending to see results.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                )}
              </div>
            </Tabs>

            {/* Sticky save bar */}
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(true)}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save & Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/sequence-editor.tsx
git commit -m "feat(outreach): add sequence editor slide-over with settings and performance tabs"
```

---

### Task 6: Sequences page

**Files:**
- Create: `src/app/admin/outreach/sequences/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/admin/outreach/sequences/page.tsx`:

```tsx
"use client"

import { useState, useMemo } from "react"
import { Plus, Filter } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ABTestSpotlight } from "./_components/ab-test-spotlight"
import { SequenceCard } from "./_components/sequence-card"
import type { SequenceCardData } from "./_components/sequence-card"
import { SequenceEditor } from "./_components/sequence-editor"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "ARCHIVED"

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }, (_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SequencesPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sectorFilter, setSectorFilter] = useState<string>("all")
  const [editorSequenceId, setEditorSequenceId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const { data: sequences, isLoading: sequencesLoading } =
    api.outreach.listSequences.useQuery()
  const { data: analytics, isLoading: analyticsLoading } =
    api.outreach.sequenceAnalytics.useQuery({})

  const isLoading = sequencesLoading || analyticsLoading

  // Join sequences with analytics
  const sequencesWithStats: SequenceCardData[] = useMemo(() => {
    if (!sequences) return []

    const analyticsMap = new Map(
      (analytics ?? []).map((a) => [a.sequenceId, a]),
    )

    return sequences.map((seq) => {
      const stats = analyticsMap.get(seq.id)
      return {
        id: seq.id,
        name: seq.name,
        sector: seq.sector,
        isActive: seq.isActive,
        archivedAt: seq.archivedAt,
        abVariant: seq.abVariant,
        pairedSequenceId: seq.pairedSequenceId,
        steps: seq.steps,
        totalSent: stats?.totalSent ?? 0,
        totalReplied: stats?.totalReplied ?? 0,
        replyRate: stats?.replyRate ?? 0,
        totalConverted: stats?.totalConverted ?? 0,
        conversionRate: stats?.conversionRate ?? 0,
      }
    })
  }, [sequences, analytics])

  // Unique sectors
  const sectors = useMemo(() => {
    const set = new Set(sequencesWithStats.map((s) => s.sector))
    return Array.from(set).sort()
  }, [sequencesWithStats])

  // Find A/B pair
  const abPair = useMemo(() => {
    const variantA = sequencesWithStats.find(
      (s) => s.abVariant === "A" && s.pairedSequenceId,
    )
    if (!variantA) return null
    const variantB = sequencesWithStats.find(
      (s) => s.id === variantA.pairedSequenceId,
    )
    if (!variantB) return null
    return { variantA, variantB }
  }, [sequencesWithStats])

  // Apply filters
  const filteredSequences = useMemo(() => {
    let result = sequencesWithStats

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((s) => {
        if (statusFilter === "ARCHIVED") return s.archivedAt !== null
        if (statusFilter === "ACTIVE") return s.isActive && !s.archivedAt
        if (statusFilter === "PAUSED") return !s.isActive && !s.archivedAt
        return true
      })
    }

    // Sector filter
    if (sectorFilter !== "all") {
      result = result.filter((s) => s.sector === sectorFilter)
    }

    return result
  }, [sequencesWithStats, statusFilter, sectorFilter])

  // Exclude A/B paired sequences from the main grid
  const gridSequences = filteredSequences.filter(
    (s) => !s.abVariant || !s.pairedSequenceId,
  )

  function openEditor(sequenceId: string | null) {
    setEditorSequenceId(sequenceId)
    setEditorOpen(true)
  }

  const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "PAUSED", label: "Paused" },
    { value: "ARCHIVED", label: "Archived" },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Sequences"
          description="Manage outreach sequences and A/B tests"
        />
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sequences"
        description="Manage outreach sequences and A/B tests"
      >
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New Sequence
        </Button>
      </PageHeader>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status pills */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
          {STATUS_PILLS.map((pill) => (
            <Button
              key={pill.value}
              variant={statusFilter === pill.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter(pill.value)}
            >
              {pill.label}
            </Button>
          ))}
        </div>

        {/* Sector filter */}
        {sectors.length > 1 && (
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* A/B Test Spotlight */}
      {abPair && statusFilter !== "ARCHIVED" && sectorFilter === "all" && (
        <ABTestSpotlight variantA={abPair.variantA} variantB={abPair.variantB} />
      )}

      {/* Sequences Grid */}
      {gridSequences.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {statusFilter === "ALL" && sectorFilter === "all"
                ? "No sequences yet. Create your first outreach sequence to get started."
                : "No sequences match the current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gridSequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onEdit={(id) => openEditor(id)}
            />
          ))}
        </div>
      )}

      {/* Editor slide-over */}
      <SequenceEditor
        sequenceId={editorSequenceId}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) setEditorSequenceId(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/sequences/page.tsx
git commit -m "feat(outreach): add sequences page with filter bar, grid, and editor integration"
```

---

### Task 7: Sidebar navigation link

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`

- [ ] **Step 1: Read the sidebar nav file**

Read `src/components/layout/sidebar-nav.tsx` to find the Outreach nav item.

- [ ] **Step 2: Add Sequences sub-link under Outreach**

Find the Outreach nav entry and add a `children` or sub-link for the Sequences page:
- Label: `"Sequences"`
- Href: `"/admin/outreach/sequences"`

Follow the existing pattern for sub-navigation items in the sidebar. If the sidebar uses a flat list, add a separate entry after the Outreach item. If it uses a nested `children` array, add to that.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar-nav.tsx
git commit -m "feat(outreach): add sequences link to sidebar navigation"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit 2>&1 | tail -30
```

Expected: No errors in the new files. Pre-existing errors in other files are acceptable.

- [ ] **Step 2: Run build**

```bash
NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -30
```

Expected: Build succeeds. The new page should appear in the build output.

- [ ] **Step 3: Fix any errors and recommit**

If tsc or build errors relate to the new files, fix them and commit:

```bash
git add -u
git commit -m "fix(outreach): resolve build errors in sequences page"
```
