# Staff Module Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all frontend changes to consume the new staff module tRPC procedures -- fixing existing bugs, enhancing the team list and profile pages, and adding new components for notes, pay rates, departments, custom fields, onboarding, and settings integration.

**Architecture:** All changes extend the existing `src/components/team/` and `src/app/admin/team/` structure. New settings tabs are lazy-loaded from the existing settings page. All data fetching uses `api.team.*` tRPC React hooks inline. The backend plan (Tasks 5-7) defines the exact router shape: `team.departments.*`, `team.notes.*`, `team.payRates.*`, `team.onboarding.*`, `team.customFields.*`, `team.listSkillCatalog`.

**Tech Stack:** React 19, Next.js 16, tRPC 11 React hooks, shadcn/ui (Radix primitives), Tailwind 4, date-fns, sonner (toasts), lucide-react icons

**Prerequisite:** The backend implementation plan (`2026-02-25-staff-module-implementation.md`) must be complete before starting this plan. All `api.team.*` procedures referenced here are defined in that plan.

---

## Task 1: Bug fixes -- AvailabilityEditor init, pagination, availability indicator

**Files:**
- Modify: `src/components/team/availability-editor.tsx`
- Modify: `src/components/team/profile/assignments-tab.tsx`
- Modify: `src/components/team/profile/activity-tab.tsx`
- Modify: `src/components/team/team-member-card.tsx`

### Step 1: Fix AvailabilityEditor init bug

The `useState` initializer on line 70 of `src/components/team/availability-editor.tsx` runs before the tRPC query resolves, so `availabilityData` is always `undefined` during initialization, leaving the grid permanently empty.

1. Add `useEffect` to the import on line 3:

```typescript
import { useState, useCallback, useEffect } from "react"
```

2. Simplify the `useState` initializer to just an empty map (line 70):

```typescript
const [grid, setGrid] = useState<Map<string, boolean>>(new Map())
```

3. Add a `useEffect` immediately after the `useState` to sync the grid when data arrives:

```typescript
// Sync grid state when availability data loads or changes
useEffect(() => {
  if (!availabilityData) return
  const m = new Map<string, boolean>()
  for (const entry of availabilityData) {
    if (entry.type === "RECURRING") {
      m.set(getCellKey(entry.dayOfWeek, entry.startTime), true)
    }
  }
  setGrid(m)
}, [availabilityData])
```

4. Similarly, add a `useEffect` after the `overrides` state (line 83) to sync specific date overrides from loaded data:

```typescript
// Sync overrides from loaded availability data
useEffect(() => {
  if (!availabilityData) return
  const loaded: SpecificOverride[] = []
  for (const entry of availabilityData) {
    if (entry.type === "SPECIFIC") {
      loaded.push({
        id: crypto.randomUUID(),
        specificDate: entry.specificDate,
        status: "AVAILABLE",
        startTime: entry.startTime,
        endTime: entry.endTime,
        isAllDay: false,
      })
    } else if (entry.type === "BLOCKED") {
      loaded.push({
        id: crypto.randomUUID(),
        specificDate: entry.specificDate,
        status: "BLOCKED",
        isAllDay: entry.isAllDay,
        reason: entry.reason,
      })
    }
  }
  if (loaded.length > 0) setOverrides(loaded)
}, [availabilityData])
```

### Step 2: Add cursor-based pagination to AssignmentsTab

In `src/components/team/profile/assignments-tab.tsx`:

1. Add `Button` to imports:

```typescript
import { Button } from "@/components/ui/button"
```

2. Add cursor state after the existing state declarations (after line 49):

```typescript
const [cursor, setCursor] = useState<string | undefined>(undefined)
```

3. Pass `cursor` to the query on line 51:

```typescript
const { data, isLoading } = api.team.listAssignments.useQuery({
  userId: memberId,
  status: statusFilter === "ALL" ? undefined : statusFilter,
  moduleSlug: moduleFilter || undefined,
  startDate: startDate || undefined,
  endDate: endDate || undefined,
  limit: PAGE_SIZE,
  cursor,
})
```

4. Reset cursor when any filter changes -- add `setCursor(undefined)` in each filter's `onChange` / `onValueChange` handler.

5. Replace the results count section at the bottom (lines 147-153) with a "Load more" button:

```tsx
<div className="flex items-center justify-between">
  <span className="text-xs text-muted-foreground">
    {assignments.length} result{assignments.length !== 1 ? "s" : ""}
    {hasMore ? "+" : ""}
  </span>
  {hasMore && (
    <Button
      size="sm"
      variant="outline"
      className="text-xs"
      onClick={() => {
        const last = assignments[assignments.length - 1]
        if (last) setCursor(last.id)
      }}
    >
      Load more
    </Button>
  )}
</div>
```

### Step 3: Add cursor-based pagination to ActivityTab

In `src/components/team/profile/activity-tab.tsx`:

