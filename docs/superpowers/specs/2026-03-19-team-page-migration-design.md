# Team Page Migration — Design Spec

Migrate `/admin/team` to match the design quality of `/admin/team/demo`, wiring up real tRPC data instead of mock data while preserving all existing functionality.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Migration approach | Component extraction | Micro-components reusable on profile page, sheets, other modules |
| Default view | Table (with grid toggle) | More data-dense, preference saved to localStorage |
| Sidebar | Collapsible, localStorage persistence | Department + employee type filters in one place, clean main area |
| Row click | Navigate to `/admin/team/[id]` | Full profile page; Quick View button opens sheet for glance |
| KPIs | New `team.stats` endpoint | Accurate aggregates, not computed from paginated client data |
| Skills/capacity in list | Join into `team.list` query | Avoids N+1 per-card fetches from current implementation |
| Filter state | URL search params | Linkable/bookmarkable filtered views |
| View/sidebar prefs | localStorage | User preference, not shareable state |
| Employee type filter | Sidebar section | Less frequently used than status, keeps main area clean |

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin → People                                  │
│ Header: "People" + description          [Departments] [+Invite] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Total    │ │ Active   │ │ Depts    │ │ Avg      │       │
│ │ Members  │ │ Rate     │ │          │ │ Capacity │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├────────┬────────────────────────────────────────────────────┤
│ Sidebar│  [Search........................] [≡ ⊞]           │
│        │  [All] [Active] [Inactive] [Suspended]  24 members│
│ Depts  │  ┌──────────────────────────────────────────────┐ │
│ ──────-│  │ Member  │ Dept │ Status │ Avail │ Cap │ Skills│ │
│ All  24│  ├─────────┼──────┼────────┼───────┼─────┼──────┤ │
│ Eng   8│  │ Alex C  │ Eng  │ Active │ ● Avl │ 8/10│ React│ │
│ Des   4│  │ Jordan  │ Eng  │ Active │ ● Blk │ 9/10│ Py   │ │
│ Sal   5│  │ ...     │      │        │       │     │      │ │
│ Ops   4│  └──────────────────────────────────────────────┘ │
│ CS    3│                                                    │
│        │  [Load more]                                       │
│ Type   │                                                    │
│ ──────-│  ┌─────────────────────────────────┐              │
│ All    │  │ 3 selected │ Change status │ Cancel│ (sticky)   │
│ FTE    │  └─────────────────────────────────┘              │
│ Self   │                                                    │
│ Contract│                                                   │
│        │                                                    │
│ WorkOS │                                                    │
│ panel  │                                                    │
└────────┴────────────────────────────────────────────────────┘
```

## New Files

### Shared micro-components (`src/components/team/`)

**`status-badge.tsx`**
- Props: `{ status: StaffStatus }`
- Renders colored pill: Active (green), Inactive (gray), Suspended (amber)
- ~20 lines

**`employee-type-badge.tsx`**
- Props: `{ type: EmployeeType }`
- Renders monospace tag: FTE, Self, Contract
- ~15 lines

**`availability-dot.tsx`**
- Props: `{ availability: 'available' | 'blocked' | 'unavailable' }`
- Available: animated ping green dot. Blocked: static amber. Unavailable: gray.
- ~20 lines

**`capacity-bar.tsx`**
- Props: `{ used: number; max: number }`
- Progress bar with color coding: green (<60%), amber (60-80%), red (>80%)
- Shows `used/max` in monospace
- ~30 lines

**`kpi-card.tsx`**
- Props: `{ label: string; value: string; sub?: string; icon: LucideIcon; trend?: { label: string; positive: boolean } }`
- Stat card matching demo design
- ~30 lines

### Page-level components (`src/components/team/`)

**`team-table.tsx`**
- Props: `{ members: StaffMember[]; onNavigate: (id: string) => void; onQuickView: (id: string) => void; bulkMode: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void }`
- Full table with columns: Member (avatar + name + title + type badge), Department (color dot + name), Status, Availability, Capacity, Skills, Actions (⋯ dropdown + ⚡ quick view)
- Uses shadcn `Table` components
- Row click navigates, ⚡ opens sheet
- Department color as left border on rows
- ~150 lines

**`team-grid-card.tsx`**
- Props: `{ member: StaffMember; onNavigate: (id: string) => void; onQuickView: (id: string) => void }`
- Replaces existing `TeamMemberCard` with richer design from demo
- Shows: avatar, name, title, department (color dot), employee type, status badge, skills (up to 3), availability dot, capacity bar, actions dropdown
- Department color as left border
- ~80 lines

**`team-sidebar.tsx`**
- Props: `{ departments: Department[]; deptFilter: string | null; onDeptFilter: (id: string | null) => void; employeeTypeFilter: string; onEmployeeTypeFilter: (type: string) => void; isOpen: boolean; onToggle: () => void }`
- Collapsible sidebar with three sections: Departments (with color dots + counts), Employee Type (All/FTE/Self/Contract), WorkOS Access panel
- ~120 lines

### Modified files

**`src/app/admin/team/page.tsx`** — Full rewrite
- Orchestrates layout, data fetching, filter state, URL params
- Uses all new components
- Keeps `TeamMemberSheet` and `AddMemberDialog` integration
- ~400 lines

**`src/modules/team/team.router.ts`** — Add `team.stats` procedure
- New `tenantProcedure` query, no input needed
- Returns `{ total, activeCount, inactiveCount, suspendedCount, departmentCount, avgCapacityUsed, avgCapacityMax }`

**`src/modules/team/team.service.ts`** — Add `getStats(tenantId)` method
- Calls repository, returns stats object

**`src/modules/team/team.repository.ts`** — Two changes:
1. Add `getStats(tenantId)` — `SELECT status, COUNT(*) ... GROUP BY status` + department count subquery + avg capacity subquery
2. Modify `listStaff` query — join skills and capacity data into the response so the list page doesn't need N+1 fetches

**`src/modules/team/team.types.ts`** — Add to `StaffMember`:
- `skills?: Array<{ skillName: string; proficiency?: number }>` — populated by list query join
- `capacityUsed?: number` — populated by list query join
- `capacityMax?: number` — populated by list query join
- `availability?: 'available' | 'blocked' | 'unavailable'` — computed in the list query: checks today's availability entries (BLOCKED > SPECIFIC > RECURRING precedence). INACTIVE/SUSPENDED users → 'unavailable'. No entries for today → 'unavailable'.

### Retired

**`src/components/team/team-member-card.tsx`** — Replaced by `team-grid-card.tsx`
- Check if used elsewhere before deleting; if referenced from `[id]/page.tsx` or other routes, keep it until those are migrated

## Interactions

### Row/card clicks
- Click row/card body → `router.push('/admin/team/${member.id}')`
- Click ⚡ Quick View button → `setSelectedMemberId(id)` opens `TeamMemberSheet`
- Click ⋯ dropdown → Edit, Send Message, Change Status, Remove

### Bulk selection
- "Select" button toggles bulk mode
- Checkboxes on each row/card
- Sticky bottom toolbar: `{count} selected | Change Status dropdown | Cancel`
- Works in both table and grid views

### Sidebar
- Toggle button (◀/▶) at top
- State saved to `localStorage('team-sidebar-open')`
- Collapsed: main content goes full width, small expand button visible
- Mobile (<768px): starts collapsed

### Search
- 300ms debounce, resets cursor
- Server-side via existing `team.list` search param
- Searches name, title, email

### Filters
- Status chips in main area (All/Active/Inactive/Suspended)
- Department filter in sidebar (click to filter, click again to deselect)
- Employee type filter in sidebar (All/FTE/Self/Contract)
- All synced to URL search params: `?status=active&dept={deptId}&type=employed&search=react`
- "Clear filters" link when any filter active

### Pagination
- Cursor-based, "Load more" button
- Cursor resets on filter/search change

## Data Flow

```
team.stats (staleTime: 60s) ──────→ 4 KPI cards
team.list (paginated, with joins) → Table rows / Grid cards
team.departments.list (staleTime: 60s) → Sidebar department filter
```

### Stats endpoint query (approximate):

```sql
-- Single query with subqueries
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_count,
  COUNT(*) FILTER (WHERE status = 'SUSPENDED') as suspended_count,
  (SELECT COUNT(*) FROM departments WHERE tenant_id = $1 AND is_active = true) as department_count
