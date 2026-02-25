# Staff Module Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the frontend for the production-grade staff module — fixing existing bugs, enhancing the team list and profile pages, and adding new components for departments, notes, pay rates, onboarding, and custom fields.

**Architecture:** All changes extend the existing `src/components/team/` and `src/app/admin/team/` structure. New settings pages are lazy-loaded tabs in the existing settings page. All data fetching uses `api.team.*` tRPC hooks inline (no custom hooks). Follows existing patterns: shadcn/ui components, `"use client"` pages, Tailwind CSS, lucide-react icons.

**Tech Stack:** Next.js 16, React 19, tRPC 11 (React Query), shadcn/ui, Tailwind 4, lucide-react

**Prerequisite:** The backend implementation plan (`2026-02-25-staff-module-implementation.md`) must be complete before starting this plan. All `api.team.*` procedures referenced here are defined in that plan.

---

## Task 1: Fix AvailabilityEditor init bug

**Files:**
- Modify: `src/components/team/availability-editor.tsx`

**Problem:** The `useState` initializer that populates the weekly grid from `availabilityData` runs before the tRPC query resolves. The grid always starts empty — existing recurring availability is never reflected.

**Step 1: Find the `useState` that initializes the grid map**

The grid state is initialized like:
```typescript
const [grid, setGrid] = useState<Map<string, boolean>>(() => {
  // This runs ONCE before availabilityData is loaded
  // ...builds map from availabilityData which is undefined
})
```

**Step 2: Replace with a two-step pattern**

```typescript
const [grid, setGrid] = useState<Map<string, boolean>>(new Map())
const [initialized, setInitialized] = useState(false)

// Sync grid from server data when it arrives
useEffect(() => {
  if (!availabilityData || initialized) return
  const newGrid = new Map<string, boolean>()
  for (const entry of availabilityData) {
    if (entry.type === 'RECURRING') {
      // Parse startTime/endTime into 30-min slots and set grid cells
      const startHour = parseInt(entry.startTime.split(':')[0]!)
      const endHour = parseInt(entry.endTime.split(':')[0]!)
      for (let h = startHour; h < endHour; h++) {
        newGrid.set(`${entry.dayOfWeek}-${String(h).padStart(2, '0')}:00`, true)
        newGrid.set(`${entry.dayOfWeek}-${String(h).padStart(2, '0')}:30`, true)
      }
    }
  }
  setGrid(newGrid)
  setInitialized(true)
}, [availabilityData, initialized])
```