1. Add imports:

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
```

2. Add cursor state at the top of the component:

```typescript
const [cursor, setCursor] = useState<string | undefined>(undefined)
```

3. Pass cursor to the query:

```typescript
const { data, isLoading, isError } = api.audit.list.useQuery(
  { userId: memberId, limit: 50, cursor },
  { retry: false }
)
```

4. Add a "Load more" button after the entries list, before the closing `</div>` of the main return:

```tsx
{data?.hasMore && (
  <div className="flex justify-center pt-2">
    <Button
      size="sm"
      variant="outline"
      className="text-xs"
      onClick={() => {
        const last = entries[entries.length - 1]
        if (last) setCursor(last.id)
      }}
    >
      Load more
    </Button>
  </div>
)}
```

### Step 4: Fix AvailabilityIndicator to use real schedule data

In `src/components/team/team-member-card.tsx`, the `AvailabilityIndicator` component (lines 35-58) shows "Available today" for any ACTIVE member regardless of their actual schedule.

Replace the entire `AvailabilityIndicator` function with:

```tsx
function AvailabilityIndicator({ memberId, status }: { memberId: string; status: StaffStatus }) {
  const today = new Date().toISOString().split("T")[0]!
  const { data: availability } = api.team.getAvailability.useQuery(
    { userId: memberId, startDate: today },
    { enabled: status === "ACTIVE", staleTime: 5 * 60 * 1000 }
  )

  if (status === "SUSPENDED") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>On leave</span>
      </div>
    )
  }

  if (status !== "ACTIVE") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Inactive</span>
      </div>
    )
  }

  // Check if today has any RECURRING or SPECIFIC availability entries
  const dayOfWeek = new Date().getDay()
  const hasAvailability = availability?.some((entry) => {
    if (entry.type === "RECURRING" && entry.dayOfWeek === dayOfWeek) return true
    if (entry.type === "SPECIFIC" && entry.specificDate === today) return true
    return false
  })

  // Check if today is blocked
  const isBlocked = availability?.some((entry) => {
    if (entry.type === "BLOCKED" && entry.specificDate === today) return true
    return false
  })

  if (isBlocked) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Blocked today</span>
      </div>
    )
  }

  if (hasAvailability) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Available today</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>No schedule today</span>
    </div>
  )
}
```

Update the usage in `TeamMemberCard` (line 159) to pass `memberId`:

```tsx
<AvailabilityIndicator memberId={member.id} status={member.status} />
```

### Commit

```
fix(team): fix availability editor init bug, add pagination to assignments/activity, fix availability indicator
```

---

## Task 2: Profile page enhancements -- Overview tab

**Files:**
- Modify: `src/components/team/profile/overview-tab.tsx`

### Step 1: Add new imports

Add to existing imports at the top of the file:

```typescript
import { lazy, Suspense } from "react"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, User, MapPin, AlertTriangle, DollarSign } from "lucide-react"

