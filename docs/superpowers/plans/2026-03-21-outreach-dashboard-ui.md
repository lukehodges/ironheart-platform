# Outreach Dashboard + Contact Detail — Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the outreach dashboard from mock data to live tRPC queries, add batch actions, keyboard shortcuts, undo, and a contact detail slide-over.

**Architecture:** Replace mock data imports with `api.outreach.*` tRPC hooks. Add interactive features (batch select, keyboard nav, undo toast) as progressive enhancements to the existing component structure. Contact detail is a Dialog-based slide-over triggered by clicking any contact name.

**Tech Stack:** React 19, tRPC React Query hooks, Tailwind 4, Lucide icons, Sonner toasts

**Spec:** `docs/superpowers/specs/2026-03-21-outreach-ui-design.md` (Section 1: Dashboard, Section 2.5: Contact Detail Slide-Over)

**Depends on:** Plan 1 (Backend Extensions) — completed

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/admin/outreach/page.tsx` | Modify | Add briefing card, wire tRPC dashboard query |
| `src/app/admin/outreach/_components/outreach-stats.tsx` | Modify | Wire to tRPC data instead of mock |
| `src/app/admin/outreach/_components/outreach-today.tsx` | Rewrite | tRPC integration, batch actions, keyboard shortcuts, undo |
| `src/app/admin/outreach/_components/contact-detail.tsx` | Create | Contact detail slide-over with timeline + quick actions |
| `src/app/admin/outreach/_components/outreach-sequences.tsx` | Modify | Wire to tRPC data |
| `src/app/admin/outreach/_components/outreach-analytics.tsx` | Modify | Wire to tRPC data |
| `src/app/admin/outreach/_mock-data.ts` | Keep | Retained as fallback for development; tRPC hooks use it when queries are loading |

---

### Task 1: Dashboard page — tRPC integration + briefing card

**Files:**
- Modify: `src/app/admin/outreach/page.tsx`

- [ ] **Step 1: Read the current page.tsx file**

Read `src/app/admin/outreach/page.tsx` to understand the current structure.

- [ ] **Step 2: Add tRPC dashboard query**

Add the tRPC import and dashboard query at the top of the component:

```tsx
import { api } from "@/lib/trpc/react"
```

Inside the component, add:
```tsx
const dashboardQuery = api.outreach.getDashboard.useQuery()
const dashboard = dashboardQuery.data
```

- [ ] **Step 3: Add briefing card above the stats strip**

After PageHeader, before OutreachStats, add a briefing card:

```tsx
{dashboard && (
  <Card className="border-blue-200 bg-blue-50/50">
    <CardContent className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-semibold text-blue-900">
          Today&apos;s Mission
        </p>
        <p className="text-sm text-blue-700">
          {dashboard.dueNow.length + dashboard.overdue.length} contacts due
          {dashboard.overdue.length > 0 && (
            <span className="text-red-600 font-medium">
              {" "}({dashboard.overdue.length} overdue)
            </span>
          )}
          {", "}
          {dashboard.recentReplies.length} replies waiting
          {" · "}
          ~{Math.ceil((dashboard.dueNow.length + dashboard.overdue.length) * 3)} min
        </p>
      </div>
      <Badge variant="outline" className="text-blue-700 border-blue-300">
        {dashboard.todayStats.sent} sent today
      </Badge>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 4: Pass dashboard data to OutreachStats**

Update the OutreachStats component call to pass live data:

```tsx
<OutreachStats
  dueToday={dashboard?.dueNow.length ?? 0}
  overdue={dashboard?.overdue.length ?? 0}
  sentToday={dashboard?.todayStats.sent ?? 0}
  repliesWaiting={dashboard?.recentReplies.length ?? 0}
  isLoading={dashboardQuery.isLoading}
/>
```

- [ ] **Step 5: Pass dashboard data to OutreachToday**

```tsx
{view === "today" && (
  <OutreachToday
    dueContacts={[...(dashboard?.overdue ?? []), ...(dashboard?.dueNow ?? [])]}
    recentReplies={dashboard?.recentReplies ?? []}
    todayStats={dashboard?.todayStats}
    isLoading={dashboardQuery.isLoading}
  />
)}
```

- [ ] **Step 6: Add necessary imports**

Add `Card, CardContent` and `Badge` imports from `@/components/ui/`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/outreach/page.tsx
git commit -m "feat(outreach): wire dashboard page to tRPC, add briefing card"
```

---

### Task 2: Stats strip — accept props instead of mock data

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-stats.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/admin/outreach/_components/outreach-stats.tsx`.

- [ ] **Step 2: Replace mock data with props**

Change the component to accept props:

```tsx
interface OutreachStatsProps {
  dueToday: number
  overdue: number
  sentToday: number
  repliesWaiting: number
  isLoading?: boolean
}

export function OutreachStats({ dueToday, overdue, sentToday, repliesWaiting, isLoading }: OutreachStatsProps) {
```

Remove any mock data imports. Use the prop values instead of hardcoded numbers.

If `isLoading` is true, show `Skeleton` components for the numbers.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/outreach/_components/outreach-stats.tsx
git commit -m "feat(outreach): wire stats strip to tRPC props"
```

---

### Task 3: Today view — tRPC, batch actions, undo

This is the largest task. The existing `outreach-today.tsx` (315 lines) needs significant changes.

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-today.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/admin/outreach/_components/outreach-today.tsx` fully.

- [ ] **Step 2: Change component to accept props instead of mock data**

Update the component signature:

```tsx
import type { DashboardContact } from "@/modules/outreach/outreach.types"

interface OutreachTodayProps {
  dueContacts: DashboardContact[]
  recentReplies: DashboardContact[]
  todayStats?: {
    sent: number
    replied: number
    bounced: number
    optedOut: number
    converted: number
    callsCompleted: number
    meetingsBooked: number
  }
  isLoading?: boolean
}

export function OutreachToday({ dueContacts, recentReplies, todayStats, isLoading }: OutreachTodayProps) {
```

Remove mock data imports. Use prop data throughout.

- [ ] **Step 3: Add tRPC mutations for mark sent and batch operations**

Inside the component:

```tsx
const utils = api.useUtils()

const logActivity = api.outreach.logActivity.useMutation({
  onSuccess: () => {
    void utils.outreach.getDashboard.invalidate()
  },
})

const batchLogActivity = api.outreach.batchLogActivity.useMutation({
  onSuccess: () => {
    void utils.outreach.getDashboard.invalidate()
    setSelectedIds(new Set())
  },
})

const undoActivity = api.outreach.undoActivity.useMutation({
  onSuccess: () => {
    void utils.outreach.getDashboard.invalidate()
  },
})
```

- [ ] **Step 4: Add batch selection state**

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

function toggleSelect(contactId: string) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(contactId)) next.delete(contactId)
    else next.add(contactId)
    return next
  })
}

