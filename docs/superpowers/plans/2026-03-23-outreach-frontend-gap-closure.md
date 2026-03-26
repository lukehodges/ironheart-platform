# Outreach Frontend Gap Closure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all gaps between the outreach frontend implementation and the original spec — fix dead buttons, build missing pages, wire disabled features, and add placeholder-replaced real components.

**Architecture:** The backend is ~95% complete (28 router procedures, all wired). This plan is almost entirely frontend work. We split into 6 sub-plans that can be executed sequentially. Each sub-plan produces a working, committable increment. The `convertContact` endpoint already exists on the backend, as do `undoActivity`, `snoozeContact`, and all analytics queries. Two backend features are stubbed (import, bulk enroll) and will need service/repo/router implementation in Sub-plan 4.

**Tech Stack:** Next.js 16 (App Router), React 19, tRPC 11, Tailwind 4, Shadcn UI (Sheet, Dialog, Tabs, Select, Card, Button, Badge, Skeleton), Sonner toasts, Lucide icons.

**Reference files:**
- Spec: `.superpowers/brainstorm/8537-1774098977/` (all approach/page docs)
- Mockups: `mockups/outreach-v1-morning-cockpit.html`, `mockups/outreach-v2-sequence-manager.html`, `mockups/outreach-v3-flow-tracker.html`
- Backend router: `src/modules/outreach/outreach.router.ts`
- Backend schemas: `src/modules/outreach/outreach.schemas.ts`

**Existing UI components available:** `Sheet` (slide-over), `Tabs`, `Select`, `Dialog`, `Card`, `Button`, `Badge`, `Skeleton`, `Input`, `Textarea`, `Label` — all from `@/components/ui/*`

---

## Sub-plan 1: Dead Buttons & Quick Fixes

**Scope:** Fix buttons that do nothing, add undo toast, wire snooze on contact detail, add cursor-based pagination.

---

### Task 1.1: Wire "New Sequence" button on dashboard

**Files:**
- Modify: `src/app/admin/outreach/page.tsx:36-38`

- [ ] **Step 1: Add state + handler for New Sequence button**

The dashboard page already has the sequences view with a working editor. Wire the header button to switch to sequences view and open the editor.

```tsx
// In page.tsx, add state:
const [openSequenceEditor, setOpenSequenceEditor] = useState(false)

// Replace the dead button (line 36-38):
<Button size="sm" onClick={() => { setView("sequences"); setOpenSequenceEditor(true) }}>
  <Plus className="h-4 w-4" aria-hidden="true" /> New Sequence
</Button>

// Pass to OutreachSequences:
{view === "sequences" && (
  <OutreachSequences
    openNewEditor={openSequenceEditor}
    onEditorOpened={() => setOpenSequenceEditor(false)}
  />
)}
```

- [ ] **Step 2: Update OutreachSequences to accept props**

Modify `src/app/admin/outreach/_components/outreach-sequences.tsx` to accept `openNewEditor` and `onEditorOpened` props. In a `useEffect`, when `openNewEditor` becomes true, set `editorOpen(true)` + `editorSequenceId(null)` and call `onEditorOpened()`.

- [ ] **Step 3: Test manually — click New Sequence on dashboard, verify editor opens**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/page.tsx src/app/admin/outreach/_components/outreach-sequences.tsx
git commit -m "fix(outreach): wire New Sequence button on dashboard header"
```

---

### Task 1.2: Add undo toast on Mark Sent

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-today.tsx`

The backend has `undoActivity` which accepts `{ contactId, activityId }` and reverts within 30s. The `logActivity` mutation returns the updated contact — but we need the activityId. Check the `logActivity` return type; if it doesn't return the activityId, we'll use a toast with a callback approach.

- [ ] **Step 1: Add undoActivity mutation**

```tsx
const undoActivity = api.outreach.undoActivity.useMutation({
  onSuccess: () => {
    void utils.outreach.getDashboard.invalidate()
    toast.success("Action undone")
  },
  onError: (err) => toast.error(err.message),
})
```

- [ ] **Step 2: Update logActivity onSuccess to show undo toast**

The `logActivity` mutation returns an `OutreachContactRecord`. We need the activityId. Since `logActivity` service method logs an activity and returns the contact, we need to modify it to also return the activityId.

**BREAKING CHANGE**: Modify `outreach.service.ts` `logActivity` to return `{ contact: OutreachContactRecord, activityId: string }` instead of just `OutreachContactRecord`. This affects ALL callers:
- `src/app/admin/outreach/_components/outreach-today.tsx` (main target)
- `src/app/admin/outreach/_components/contact-detail.tsx` (also uses logActivity — update its onSuccess to access `result.contact` instead of `result` directly)

Modify `outreach.router.ts` `logActivity` to return the full object.

Then in **outreach-today.tsx**:

```tsx
const logActivity = api.outreach.logActivity.useMutation({
  onSuccess: (result) => {
    void utils.outreach.getDashboard.invalidate()
    if (result.activityId) {
      toast.success("Marked as sent", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => undoActivity.mutate({
            contactId: result.contact.id,
            activityId: result.activityId,
          }),
        },
      })
    } else {
      toast.success("Activity logged")
    }
  },
  onError: (err) => toast.error(err.message),
})
```

And in **contact-detail.tsx**, update the logActivity onSuccess — the result shape changes from `OutreachContactRecord` to `{ contact, activityId }`, so any references to `result.id` etc. must use `result.contact.id`.

- [ ] **Step 3: Test — mark a contact sent, verify undo toast appears, click undo**

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/outreach.service.ts src/modules/outreach/outreach.router.ts src/app/admin/outreach/_components/outreach-today.tsx src/app/admin/outreach/_components/contact-detail.tsx
git commit -m "feat(outreach): add 5-second undo toast on mark sent"
```

---

### Task 1.3: Wire Snooze button on contact detail

**Files:**
- Modify: `src/app/admin/outreach/_components/contact-detail.tsx`

The `snoozeContact` mutation exists in the backend. The reply-detail component already has a working snooze UI — replicate the pattern.

- [ ] **Step 1: Add snooze state and mutation to contact-detail.tsx**

```tsx
import { useState } from "react"
// ... existing imports

// Inside component:
const [showSnooze, setShowSnooze] = useState(false)
const [customDate, setCustomDate] = useState("")