FROM users
WHERE tenant_id = $1 AND is_team_member = true
```

### List query enhancement:

Add left joins to include skills and capacity in the list response:
- Skills: join `resourceSkills` table, aggregate into array
- Capacity: join `userCapacities` table for used/max values
- Availability: compute from `userAvailability` entries for today — BLOCKED > SPECIFIC > RECURRING precedence. If member status is INACTIVE/SUSPENDED, hardcode 'unavailable'. No matching entries → 'unavailable'.
- All three are nullable — components handle missing data gracefully

## Responsive Behaviour

| Breakpoint | Layout |
|---|---|
| xl (1280px+) | Sidebar + 3-col grid / full table |
| lg (1024px+) | Sidebar + 2-col grid / table (scrollable) |
| md (768px+) | Sidebar collapsed + 2-col grid / table |
| sm (<768px) | No sidebar + 1-col grid / table (horizontal scroll) |

KPI cards: 4 cols on sm+, 2 cols on xs.

## What's NOT changing

- `/admin/team/[id]` profile page — untouched
- `/admin/team/departments` page — untouched
- `TeamMemberSheet` component — kept as-is, used for Quick View
- `AddMemberDialog` component — kept as-is
- All `profile/` tab components — untouched
- Auth/permissions — handled by admin layout
- `/admin/team/demo` — left in place (can be removed later)