function selectAll() {
  if (selectedIds.size === dueContacts.length) {
    setSelectedIds(new Set())
  } else {
    setSelectedIds(new Set(dueContacts.map(c => c.id)))
  }
}
```

- [ ] **Step 5: Add undo toast for mark sent**

```tsx
const [lastAction, setLastAction] = useState<{ contactId: string; activityId: string } | null>(null)

async function handleMarkSent(contactId: string) {
  const result = await logActivity.mutateAsync({ contactId, activityType: "SENT" })
  toast.success("Marked as sent", {
    action: {
      label: "Undo",
      onClick: () => {
        if (lastAction) {
          undoActivity.mutate({ contactId: lastAction.contactId, activityId: lastAction.activityId })
        }
      },
    },
    duration: 5000,
  })
}
```

Note: The `logActivity` mutation returns the updated contact, not the activity ID. You'll need to track the activity ID from the response or adjust the undo flow. If the mutation response doesn't include activityId, simplify the undo to just show a toast without the undo button for now — it can be added when the backend returns the activityId.

- [ ] **Step 6: Add copy-to-clipboard for email body**

```tsx
const getBody = api.outreach.getBody.useMutation()

async function handleCopyBody(contactId: string, contactName: string) {
  const rendered = await getBody.mutateAsync({ contactId })
  const text = rendered.subject
    ? `Subject: ${rendered.subject}\n\n${rendered.body}`
    : rendered.body
  await navigator.clipboard.writeText(text)
  toast.success(`Copied email for ${contactName}`)
}
```

Note: `getBody` is a query in the router, but calling it imperatively requires either `useQuery` with `enabled: false` + `refetch()`, or using `utils.outreach.getBody.fetch()`. Use whichever pattern feels cleaner — `utils.outreach.getBody.fetch({ contactId })` is simplest for imperative calls.

- [ ] **Step 7: Add batch actions bar**

Render conditionally when contacts are selected:

```tsx
{selectedIds.size > 0 && (
  <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
    <Checkbox
      checked={selectedIds.size === dueContacts.length}
      onCheckedChange={selectAll}
    />
    <span className="text-sm text-muted-foreground">
      {selectedIds.size} selected
    </span>
    <Button
      size="sm"
      variant="outline"
      onClick={() => batchLogActivity.mutate({
        contactIds: Array.from(selectedIds),
        activityType: "SENT",
      })}
      disabled={batchLogActivity.isPending}
    >
      Mark Sent ({selectedIds.size})
    </Button>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => batchLogActivity.mutate({
        contactIds: Array.from(selectedIds),
        activityType: "SKIPPED",
      })}
      disabled={batchLogActivity.isPending}
    >
      Skip ({selectedIds.size})
    </Button>
  </div>
)}
```

- [ ] **Step 8: Add sector filter chips**

```tsx
const sectors = useMemo(() => {
  const set = new Set(dueContacts.map(c => c.sector))
  return Array.from(set).sort()
}, [dueContacts])