Adapt the exact slot key format and time increment to match what the existing grid rendering uses (inspect the grid cell `onClick` handler for the key format).

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/team/availability-editor.tsx
git commit -m "fix(team): sync AvailabilityEditor grid from server data on load"
```

---

## Task 2: Fix pagination on AssignmentsTab and ActivityTab

**Files:**
- Modify: `src/components/team/profile/assignments-tab.tsx`
- Modify: `src/components/team/profile/activity-tab.tsx`

**Step 1: Add "Load more" to AssignmentsTab**

The tab currently fetches 20 records and shows a `+` suffix when `hasMore` is true. Add:

```typescript
const [allRows, setAllRows] = useState<typeof data.rows>([])
const [cursor, setCursor] = useState<string | undefined>()
```

Use `useEffect` to append new pages to `allRows` when data changes. Add a "Load more" button:

```tsx
{data?.hasMore && (
  <Button
    variant="outline"
    size="sm"
    className="w-full mt-4"
    onClick={() => {
      const lastRow = allRows[allRows.length - 1]
      if (lastRow) setCursor(lastRow.assignedAt.toISOString())
    }}
  >
    Load more
  </Button>
)}
```

Pass `cursor` to the `api.team.listAssignments.useQuery` input.

**Step 2: Add "Load more" to ActivityTab**

Same pattern — the tab currently fetches 50 and has no pagination. Add cursor-based "Load more" button using `api.audit.list`'s cursor parameter.

**Step 3: Commit**

```bash
git add src/components/team/profile/assignments-tab.tsx src/components/team/profile/activity-tab.tsx
git commit -m "fix(team): add cursor-based pagination to AssignmentsTab and ActivityTab"
```

---

## Task 3: Fix AvailabilityIndicator on TeamMemberCard

**Files:**
- Modify: `src/components/team/team-member-card.tsx`

**Problem:** The `AvailabilityIndicator` in the card footer shows "Available today" for any ACTIVE member regardless of their actual schedule.

**Step 1: Replace status-based indicator with schedule-based**

The card already queries `api.team.getWorkload`. Add a lightweight schedule check:

```typescript
const today = new Date().toISOString().slice(0, 10)
const { data: schedule } = api.team.getSchedule.useQuery(
  { userId: member.id, date: today },
  { enabled: member.status === 'ACTIVE', staleTime: 60_000 }
)
```

Derive availability from schedule data:
- If `schedule?.availableSlots.length > 0` → "Available today" (green)
- If `schedule?.availableSlots.length === 0 && schedule?.assignedBookings.length > 0` → "Fully booked" (amber)
- If `schedule?.availableSlots.length === 0` → "Unavailable today" (grey)
- If member status is SUSPENDED/INACTIVE → keep current behavior

**Step 2: Commit**

```bash
git add src/components/team/team-member-card.tsx
git commit -m "fix(team): show true schedule-based availability on TeamMemberCard"
```

---

## Task 4: Enhance team list page — server-side filters + department grouping

**Files:**
- Modify: `src/app/admin/team/page.tsx`

**Step 1: Add server-side employeeType filter**

The list page already has client-side employee type filter chips. Replace with server-side:

```typescript
const { data, isLoading } = api.team.list.useQuery({
  limit: 100,
  status: statusFilter !== 'ALL' ? statusFilter : undefined,
  employeeType: employeeTypeFilter !== 'ALL' ? employeeTypeFilter : undefined,
})
```

Remove the client-side `.filter()` call on employee type.

**Step 2: Add department filter**

Query departments for the filter dropdown:
```typescript
const { data: departments } = api.team.departments.list.useQuery()
```

Add a department filter `Select` component:
```tsx
<Select value={departmentFilter} onValueChange={setDepartmentFilter}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="All departments" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All departments</SelectItem>
    {departments?.map(dept => (
      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Pass `departmentId` to the list query.

**Step 3: Add department grouping toggle**

Add a toggle button (icon: `LayoutGrid` vs `FolderTree`):
```typescript
const [groupByDepartment, setGroupByDepartment] = useState(false)
```

When enabled, group the flat `data.rows` by their primary department and render collapsible sections:
```tsx
{groupByDepartment ? (
  <DepartmentGroupedView members={data.rows} />
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {data.rows.map(member => <TeamMemberCard key={member.id} ... />)}
  </div>
)}
```

Create a local `DepartmentGroupedView` component that uses `Collapsible` from shadcn/ui:
```tsx
function DepartmentGroupedView({ members }: { members: StaffMember[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; members: StaffMember[] }>()
    const ungrouped: StaffMember[] = []
    for (const m of members) {
      const primary = m.departments?.find(d => d.isPrimary) ?? m.departments?.[0]
      if (primary) {
        const existing = map.get(primary.departmentId) ?? { name: primary.departmentName, members: [] }
        existing.members.push(m)
        map.set(primary.departmentId, existing)
      } else {
        ungrouped.push(m)
      }
    }
    return { departments: Array.from(map.entries()), ungrouped }
  }, [members])

  return (
    <div className="space-y-6">
      {grouped.departments.map(([id, { name, members }]) => (
        <Collapsible key={id} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
            <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
            {name} <Badge variant="secondary">{members.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3 ml-6">
              {members.map(m => <TeamMemberCard key={m.id} member={m} ... />)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
      {grouped.ungrouped.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ChevronRight className="h-4 w-4" /> Unassigned <Badge variant="secondary">{grouped.ungrouped.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3 ml-6">
              {grouped.ungrouped.map(m => <TeamMemberCard key={m.id} member={m} ... />)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
```

Only show the grouping toggle when departments exist (progressive disclosure).

**Step 4: Commit**

```bash
git add src/app/admin/team/page.tsx
git commit -m "feat(team): add server-side filters and department grouping to team list"
```

---

## Task 5: Enhance AddMemberDialog

**Files:**
- Modify: `src/components/team/add-member-dialog.tsx`

**Step 1: Add jobTitle and departmentId fields**

After the existing phone field, add:

```tsx
<div className="space-y-2">
  <Label htmlFor="jobTitle">Job Title</Label>
  <Input id="jobTitle" value={form.jobTitle} onChange={...} placeholder="e.g. Senior Plumber" />
</div>

<div className="space-y-2">
  <Label htmlFor="department">Department</Label>
  <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
    <SelectTrigger>
      <SelectValue placeholder="Select department (optional)" />
    </SelectTrigger>
    <SelectContent>
      {departments?.map(dept => (
        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Query departments: `const { data: departments } = api.team.departments.list.useQuery()`

Pass `jobTitle` and `departmentId` to the `api.team.create.useMutation` call.

**Step 2: Commit**

```bash
git add src/components/team/add-member-dialog.tsx
git commit -m "feat(team): add jobTitle and department fields to AddMemberDialog"
```

---

## Task 6: Enhance profile Overview tab

**Files:**
- Modify: `src/components/team/profile/overview-tab.tsx`

**Step 1: Add emergency contact section**

After the existing profile details table, add an "Emergency Contact" section (only shown if any emergency field is populated or in edit mode):

```tsx
<div className="border rounded-lg p-4 space-y-3">
  <h3 className="text-sm font-medium">Emergency Contact</h3>
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div>
      <span className="text-muted-foreground">Name</span>
      <p>{member.emergencyContactName ?? '—'}</p>
    </div>
    <div>
      <span className="text-muted-foreground">Phone</span>
      <p>{member.emergencyContactPhone ?? '—'}</p>
    </div>
    <div>
      <span className="text-muted-foreground">Relationship</span>
      <p>{member.emergencyContactRelation ?? '—'}</p>
    </div>
  </div>
</div>
```

**Step 2: Add department badges and reporting line**

Below the name in the details section:

```tsx
{member.departments?.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {member.departments.map(d => (
      <Badge key={d.departmentId} variant={d.isPrimary ? "default" : "secondary"}>
        {d.departmentName}
      </Badge>
    ))}
  </div>
)}
{member.reportsTo && (
  <p className="text-sm text-muted-foreground mt-1">Reports to: {reportsToName}</p>
)}
```

Fetch the `reportsTo` user's name if set: `api.team.getById.useQuery({ userId: member.reportsTo }, { enabled: !!member.reportsTo })`

**Step 3: Add current pay rate with history link**

```tsx
const { data: payRates } = api.team.payRates.list.useQuery(
  { userId: member.id },
  { enabled: hasPermission('staff:sensitive:read') }
)
const currentRate = payRates?.[0]

{currentRate && (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-muted-foreground text-sm">Pay Rate</span>
      <p className="font-medium">
        {currentRate.currency} {currentRate.amount.toFixed(2)} / {currentRate.rateType.toLowerCase()}
      </p>
    </div>
    <Button variant="ghost" size="sm" onClick={() => setShowPayRatesDialog(true)}>
      View history
    </Button>
  </div>
)}
```

**Step 4: Add onboarding progress bar**

```tsx
const { data: onboarding } = api.team.onboarding.getProgress.useQuery({ userId: member.id })
const activeChecklist = onboarding?.find(p => p.status !== 'COMPLETED')

{activeChecklist && (
  <OnboardingProgress progress={activeChecklist} />
)}
```

(The `OnboardingProgress` component is created in Task 11.)

**Step 5: Add custom fields section**

```tsx
const { data: customFieldValues } = api.team.customFields.getValues.useQuery({ userId: member.id })

{customFieldValues && customFieldValues.length > 0 && (
  <div className="border rounded-lg p-4 space-y-3">
    <h3 className="text-sm font-medium">Additional Information</h3>
    {/* Group by groupName */}
    {Object.entries(groupBy(customFieldValues, v => v.groupName ?? 'Other')).map(([group, fields]) => (
      <div key={group}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {fields.map(f => (
            <div key={f.fieldDefinitionId}>
              <span className="text-muted-foreground">{f.label}</span>
              <p>{formatCustomFieldValue(f)}</p>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

**Step 6: Expand EditProfileDialog with new fields**

Add to the edit dialog: `jobTitle`, `bio`, `reportsTo` (staff member select), emergency contact fields (name, phone, relation), address fields (line1, line2, city, postcode, country).

**Step 7: Commit**

```bash
git add src/components/team/profile/overview-tab.tsx
git commit -m "feat(team): enhance Overview tab with emergency contact, departments, pay rate, onboarding, custom fields"
```

---

## Task 7: Add Notes tab

**Files:**
- Create: `src/components/team/profile/notes-tab.tsx`
- Modify: `src/app/admin/team/[id]/page.tsx` (add tab)

**Step 1: Create the NotesTab component**

```tsx
"use client"

import { useState } from "react"
import { api } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Pin, Trash2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
```

The component:
- Queries `api.team.notes.list.useQuery({ userId, limit: 50 })`
- Renders pinned notes first (with a pin icon), then remaining sorted by createdAt desc
- Each note card shows: author name, relative timestamp, content, and a dropdown menu (pin/unpin, edit, delete — only for own notes)
- "Add note" form at the top: `Textarea` + `Button` calling `api.team.notes.create.useMutation`
- Cursor-based "Load more" button when `hasMore`
- Edit mode: clicking "Edit" in dropdown replaces the note content with a `Textarea` inline
- Delete confirmation via `AlertDialog`

**Step 2: Add the tab to the profile page**

In `src/app/admin/team/[id]/page.tsx`, add:

```tsx
const NotesTab = lazy(() =>
  import("@/components/team/profile/notes-tab").then(m => ({ default: m.NotesTab }))
)
```

Add a `<TabsTrigger value="notes">Notes</TabsTrigger>` and corresponding `<TabsContent>`.

Tab order: Overview | Calendar | Skills | Capacity | Availability | Assignments | Notes | Activity

**Step 3: Commit**

```bash
git add src/components/team/profile/notes-tab.tsx src/app/admin/team/[id]/page.tsx
git commit -m "feat(team): add Notes tab to staff profile"
```

---

## Task 8: Add Pay Rates dialog

**Files:**
- Create: `src/components/team/profile/pay-rates-dialog.tsx`

**Step 1: Create PayRatesDialog**

A modal `Dialog` triggered from the Overview tab's "View history" link.

Content:
- Header: "Pay Rate History"
- Table of all rates from `api.team.payRates.list.useQuery({ userId })`, ordered by effectiveFrom desc
- Columns: Rate Type, Amount, Currency, Effective From, Effective Until (or "Current"), Reason
- "Add Rate" button at top opens an inline form:
  - Rate type select (HOURLY, DAILY, SALARY, COMMISSION, PIECE_RATE)
  - Amount number input
  - Currency select (GBP, USD, EUR — or text input)
  - Effective from date input
  - Reason text input (optional)
  - Save calls `api.team.payRates.create.useMutation`, invalidates list

The current rate row is highlighted with a `Badge variant="default"` showing "Current".

**Step 2: Commit**

```bash
git add src/components/team/profile/pay-rates-dialog.tsx
git commit -m "feat(team): add PayRatesDialog for pay rate history and creation"
```

---

## Task 9: Add Calendar tab placeholder

**Files:**
- Create: `src/components/team/profile/calendar-tab.tsx`
- Modify: `src/app/admin/team/[id]/page.tsx` (add tab)

**Step 1: Create CalendarTab placeholder**

This tab will eventually render a unified calendar from the scheduling module. For now, create a placeholder that shows today's schedule using the existing `team.getSchedule` endpoint:

```tsx
const today = new Date().toISOString().slice(0, 10)
const { data: schedule } = api.team.getSchedule.useQuery({ userId, date: selectedDate })
```

Render:
- A date picker to select the day
- A vertical timeline (8am–8pm) showing:
  - Availability blocks (green background)
  - Booked appointments (blue cards overlaid on the timeline)
  - Blocked time (grey striped)
- "Full calendar integration coming soon" banner at top

This gives immediate value while the scheduling module's unified calendar is built separately.

**Step 2: Add the tab to profile page**

Same pattern as Task 7: lazy import, add `TabsTrigger` + `TabsContent`.

**Step 3: Commit**

```bash
git add src/components/team/profile/calendar-tab.tsx src/app/admin/team/[id]/page.tsx
git commit -m "feat(team): add Calendar tab with daily schedule view placeholder"
```

---

## Task 10: Department management page

**Files:**
- Create: `src/components/team/departments/department-list.tsx`
- Create: `src/components/team/departments/department-dialog.tsx`
- Create: `src/components/team/departments/department-members.tsx`
- Create: `src/app/admin/team/departments/page.tsx`

**Step 1: Create DepartmentList component**

A tree view of departments using `Collapsible`:
- Queries `api.team.departments.list.useQuery()` — returns flat list, build tree client-side from `parentId`
- Each row shows: color dot, name, member count, manager name, actions dropdown (edit, add sub-department, delete)
- Drag handle for reorder (optional — can use up/down arrows for simplicity)
- "Create Department" button at top

**Step 2: Create DepartmentDialog**

A `Dialog` for create/edit:
- Fields: Name (required), Description (optional), Parent department (select from existing), Manager (select from staff list via `api.team.list`), Color (hex picker or preset swatches)
- Create calls `api.team.departments.create.useMutation`
- Edit calls `api.team.departments.update.useMutation`

**Step 3: Create DepartmentMembers component**

Shown when clicking a department row — expands to show members:
- List of members with avatar, name, "Primary" badge
- "Add Member" button → staff search select → calls `api.team.departments.addMember.useMutation`
- Remove button per member → calls `api.team.departments.removeMember.useMutation`

**Step 4: Create the departments page**

```tsx
"use client"

import { DepartmentList } from "@/components/team/departments/department-list"

export default function DepartmentsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4 md:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize your team into departments and groups
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <DepartmentList />
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/components/team/departments/ src/app/admin/team/departments/
git commit -m "feat(team): add department management page with tree view and member assignment"
```

---

## Task 11: Onboarding progress component + templates settings

**Files:**
- Create: `src/components/team/profile/onboarding-progress.tsx`
- Create: `src/components/settings/staff-onboarding-tab.tsx`
- Modify: `src/app/admin/settings/page.tsx` (add settings tab)
- Modify: `src/components/settings/settings-sidebar.tsx` (add sidebar item)
- Modify: `src/types/settings.ts` (add tab type)

**Step 1: Create OnboardingProgress component**

Used on the Overview tab to show checklist progress:

```tsx
export function OnboardingProgress({ progress }: { progress: ChecklistProgress }) {
  const totalRequired = progress.items.filter(i => i.isRequired).length
  const completedRequired = progress.items.filter(i => i.isRequired && i.completedAt).length
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{progress.templateName}</h3>
        <Badge variant={pct === 100 ? "default" : "secondary"}>{pct}%</Badge>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="space-y-2">
        {progress.items.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <Checkbox
              checked={!!item.completedAt}
              onCheckedChange={() => completeItem.mutate({ progressId: progress.id, itemKey: item.key })}
              disabled={!!item.completedAt}
            />
            <span className={cn("text-sm", item.completedAt && "line-through text-muted-foreground")}>
              {item.label}
              {item.isRequired && <span className="text-destructive ml-1">*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Calls `api.team.onboarding.completeItem.useMutation` on checkbox click.

**Step 2: Create StaffOnboardingTab settings component**

A settings tab for managing checklist templates:
- Queries `api.team.onboarding.templates.list.useQuery()`
- Two sections: "Onboarding Templates" and "Offboarding Templates"
- Each template card shows: name, item count, employee type filter (or "All"), "Default" badge, edit/delete buttons
- "Create Template" button opens a dialog with:
  - Name, Type (onboarding/offboarding), Employee type filter (optional)
  - Sortable item list: each item has key, label, description, isRequired checkbox
  - "Add Item" button appends to list
  - Save calls `api.team.onboarding.templates.create.useMutation`

**Step 3: Add to settings page**

In `src/types/settings.ts`, add `"staff-onboarding"` to the `SettingsTab` union type.

In `src/components/settings/settings-sidebar.tsx`, add sidebar item under an "HR" or "Team" group:
```typescript
{ id: "staff-onboarding", label: "Onboarding", icon: ClipboardCheck }
```

In `src/app/admin/settings/page.tsx`:
- Add lazy import for `StaffOnboardingTab`
- Add `TAB_TITLES` entry
- Add `TabsContent` block
- Add to `isValidTab`

**Step 4: Commit**

```bash
git add src/components/team/profile/onboarding-progress.tsx src/components/settings/staff-onboarding-tab.tsx src/app/admin/settings/page.tsx src/components/settings/settings-sidebar.tsx src/types/settings.ts
git commit -m "feat(team): add onboarding progress component and templates settings page"
```

---

## Task 12: Custom fields settings

**Files:**
- Create: `src/components/settings/staff-custom-fields-tab.tsx`
- Modify: `src/app/admin/settings/page.tsx` (add tab)
- Modify: `src/components/settings/settings-sidebar.tsx` (add sidebar item)
- Modify: `src/types/settings.ts` (add tab type)

**Step 1: Create StaffCustomFieldsTab**

A settings tab for managing custom field definitions:
- Queries `api.team.customFields.listDefinitions.useQuery()`
- Renders a sortable list of field definitions grouped by `groupName`
- Each row shows: label, field type badge, required indicator, showOnCard indicator
- "Add Field" button opens a dialog:
  - Field key (auto-generated from label, editable), Label, Field type select
  - For SELECT/MULTI_SELECT: options editor (add/remove value+label pairs)
  - Checkboxes: Required, Show on card, Show on profile
  - Group name text input
  - Sort order number
  - Save calls `api.team.customFields.createDefinition.useMutation`
- Edit button per row opens same dialog pre-filled
- Delete button with confirmation

**Step 2: Add to settings page**

In `src/types/settings.ts`, add `"staff-custom-fields"` to the `SettingsTab` union type.

In sidebar: `{ id: "staff-custom-fields", label: "Custom Fields", icon: ListPlus }`

In settings page: lazy import, `TAB_TITLES` entry, `TabsContent` block, `isValidTab` update.

**Step 3: Commit**

```bash
git add src/components/settings/staff-custom-fields-tab.tsx src/app/admin/settings/page.tsx src/components/settings/settings-sidebar.tsx src/types/settings.ts
git commit -m "feat(team): add custom fields settings page"
```

---

## Task 13: Enhance AddSkillDialog with autocomplete

**Files:**
- Modify: `src/components/team/profile/skills-tab.tsx`

**Step 1: Add skill catalog query**

```typescript
const { data: skillCatalog } = api.team.listSkillCatalog.useQuery()
```

**Step 2: Replace free-text Skill ID input with combobox**

Replace the plain `Input` for Skill ID with a filterable combobox that shows existing skill IDs from the catalog:

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {skillId || "Select or type a skill ID..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-full p-0">
    <Command>
      <CommandInput placeholder="Search skills..." onValueChange={setSkillId} />
      <CommandEmpty>No matching skill — will create new</CommandEmpty>
      <CommandGroup>
        {filteredCatalog.map(skill => (
          <CommandItem key={skill.skillId} onSelect={() => {
            setSkillId(skill.skillId)
            setSkillName(skill.skillName)
            setOpen(false)
          }}>
            {skill.skillName} ({skill.skillId})
          </CommandItem>
        ))}
      </CommandGroup>
    </Command>
  </PopoverContent>
</Popover>
```

Selecting from the catalog auto-fills both Skill ID and Name. Typing a new value allows creation of new skills.

**Step 3: Commit**

```bash
git add src/components/team/profile/skills-tab.tsx
git commit -m "feat(team): add autocomplete to AddSkillDialog from skill catalog"
```

---

## Task 14: Enhance ProfileHeader with departments

**Files:**
- Modify: `src/components/team/profile/profile-header.tsx`

**Step 1: Add department badges**

Below the name/role line, add department badges:

```tsx
{member.departments?.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {member.departments.map(d => (
      <Badge key={d.departmentId} variant="outline" className="text-xs">
        {d.departmentName}
      </Badge>
    ))}
  </div>
)}
```

**Step 2: Add job title display**

Show job title below the name if present:
```tsx
{member.jobTitle && (
  <p className="text-sm text-muted-foreground">{member.jobTitle}</p>
)}
```

**Step 3: Commit**

```bash
git add src/components/team/profile/profile-header.tsx
git commit -m "feat(team): show department badges and job title in ProfileHeader"
```

---

## Task 15: Final verification

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Fix any remaining issues**

Address any type errors, missing imports, or build failures.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(team): fix remaining frontend type errors and build issues"
```

---

## Execution Order and Dependencies

```
Task 1  (AvailabilityEditor fix)     ─┐
Task 2  (Pagination fixes)           ─┤── Independent bug fixes, can run in parallel
Task 3  (AvailabilityIndicator fix)  ─┘

Task 4  (List page filters/grouping) ── depends on backend departmentId filter
Task 5  (AddMemberDialog)            ── depends on backend create schema changes

Task 6  (Overview tab enhancements)  ─┐
Task 7  (Notes tab)                  ─┤── Independent new components, can run in parallel
Task 8  (Pay rates dialog)           ─┤
Task 9  (Calendar tab)               ─┘

Task 10 (Department management page) ── independent

Task 11 (Onboarding components)      ─┐── Independent settings pages, can run in parallel
Task 12 (Custom fields settings)     ─┘

Task 13 (Skill autocomplete)         ── independent
Task 14 (ProfileHeader enhancements) ── independent

Task 15 (Final verification)         ── depends on ALL above
```

**Parallel waves:**
- Wave 1: Tasks 1, 2, 3 (bug fixes)
- Wave 2: Tasks 4, 5 (existing page enhancements)
- Wave 3: Tasks 6, 7, 8, 9, 10 (new components + page enhancements)
- Wave 4: Tasks 11, 12, 13, 14 (settings + small enhancements)
- Wave 5: Task 15 (verification)