const PayRatesDialog = lazy(() =>
  import("@/components/team/profile/pay-rates-dialog").then((m) => ({ default: m.PayRatesDialog }))
)
```

### Step 2: Add emergency contact section

Create a new `EmergencyContactSection` component inside the file. The backend plan extends `StaffMember` (Task 3) with `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelation`. Access these via optional chaining since they may be `null`.

```tsx
function EmergencyContactSection({ member }: { member: StaffMember }) {
  const hasContact = (member as any).emergencyContactName || (member as any).emergencyContactPhone
  if (!hasContact) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        Emergency Contact
      </h4>
      <div className="rounded-lg border border-border divide-y divide-border px-4">
        {(member as any).emergencyContactName && (
          <DetailRow label="Name" value={(member as any).emergencyContactName} />
        )}
        {(member as any).emergencyContactPhone && (
          <DetailRow label="Phone" value={(member as any).emergencyContactPhone} />
        )}
        {(member as any).emergencyContactRelation && (
          <DetailRow label="Relationship" value={(member as any).emergencyContactRelation} />
        )}
      </div>
    </div>
  )
}
```

Note: Once the backend plan lands and the `StaffMember` type is updated, replace the `as any` casts with direct property access.

### Step 3: Add address section

```tsx
function AddressSection({ member }: { member: StaffMember }) {
  const m = member as any
  const parts = [m.addressLine1, m.addressLine2, m.addressCity, m.addressPostcode, m.addressCountry].filter(Boolean)
  if (parts.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Address
      </h4>
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm text-foreground">{parts.join(", ")}</p>
      </div>
    </div>
  )
}
```

### Step 4: Add department badges

```tsx
function DepartmentBadges({ member }: { member: StaffMember }) {
  const departments = (member as any).departments ?? []
  if (departments.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Departments
      </h4>
      <div className="flex flex-wrap gap-2">
        {departments.map((dept: any) => (
          <Badge
            key={dept.departmentId}
            variant={dept.isPrimary ? "default" : "secondary"}
            className="text-xs"
          >
            {dept.departmentName}
            {dept.isPrimary && <span className="ml-1 opacity-70">primary</span>}
          </Badge>
        ))}
      </div>
    </div>
  )
}
```

### Step 5: Add reporting line

```tsx
function ReportingLine({ reportsTo }: { reportsTo: string | null }) {
  const { data: manager } = api.team.getById.useQuery(
    { userId: reportsTo! },
    { enabled: !!reportsTo, staleTime: 5 * 60 * 1000 }
  )
  if (!reportsTo || !manager) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <User className="h-4 w-4" />
        Reports to
      </h4>
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm text-foreground">{manager.name}</p>
        {(manager as any).jobTitle && (
          <p className="text-xs text-muted-foreground">{(manager as any).jobTitle}</p>
        )}
      </div>
    </div>
  )
}
```

### Step 6: Add pay rate section with "view history" link

```tsx
function PayRateSection({ memberId, currentRate }: { memberId: string; currentRate: number | null }) {
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Pay Rate
      </h4>
      <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-foreground">
          {currentRate != null ? formatCurrency(currentRate) : "Not set"}
          {currentRate != null && <span className="text-xs text-muted-foreground ml-1">/hr</span>}
        </span>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setHistoryOpen(true)}>
          View history
        </Button>
      </div>
      {historyOpen && (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <PayRatesDialog memberId={memberId} open={historyOpen} onOpenChange={setHistoryOpen} />
        </Suspense>
      )}
    </div>
  )
}
```

### Step 7: Add onboarding progress bar

```tsx
function OnboardingProgressSection({ memberId }: { memberId: string }) {
  const { data: progress, isLoading } = api.team.onboarding.getProgress.useQuery(
    { userId: memberId, type: "ONBOARDING" },
    { staleTime: 30_000 }
  )
  if (isLoading) return <Skeleton className="h-16 w-full" />

  const active = Array.isArray(progress) ? progress.find((p: any) => p.status !== "COMPLETED") : null
  if (!active) return null

  const totalRequired = active.items.filter((i: any) => i.isRequired).length
  const completedRequired = active.items.filter((i: any) => i.isRequired && i.completedAt).length
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Onboarding Progress</h4>
      <div className="rounded-lg border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{active.templateName}</span>
          <span className="text-xs font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {completedRequired}/{totalRequired} required items complete
        </p>
      </div>
    </div>
  )
}
```

### Step 8: Add custom fields section

```tsx
function CustomFieldsSection({ memberId }: { memberId: string }) {
  const { data: values, isLoading } = api.team.customFields.getValues.useQuery(
    { userId: memberId },
    { staleTime: 60_000 }
  )
  if (isLoading) return <Skeleton className="h-16 w-full" />
  if (!values || values.length === 0) return null

  const grouped = new Map<string, typeof values>()
  for (const v of values) {
    const group = v.groupName ?? "Other"
    const arr = grouped.get(group) ?? []
    arr.push(v)
    grouped.set(group, arr)
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([group, fields]) => (
        <div key={group} className="space-y-2">
          <h4 className="text-sm font-medium">{group}</h4>
          <div className="rounded-lg border border-border divide-y divide-border px-4">
            {fields.map((f) => (
              <DetailRow
                key={f.fieldDefinitionId}
                label={f.label}
                value={f.value == null ? "\u2014" : String(f.value)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Step 9: Update the OverviewTab body

Replace the `OverviewTab` function body to include all new sections:

```tsx
export function OverviewTab({ member, onUpdate }: OverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false)
  const utils = api.useUtils()

  return (
    <div className="py-6 space-y-6">
      {/* Onboarding progress (shows only if incomplete) */}
      <OnboardingProgressSection memberId={member.id} />

      {/* Profile details header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Profile Details</h3>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border px-4">
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="Phone" value={member.phone ?? "\u2014"} />
        <DetailRow label="Job title" value={(member as any).jobTitle ?? "\u2014"} />
        <DetailRow
          label="Employee type"
          value={member.employeeType ? member.employeeType.replace("_", " ").toLowerCase() : "\u2014"}
        />
        <DetailRow label="Hourly rate" value={formatCurrency(member.hourlyRate)} />
        <DetailRow label="Joined" value={formatDate(member.createdAt)} />
      </div>

      {/* Department badges */}
      <DepartmentBadges member={member} />

      {/* Reporting line */}
      <ReportingLine reportsTo={(member as any).reportsTo ?? null} />

      {/* Pay rate with history link */}
      <PayRateSection memberId={member.id} currentRate={member.hourlyRate ?? null} />

      <Separator />

      {/* Emergency contact */}
      <EmergencyContactSection member={member} />

      {/* Address */}
      <AddressSection member={member} />

      {/* Custom fields */}
      <CustomFieldsSection memberId={member.id} />

      <EditProfileDialog
        member={member}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          void utils.team.getById.invalidate({ userId: member.id })
          void utils.team.list.invalidate()
          onUpdate()
        }}
      />
    </div>
  )
}
```

### Step 10: Extend EditProfileDialog with new fields

Add state for new fields in the `EditProfileDialog` component (initialized from `member.*`): `jobTitle`, `bio`, `reportsTo`, `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelation`, `addressLine1`, `addressLine2`, `addressCity`, `addressPostcode`, `addressCountry`.

Add form fields for each, grouped in collapsible sections using `Collapsible` from `@/components/ui/collapsible`:
- "Contact" section (existing: email, phone)
- "Employment" section (existing: employeeType, hourlyRate; new: jobTitle, reportsTo as staff-member Select)
- "Emergency Contact" section (emergencyContactName, emergencyContactPhone, emergencyContactRelation)
- "Address" section (addressLine1, addressLine2, addressCity, addressPostcode, addressCountry)

Include all fields in the `updateMutation.mutate()` call. The backend `updateStaffSchema` (Task 4) already accepts all these fields.

### Commit

```
feat(team): enhance overview tab with departments, emergency contact, address, pay rate, onboarding, custom fields
```

---

## Task 3: Profile page -- add Calendar and Notes tabs

**Files:**
- Modify: `src/app/admin/team/[id]/page.tsx`

### Step 1: Add import for NotesTab

```typescript
import { NotesTab } from "@/components/team/profile/notes-tab"
```

### Step 2: Reorder tabs per design doc and add Calendar + Notes

The design doc specifies tab order: Overview | Calendar | Skills | Capacity | Availability | Assignments | Notes | Activity

Replace the `<TabsList>` and all `<TabsContent>` blocks:

```tsx
<Tabs defaultValue="overview">
  <TabsList className="w-full justify-start">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="calendar">Calendar</TabsTrigger>
    <TabsTrigger value="skills">Skills</TabsTrigger>
    <TabsTrigger value="capacity">Capacity</TabsTrigger>
    <TabsTrigger value="availability">Availability</TabsTrigger>
    <TabsTrigger value="assignments">Assignments</TabsTrigger>
    <TabsTrigger value="notes">Notes</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="mt-4">
    <OverviewTab member={member} onUpdate={() => void refetch()} />
  </TabsContent>

  <TabsContent value="calendar" className="mt-4">
    <div className="py-6">
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Staff calendar will be available when the scheduling module is extended.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          This tab will aggregate availability, bookings, and leave into a unified calendar view.
        </p>
      </div>
    </div>
  </TabsContent>

  <TabsContent value="skills" className="mt-4">
    <SkillsTab memberId={member.id} />
  </TabsContent>

  <TabsContent value="capacity" className="mt-4">
    <CapacityTab memberId={member.id} />
  </TabsContent>

  <TabsContent value="availability" className="mt-4">
    <AvailabilityTab memberId={member.id} />
  </TabsContent>

  <TabsContent value="assignments" className="mt-4">
    <AssignmentsTab memberId={member.id} />
  </TabsContent>

  <TabsContent value="notes" className="mt-4">
    <NotesTab memberId={member.id} />
  </TabsContent>

  <TabsContent value="activity" className="mt-4">
    <ActivityTab memberId={member.id} />
  </TabsContent>
</Tabs>
```

### Commit

```
feat(team): add calendar placeholder and notes tab to staff profile page
```

---

## Task 4: Team list page -- server-side employeeType filter

**Files:**
- Modify: `src/app/admin/team/page.tsx`

### Step 1: Pass employeeType to the tRPC query

Currently the list page (line 152-155) queries without `employeeType` and filters client-side (lines 160-163). Change the query to pass it server-side:

```typescript
const { data, isLoading, refetch } = api.team.list.useQuery({
  limit: 100,
  status: statusFilter === "ALL" ? undefined : statusFilter,
  employeeType: employeeTypeFilter === "ALL" ? undefined : employeeTypeFilter,
})
```

### Step 2: Remove client-side filter

Delete the `filteredMembers` filter (lines 160-163). Replace all references to `filteredMembers` below with `members` (the `data?.rows ?? []` variable).

### Commit

```
fix(team): use server-side employeeType filter instead of client-side filtering
```

---

## Task 5: Team list page -- department grouping, bulk actions, custom field values on cards

**Files:**
- Modify: `src/app/admin/team/page.tsx`
- Modify: `src/components/team/team-member-card.tsx`

### Step 1: Add department grouping toggle

In `src/app/admin/team/page.tsx`:

1. Add imports:

```typescript
import { Building2 } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
```

2. Add state:

```typescript
const [groupByDepartment, setGroupByDepartment] = useState(false)
```

3. Query departments when grouping is active:

```typescript
const { data: departments } = api.team.departments.list.useQuery(undefined, {
  enabled: groupByDepartment,
  staleTime: 60_000,
})
```

4. Add a toggle button in the filter area (after the employee type filter row):

```tsx
<div className="flex items-center gap-2">
  <Button
    size="sm"
    variant={groupByDepartment ? "default" : "outline"}
    className="text-xs h-7"
    onClick={() => setGroupByDepartment(!groupByDepartment)}
  >
    <Building2 className="h-3.5 w-3.5" />
    Group by department
  </Button>
</div>
```

5. When `groupByDepartment` is true, render a `DepartmentGroupedView` local component instead of the flat grid. This component groups members by their primary department using `member.departments` array, renders `Collapsible` sections, and puts members without departments in an "Unassigned" group.

### Step 2: Add bulk actions toolbar

1. Add state:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [bulkMode, setBulkMode] = useState(false)
```

2. Add a bulk update mutation:

```typescript
const bulkUpdateMutation = api.team.update.useMutation({
  onSuccess: () => {
    toast.success("Members updated")
    setSelectedIds(new Set())
    setBulkMode(false)
    void refetch()
  },
  onError: (err) => toast.error(err.message ?? "Failed to update"),
})
```

3. Add a "Select" toggle button next to "Add Member":

```tsx
<Button
  size="sm"
  variant={bulkMode ? "secondary" : "outline"}
  onClick={() => {
    setBulkMode(!bulkMode)
    setSelectedIds(new Set())
  }}
>
  {bulkMode ? "Cancel selection" : "Select"}
</Button>
```

4. Add a sticky bottom toolbar when `selectedIds.size > 0`:

```tsx
{selectedIds.size > 0 && (
  <div className="sticky bottom-4 z-10 mx-auto w-fit rounded-lg border border-border bg-card shadow-lg px-4 py-2 flex items-center gap-3">
    <span className="text-xs font-medium">{selectedIds.size} selected</span>
    <Separator orientation="vertical" className="h-5" />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-7">Change status</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => {
              for (const id of selectedIds) {
                bulkUpdateMutation.mutate({ id, status: s })
              }
            }}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <Button
      size="sm"
      variant="ghost"
      className="text-xs h-7"
      onClick={() => { setSelectedIds(new Set()); setBulkMode(false) }}
    >
      Cancel
    </Button>
  </div>
)}
```

5. Pass `bulkMode`, `isSelected`, and `onToggleSelect` props to `TeamMemberCard`. When `bulkMode` is true, the card shows a checkbox and toggles selection on click instead of opening the sheet.

### Step 3: Add custom field values to TeamMemberCard

In `src/components/team/team-member-card.tsx`, add a `CustomFieldChips` component:

```tsx
function CustomFieldChips({ memberId }: { memberId: string }) {
  const { data: definitions } = api.team.customFields.listDefinitions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  })
  const { data: values } = api.team.customFields.getValues.useQuery(
    { userId: memberId },
    { staleTime: 60_000 }
  )

  if (!definitions || !values) return null

  const cardFields = definitions.filter((d) => d.showOnCard)
  if (cardFields.length === 0) return null

  const valueMap = new Map(values.map((v) => [v.fieldDefinitionId, v.value]))

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
      {cardFields.map((def) => {
        const val = valueMap.get(def.id)
        if (val == null) return null
        return (
          <span
            key={def.id}
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {def.label}: {String(val)}
          </span>
        )
      })}
    </div>
  )
}
```

Render `<CustomFieldChips memberId={member.id} />` after `<SkillChips memberId={member.id} />` in the card body.

### Commit

```
feat(team): add department grouping, bulk actions, and custom field values to team list
```

---

## Task 6: Notes tab -- new component

**Files:**
- Create: `src/components/team/profile/notes-tab.tsx`

### Step 1: Create the NotesTab component

tRPC procedures used:
- `api.team.notes.list.useQuery({ userId, limit, cursor })` -- returns `{ rows: StaffNote[], hasMore: boolean }`
- `api.team.notes.create.useMutation()` -- input: `{ userId, content }`
- `api.team.notes.update.useMutation()` -- input: `{ noteId, content?, isPinned? }`
- `api.team.notes.delete.useMutation()` -- input: `{ noteId }`

Create a full component file at `src/components/team/profile/notes-tab.tsx`. The component should:

1. Use `"use client"` directive
2. Import: `useState` from react, `format` from date-fns, `Pin`/`PinOff`/`Pencil`/`Trash2`/`Plus` from lucide-react, `toast` from sonner, `api` from `@/lib/trpc/react`, `Button`, `Badge`, `Textarea`, `Skeleton`, `EmptyState`, `AlertDialog*`, `cn`
3. Accept props `{ memberId: string }`
4. Manage state: `newNote` (string), `editingId` (string | null), `editContent` (string), `deleteId` (string | null), `cursor` (string | undefined)
5. Render:
   - "Add note" form at top with `Textarea` and `Button`
   - Pinned notes section (notes where `isPinned = true`), then unpinned notes section
   - Each note card shows: author name, relative timestamp via `format(new Date(note.createdAt), "d MMM yyyy HH:mm")`, content, action buttons (pin/unpin, edit, delete)
   - Inline editing: when edit button is clicked, replace content with `Textarea` + Save/Cancel buttons
   - Delete confirmation via `AlertDialog`
   - "Load more" button when `hasMore` is true
6. Follow the exact same patterns as `SkillsTab` for layout, and `ActivityTab` for card styling

Export as named export: `export function NotesTab`.

### Commit

```
feat(team): add notes tab component with create, edit, pin, delete functionality
```

---

## Task 7: Pay rates dialog -- new component

**Files:**
- Create: `src/components/team/profile/pay-rates-dialog.tsx`

### Step 1: Create the PayRatesDialog component

tRPC procedures used:
- `api.team.payRates.list.useQuery({ userId })` -- returns `PayRate[]` ordered by effectiveFrom desc
- `api.team.payRates.create.useMutation()` -- input: `{ userId, rateType, amount, currency, effectiveFrom, reason? }`

Create `src/components/team/profile/pay-rates-dialog.tsx`:

1. Use `"use client"` directive
2. Accept props `{ memberId: string; open: boolean; onOpenChange: (open: boolean) => void }`
3. Render a `Dialog` with:
   - Header: "Pay Rate History"
   - Scrollable list of rate entries, each showing: amount formatted with `Intl.NumberFormat`, rate type badge, "Current" badge for the first entry without `effectiveUntil`, effective date range, reason (italic, muted)
   - A `Separator`
   - "Add new rate" button that toggles an inline form
   - Form fields: rate type Select (HOURLY, DAILY, SALARY, COMMISSION, PIECE_RATE), amount number Input, effective from date Input, reason Input (optional)
   - Form submit calls `api.team.payRates.create.useMutation`, invalidates list + getById
4. Follow the exact same dialog pattern as `AddMemberDialog`

Export as named export: `export function PayRatesDialog`.

### Commit

```
feat(team): add pay rates dialog with rate history and create form
```

---

## Task 8: Department management -- new page and components

**Files:**
- Create: `src/components/team/departments/department-tree.tsx`
- Create: `src/components/team/departments/department-dialog.tsx`
- Create: `src/app/admin/team/departments/page.tsx`

### Step 1: Create DepartmentTree component

tRPC procedures used:
- `api.team.departments.list.useQuery()` -- returns `Department[]` with nested `children`
- `api.team.departments.delete.useMutation()` -- input: `{ id }` (soft-delete)

Create `src/components/team/departments/department-tree.tsx`:

1. Accept props: `{ onEdit: (dept: Department) => void; onCreate: (parentId?: string) => void }`
2. Query departments and render a recursive tree using `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` from `@/components/ui/collapsible`
3. Each tree node shows: expand/collapse chevron (only if has children), color dot, department name, member count Badge, action buttons (add sub-department, edit, archive/delete)
4. Nested nodes are indented with `paddingLeft` based on depth
5. Empty state with "Create Department" action button when no departments exist

### Step 2: Create DepartmentDialog component

tRPC procedures used:
- `api.team.departments.create.useMutation()` -- input: `{ name, description?, parentId?, managerId?, color? }`
- `api.team.departments.update.useMutation()` -- input: `{ id, name?, description?, parentId?, managerId?, color?, sortOrder?, isActive? }`

Create `src/components/team/departments/department-dialog.tsx`:

1. Accept props: `{ open, onOpenChange, department?: Department | null, parentId?: string }`
2. When `department` is provided, render in edit mode (pre-fill fields). Otherwise, create mode.
3. Fields: name (required), description (Textarea, optional), color (hex Input with color preview dot), parent department (Select from departments list), manager (Select from `api.team.list.useQuery({ status: "ACTIVE", limit: 50 })`)
4. Follow the exact same dialog pattern as `AddMemberDialog`

### Step 3: Create departments page

Create `src/app/admin/team/departments/page.tsx`:

1. `"use client"` page with state for dialog open/close, editing department, and parent ID
2. Back button linking to `/admin/team`
3. `PageHeader` with title "Departments" and "Add Department" button
4. `DepartmentTree` component with `onEdit` and `onCreate` callbacks
5. `DepartmentDialog` rendered at the bottom, controlled by state

### Commit

```
feat(team): add department management page with tree view and create/edit dialog
```

---

## Task 9: Custom fields settings -- new component

**Files:**
- Create: `src/components/settings/staff-custom-fields.tsx`

### Step 1: Create StaffCustomFieldsTab component

tRPC procedures used:
- `api.team.customFields.listDefinitions.useQuery()` -- returns `CustomFieldDefinition[]`
- `api.team.customFields.createDefinition.useMutation()` -- input from `createCustomFieldDefSchema`
- `api.team.customFields.updateDefinition.useMutation()` -- input from `updateCustomFieldDefSchema`
- `api.team.customFields.deleteDefinition.useMutation()` -- input: `{ id }`

Create `src/components/settings/staff-custom-fields.tsx`:

1. Use `"use client"` directive
2. Main component renders:
   - Header with "Custom Fields" title and "Add Field" button
   - List of existing field definitions grouped by `groupName`, each showing: label, fieldKey (monospace), fieldType Badge, indicators for showOnCard/showOnProfile/isRequired, edit and delete buttons
   - Empty state when no definitions exist
3. Create/edit dialog with fields:
   - `label` (required) -- Input
   - `fieldKey` (required, auto-generated from label by lowercasing and replacing spaces with hyphens) -- Input, editable
   - `fieldType` -- Select with options: TEXT, NUMBER, DATE, SELECT, MULTI_SELECT, BOOLEAN, URL, EMAIL, PHONE
   - `options` (shown only for SELECT/MULTI_SELECT) -- dynamic list of `{ value, label }` pairs with add/remove buttons
   - `isRequired` -- Checkbox
   - `showOnCard` -- Checkbox
   - `showOnProfile` -- Checkbox
   - `groupName` -- Input (optional)
   - `sortOrder` -- number Input
4. Delete confirmation via `AlertDialog`

Export as named export: `export function StaffCustomFieldsTab`.

### Commit

```
feat(settings): add staff custom fields settings component
```

---

## Task 10: Onboarding templates settings + progress component

**Files:**
- Create: `src/components/settings/staff-onboarding-templates.tsx`
- Create: `src/components/team/profile/onboarding-progress.tsx`

### Step 1: Create StaffOnboardingTemplatesTab component

tRPC procedures used:
- `api.team.onboarding.templates.list.useQuery()` -- returns `ChecklistTemplate[]`
- `api.team.onboarding.templates.create.useMutation()` -- input from `createChecklistTemplateSchema`
- `api.team.onboarding.templates.update.useMutation()` -- input from `updateChecklistTemplateSchema`

Create `src/components/settings/staff-onboarding-templates.tsx`:

1. Use `"use client"` directive
2. Main component renders:
   - Two sections: "Onboarding Templates" and "Offboarding Templates" (filtered by `type` field)
   - Each template card shows: name, item count Badge, employeeType Badge (or "All types"), "Default" Badge if `isDefault`, edit button
   - "Create Template" button opens a dialog
3. Create/edit dialog with:
   - `name` -- Input (required)
   - `type` -- Select: ONBOARDING / OFFBOARDING
   - `employeeType` -- Select: "All types" / EMPLOYED / SELF_EMPLOYED / CONTRACTOR (optional)
   - `isDefault` -- Checkbox
   - `items` -- Dynamic list editor. Each item has: `key` (auto-generated from label), `label` (Input), `description` (Input), `isRequired` (Checkbox), `order` (auto-assigned from position). Items can be added with "Add Item" button, removed with X button. Items are rendered in order.
4. Follow the same dialog pattern as other components

Export as named export: `export function StaffOnboardingTemplatesTab`.

### Step 2: Create OnboardingProgress component

tRPC procedures used:
- `api.team.onboarding.getProgress.useQuery({ userId })` -- returns `ChecklistProgress[]`
- `api.team.onboarding.completeItem.useMutation()` -- input: `{ progressId, itemKey }`

Create `src/components/team/profile/onboarding-progress.tsx`:

1. Use `"use client"` directive
2. Accept props `{ memberId: string }`
3. Query progress and render each active (non-COMPLETED) checklist:
   - Template name as header
   - Status Badge (NOT_STARTED / IN_PROGRESS / COMPLETED)
   - Progress bar showing `completedRequired / totalRequired` percentage
   - Item list with checkboxes -- completed items are checked and show line-through text, required items show `*` indicator
   - Clicking an uncompleted checkbox calls `completeItem` mutation
4. Return `null` if no active checklists

Export as named export: `export function OnboardingProgress`.

### Commit

```
feat(team): add onboarding templates settings and onboarding progress checklist components
```

---

## Task 11: Settings integration -- add new tabs to settings page

**Files:**
- Modify: `src/types/settings.ts`
- Modify: `src/components/settings/settings-sidebar.tsx`
- Modify: `src/app/admin/settings/page.tsx`

### Step 1: Extend the SettingsTab type

In `src/types/settings.ts`, add two new tab IDs to the union:

```typescript
export type SettingsTab =
  | 'general'
  | 'notifications'
  | 'integrations'
  | 'billing'
  | 'modules'
  | 'security'
  | 'roles'
  | 'staff-custom-fields'
  | 'staff-onboarding'
  | 'danger';
```

### Step 2: Add tabs to SettingsSidebar

In `src/components/settings/settings-sidebar.tsx`:

1. Add imports:

```typescript
import { UserCog, ClipboardCheck } from "lucide-react"
```

2. Insert two entries into the `SETTINGS_TABS` array, before the `danger` entry:

```typescript
{
  id: "staff-custom-fields" as SettingsTab,
  label: "Staff Custom Fields",
  icon: <UserCog className="h-4 w-4" />,
},
{
  id: "staff-onboarding" as SettingsTab,
  label: "Onboarding Templates",
  icon: <ClipboardCheck className="h-4 w-4" />,
},
```

### Step 3: Add tab content to settings page

In `src/app/admin/settings/page.tsx`:

1. Add lazy imports:

```typescript
const StaffCustomFieldsTab = lazy(() =>
  import("@/components/settings/staff-custom-fields").then((m) => ({ default: m.StaffCustomFieldsTab }))
)
const StaffOnboardingTemplatesTab = lazy(() =>
  import("@/components/settings/staff-onboarding-templates").then((m) => ({ default: m.StaffOnboardingTemplatesTab }))
)
```

2. Add to `TAB_TITLES`:

```typescript
"staff-custom-fields": "Staff Custom Fields",
"staff-onboarding": "Onboarding Templates",
```

3. Add `TabsContent` blocks before the danger tab content:

```tsx
<TabsContent value="staff-custom-fields" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
  <Suspense fallback={<TabLoadingSkeleton />}>
    <StaffCustomFieldsTab />
  </Suspense>
</TabsContent>

<TabsContent value="staff-onboarding" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
  <Suspense fallback={<TabLoadingSkeleton />}>
    <StaffOnboardingTemplatesTab />
  </Suspense>
</TabsContent>
```

4. Update the `isValidTab` function to include new tab IDs:

```typescript
function isValidTab(tab: string): boolean {
  return [
    "general", "notifications", "integrations", "billing",
    "modules", "security", "roles",
    "staff-custom-fields", "staff-onboarding",
    "danger",
  ].includes(tab)
}
```

### Commit

```
feat(settings): integrate staff custom fields and onboarding templates into settings page
```

---

## Task 12: AddMemberDialog + AddSkillDialog enhancements

**Files:**
- Modify: `src/components/team/add-member-dialog.tsx`
- Modify: `src/components/team/profile/skills-tab.tsx`

### Step 1: Add jobTitle and departmentId to AddMemberDialog

In `src/components/team/add-member-dialog.tsx`:

1. Extend `FormState` interface with:

```typescript
jobTitle: string
departmentId: string
```

2. Extend `initialForm` with:

```typescript
jobTitle: "",
departmentId: "",
```

3. Query departments inside the component:

```typescript
const { data: deptData } = api.team.departments.list.useQuery(undefined, { staleTime: 60_000 })
const departmentOptions = deptData ?? []
```

4. Add form fields after the employee type Select (before the closing `</div>` of the form fields section):

```tsx
{/* Job title */}
<div className="space-y-1.5">
  <Label htmlFor="member-job-title">Job title</Label>
  <Input
    id="member-job-title"
    placeholder="e.g. Senior Engineer"
    value={form.jobTitle}
    onChange={(e) => handleChange("jobTitle", e.target.value)}
  />
</div>

{/* Department */}
<div className="space-y-1.5">
  <Label htmlFor="member-department">Department</Label>
  <Select
    value={form.departmentId}
    onValueChange={(val) => handleChange("departmentId", val)}
  >
    <SelectTrigger id="member-department" aria-label="Department">
      <SelectValue placeholder="Select department..." />
    </SelectTrigger>
    <SelectContent>
      {departmentOptions.map((dept) => (
        <SelectItem key={dept.id} value={dept.id}>
          {dept.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

5. Include in the mutation call on line 124-129:

```typescript
createMutation.mutate({
  name: fullName,
  email: form.email.trim(),
  phone: form.phone.trim() || undefined,
  employeeType: form.employeeType ? (form.employeeType as EmployeeType) : undefined,
  jobTitle: form.jobTitle.trim() || undefined,
  departmentId: form.departmentId || undefined,
})
```

### Step 2: Add autocomplete to AddSkillDialog

In the `AddSkillDialog` component inside `src/components/team/profile/skills-tab.tsx`:

1. Query the skill catalog:

```typescript
const { data: catalog } = api.team.listSkillCatalog.useQuery(undefined, { staleTime: 60_000 })
```

2. Replace the plain "Skill ID" Input with an input that shows suggestions below it. After the Input, add a suggestion dropdown:

```tsx
{skillId && catalog && catalog.length > 0 && (
  <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-popover">
    {catalog
      .filter((c) =>
        c.skillId.toLowerCase().includes(skillId.toLowerCase()) ||
        c.skillName.toLowerCase().includes(skillId.toLowerCase())
      )
      .slice(0, 5)
      .map((c) => (
        <button
          key={c.skillId}
          type="button"
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
          onClick={() => { setSkillId(c.skillId); setSkillName(c.skillName) }}
        >
          <span className="font-medium">{c.skillId}</span>
          <span className="text-muted-foreground ml-2">{c.skillName}</span>
        </button>
      ))}
  </div>
)}
```

### Commit

```
feat(team): add jobTitle/department to add member dialog, add skill catalog autocomplete
```

---

## Task 13: ProfileHeader -- show department badges and reporting line

**Files:**
- Modify: `src/components/team/profile/profile-header.tsx`

### Step 1: Add imports

Add to the existing imports:

```typescript
import { User } from "lucide-react"
```

### Step 2: Add job title below the name

In the `ProfileHeader` component, after the `employeeType` paragraph (line 145-148), add:

```tsx
{(member as any).jobTitle && (
  <p className="text-sm text-muted-foreground">{(member as any).jobTitle}</p>
)}
```

### Step 3: Add department badges

After the WorkloadStrip (line 225), add:

```tsx
{/* Departments */}
{(member as any).departments?.length > 0 && (
  <>
    <div className="h-5 w-px bg-border hidden sm:block" aria-hidden="true" />
    <div className="flex flex-wrap items-center gap-1.5">
      {(member as any).departments.map((dept: any) => (
        <Badge
          key={dept.departmentId}
          variant={dept.isPrimary ? "default" : "outline"}
          className="text-[10px]"
        >
          {dept.departmentName}
        </Badge>
      ))}
    </div>
  </>
)}
```

### Step 4: Add reporting line

After the contact details section (line 168), add:

```tsx
{(member as any).reportsTo && (
  <ReportsToLine reportsTo={(member as any).reportsTo} />
)}
```

Create a local `ReportsToLine` component:

```tsx
function ReportsToLine({ reportsTo }: { reportsTo: string }) {
  const { data: manager } = api.team.getById.useQuery(
    { userId: reportsTo },
    { staleTime: 5 * 60 * 1000 }
  )
  if (!manager) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Reports to {manager.name}</span>
    </div>
  )
}
```

### Commit

```
feat(team): show department badges, job title, and reporting line in profile header
```

---

## Task 14: Final verification

### Step 1: Run TypeScript check

```bash
npx tsc --noEmit
```

Fix any type errors. Common issues to watch for:
- `StaffMember` type may not yet have `departments`, `reportsTo`, `jobTitle` fields until the backend plan lands. The `as any` casts are defensive guards that should be replaced with proper typed access after the backend deploys.
- New procedure paths (`team.departments.list`, `team.notes.list`, etc.) will cause type errors until the backend router is registered.
- Ensure all imports resolve correctly.

### Step 2: Run build

```bash
npm run build
```

### Step 3: Run tests

```bash
npx vitest run
```

### Step 4: Fix remaining issues

Address any compilation, build, or test failures.

### Commit

```
chore(team): fix type errors and build issues from staff module frontend changes
```

---

## Execution Order and Dependencies

```
Task 1  (bug fixes)                    -- no dependencies, start immediately
Task 4  (server-side employeeType)     -- no dependencies, can parallel with Task 1
Task 6  (notes tab component)          -- no frontend deps, needs backend Task 7
Task 7  (pay rates dialog)             -- no frontend deps, needs backend Task 7
Task 8  (department management)        -- no frontend deps, needs backend Task 7
Task 9  (custom fields settings)       -- no frontend deps, needs backend Task 7
Task 10 (onboarding templates)         -- no frontend deps, needs backend Task 7

Task 2  (overview tab enhancements)    -- depends on Tasks 7, 10 (imports PayRatesDialog, uses onboarding query)
Task 3  (calendar + notes tabs)        -- depends on Task 6 (imports NotesTab)
Task 5  (team list enhancements)       -- depends on Task 4 (server-side filter)
Task 11 (settings integration)         -- depends on Tasks 9, 10 (imports settings components)
Task 12 (dialog enhancements)          -- depends on backend Task 7 (new create schema fields)
Task 13 (profile header enhancements)  -- depends on backend Task 3 (StaffMember type)

Task 14 (final verification)           -- depends on ALL above
```

**Parallel execution waves:**

- **Wave 1** (parallel): Tasks 1, 4, 6, 7, 8, 9, 10 -- all independent of each other
- **Wave 2** (parallel): Tasks 2, 3, 5, 11, 12, 13 -- depend on Wave 1 outputs
- **Wave 3**: Task 14 -- final verification