const [sectorFilter, setSectorFilter] = useState<string | null>(null)

const filteredContacts = sectorFilter
  ? dueContacts.filter(c => c.sector === sectorFilter)
  : dueContacts
```

Render filter chips:
```tsx
<div className="flex gap-2 flex-wrap">
  <Button
    size="sm"
    variant={sectorFilter === null ? "default" : "ghost"}
    onClick={() => setSectorFilter(null)}
  >
    All
  </Button>
  {sectors.map(sector => (
    <Button
      key={sector}
      size="sm"
      variant={sectorFilter === sector ? "default" : "ghost"}
      onClick={() => setSectorFilter(sector)}
    >
      {sector}
    </Button>
  ))}
</div>
```

- [ ] **Step 9: Update contact cards to use DashboardContact type**

Map the `DashboardContact` fields to the card display:
- `c.customerName` for name
- `c.company` for company
- `c.sector` for sector badge
- `c.sequenceName` for sequence
- `c.currentStep` + `c.totalSteps` for step indicator
- `c.channel` for channel icon
- `c.nextDueAt` for due time
- `c.subject` for subject preview

Add checkbox to each card for batch selection:
```tsx
<Checkbox
  checked={selectedIds.has(c.id)}
  onCheckedChange={() => toggleSelect(c.id)}
  className="mt-1"
/>
```

- [ ] **Step 10: Update ProgressRing to use todayStats**

```tsx
<ProgressRing
  sent={todayStats?.sent ?? 0}
  total={(todayStats?.sent ?? 0) + dueContacts.length}
/>
```

- [ ] **Step 11: Commit**

```bash
git add src/app/admin/outreach/_components/outreach-today.tsx
git commit -m "feat(outreach): wire today view to tRPC, add batch actions + undo + sector filters"
```

---

### Task 4: Keyboard shortcuts

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-today.tsx`

- [ ] **Step 1: Add focused contact state and keyboard handler**