const snoozeContact = api.outreach.snoozeContact.useMutation({
  onSuccess: () => {
    void utils.outreach.getDashboard.invalidate()
    toast.success("Contact snoozed")
    onOpenChange(false)
  },
  onError: (err) => toast.error(err.message),
})

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function nextQuarter(): Date {
  const now = new Date()
  const month = now.getMonth()
  const nextQ = month < 3 ? 3 : month < 6 ? 6 : month < 9 ? 9 : 12
  return new Date(now.getFullYear() + (nextQ === 12 ? 1 : 0), nextQ % 12, 1)
}
```

- [ ] **Step 2: Replace disabled Snooze button with working toggle + scheduler**

Replace the disabled snooze button (line 135-137) with:

```tsx
<Button
  size="sm"
  variant={showSnooze ? "default" : "outline"}
  onClick={() => setShowSnooze(!showSnooze)}
>
  <Clock className="h-3.5 w-3.5 mr-1" /> Snooze
</Button>
```

Add snooze scheduler after the quick actions grid:

```tsx
{showSnooze && (
  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
    <p className="text-xs font-medium text-amber-800">Snooze until:</p>
    <div className="flex flex-wrap gap-1.5">
      {[
        { label: "1 week", date: addDays(new Date(), 7) },
        { label: "2 weeks", date: addDays(new Date(), 14) },
        { label: "1 month", date: addDays(new Date(), 30) },
        { label: "Next quarter", date: nextQuarter() },
      ].map((opt) => (
        <Button
          key={opt.label}
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={() => snoozeContact.mutate({ contactId: contact.id, snoozedUntil: opt.date })}
          disabled={snoozeContact.isPending}
        >
          {opt.label}
        </Button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="text-xs border rounded px-2 py-1 flex-1"
        value={customDate}
        onChange={(e) => setCustomDate(e.target.value)}
        min={new Date().toISOString().split("T")[0]}
      />
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7"
        onClick={() => {
          if (customDate) snoozeContact.mutate({ contactId: contact.id, snoozedUntil: new Date(customDate) })
        }}
        disabled={!customDate || snoozeContact.isPending}
      >
        Set
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Test — open contact detail, click Snooze, verify scheduler shows, pick a date**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/_components/contact-detail.tsx
git commit -m "feat(outreach): wire snooze scheduler on contact detail dialog"
```

---

### Task 1.4: Add cursor-based pagination to contacts page

**Files:**
- Modify: `src/app/admin/outreach/contacts/page.tsx`

The backend `listContacts` already supports `cursor` and returns `{ rows, hasMore }`. The frontend just needs to track the cursor.

- [ ] **Step 1: Add pagination state**

```tsx
const [cursors, setCursors] = useState<string[]>([]) // stack of previous cursors
const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined

const contactsQuery = api.outreach.listContacts.useQuery({
  status: statusFilter ?? undefined,
  sequenceId: sequenceFilter ?? undefined,
  search: searchQuery || undefined,
  cursor: currentCursor,
  limit: 25,
})
```

- [ ] **Step 2: Add pagination controls at bottom of table**

```tsx
{/* Pagination */}
<div className="flex items-center justify-between pt-4">
  <p className="text-xs text-muted-foreground">
    Page {cursors.length + 1}
  </p>
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="outline"
      disabled={cursors.length === 0}
      onClick={() => setCursors((prev) => prev.slice(0, -1))}
    >
      Previous
    </Button>
    <Button
      size="sm"
      variant="outline"
      disabled={!contactsQuery.data?.hasMore}
      onClick={() => {
        const rows = contactsQuery.data?.rows ?? []
        const lastId = rows[rows.length - 1]?.id
        if (lastId) setCursors((prev) => [...prev, lastId])
      }}
    >
      Next
    </Button>
  </div>
</div>
```

- [ ] **Step 3: Reset cursors when filters change**

Add a `useEffect` that resets `setCursors([])` whenever `statusFilter`, `sequenceFilter`, `searchQuery`, or `sectorFilter` change.

- [ ] **Step 4: Test — load contacts page, click next/previous, verify data changes**

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/outreach/contacts/page.tsx
git commit -m "feat(outreach): add cursor-based pagination to contacts page"
```

---

### Task 1.5: Add cursor-based pagination to replies page

**Files:**
- Modify: `src/app/admin/outreach/replies/page.tsx`

Same pattern as Task 1.4 but for the replies list.

- [ ] **Step 1: Add cursor state and pass to listContacts query**

The replies page uses `api.outreach.listContacts.useQuery({ status: "REPLIED" })`. Add cursor tracking:

```tsx
const [cursor, setCursor] = useState<string | undefined>(undefined)
const contactsQuery = api.outreach.listContacts.useQuery({
  status: "REPLIED",
  cursor,
  limit: 25,
})
```

- [ ] **Step 2: Pass onLoadMore callback to ReplyList**

```tsx
<ReplyList
  contacts={contactsQuery.data?.rows ?? []}
  selectedId={selectedContact?.id ?? null}
  onSelect={setSelectedContact}
  isLoading={contactsQuery.isLoading}
  hasMore={contactsQuery.data?.hasMore ?? false}
  onLoadMore={() => {
    const rows = contactsQuery.data?.rows ?? []
    const lastId = rows[rows.length - 1]?.id
    if (lastId) setCursor(lastId)
  }}
/>
```

- [ ] **Step 3: Wire "Load more" button in reply-list.tsx**

In `src/app/admin/outreach/replies/_components/reply-list.tsx`, update the component to accept and use `hasMore` and `onLoadMore` props, and show the button conditionally:

```tsx
{hasMore && (
  <Button variant="ghost" size="sm" className="w-full" onClick={onLoadMore}>
    Load more
  </Button>
)}
```

- [ ] **Step 4: Test — load replies, verify load more works**

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/outreach/replies/page.tsx src/app/admin/outreach/replies/_components/reply-list.tsx
git commit -m "feat(outreach): add pagination to replies page"
```

---

## Sub-plan 2: Contact Detail Slide-Over & Enhancements

**Scope:** Convert contact detail from Dialog to Sheet (slide-over), add editable notes, add Convert to Deal flow, improve the contact detail across all pages that use it.

---

### Task 2.1: Convert ContactDetail from Dialog to Sheet

**Files:**
- Modify: `src/app/admin/outreach/_components/contact-detail.tsx`

The spec calls for a right-side slide-over panel (480px), not a centered dialog.

- [ ] **Step 1: Replace Dialog imports with Sheet**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
// Remove: Dialog, DialogContent, DialogHeader, DialogTitle
```

- [ ] **Step 2: Replace Dialog wrapper with Sheet**

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle className="flex items-center gap-2">
        {/* same content as before */}
      </SheetTitle>
    </SheetHeader>
    {/* rest of content */}
  </SheetContent>
</Sheet>
```

- [ ] **Step 3: Test — open contact detail from dashboard and contacts page, verify slide-over from right**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/_components/contact-detail.tsx
git commit -m "refactor(outreach): convert contact detail from Dialog to Sheet slide-over"
```

---

### Task 2.2: Add editable notes to contact detail

**Files:**
- Modify: `src/app/admin/outreach/_components/contact-detail.tsx`

The spec says notes should be an editable textarea that auto-saves. We don't have a dedicated `updateContactNotes` endpoint, but `logActivity` accepts `notes`. For now, we can use a simple pattern: show a textarea, and on blur, if changed, call a mutation. Since there's no dedicated notes endpoint, we'll store notes via a lightweight approach — we can use the contact's existing `notes` field. Looking at the backend, the `enrollContact` accepts notes but there's no `updateContact` endpoint for just notes.

For now, display the notes as read-only (already done) but make the textarea visible. We'll add a TODO for a proper notes endpoint later. The important thing is the UI matches the spec.

- [ ] **Step 1: Replace read-only notes with textarea**

```tsx
{/* Notes */}
<div>
  <p className="text-sm font-semibold mb-1">Notes</p>
  <textarea
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
    placeholder="Add notes..."
    defaultValue={contact.notes ?? ""}
    readOnly
  />
  <p className="text-[10px] text-muted-foreground mt-1">Notes editing coming soon</p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/_components/contact-detail.tsx
git commit -m "feat(outreach): show notes textarea in contact detail slide-over"
```

---

### Task 2.3: Add Convert to Deal flow

**Files:**
- Create: `src/app/admin/outreach/_components/convert-to-deal.tsx`
- Modify: `src/app/admin/outreach/_components/contact-detail.tsx`
- Modify: `src/app/admin/outreach/replies/_components/reply-detail.tsx`
- Modify: `src/app/admin/outreach/contacts/_components/contacts-table.tsx`

The `convertContact` endpoint exists in the backend: `{ contactId, pipelineId, stageId, dealValue? }`. We need to fetch pipelines via `api.pipeline.list` and stages via `api.pipeline.getById`.

- [ ] **Step 1: Create ConvertToDeal component**

```tsx
// src/app/admin/outreach/_components/convert-to-deal.tsx
"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowRightCircle, X } from "lucide-react"

interface ConvertToDealProps {
  contactId: string
  contactName: string
  onConverted: () => void
  onCancel: () => void
}

export function ConvertToDeal({ contactId, contactName, onConverted, onCancel }: ConvertToDealProps) {
  const [pipelineId, setPipelineId] = useState<string>("")
  const [stageId, setStageId] = useState<string>("")
  const [dealValue, setDealValue] = useState<string>("")

  const pipelinesQuery = api.pipeline.list.useQuery()
  const pipelines = pipelinesQuery.data ?? []

  const pipelineDetailQuery = api.pipeline.getById.useQuery(
    { pipelineId },
    { enabled: !!pipelineId },
  )
  const stages = pipelineDetailQuery.data?.stages ?? []

  // Auto-select first pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !pipelineId) {
      setPipelineId(pipelines[0].id)
    }
  }, [pipelines, pipelineId])

  // Auto-select first stage when pipeline changes
  useEffect(() => {
    if (stages.length > 0 && !stageId) {
      setStageId(stages[0].id)
    }
  }, [stages, stageId])

  const utils = api.useUtils()
  const convertContact = api.outreach.convertContact.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      void utils.outreach.listContacts.invalidate()
      toast.success(`${contactName} converted to deal`)
      onConverted()
    },
    onError: (err) => toast.error(err.message),
  })

  if (pipelinesQuery.isLoading) {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-800">Convert to Deal</p>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Pipeline</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={pipelineId}
            onChange={(e) => { setPipelineId(e.target.value); setStageId("") }}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs">Stage</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs">Deal Value (optional)</Label>
          <Input
            type="number"
            placeholder="0"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => {
          if (!pipelineId || !stageId) {
            toast.error("Select a pipeline and stage")
            return
          }
          convertContact.mutate({
            contactId,
            pipelineId,
            stageId,
            dealValue: dealValue ? parseFloat(dealValue) : undefined,
          })
        }}
        disabled={convertContact.isPending || !pipelineId || !stageId}
      >
        <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />
        {convertContact.isPending ? "Converting..." : "Convert"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Wire into contact-detail.tsx**

Replace the disabled Convert button with a toggle that shows `<ConvertToDeal />`:

```tsx
const [showConvert, setShowConvert] = useState(false)

// Replace disabled Convert button:
<Button
  size="sm"
  variant={showConvert ? "default" : "outline"}
  onClick={() => setShowConvert(!showConvert)}
>
  <ArrowRightCircle className="h-3.5 w-3.5 mr-1" /> Convert
</Button>

// After quick actions grid:
{showConvert && (
  <ConvertToDeal
    contactId={contact.id}
    contactName={contact.customerName}
    onConverted={() => { setShowConvert(false); onOpenChange(false) }}
    onCancel={() => setShowConvert(false)}
  />
)}
```

- [ ] **Step 3: Wire into reply-detail.tsx**

Replace the disabled "Convert to Deal" button with the same toggle pattern. Import `ConvertToDeal` and add state + render.

- [ ] **Step 4: Wire into contacts-table.tsx kebab menu**

Replace the disabled "Convert" button in the kebab menu. When clicked, open the contact detail slide-over with `showConvert` pre-set to true. Since the kebab opens the detail, pass a prop `initialShowConvert` to ContactDetail.

- [ ] **Step 5: Test — open contact detail, click Convert, select pipeline/stage, submit**

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/outreach/_components/convert-to-deal.tsx src/app/admin/outreach/_components/contact-detail.tsx src/app/admin/outreach/replies/_components/reply-detail.tsx src/app/admin/outreach/contacts/_components/contacts-table.tsx
git commit -m "feat(outreach): add Convert to Deal flow with pipeline/stage selection"
```

---

### Task 2.4: Add Sequence Context card to reply detail

**Files:**
- Modify: `src/app/admin/outreach/replies/_components/reply-detail.tsx`

The spec shows a "Sequence Context" card with: Sequence name, Replied at Step, Days in Sequence, Channel, Sector, A/B Variant. The contact data already includes `sequenceName`, `sector`, `currentStep`, `totalSteps`, `enrolledAt`.

- [ ] **Step 1: Add sequence context card after categorization buttons**

```tsx
{/* Sequence Context */}
<div className="rounded-lg border bg-slate-50/50 p-3">
  <p className="text-xs font-semibold text-muted-foreground mb-2">Sequence Context</p>
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    <div>
      <span className="text-muted-foreground">Sequence</span>
      <p className="font-medium">{contact.sequenceName}</p>
    </div>
    <div>
      <span className="text-muted-foreground">Replied at Step</span>
      <p className="font-medium">{contact.currentStep} of {contact.totalSteps}</p>
    </div>
    <div>
      <span className="text-muted-foreground">Days in Sequence</span>
      <p className="font-medium">
        {contact.enrolledAt
          ? Math.floor((Date.now() - new Date(contact.enrolledAt).getTime()) / 86400000)
          : "—"}
      </p>
    </div>
    <div>
      <span className="text-muted-foreground">Sector</span>
      <p className="font-medium">{contact.sector}</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/replies/_components/reply-detail.tsx
git commit -m "feat(outreach): add sequence context card to reply detail"
```

---

## Sub-plan 3: Analytics Page

**Scope:** Build the dedicated `/admin/outreach/analytics` page with 5 sub-tabs as spec'd. The backend has `sequenceAnalytics` and `sectorAnalytics` endpoints. For timing/revenue/cohorts, we'll build frontend-computed views from existing data where possible, and add "coming soon" for data that needs new backend endpoints.

---

### Task 3.1: Create analytics page route with sub-tabs

**Files:**
- Create: `src/app/admin/outreach/analytics/page.tsx`
- Create: `src/app/admin/outreach/analytics/_components/analytics-overview.tsx`
- Create: `src/app/admin/outreach/analytics/_components/analytics-sectors.tsx`
- Create: `src/app/admin/outreach/analytics/_components/analytics-timing.tsx`
- Create: `src/app/admin/outreach/analytics/_components/analytics-revenue.tsx`
- Create: `src/app/admin/outreach/analytics/_components/analytics-cohorts.tsx`
- Modify: `src/components/layout/sidebar-nav.tsx` (add Analytics nav item)

- [ ] **Step 1: Create the analytics page shell with tabs**

```tsx
// src/app/admin/outreach/analytics/page.tsx
"use client"

import { useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { BarChart3, Download } from "lucide-react"
import { AnalyticsOverview } from "./_components/analytics-overview"
import { AnalyticsSectors } from "./_components/analytics-sectors"
import { AnalyticsTiming } from "./_components/analytics-timing"
import { AnalyticsRevenue } from "./_components/analytics-revenue"
import { AnalyticsCohorts } from "./_components/analytics-cohorts"

type AnalyticsTab = "overview" | "sectors" | "timing" | "revenue" | "cohorts"

const TABS: { value: AnalyticsTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "sectors", label: "Sectors" },
  { value: "timing", label: "Timing" },
  { value: "revenue", label: "Revenue" },
  { value: "cohorts", label: "Cohorts" },
]

type DateRange = "7d" | "30d" | "90d" | "all"

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>("overview")
  const [dateRange, setDateRange] = useState<DateRange>("30d")

  const dateFilters = {
    dateFrom: dateRange === "all" ? undefined : (() => {
      const d = new Date()
      d.setDate(d.getDate() - (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90))
      return d
    })(),
    dateTo: undefined,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" description="Outreach performance insights">
        <Button variant="outline" size="sm" disabled>
          <Download className="h-4 w-4 mr-1.5" /> Export
        </Button>
      </PageHeader>

      {/* Sub-tabs + date range */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
          {TABS.map((t) => (
            <Button
              key={t.value}
              variant={tab === t.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={dateRange === r ? "default" : "ghost"}
              size="sm"
              onClick={() => setDateRange(r)}
            >
              {r === "all" ? "All time" : r}
            </Button>
          ))}
        </div>
      </div>

      {tab === "overview" && <AnalyticsOverview dateFilters={dateFilters} />}
      {tab === "sectors" && <AnalyticsSectors dateFilters={dateFilters} />}
      {tab === "timing" && <AnalyticsTiming />}
      {tab === "revenue" && <AnalyticsRevenue dateFilters={dateFilters} />}
      {tab === "cohorts" && <AnalyticsCohorts />}
    </div>
  )
}
```

- [ ] **Step 2: Create analytics-overview.tsx**

This combines: State Machine (already exists in outreach-analytics.tsx — extract it), Conversion Funnel, Channel Performance, Sector Performance table. Uses `sequenceAnalytics` and `sectorAnalytics` queries.

Key sections:
- **State Machine Flow** — reuse/extract from `outreach-analytics.tsx`
- **Conversion Funnel** — stacked horizontal bars: Contacted → Replied → Converted with percentages
- **Sector Performance Table** — columns: Sector, Sent, Replies, Rate, Conv., with rate color pills
- **Channel Performance** — if the sequence analytics data includes channel info, show bar chart; otherwise placeholder

```tsx
// src/app/admin/outreach/analytics/_components/analytics-overview.tsx
"use client"

import { useMemo } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, TrendingUp } from "lucide-react"

interface DateFilters { dateFrom?: Date; dateTo?: Date }

export function AnalyticsOverview({ dateFilters }: { dateFilters: DateFilters }) {
  const { data: seqAnalytics, isLoading: seqLoading } = api.outreach.sequenceAnalytics.useQuery({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  })
  const { data: sectorStats, isLoading: secLoading } = api.outreach.sectorAnalytics.useQuery({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  })

  const totals = useMemo(() => {
    if (!seqAnalytics) return { sent: 0, replied: 0, converted: 0 }
    return {
      sent: seqAnalytics.reduce((s, a) => s + a.totalSent, 0),
      replied: seqAnalytics.reduce((s, a) => s + a.totalReplied, 0),
      converted: seqAnalytics.reduce((s, a) => s + a.totalConverted, 0),
    }
  }, [seqAnalytics])

  const replyRate = totals.sent > 0 ? ((totals.replied / totals.sent) * 100).toFixed(1) : "0"
  const convRate = totals.replied > 0 ? ((totals.converted / totals.replied) * 100).toFixed(1) : "0"

  if (seqLoading || secLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
  }

  return (
    <div className="space-y-6">
      {/* State Machine */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Contact State Machine</p>
          <div className="flex items-center justify-center gap-0 flex-wrap">
            {[
              { label: "SENT", count: totals.sent, bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-700" },
              { label: "REPLIED", count: totals.replied, bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
              { label: "CONVERTED", count: totals.converted, bg: "bg-green-100", border: "border-green-400", text: "text-green-800" },
            ].map((state, i, arr) => (
              <div key={state.label} className="flex items-center">
                <Card className={`${state.bg} ${state.border} border`}>
                  <CardContent className="px-6 py-3 text-center">
                    <p className={`text-[10px] font-medium ${state.text}`}>{state.label}</p>
                    <p className={`text-xl font-bold font-mono ${state.text}`}>{state.count}</p>
                  </CardContent>
                </Card>
                {i < arr.length - 1 && (
                  <div className="flex items-center px-2">
                    <div className="w-8 h-px bg-slate-300" />
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
                        {i === 0 ? replyRate : convRate}%
                      </span>
                    </div>
                    <div className="w-8 h-px bg-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Conversion Funnel</p>
          <div className="space-y-3">
            {[
              { label: "Contacted", count: totals.sent, pct: "100", color: "bg-blue-500" },
              { label: "Replied", count: totals.replied, pct: replyRate, color: "bg-emerald-500" },
              { label: "Converted", count: totals.converted, pct: totals.sent > 0 ? ((totals.converted / totals.sent) * 100).toFixed(1) : "0", color: "bg-green-600" },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-muted-foreground">{step.count} ({step.pct}%)</span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(parseFloat(step.pct), 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Performance */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Sector Performance</p>
          {(sectorStats ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No sector data yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Sector</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Sent</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Replies</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Rate</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {(sectorStats ?? []).map((s) => {
                  const rate = s.totalSent > 0 ? (s.totalReplied / s.totalSent) * 100 : 0
                  const rateColor = rate >= 15 ? "text-emerald-700 bg-emerald-50" : rate >= 10 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                  return (
                    <tr key={s.sector} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.sector}</td>
                      <td className="py-2 text-right font-mono">{s.totalSent}</td>
                      <td className="py-2 text-right font-mono">{s.totalReplied}</td>
                      <td className="py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rateColor}`}>
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono">{s.totalConverted}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Sequence Comparison */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Sequence Comparison</p>
          {(seqAnalytics ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No sequence data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-muted-foreground">Sequence</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground">Sector</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Sent</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Reply Rate</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(seqAnalytics ?? []).map((seq) => {
                    const rr = seq.replyRate * 100
                    const cr = seq.conversionRate * 100
                    const rrColor = rr >= 15 ? "text-emerald-700 bg-emerald-50" : rr >= 10 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                    return (
                      <tr key={seq.sequenceId} className="border-b last:border-0">
                        <td className="py-2 font-medium">{seq.name}</td>
                        <td className="py-2 text-muted-foreground">{seq.sector}</td>
                        <td className="py-2 text-right font-mono">{seq.totalSent}</td>
                        <td className="py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rrColor}`}>
                            {rr.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono">{cr.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create analytics-sectors.tsx**

Detailed sector view with the heatmap from outreach-analytics.tsx plus additional sector drill-down table.

```tsx
// src/app/admin/outreach/analytics/_components/analytics-sectors.tsx
"use client"

import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DateFilters { dateFrom?: Date; dateTo?: Date }

export function AnalyticsSectors({ dateFilters }: { dateFilters: DateFilters }) {
  const { data: sectorStats, isLoading } = api.outreach.sectorAnalytics.useQuery({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  })

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
  }

  const stats = sectorStats ?? []
  const maxSent = Math.max(...stats.map((s) => s.totalSent), 1)

  function heatColor(value: number, max: number): string {
    const ratio = max > 0 ? value / max : 0
    if (ratio >= 0.8) return "bg-indigo-200 text-indigo-900"
    if (ratio >= 0.6) return "bg-indigo-100 text-indigo-800"
    if (ratio >= 0.4) return "bg-indigo-50 text-indigo-700"
    if (ratio >= 0.2) return "bg-blue-50 text-blue-700"
    return "bg-slate-50 text-slate-600"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Sector Heatmap</p>
          {stats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No sector data yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Sector</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground">Sent</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground">Replied</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground">Rate</th>
                  <th className="text-center pb-2 font-medium text-muted-foreground">Converted</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => {
                  const rate = s.totalSent > 0 ? (s.totalReplied / s.totalSent) * 100 : 0
                  return (
                    <tr key={s.sector} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.sector}</td>
                      <td className="py-2">
                        <div className={`text-center font-mono rounded px-2 py-1 ${heatColor(s.totalSent, maxSent)}`}>
                          {s.totalSent}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className={`text-center font-mono rounded px-2 py-1 ${heatColor(s.totalReplied, Math.max(...stats.map((x) => x.totalReplied), 1))}`}>
                          {s.totalReplied}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className={`text-center font-mono rounded px-2 py-1 ${rate >= 15 ? "bg-emerald-100 text-emerald-800" : rate >= 10 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                          {rate.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-2">
                        <div className={`text-center font-mono rounded px-2 py-1 ${heatColor(s.totalConverted, Math.max(...stats.map((x) => x.totalConverted), 1))}`}>
                          {s.totalConverted}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create analytics-timing.tsx (placeholder with spec layout)**

Timing needs backend data we don't have yet (reply rate by hour/day). Build the layout with placeholder data that shows the intended UI. Mark "Requires backend endpoint" clearly.

```tsx
// src/app/admin/outreach/analytics/_components/analytics-timing.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SLOTS = ["7-9 AM", "9-11 AM", "11-1 PM", "1-3 PM", "3-5 PM"]

export function AnalyticsTiming() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Best Time to Send</p>
            <span className="text-[10px] text-muted-foreground bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
              Requires more data
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Reply rate heatmap by day of week and time slot. Needs ~200+ sent emails to generate reliable patterns.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-muted-foreground font-medium w-20" />
                  {DAYS.map((d) => (
                    <th key={d} className="text-center pb-2 text-muted-foreground font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="py-1.5 text-muted-foreground font-medium">{slot}</td>
                    {DAYS.map((d) => (
                      <td key={d} className="py-1.5 px-0.5">
                        <div className="h-8 rounded bg-slate-100 flex items-center justify-center text-[10px] text-muted-foreground/50">
                          —
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Optimal Sequence Length</p>
          <p className="text-xs text-muted-foreground mb-3">
            Shows which step number generates the most replies.
          </p>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Needs more activity data to compute</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Create analytics-revenue.tsx**

Revenue attribution from sequence analytics data. Show sequence comparison with revenue. Since we don't track revenue per sequence yet (would need pipeline deal values), show what we can + placeholder.

```tsx
// src/app/admin/outreach/analytics/_components/analytics-revenue.tsx
"use client"

import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, PoundSterling } from "lucide-react"

interface DateFilters { dateFrom?: Date; dateTo?: Date }

export function AnalyticsRevenue({ dateFilters }: { dateFilters: DateFilters }) {
  const { data: seqAnalytics, isLoading } = api.outreach.sequenceAnalytics.useQuery({
    dateFrom: dateFilters.dateFrom,
    dateTo: dateFilters.dateTo,
  })

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
  }

  const sequences = seqAnalytics ?? []
  const totalConverted = sequences.reduce((s, a) => s + a.totalConverted, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Converted</p>
            <p className="text-2xl font-bold font-mono">{totalConverted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Cost per Deal</p>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sequence ROI table */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-4">Sequence ROI Comparison</p>
          {sequences.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-muted-foreground">Sequence</th>
                    <th className="text-left pb-2 font-medium text-muted-foreground">Sector</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Sent</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Replied</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Reply Rate</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Converted</th>
                    <th className="text-right pb-2 font-medium text-muted-foreground">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sequences.map((seq) => {
                    const rr = (seq.replyRate * 100).toFixed(1)
                    const cr = (seq.conversionRate * 100).toFixed(1)
                    const rrN = seq.replyRate * 100
                    const rrColor = rrN >= 15 ? "text-emerald-700 bg-emerald-50" : rrN >= 10 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"
                    return (
                      <tr key={seq.sequenceId} className="border-b last:border-0">
                        <td className="py-2 font-medium">{seq.name}</td>
                        <td className="py-2 text-muted-foreground">{seq.sector}</td>
                        <td className="py-2 text-right font-mono">{seq.totalSent}</td>
                        <td className="py-2 text-right font-mono">{seq.totalReplied}</td>
                        <td className="py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rrColor}`}>{rr}%</span>
                        </td>
                        <td className="py-2 text-right font-mono">{seq.totalConverted}</td>
                        <td className="py-2 text-right font-mono">{cr}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Create analytics-cohorts.tsx (placeholder)**

```tsx
// src/app/admin/outreach/analytics/_components/analytics-cohorts.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"

export function AnalyticsCohorts() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Cohort Analysis</p>
          <span className="text-[10px] text-muted-foreground bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
            Requires backend endpoint
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Tracks reply rates by enrollment week to show if sequences improve over time.
          Needs a dedicated analytics.cohorts endpoint that groups contacts by enrollment week
          and computes week-over-week reply rates.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium text-muted-foreground">Enrolled</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">Contacts</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">Week 1</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">Week 2</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">Week 3</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">Week 4</th>
                <th className="text-right pb-2 font-medium text-muted-foreground">Total Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Awaiting sufficient enrollment data</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Add Analytics + Templates to sidebar nav via manifest**

The sidebar is manifest-driven. Modify `src/modules/outreach/outreach.manifest.ts` to add entries to the `sidebarItems` array:

```ts
// Add these after the existing Sequences entry:
{ title: "Analytics", href: "/admin/outreach/analytics", icon: "BarChart3", section: "operations", permission: "outreach:read" },
{ title: "Templates", href: "/admin/outreach/templates", icon: "FileText", section: "operations", permission: "outreach:read" },
```

No changes needed to `sidebar-nav.tsx` — it reads from the manifest.

- [ ] **Step 8: Update dashboard analytics view to link to full analytics page**

In `src/app/admin/outreach/_components/outreach-analytics.tsx`, replace the "Coming soon" placeholders with a link/button to `/admin/outreach/analytics` for the full experience. Keep the state machine and sector heatmap as a summary view.

- [ ] **Step 9: Test — navigate to /admin/outreach/analytics, verify all 5 tabs render**

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/outreach/analytics/ src/modules/outreach/outreach.manifest.ts src/app/admin/outreach/_components/outreach-analytics.tsx
git commit -m "feat(outreach): add dedicated analytics page with 5 sub-tabs"
```

---

## Sub-plan 4: Import Workflow

**Scope:** Build the CSV import modal and manual add form. The backend has schema stubs (`importContactsSchema`, `bulkEnrollSchema`) but no service/repo/router implementation — those need to be added too.

---

### Task 4.1: Implement import backend (service + repo + router)

**Files:**
- Modify: `src/modules/outreach/outreach.repository.ts`
- Modify: `src/modules/outreach/outreach.service.ts`
- Modify: `src/modules/outreach/outreach.router.ts`

- [ ] **Step 1: Add importContacts to repository**

```ts
// In outreach.repository.ts, add:
async importContacts(
  tenantId: string,
  contacts: Array<{ firstName: string; lastName?: string; email: string; company?: string; sector?: string; notes?: string }>,
): Promise<{ imported: string[]; skipped: string[] }> {
  const imported: string[] = []
  const skipped: string[] = []

  for (const c of contacts) {
    // Check for existing customer by email
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, c.email)))
      .limit(1)

    if (existing[0]) {
      skipped.push(c.email)
      continue
    }

    const [customer] = await db
      .insert(customers)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        firstName: c.firstName,
        lastName: c.lastName ?? null,
        email: c.email,
        tags: c.company ? [`company:${c.company}`] : [],
      })
      .returning()

    if (customer) imported.push(customer.id)
  }

  return { imported, skipped }
}
```

NOTE: This is a simplified version. The exact Drizzle query patterns must match the existing codebase — check how `customers` table is imported and used elsewhere. The agent implementing this should read the existing repository patterns first.

- [ ] **Step 2: Add importContacts to service**

```ts
async importContacts(
  ctx: Context,
  input: z.infer<typeof importContactsSchema>,
): Promise<{ imported: number; skipped: number; skippedEmails: string[] }> {
  const { imported, skipped } = await outreachRepository.importContacts(ctx.tenantId, input.contacts)

  // Optionally enroll imported contacts into a sequence
  if (input.sequenceId && imported.length > 0) {
    for (const customerId of imported) {
      await this.enrollContact(ctx, { customerId, sequenceId: input.sequenceId })
    }
  }

  return { imported: imported.length, skipped: skipped.length, skippedEmails: skipped }
}
```

- [ ] **Step 3: Add router procedures**

```ts
importContacts: modulePermission("outreach:write")
  .input(importContactsSchema)
  .mutation(async ({ ctx, input }) => outreachService.importContacts(ctx, input)),

bulkEnroll: modulePermission("outreach:write")
  .input(bulkEnrollSchema)
  .mutation(async ({ ctx, input }) => outreachService.bulkEnroll(ctx, input)),
```

- [ ] **Step 4: Add bulkEnroll to service**

```ts
async bulkEnroll(
  ctx: Context,
  input: z.infer<typeof bulkEnrollSchema>,
): Promise<{ enrolled: number; failed: number }> {
  let enrolled = 0
  let failed = 0
  for (const customerId of input.customerIds) {
    try {
      await this.enrollContact(ctx, {
        customerId,
        sequenceId: input.sequenceId,
        assignedUserId: input.assignedUserId,
      })
      enrolled++
    } catch {
      failed++
    }
  }
  return { enrolled, failed }
}
```

- [ ] **Step 5: Test — write a unit test for importContacts**

- [ ] **Step 6: Commit**

```bash
git add src/modules/outreach/outreach.repository.ts src/modules/outreach/outreach.service.ts src/modules/outreach/outreach.router.ts
git commit -m "feat(outreach): implement import contacts and bulk enroll backend"
```

---

### Task 4.2: Build CSV Import modal

**Files:**
- Create: `src/app/admin/outreach/contacts/_components/import-modal.tsx`
- Modify: `src/app/admin/outreach/contacts/page.tsx` (wire Import button)

- [ ] **Step 1: Create ImportModal component**

Multi-step modal: (1) Upload CSV file, (2) Map columns, (3) Preview + optional sequence selection, (4) Import.

The component should:
- Accept a CSV file via drag-and-drop or file input
- Parse CSV client-side using a simple parser (split by newlines and commas, handle quoted fields)
- Show column mapping UI (dropdown per CSV column → firstName/lastName/email/company/sector/notes)
- Preview first 5 rows after mapping
- Optional: select a sequence to enroll into
- Submit button calls `api.outreach.importContacts.useMutation()`
- Show results: "Imported X contacts, Y skipped (duplicates)"

This is a large component (~250-350 lines). The implementing agent should follow the existing modal patterns in the codebase (Dialog from shadcn).

Key imports needed:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
```

Key state:
```tsx
const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload")
const [csvData, setCsvData] = useState<string[][]>([])
const [headers, setHeaders] = useState<string[]>([])
const [mapping, setMapping] = useState<Record<string, string>>({})
const [sequenceId, setSequenceId] = useState<string>("")
```

- [ ] **Step 2: Wire Import button on contacts page**

Replace the disabled Import button with:
```tsx
const [showImport, setShowImport] = useState(false)

<Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
  <Upload className="h-4 w-4 mr-1.5" /> Import
</Button>

<ImportModal open={showImport} onOpenChange={setShowImport} />
```

- [ ] **Step 3: Test — click Import, upload a CSV, verify column mapping, import**

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/contacts/_components/import-modal.tsx src/app/admin/outreach/contacts/page.tsx
git commit -m "feat(outreach): add CSV import modal to contacts page"
```

---

## Sub-plan 5: Sequence Editor Enhancements

**Scope:** Add status distribution bar to sequence cards, add duplicate action, add step preview mode.

---

### Task 5.1: Add status distribution bar to sequence cards

**Files:**
- Modify: `src/app/admin/outreach/sequences/_components/sequence-card.tsx`

The spec shows a stacked horizontal bar showing Active/Replied/Converted/Bounced/Opted-out/Completed distribution. The `sequenceAnalytics` data doesn't include per-status breakdown. We can compute this from `listContacts` but that's expensive per-card.

Instead, add a simple stats row showing the data we already have from analytics (totalSent, totalReplied, totalConverted) as a proportional bar.

- [ ] **Step 1: Add distribution bar to SequenceCard**

Add after the stats grid, before the step flow visual:

```tsx
{/* Distribution bar */}
{(sequence.totalSent > 0) && (
  <div className="space-y-1">
    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
      <div
        className="bg-blue-400"
        style={{ width: `${((sequence.totalSent - sequence.totalReplied) / sequence.totalSent) * 100}%` }}
        title={`Active/Sent: ${sequence.totalSent - sequence.totalReplied}`}
      />
      <div
        className="bg-emerald-400"
        style={{ width: `${(sequence.totalReplied / sequence.totalSent) * 100}%` }}
        title={`Replied: ${sequence.totalReplied}`}
      />
      <div
        className="bg-green-600"
        style={{ width: `${(sequence.totalConverted / sequence.totalSent) * 100}%` }}
        title={`Converted: ${sequence.totalConverted}`}
      />
    </div>
    <div className="flex gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Sent</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Replied</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" />Converted</span>
    </div>
  </div>
)}
```

- [ ] **Step 2: Add Duplicate action to sequence card footer**

Add a duplicate button next to Edit. It should call `createSequence` with the same data but a "(copy)" suffix on the name.

```tsx
const duplicateSequence = api.outreach.createSequence.useMutation({
  onSuccess: () => {
    void utils.outreach.listSequences.invalidate()
    toast.success("Sequence duplicated")
  },
  onError: (err) => toast.error(err.message),
})

// In footer actions:
<Button
  size="sm"
  variant="ghost"
  onClick={(e) => {
    e.stopPropagation()
    duplicateSequence.mutate({
      name: `${sequence.name} (copy)`,
      sector: sequence.sector,
      steps: sequence.steps,
      description: sequence.description ?? undefined,
      targetIcp: sequence.targetIcp ?? undefined,
    })
  }}
  disabled={duplicateSequence.isPending}
>
  <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
</Button>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/sequence-card.tsx
git commit -m "feat(outreach): add distribution bar and duplicate action to sequence cards"
```

---

### Task 5.2: Add step preview mode to sequence editor

**Files:**
- Modify: `src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx`

The spec shows a "Preview" toggle that renders the template with a real contact's data. Use `api.outreach.getBody` to fetch rendered content.

- [ ] **Step 1: Add preview state and contact selector**

```tsx
const [previewContactId, setPreviewContactId] = useState<string | null>(null)
const [showPreview, setShowPreview] = useState(false)

const contactsQuery = api.outreach.listContacts.useQuery(
  { limit: 10 },
  { enabled: showPreview },
)
```

- [ ] **Step 2: Add preview toggle at top of steps tab**

```tsx
<div className="flex items-center justify-between mb-4">
  <p className="text-sm font-semibold">Steps</p>
  <div className="flex items-center gap-2">
    <Button
      size="sm"
      variant={showPreview ? "default" : "outline"}
      onClick={() => setShowPreview(!showPreview)}
    >
      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
    </Button>
    {showPreview && (
      <select
        className="text-xs border rounded px-2 py-1"
        value={previewContactId ?? ""}
        onChange={(e) => setPreviewContactId(e.target.value || null)}
      >
        <option value="">Select contact...</option>
        {(contactsQuery.data?.rows ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.customerFirstName} {c.customerLastName}
          </option>
        ))}
      </select>
    )}
  </div>
</div>
```

- [ ] **Step 3: Show rendered preview below each step body when preview mode is on**

When `showPreview && previewContactId`, for each step, call `api.outreach.getBody` (or do simple client-side variable replacement as a lightweight alternative) and show the rendered version below the textarea.

Simple client-side approach (avoids N queries):
```tsx
function renderPreview(body: string, contact: OutreachContactWithDetails): string {
  return body
    .replace(/\{\{firstName\}\}/g, contact.customerFirstName ?? "")
    .replace(/\{\{lastName\}\}/g, contact.customerLastName ?? "")
    .replace(/\{\{company\}\}/g, contact.company ?? "")
    .replace(/\{\{sector\}\}/g, contact.sector ?? "")
}
```

- [ ] **Step 4: Test — open sequence editor, toggle preview, select contact, verify variables resolve**

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/outreach/sequences/_components/editor-steps-tab.tsx
git commit -m "feat(outreach): add step preview mode to sequence editor"
```

---

## Sub-plan 6: Dashboard & Replies Polish

**Scope:** Final polish — update outreach-analytics.tsx to show link to full analytics, add "Schedule Follow-up" placeholder, clean up remaining stubs.

---

### Task 6.1: Update dashboard analytics summary

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-analytics.tsx`

Replace the three "Coming soon" placeholders (ActivityFeed, ChannelMix, SequenceVelocity) with a compact summary + link to the full analytics page.

- [ ] **Step 1: Replace placeholders with link**

```tsx
import Link from "next/link"

// Replace ActivityFeed, ChannelMix, SequenceVelocity with:
function AnalyticsTeaser() {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <p className="text-sm font-medium mb-2">Full Analytics Dashboard</p>
        <p className="text-xs text-muted-foreground mb-4">
          Sector heatmaps, timing insights, revenue attribution, cohort analysis and more.
        </p>
        <Link href="/admin/outreach/analytics">
          <Button size="sm" variant="outline">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> View Full Analytics
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

// Simplify the OutreachAnalytics layout:
export function OutreachAnalytics() {
  return (
    <div className="space-y-6">
      <StateMachineFlow />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectorHeatmap />
        <AnalyticsTeaser />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/_components/outreach-analytics.tsx
git commit -m "refactor(outreach): replace analytics placeholders with link to full analytics page"
```

---

### Task 6.2: Add disabled "Schedule Follow-up" button to reply detail

**Files:**
- Modify: `src/app/admin/outreach/replies/_components/reply-detail.tsx`

The spec shows "Schedule Follow-up" and "Forward" actions in the reply detail. These are post-MVP but should be visible as disabled buttons so the UI matches the spec layout.

- [ ] **Step 1: Add buttons to reply detail action bar**

After the snooze button, add:

```tsx
<Button size="sm" variant="outline" disabled>
  <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Follow Up
</Button>
<Button size="sm" variant="outline" disabled>
  <Forward className="h-3.5 w-3.5 mr-1" /> Forward
</Button>
```

Import `CalendarPlus` and `Forward` from lucide-react.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/replies/_components/reply-detail.tsx
git commit -m "feat(outreach): add disabled follow-up button to reply detail"
```

---

### Task 6.3: Add template performance stats to template cards

**Files:**
- Modify: `src/app/admin/outreach/templates/_components/template-cards.tsx`

The spec shows reply rate and usage count on each template card. We don't have a backend endpoint for template performance yet, but we can show the footer structure with placeholder values for when the data becomes available.

- [ ] **Step 1: Add footer to template cards**

```tsx
{/* Card footer */}
<div className="flex items-center justify-between mt-3 pt-2 border-t text-[10px] text-muted-foreground">
  <span>Performance tracking coming soon</span>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/templates/_components/template-cards.tsx
git commit -m "feat(outreach): add performance footer placeholder to template cards"
```

---

### Task 6.4: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build succeeds

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Manual smoke test — navigate every outreach page, click every button**

Verify:
- Dashboard: New Sequence button works, undo toast on mark sent
- Contacts: Import button opens modal, pagination works, Convert in kebab works
- Replies: Pagination loads more, sequence context card shows
- Sequences: Duplicate button works, distribution bar shows, preview mode works
- Analytics: All 5 tabs render, date range filters work
- Templates: Performance footer shows
- Contact detail: Slide-over (not dialog), snooze works, convert works

- [ ] **Step 5: Commit any fixes**

Stage only the specific files that were modified during smoke test fixes — avoid `git add -A`.

```bash
git commit -m "fix(outreach): address smoke test issues"
```