```tsx
const [focusedIndex, setFocusedIndex] = useState(0)

useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    // Don't handle if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    const contact = filteredContacts[focusedIndex]
    if (!contact) return

    switch (e.key) {
      case "j":
        e.preventDefault()
        setFocusedIndex(i => Math.min(i + 1, filteredContacts.length - 1))
        break
      case "k":
        e.preventDefault()
        setFocusedIndex(i => Math.max(i - 1, 0))
        break
      case "s":
        e.preventDefault()
        handleMarkSent(contact.id)
        break
      case "c":
        e.preventDefault()
        handleCopyBody(contact.id, contact.customerName)
        break
      case "o": {
        e.preventDefault()
        // Open mailto or LinkedIn URL
        const mailto = `mailto:${contact.customerEmail ?? ""}?subject=${encodeURIComponent(contact.subject ?? "")}`
        window.open(mailto, "_blank")
        break
      }
      case "x":
        e.preventDefault()
        toggleSelect(contact.id)
        break
      case "?":
        e.preventDefault()
        setShowShortcuts(v => !v)
        break
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [focusedIndex, filteredContacts])
```

- [ ] **Step 2: Add visual focus indicator to contact cards**

Add a ring/highlight to the focused card:
```tsx
className={cn(
  "p-3 rounded-lg border",
  index === focusedIndex && "ring-2 ring-blue-500 ring-offset-1",
)}
```

Import `cn` from `@/lib/utils` if not already imported.

- [ ] **Step 3: Add keyboard shortcuts help panel**

```tsx
const [showShortcuts, setShowShortcuts] = useState(false)

{showShortcuts && (
  <Card className="p-4">
    <p className="text-sm font-semibold mb-2">Keyboard Shortcuts</p>
    <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
      <span><kbd className="px-1 bg-muted rounded">j/k</kbd> Navigate</span>
      <span><kbd className="px-1 bg-muted rounded">s</kbd> Mark sent</span>
      <span><kbd className="px-1 bg-muted rounded">c</kbd> Copy body</span>
      <span><kbd className="px-1 bg-muted rounded">o</kbd> Open in Gmail</span>
      <span><kbd className="px-1 bg-muted rounded">x</kbd> Toggle select</span>
      <span><kbd className="px-1 bg-muted rounded">?</kbd> Toggle shortcuts</span>
    </div>
  </Card>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/_components/outreach-today.tsx
git commit -m "feat(outreach): add keyboard shortcuts for contact navigation"
```

---

### Task 5: Contact detail slide-over

**Files:**
- Create: `src/app/admin/outreach/_components/contact-detail.tsx`
- Modify: `src/app/admin/outreach/_components/outreach-today.tsx` (add trigger)

- [ ] **Step 1: Create the contact detail component**

Create `src/app/admin/outreach/_components/contact-detail.tsx`:

```tsx
"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Mail, Linkedin, Phone, Send, SkipForward,
  MessageSquare, Pause, Play, ArrowRightLeft, Clock,
  CheckCircle2,
} from "lucide-react"
import type { DashboardContact } from "@/modules/outreach/outreach.types"

interface ContactDetailProps {
  contact: DashboardContact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail,
  LINKEDIN_REQUEST: Linkedin,
  LINKEDIN_MESSAGE: Linkedin,
  CALL: Phone,
}

export function ContactDetail({ contact, open, onOpenChange }: ContactDetailProps) {
  if (!contact) return null

  const utils = api.useUtils()
  const activitiesQuery = api.outreach.getContactActivities.useQuery(
    { contactId: contact.id, limit: 20 },
    { enabled: open },
  )

  const logActivity = api.outreach.logActivity.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      void activitiesQuery.refetch()
      toast.success("Activity logged")
    },
    onError: (err) => toast.error(err.message),
  })

  const pauseContact = api.outreach.pauseContact.useMutation({
    onSuccess: () => {
      void utils.outreach.getDashboard.invalidate()
      toast.success("Contact paused")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const activities = activitiesQuery.data?.activities ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{contact.customerName}</span>
            <Badge variant="outline">{contact.sector}</Badge>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {contact.company && <span>{contact.company} · </span>}
            {contact.customerEmail}
          </div>
        </DialogHeader>

        {/* Sequence Progress */}
        <div className="flex items-center gap-1 py-2">
          {Array.from({ length: contact.totalSteps }, (_, i) => {
            const stepNum = i + 1
            const isCompleted = stepNum < contact.currentStep
            const isCurrent = stepNum === contact.currentStep
            const ChannelIcon = CHANNEL_ICONS[contact.channel] ?? Mail

            return (
              <div key={stepNum} className="flex items-center gap-1">
                {i > 0 && <div className="w-4 h-px bg-border" />}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border ${
                    isCompleted
                      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                      : isCurrent
                        ? "bg-blue-100 border-blue-400 text-blue-700 ring-2 ring-blue-200"
                        : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "SENT" })}
            disabled={logActivity.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Mark Sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "SKIPPED" })}
            disabled={logActivity.isPending}
          >
            <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => logActivity.mutate({ contactId: contact.id, activityType: "REPLIED" })}
            disabled={logActivity.isPending}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Log Reply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseContact.mutate({ contactId: contact.id })}
            disabled={pauseContact.isPending}
          >
            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
          </Button>
          <Button size="sm" variant="outline" disabled>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Convert
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Clock className="h-3.5 w-3.5 mr-1" /> Snooze
          </Button>
        </div>

        {/* Activity Timeline */}
        <div>
          <p className="text-sm font-semibold mb-2">Activity Timeline</p>
          {activitiesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet</p>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 relative">
                  <div className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.activityType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Step {activity.stepPosition} · {activity.channel}
                      </span>
                    </div>
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-semibold mb-1">Notes</p>
          <p className="text-sm text-muted-foreground">
            {contact.notes || "No notes"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire the slide-over trigger in outreach-today.tsx**

In `outreach-today.tsx`, add state and import:

```tsx
import { ContactDetail } from "./contact-detail"

// Inside the component:
const [selectedContact, setSelectedContact] = useState<DashboardContact | null>(null)
```

Make contact names clickable:
```tsx
<button
  className="font-medium text-sm hover:underline text-left"
  onClick={() => setSelectedContact(contact)}
>
  {contact.customerName}
</button>
```

Add the slide-over at the bottom of the component's return:
```tsx
<ContactDetail
  contact={selectedContact}
  open={selectedContact !== null}
  onOpenChange={(open) => { if (!open) setSelectedContact(null) }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/outreach/_components/contact-detail.tsx src/app/admin/outreach/_components/outreach-today.tsx
git commit -m "feat(outreach): add contact detail slide-over with timeline and quick actions"
```

---

### Task 6: Wire sequences and analytics views to tRPC

**Files:**
- Modify: `src/app/admin/outreach/_components/outreach-sequences.tsx`
- Modify: `src/app/admin/outreach/_components/outreach-analytics.tsx`
- Modify: `src/app/admin/outreach/page.tsx`

- [ ] **Step 1: Read both component files**

Read outreach-sequences.tsx and outreach-analytics.tsx.

- [ ] **Step 2: Update outreach-sequences.tsx to accept tRPC data**

Add props interface and replace mock data usage:

```tsx
import { api } from "@/lib/trpc/react"

export function OutreachSequences() {
  const sequencesQuery = api.outreach.listSequences.useQuery()
  const analyticsQuery = api.outreach.sequenceAnalytics.useQuery({})

  const sequences = sequencesQuery.data ?? []
  const analytics = analyticsQuery.data ?? []

  // ... rest of component uses sequences and analytics instead of mockSequences
```

Keep the existing UI structure — just swap mock data for query results. The component should handle loading states with skeletons.

- [ ] **Step 3: Update outreach-analytics.tsx similarly**

```tsx
import { api } from "@/lib/trpc/react"

export function OutreachAnalytics() {
  const sequenceAnalytics = api.outreach.sequenceAnalytics.useQuery({})
  const sectorAnalytics = api.outreach.sectorAnalytics.useQuery({})

  // ... use query data instead of mock data
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/outreach/_components/outreach-sequences.tsx src/app/admin/outreach/_components/outreach-analytics.tsx
git commit -m "feat(outreach): wire sequences and analytics views to tRPC"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Run tests to confirm no regressions**

Run: `npx vitest run src/modules/outreach/ 2>&1 | tail -10`
Expected: All tests pass.
