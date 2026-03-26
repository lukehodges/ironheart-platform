# Team Page Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/admin/team` to match the demo's premium design, wired to real tRPC data with a collapsible sidebar, table/grid views, KPI cards, and inline skills/capacity/availability.

**Architecture:** Component extraction approach — shared micro-components (`StatusBadge`, `CapacityBar`, etc.) in `src/components/team/`, page-level components (`TeamTable`, `TeamGridCard`, `TeamSidebar`), and a rewritten page orchestrating layout + data. Backend gets a new `team.stats` endpoint and enhanced `listByTenant` query with joined skills/capacity/availability.

**Tech Stack:** Next.js 16, React 19, tRPC 11, Drizzle ORM, shadcn/ui, Tailwind 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-team-page-migration-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/modules/team/team.types.ts:15-47` | Add optional `skills`, `capacityUsed`, `capacityMax`, `availability` to `StaffMember` + `TeamStats` interface |
| Modify | `src/modules/team/team.repository.ts:197-319` | Enhance `listByTenant` with batch skill/capacity/availability loading; add `getStats` method |
| Modify | `src/modules/team/team.service.ts:49` | Add `getStats` method |
| Modify | `src/modules/team/team.router.ts:49` | Add `stats` procedure |
| Create | `src/modules/team/__tests__/team.stats.test.ts` | Tests for stats endpoint |
| Create | `src/components/team/status-badge.tsx` | Colored status pill |
| Create | `src/components/team/employee-type-badge.tsx` | Monospace employee type tag |
| Create | `src/components/team/availability-dot.tsx` | Animated availability indicator |
| Create | `src/components/team/capacity-bar.tsx` | Progress bar with color coding |
| Create | `src/components/team/kpi-card.tsx` | Stat card with icon + trend |
| Create | `src/components/team/team-table.tsx` | Full table view |
| Create | `src/components/team/team-grid-card.tsx` | Rich grid card (replaces TeamMemberCard) |
| Create | `src/components/team/team-sidebar.tsx` | Collapsible dept + type filter sidebar |
| Rewrite | `src/app/admin/team/page.tsx` | New page orchestrating all components |

---

### Task 1: Add types and interfaces

**Files:**
- Modify: `src/modules/team/team.types.ts:15-47`

- [ ] **Step 1: Add optional fields to StaffMember interface**

In `src/modules/team/team.types.ts`, add after line 43 (`departments: StaffDepartmentMembership[]`):

```typescript
  // Optional fields populated by list query joins
  skills?: Array<{ skillName: string; proficiency: string | null }>
  capacityUsed?: number
  capacityMax?: number
  availability?: 'available' | 'blocked' | 'unavailable'
```

- [ ] **Step 2: Add TeamStats interface**

After the `StaffMember` interface closing brace (after line 47), add:

```typescript
export interface TeamStats {
  total: number
  activeCount: number
  inactiveCount: number
  suspendedCount: number
  departmentCount: number
  avgCapacityUsed: number
  avgCapacityMax: number
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing ones are fine, no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/modules/team/team.types.ts
git commit -m "feat(team): add skills, capacity, availability, TeamStats types"
```

---

### Task 2: Backend — getStats repository + service + router

**Files:**
- Modify: `src/modules/team/team.repository.ts`
- Modify: `src/modules/team/team.service.ts`
- Modify: `src/modules/team/team.router.ts`
- Create: `src/modules/team/__tests__/team.stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/team/__tests__/team.stats.test.ts`. Follow the same mock pattern as `team.availability.test.ts` — use `globalThis.__teamStatsSelectQueue` for mock results:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

(globalThis as Record<string, unknown>).__teamStatsSelectQueue = []

vi.mock('@/shared/db', () => {
  function makeSelectChain() {
    const chain: Record<string, unknown> = {}
    const dequeue = async () => {
      const queue = (globalThis as unknown as Record<string, unknown[]>).__teamStatsSelectQueue
      return queue.shift() ?? []
    }
    const methods = ['from', 'where', 'limit', 'orderBy', 'innerJoin', 'leftJoin', 'groupBy']
    for (const m of methods) {
      chain[m] = () => chain
    }
    chain.then = (resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) =>
      dequeue().then(resolve, reject)
    return chain
  }

  return {
    db: {
      select: () => makeSelectChain(),
      execute: vi.fn(),
    },
  }
})

vi.mock('@/shared/db/schema', () => ({
  users: { id: 'id', tenantId: 'tenantId', status: 'status', createdAt: 'createdAt' },
  staffProfiles: { userId: 'userId', staffStatus: 'staffStatus', employeeType: 'employeeType' },
  staffDepartments: { id: 'id', tenantId: 'tenantId', isActive: 'isActive', name: 'name' },
  staffDepartmentMembers: { userId: 'userId', tenantId: 'tenantId', departmentId: 'departmentId', isPrimary: 'isPrimary' },
  resourceSkills: { tenantId: 'tenantId', userId: 'userId', skillName: 'skillName', proficiency: 'proficiency' },
  resourceCapacities: { tenantId: 'tenantId', userId: 'userId', capacityType: 'capacityType', maxDaily: 'maxDaily', effectiveFrom: 'effectiveFrom', effectiveUntil: 'effectiveUntil' },
  resourceAssignments: { tenantId: 'tenantId', userId: 'userId', status: 'status', scheduledDate: 'scheduledDate' },
  userAvailability: { userId: 'userId', type: 'type', specificDate: 'specificDate', endDate: 'endDate', dayOfWeek: 'dayOfWeek' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: unknown[]) => a),
  and: vi.fn((...a: unknown[]) => a),
  or: vi.fn((...a: unknown[]) => a),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  count: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  ilike: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  notInArray: vi.fn(),
}))

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

const { teamRepository } = await import('../team.repository')

function enqueue(...results: unknown[]) {
  const q = (globalThis as unknown as Record<string, unknown[]>).__teamStatsSelectQueue
  for (const r of results) q.push(r)
}

describe('teamRepository.getStats', () => {
  beforeEach(() => {
    (globalThis as unknown as Record<string, unknown[]>).__teamStatsSelectQueue = []
  })

  it('returns aggregated stats for a tenant', async () => {
    // Mock: status counts query
    enqueue([
      { status: 'ACTIVE', count: 18 },
      { status: 'INACTIVE', count: 3 },
      { status: 'SUSPENDED', count: 1 },
    ])
    // Mock: department count query
    enqueue([{ count: 5 }])
    // Mock: avg capacity query
    enqueue([{ avgUsed: 6.2, avgMax: 10 }])

    const stats = await teamRepository.getStats('tenant-1')

    expect(stats).toEqual({
      total: 22,
      activeCount: 18,
      inactiveCount: 3,
      suspendedCount: 1,
      departmentCount: 5,
      avgCapacityUsed: 6.2,
      avgCapacityMax: 10,
    })
  })

  it('returns zeros when no staff exist', async () => {
    enqueue([]) // no status counts
    enqueue([{ count: 0 }]) // zero departments
    enqueue([{ avgUsed: null, avgMax: null }]) // no capacity data

    const stats = await teamRepository.getStats('empty-tenant')

    expect(stats).toEqual({
      total: 0,
      activeCount: 0,
      inactiveCount: 0,
      suspendedCount: 0,
      departmentCount: 0,
      avgCapacityUsed: 0,
      avgCapacityMax: 0,
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/team/__tests__/team.stats.test.ts 2>&1 | tail -20`
Expected: FAIL — `teamRepository.getStats is not a function`

- [ ] **Step 3: Implement getStats in repository**

In `src/modules/team/team.repository.ts`, add the `resourceCapacities` and `resourceAssignments` imports to the import block at the top (line 4-18). Add `resourceCapacities` and `resourceAssignments` to the imports from `@/shared/db/schema`.

Then add this method to the `teamRepository` object, after the `listByTenant` method (after line 319):

```typescript
  async getStats(tenantId: string): Promise<import("./team.types").TeamStats> {
    log.info({ tenantId }, "getStats");

    // 1. Count staff by derived status
    // We need to replicate the status derivation logic from mapToStaffMember
    const staffRows = await db
      .select({
        userStatus: users.status,
        staffStatus: staffProfiles.staffStatus,
      })
      .from(users)
      .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(eq(users.tenantId, tenantId));

    let activeCount = 0;
    let inactiveCount = 0;
    let suspendedCount = 0;

    for (const row of staffRows) {
      if (row.staffStatus === "TERMINATED" || row.userStatus === "DELETED") {
        inactiveCount++;
      } else if (row.staffStatus === "ACTIVE" || row.userStatus === "ACTIVE") {
        activeCount++;
      } else if (row.userStatus === "SUSPENDED") {
        suspendedCount++;
      } else {
        inactiveCount++;
      }
    }

    const total = activeCount + inactiveCount + suspendedCount;

    // 2. Count active departments
    const [deptResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(staffDepartments)
      .where(
        and(
          eq(staffDepartments.tenantId, tenantId),
          eq(staffDepartments.isActive, true),
        )
      );
    const departmentCount = deptResult?.count ?? 0;

    // 3. Average capacity (from resourceCapacities for "bookings" type, current date)
    const today = new Date().toISOString().split("T")[0];
    const [capResult] = await db
      .select({
        avgMax: sql<number>`COALESCE(AVG(${resourceCapacities.maxDaily})::numeric(5,1), 0)`,
      })
      .from(resourceCapacities)
      .where(
        and(
          eq(resourceCapacities.tenantId, tenantId),
          eq(resourceCapacities.capacityType, "bookings"),
          lte(resourceCapacities.effectiveFrom, new Date(today)),
          or(
            isNull(resourceCapacities.effectiveUntil),
            gte(resourceCapacities.effectiveUntil, new Date(today)),
          ),
        )
      );

    // Count active assignments for today as avg used
    const [assignResult] = await db
      .select({
        avgUsed: sql<number>`COALESCE(AVG(assignment_count)::numeric(5,1), 0)`,
      })
      .from(
        sql`(
          SELECT user_id, COUNT(*) as assignment_count
          FROM resource_assignments
          WHERE tenant_id = ${tenantId}
            AND status IN ('ASSIGNED', 'IN_PROGRESS')
            AND (scheduled_date IS NULL OR scheduled_date = ${today}::date)
          GROUP BY user_id
        ) as user_assignments`
      );

    return {
      total,
      activeCount,
      inactiveCount,
      suspendedCount,
      departmentCount,
      avgCapacityUsed: Number(assignResult?.avgUsed ?? 0),
      avgCapacityMax: Number(capResult?.avgMax ?? 0),
    };
  },
```

- [ ] **Step 4: Add getStats to service**

In `src/modules/team/team.service.ts`, add after the `listStaff` method (after line 85):

```typescript
  async getStats(ctx: Context): Promise<import("./team.types").TeamStats> {
    log.info({ tenantId: ctx.tenantId }, "Getting team stats");
    return teamRepository.getStats(ctx.tenantId);
  },
```

- [ ] **Step 5: Add stats procedure to router**

In `src/modules/team/team.router.ts`, add after the `list` procedure (after line 53):

```typescript
  stats: moduleProcedure
    .query(({ ctx }) => teamService.getStats(ctx)),
```

- [ ] **Step 6: Run the test**

Run: `npx vitest run src/modules/team/__tests__/team.stats.test.ts 2>&1 | tail -20`
Expected: PASS (2 tests)

- [ ] **Step 7: Run full type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 8: Commit**

```bash
git add src/modules/team/team.repository.ts src/modules/team/team.service.ts src/modules/team/team.router.ts src/modules/team/__tests__/team.stats.test.ts
git commit -m "feat(team): add team.stats endpoint for KPI dashboard cards"
```

---

### Task 3: Backend — Enhance listByTenant with batch skill/capacity/availability loading

**Files:**
- Modify: `src/modules/team/team.repository.ts:286-318`

This task adds batch loading of skills, capacity, and availability data after the main list query — same pattern as the existing department batch load (lines 286-311). This avoids N+1 queries.

- [ ] **Step 1: Add imports**

Ensure `resourceSkills`, `resourceCapacities`, `resourceAssignments` are imported from `@/shared/db/schema` at the top of `team.repository.ts`. Also ensure `userAvailability` is imported (it already is at line 7).

- [ ] **Step 2: Add batch loading after department batch load**

In `listByTenant`, after the department map is built (after line 311, `deptMap.set(d.userId, list)`), add:

```typescript
    // Batch-load skills for all returned staff
    const skillRows = userIds.length > 0
      ? await db
          .select({
            userId: resourceSkills.userId,
            skillName: resourceSkills.skillName,
            proficiency: resourceSkills.proficiency,
          })
          .from(resourceSkills)
          .where(
            and(
              eq(resourceSkills.tenantId, tenantId),
              inArray(resourceSkills.userId, userIds),
            )
          )
      : [];

    const skillMap = new Map<string, Array<{ skillName: string; proficiency: string | null }>>();
    for (const s of skillRows) {
      const list = skillMap.get(s.userId) ?? [];
      list.push({ skillName: s.skillName, proficiency: s.proficiency });
      skillMap.set(s.userId, list);
    }

    // Batch-load capacity for all returned staff (current effective "bookings" capacity)
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const capRows = userIds.length > 0
      ? await db
          .select({
            userId: resourceCapacities.userId,
            maxDaily: resourceCapacities.maxDaily,
          })
          .from(resourceCapacities)
          .where(
            and(
              eq(resourceCapacities.tenantId, tenantId),
              inArray(resourceCapacities.userId, userIds),
              eq(resourceCapacities.capacityType, "bookings"),
              lte(resourceCapacities.effectiveFrom, today),
              or(
                isNull(resourceCapacities.effectiveUntil),
                gte(resourceCapacities.effectiveUntil, today),
              ),
            )
          )
      : [];

    const capMap = new Map<string, number>();
    for (const c of capRows) {
      if (c.maxDaily !== null) capMap.set(c.userId, c.maxDaily);
    }

    // Batch-load active assignment counts (capacity used) for today
    const assignRows = userIds.length > 0
      ? await db
          .select({
            userId: resourceAssignments.userId,
            count: sql<number>`count(*)::int`,
          })
          .from(resourceAssignments)
          .where(
            and(
              eq(resourceAssignments.tenantId, tenantId),
              inArray(resourceAssignments.userId, userIds),
              inArray(resourceAssignments.status, ["ASSIGNED", "IN_PROGRESS"]),
            )
          )
          .groupBy(resourceAssignments.userId)
      : [];

    const assignMap = new Map<string, number>();
    for (const a of assignRows) {
      assignMap.set(a.userId, a.count);
    }

    // Batch-load today's availability for all returned staff
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const availRows = userIds.length > 0
      ? await db
          .select({
            userId: userAvailability.userId,
            type: userAvailability.type,
            specificDate: userAvailability.specificDate,
            endDate: userAvailability.endDate,
            dayOfWeek: userAvailability.dayOfWeek,
          })
          .from(userAvailability)
          .where(
            and(
              inArray(userAvailability.userId, userIds),
              or(
                // BLOCKED entries covering today
                and(
                  eq(userAvailability.type, "BLOCKED"),
                  lte(userAvailability.specificDate, today),
                  or(
                    isNull(userAvailability.endDate),
                    gte(userAvailability.endDate, today),
                  ),
                ),
                // SPECIFIC entries for today
                and(
                  eq(userAvailability.type, "SPECIFIC"),
                  eq(userAvailability.specificDate, today),
                ),
                // RECURRING entries for today's day of week
                and(
                  eq(userAvailability.type, "RECURRING"),
                  eq(userAvailability.dayOfWeek, dayOfWeek),
                ),
              ),
            )
          )
      : [];

    // Compute availability per user: BLOCKED > SPECIFIC > RECURRING
    type AvailStatus = 'available' | 'blocked' | 'unavailable';
    const availMap = new Map<string, AvailStatus>();
    for (const a of availRows) {
      const current = availMap.get(a.userId);
      if (a.type === "BLOCKED") {
        availMap.set(a.userId, "blocked");
      } else if (a.type === "SPECIFIC" && current !== "blocked") {
        availMap.set(a.userId, "available");
      } else if (a.type === "RECURRING" && current !== "blocked" && current !== "available") {
        availMap.set(a.userId, "available");
      }
    }
```

- [ ] **Step 3: Update the mapToStaffMember call to include new data**

Replace the return block (lines 313-318):

```typescript
    return {
      rows: sliced.map((r) => {
        const member = mapToStaffMember(r.user, r.profile, deptMap.get(r.user.id) ?? []);
        member.skills = skillMap.get(r.user.id) ?? [];
        member.capacityMax = capMap.get(r.user.id) ?? undefined;
        member.capacityUsed = assignMap.get(r.user.id) ?? undefined;
        // Availability: if status is not ACTIVE, force unavailable
        if (member.status !== "ACTIVE") {
          member.availability = "unavailable";
        } else {
          member.availability = availMap.get(r.user.id) ?? "unavailable";
        }
        return member;
      }),
      hasMore,
    };
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Run existing team tests**

Run: `npx vitest run src/modules/team/__tests__/ 2>&1 | tail -20`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/modules/team/team.repository.ts
git commit -m "feat(team): batch-load skills, capacity, availability in list query"
```

---

### Task 4: Create shared micro-components

**Files:**
- Create: `src/components/team/status-badge.tsx`
- Create: `src/components/team/employee-type-badge.tsx`
- Create: `src/components/team/availability-dot.tsx`
- Create: `src/components/team/capacity-bar.tsx`
- Create: `src/components/team/kpi-card.tsx`

- [ ] **Step 1: Create status-badge.tsx**

```typescript
import { cn } from "@/lib/utils"
import type { StaffStatus } from "@/modules/team/team.types"

const styles: Record<StaffStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-500 border-zinc-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
}

const labels: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  )
}
```

- [ ] **Step 2: Create employee-type-badge.tsx**

```typescript
import type { EmployeeType } from "@/modules/team/team.types"

const labels: Record<EmployeeType, string> = {
  EMPLOYED: "FTE",
  SELF_EMPLOYED: "Self",
  CONTRACTOR: "Contract",
}

export function EmployeeTypeBadge({ type }: { type: EmployeeType }) {
  return (
    <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
      {labels[type]}
    </span>
  )
}
```

- [ ] **Step 3: Create availability-dot.tsx**

```typescript
export type AvailabilityStatus = "available" | "blocked" | "unavailable"

export function AvailabilityDot({ availability }: { availability: AvailabilityStatus }) {
  if (availability === "available") {
    return (
      <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
    )
  }
  if (availability === "blocked") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
  }
  return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
}

const labels: Record<AvailabilityStatus, string> = {
  available: "Available",
  blocked: "Blocked",
  unavailable: "Unavailable",
}

export function AvailabilityLabel({ availability }: { availability: AvailabilityStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <AvailabilityDot availability={availability} />
      <span className="text-[11px] text-zinc-500">{labels[availability]}</span>
    </div>
  )
}
```

- [ ] **Step 4: Create capacity-bar.tsx**

```typescript
import { cn } from "@/lib/utils"

function capacityColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "#ef4444"
  if (pct > 60) return "#f59e0b"
  return "#10b981"
}

function capacityTextClass(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 80) return "text-red-600"
  if (pct > 60) return "text-amber-600"
  return "text-emerald-600"
}

export function CapacityBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? (used / max) * 100 : 0
  const color = capacityColor(used, max)
  const textClass = capacityTextClass(used, max)
  return (
    <div className="space-y-1 w-20">
      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-[11px] font-semibold tabular-nums", textClass)}>
          {used}
          <span className="text-zinc-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create kpi-card.tsx**

```typescript
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  trend?: { label: string; positive: boolean }
}

export function KpiCard({ label, value, sub, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono tabular-nums leading-none text-zinc-900">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium mb-0.5", trend.positive ? "text-emerald-600" : "text-red-500")}>
            {trend.positive ? "↑" : "↓"} {trend.label}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add src/components/team/status-badge.tsx src/components/team/employee-type-badge.tsx src/components/team/availability-dot.tsx src/components/team/capacity-bar.tsx src/components/team/kpi-card.tsx
git commit -m "feat(team): add shared micro-components for team dashboard"
```

---

### Task 5: Create TeamSidebar component

**Files:**
- Create: `src/components/team/team-sidebar.tsx`

- [ ] **Step 1: Create team-sidebar.tsx**

```typescript
"use client"

import { ChevronLeft, ChevronRight, Shield, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { EmployeeType } from "@/modules/team/team.types"

interface DepartmentItem {
  id: string
  name: string
  color: string | null
  memberCount: number
}

interface TeamSidebarProps {
  departments: DepartmentItem[]
  totalMembers: number
  deptFilter: string | null
  onDeptFilter: (id: string | null) => void
  employeeTypeFilter: EmployeeType | null
  onEmployeeTypeFilter: (type: EmployeeType | null) => void
  isOpen: boolean
  onToggle: () => void
}

const EMPLOYEE_TYPE_OPTIONS: Array<{ value: EmployeeType | null; label: string }> = [
  { value: null, label: "All types" },
  { value: "EMPLOYED", label: "FTE" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CONTRACTOR", label: "Contractor" },
]

export function TeamSidebar({
  departments,
  totalMembers,
  deptFilter,
  onDeptFilter,
  employeeTypeFilter,
  onEmployeeTypeFilter,
  isOpen,
  onToggle,
}: TeamSidebarProps) {
  if (!isOpen) {
    return (
      <div className="shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          aria-label="Open sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside className="w-52 shrink-0 space-y-4">
      {/* Toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-zinc-400 hover:text-zinc-700 gap-1"
          onClick={onToggle}
        >
          <ChevronLeft className="h-3 w-3" />
          Hide
        </Button>
      </div>

      {/* Department filter */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Departments
          </span>
        </div>
        <div className="p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => onDeptFilter(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              deptFilter === null
                ? "bg-zinc-900 text-white font-semibold"
                : "text-zinc-600 hover:bg-zinc-50 font-medium"
            )}
          >
            <span>All members</span>
            <span className={cn("font-mono text-[11px]", deptFilter === null ? "text-white/70" : "text-zinc-400")}>
              {totalMembers}
            </span>
          </button>

          <Separator className="bg-zinc-100 my-1" />

          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => onDeptFilter(dept.id === deptFilter ? null : dept.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                deptFilter === dept.id
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 font-medium"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: dept.color ?? "#a1a1aa" }}
                />
                <span className="truncate">{dept.name}</span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400 shrink-0">{dept.memberCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Employee type filter */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            Type
          </span>
        </div>
        <div className="p-1.5 space-y-0.5">
          {EMPLOYEE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? "all"}
              type="button"
              onClick={() => onEmployeeTypeFilter(opt.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                employeeTypeFilter === opt.value
                  ? "bg-zinc-100 font-semibold text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* WorkOS panel */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-blue-700">WorkOS Access</span>
        </div>
        <p className="text-[11px] leading-relaxed text-blue-600">
          Invite flows, SSO &amp; SCIM provisioning via WorkOS AuthKit.
        </p>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          Manage Access
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/team/team-sidebar.tsx
git commit -m "feat(team): add collapsible sidebar with department + type filters"
```

---

### Task 6: Create TeamTable component

**Files:**
- Create: `src/components/team/team-table.tsx`

- [ ] **Step 1: Create team-table.tsx**

```typescript
"use client"

import { MoreHorizontal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "./status-badge"
import { EmployeeTypeBadge } from "./employee-type-badge"
import { AvailabilityLabel } from "./availability-dot"
import { CapacityBar } from "./capacity-bar"
import type { StaffMember } from "@/modules/team/team.types"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function getDeptName(member: StaffMember): string | null {
  const primary = member.departments?.find((d) => d.isPrimary)
  return primary?.departmentName ?? member.departments?.[0]?.departmentName ?? null
}

interface TeamTableProps {
  members: StaffMember[]
  departmentColors: Map<string, string>
  onNavigate: (id: string) => void
  onQuickView: (id: string) => void
  bulkMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

export function TeamTable({
  members,
  departmentColors,
  onNavigate,
  onQuickView,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: TeamTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-zinc-200">
            {bulkMode && <TableHead className="w-10 pl-4" />}
            <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[220px]">
              Member
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[140px]">
              Department
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[80px]">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[100px]">
              Availability
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 w-[110px]">
              Capacity
            </TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Skills
            </TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={bulkMode ? 8 : 7} className="h-24 text-center text-sm text-zinc-400">
                No members match your filters.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => {
              const deptName = getDeptName(member)
              const deptColor = deptName ? departmentColors.get(deptName) ?? "#a1a1aa" : "transparent"

              return (
                <TableRow
                  key={member.id}
                  className="group hover:bg-zinc-50/80 cursor-pointer border-zinc-100 transition-colors"
                  style={{ borderLeft: `3px solid ${deptColor}` }}
                  onClick={() => bulkMode ? onToggleSelect(member.id) : onNavigate(member.id)}
                >
                  {bulkMode && (
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => onToggleSelect(member.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${member.name}`}
                      />
                    </TableCell>
                  )}

                  {/* Member */}
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0 text-xs">
                        {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                        <AvatarFallback className="text-[11px] font-semibold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">
                          {member.name}
                        </p>
                        <p className="text-xs text-zinc-400 truncate leading-tight flex items-center gap-1.5">
                          {member.jobTitle ?? "No title"}
                          {member.employeeType && <EmployeeTypeBadge type={member.employeeType} />}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Department */}
                  <TableCell className="py-3">
                    {deptName ? (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                        <span className="text-xs text-zinc-600 truncate">{deptName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3">
                    <StatusBadge status={member.status} />
                  </TableCell>

                  {/* Availability */}
                  <TableCell className="py-3">
                    <AvailabilityLabel availability={member.availability ?? "unavailable"} />
                  </TableCell>

                  {/* Capacity */}
                  <TableCell className="py-3">
                    {member.capacityMax != null ? (
                      <CapacityBar used={member.capacityUsed ?? 0} max={member.capacityMax} />
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>

                  {/* Skills */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(member.skills ?? []).slice(0, 2).map((s) => (
                        <span
                          key={s.skillName}
                          className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
                        >
                          {s.skillName}
                        </span>
                      ))}
                      {(member.skills ?? []).length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 cursor-default">
                              +{(member.skills ?? []).length - 2}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {(member.skills ?? []).slice(2).map((s) => s.skillName).join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 pr-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); onQuickView(member.id) }}
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Quick View</TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onNavigate(member.id)}>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-amber-600">Change Status</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/team/team-table.tsx
git commit -m "feat(team): add TeamTable component with all columns"
```

---

### Task 7: Create TeamGridCard component

**Files:**
- Create: `src/components/team/team-grid-card.tsx`

- [ ] **Step 1: Create team-grid-card.tsx**

```typescript
"use client"

import { MoreHorizontal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "./status-badge"
import { EmployeeTypeBadge } from "./employee-type-badge"
import { AvailabilityLabel } from "./availability-dot"
import { CapacityBar } from "./capacity-bar"
import type { StaffMember } from "@/modules/team/team.types"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface TeamGridCardProps {
  member: StaffMember
  deptColor: string
  onNavigate: (id: string) => void
  onQuickView: (id: string) => void
}

export function TeamGridCard({ member, deptColor, onNavigate, onQuickView }: TeamGridCardProps) {
  const deptName = member.departments?.find((d) => d.isPrimary)?.departmentName
    ?? member.departments?.[0]?.departmentName ?? null

  return (
    <div
      className="relative rounded-xl border border-zinc-200 bg-white p-4 space-y-3 hover:-translate-y-px hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ borderLeft: `3px solid ${deptColor}` }}
      onClick={() => onNavigate(member.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 text-xs ring-2 ring-white">
            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
            <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{member.name}</p>
            <p className="text-xs text-zinc-500 truncate leading-tight">{member.jobTitle ?? "No title"}</p>
          </div>
        </div>
        <StatusBadge status={member.status} />
      </div>

      {/* Dept + type */}
      <div className="flex items-center gap-2">
        {deptName && (
          <>
            <span className="inline-flex h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
            <span className="text-xs text-zinc-600 truncate">{deptName}</span>
          </>
        )}
        {member.employeeType && <EmployeeTypeBadge type={member.employeeType} />}
      </div>

      {/* Skills */}
      {(member.skills ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(member.skills ?? []).slice(0, 3).map((s) => (
            <span
              key={s.skillName}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600"
            >
              {s.skillName}
            </span>
          ))}
          {(member.skills ?? []).length > 3 && (
            <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              +{(member.skills ?? []).length - 3}
            </span>
          )}
        </div>
      )}

      <Separator className="bg-zinc-100" />

      {/* Availability + capacity */}
      <div className="flex items-center justify-between gap-3">
        <AvailabilityLabel availability={member.availability ?? "unavailable"} />
        {member.capacityMax != null && (
          <CapacityBar used={member.capacityUsed ?? 0} max={member.capacityMax} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              onClick={(e) => { e.stopPropagation(); onQuickView(member.id) }}
            >
              Quick View
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Open side panel</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onNavigate(member.id)}>View Profile</DropdownMenuItem>
            <DropdownMenuItem>Edit Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-amber-600">Change Status</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/components/team/team-grid-card.tsx
git commit -m "feat(team): add TeamGridCard component replacing TeamMemberCard"
```

---

### Task 8: Rewrite the team page

**Files:**
- Rewrite: `src/app/admin/team/page.tsx`

This is the main page rewrite. It orchestrates all new components, manages filter state via URL params, and wires up real tRPC data.

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire contents of `src/app/admin/team/page.tsx` with:

```typescript
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  UserPlus,
  Network,
  Search,
  List,
  LayoutGrid,
  Users,
  TrendingUp,
  Building2,
  Activity,
  ChevronRight,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TeamMemberSheet } from "@/components/team/team-member-sheet"
import { AddMemberDialog } from "@/components/team/add-member-dialog"
import { KpiCard } from "@/components/team/kpi-card"
import { TeamSidebar } from "@/components/team/team-sidebar"
import { TeamTable } from "@/components/team/team-table"
import { TeamGridCard } from "@/components/team/team-grid-card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { StaffStatus, EmployeeType } from "@/modules/team/team.types"

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | StaffStatus
type ViewMode = "table" | "grid"

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
]

// ─── localStorage helpers ────────────────────────────────────────────────────

function getStoredView(): ViewMode {
  if (typeof window === "undefined") return "table"
  return (localStorage.getItem("team-view-mode") as ViewMode) ?? "table"
}

function getStoredSidebar(): boolean {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem("team-sidebar-open")
  return stored === null ? true : stored === "true"
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── Filter state from URL params ──────────────────────────────────────────
  const statusFilter = (searchParams.get("status")?.toUpperCase() as StatusFilter) ?? "ALL"
  const deptFilter = searchParams.get("dept") ?? null
  const employeeTypeFilter = (searchParams.get("type")?.toUpperCase() as EmployeeType) ?? null
  const searchParam = searchParams.get("search") ?? ""

  const [search, setSearch] = useState(searchParam)
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam)

  // ─── UI state (localStorage) ───────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView)
  const [sidebarOpen, setSidebarOpen] = useState(getStoredSidebar)

  // ─── Other state ───────────────────────────────────────────────────────────
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  // ─── URL param helpers ─────────────────────────────────────────────────────
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "ALL") {
          params.delete(key)
        } else {
          params.set(key, value.toLowerCase())
        }
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : "/admin/team", { scroll: false })
      setCursor(undefined)
    },
    [searchParams, router]
  )

  // ─── Debounced search → URL sync ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      if (search !== searchParam) {
        updateParams({ search: search || null })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searchParam, updateParams])

  // ─── Persist view/sidebar prefs ────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("team-view-mode", viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem("team-sidebar-open", String(sidebarOpen)) }, [sidebarOpen])

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = api.team.stats.useQuery(undefined, {
    staleTime: 60_000,
  })

  const { data, isLoading } = api.team.list.useQuery({
    limit: 25,
    search: debouncedSearch || undefined,
    departmentId: deptFilter ?? undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    employeeType: employeeTypeFilter ?? undefined,
    cursor,
  })

  const members = data?.rows ?? []

  const { data: departments } = api.team.departments.list.useQuery(undefined, {
    staleTime: 60_000,
  })

  const utils = api.useUtils()

  // ─── Build department color map ────────────────────────────────────────────
  const deptColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!departments) return map
    function walk(list: typeof departments) {
      for (const d of list!) {
        if (d.color) map.set(d.name, d.color)
        if (d.children?.length) walk(d.children)
      }
    }
    walk(departments)
    return map
  }, [departments])

  // Flatten departments for sidebar
  const sidebarDepts = useMemo(() => {
    if (!departments) return []
    const result: Array<{ id: string; name: string; color: string | null; memberCount: number }> = []
    function walk(list: typeof departments) {
      for (const d of list!) {
        result.push({ id: d.id, name: d.name, color: d.color ?? null, memberCount: d.memberCount ?? 0 })
        if (d.children?.length) walk(d.children)
      }
    }
    walk(departments)
    return result
  }, [departments])

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  const bulkUpdateMutation = api.team.update.useMutation({
    onError: (err) => toast.error(err.message ?? "Failed to update"),
  })

  async function handleBulkStatusChange(status: StaffStatus) {
    const ids = Array.from(selectedIds)
    setBulkUpdating(true)
    try {
      for (const id of ids) {
        await bulkUpdateMutation.mutateAsync({ id, status })
      }
      toast.success(`Updated ${ids.length} member${ids.length !== 1 ? "s" : ""}`)
      setSelectedIds(new Set())
      setBulkMode(false)
      void utils.team.list.invalidate()
      void utils.team.stats.invalidate()
    } catch {
      // onError handler shows toast
    } finally {
      setBulkUpdating(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const hasFilters = statusFilter !== "ALL" || deptFilter !== null || employeeTypeFilter !== null || search !== ""

  function clearFilters() {
    setSearch("")
    router.replace("/admin/team", { scroll: false })
    setCursor(undefined)
  }

  function getDeptColor(memberName: string): string {
    return deptColorMap.get(memberName) ?? "#a1a1aa"
  }

  function getMemberDeptColor(member: typeof members[0]): string {
    const deptName = member.departments?.find((d) => d.isPrimary)?.departmentName
      ?? member.departments?.[0]?.departmentName
    return deptName ? getDeptColor(deptName) : "#a1a1aa"
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-zinc-600 font-medium">People</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">People</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Manage staff capacity, availability, and department structure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/team/departments">
                <Network className="h-4 w-4" />
                Departments
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="gap-2 bg-zinc-900 text-white hover:bg-zinc-700"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Add a new team member
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* KPI cards */}
        {statsLoading ? (
          <KpiSkeleton />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Total Members"
              value={String(stats.total)}
              sub={`Across ${stats.departmentCount} departments`}
              icon={Users}
            />
            <KpiCard
              label="Active Rate"
              value={stats.total > 0 ? `${Math.round((stats.activeCount / stats.total) * 100)}%` : "0%"}
              sub={`${stats.activeCount} active`}
              icon={TrendingUp}
            />
            <KpiCard
              label="Departments"
              value={String(stats.departmentCount)}
              icon={Building2}
            />
            <KpiCard
              label="Avg Capacity"
              value={stats.avgCapacityMax > 0 ? String(stats.avgCapacityUsed) : "—"}
              sub={stats.avgCapacityMax > 0 ? `Out of ${stats.avgCapacityMax} max` : "No capacity data"}
              icon={Activity}
            />
          </div>
        ) : null}

        {/* Body: sidebar + main */}
        <div className="flex items-start gap-5">
          {/* Sidebar */}
          <TeamSidebar
            departments={sidebarDepts}
            totalMembers={stats?.total ?? 0}
            deptFilter={deptFilter}
            onDeptFilter={(id) => updateParams({ dept: id })}
            employeeTypeFilter={employeeTypeFilter}
            onEmployeeTypeFilter={(type) => updateParams({ type: type })}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Search + view toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  placeholder="Search by name, title, skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-zinc-200 bg-white placeholder:text-zinc-400"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        viewMode === "table" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Table view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                        viewMode === "grid" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-700"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Grid view</TooltipContent>
                </Tooltip>
              </div>
              {/* Bulk select toggle */}
              <Button
                size="sm"
                variant={bulkMode ? "secondary" : "outline"}
                className="text-xs h-9"
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()) }}
              >
                {bulkMode ? "Cancel" : "Select"}
              </Button>
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateParams({ status: f.value })}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    statusFilter === f.value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  {f.label}
                </button>
              ))}
              {hasFilters && (
                <>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </>
              )}
              <span className="ml-auto font-mono text-xs text-zinc-400 tabular-nums">
                {members.length} member{members.length !== 1 ? "s" : ""}
                {data?.hasMore ? "+" : ""}
              </span>
            </div>

            {/* Content */}
            {isLoading ? (
              <TableSkeleton />
            ) : viewMode === "table" ? (
              <TeamTable
                members={members}
                departmentColors={deptColorMap}
                onNavigate={(id) => router.push(`/admin/team/${id}`)}
                onQuickView={(id) => setSelectedMemberId(id)}
                bulkMode={bulkMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ) : (
              members.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-zinc-200 bg-white">
                  <p className="text-sm text-zinc-400">No members match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {members.map((member) => (
                    <div key={member.id} className="relative">
                      {bulkMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelect(member.id)}
                            aria-label={`Select ${member.name}`}
                          />
                        </div>
                      )}
                      <TeamGridCard
                        member={member}
                        deptColor={getMemberDeptColor(member)}
                        onNavigate={(id) => bulkMode ? toggleSelect(id) : router.push(`/admin/team/${id}`)}
                        onQuickView={(id) => setSelectedMemberId(id)}
                      />
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Load more */}
            {data?.hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastMember = members[members.length - 1]
                    if (lastMember) setCursor(lastMember.id)
                  }}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bulk actions toolbar */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-4 z-10 mx-auto w-fit rounded-lg border border-zinc-200 bg-white shadow-lg px-4 py-2 flex items-center gap-3">
            <span className="text-xs font-medium">{selectedIds.size} selected</span>
            <Separator orientation="vertical" className="h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs h-7" disabled={bulkUpdating}>
                  {bulkUpdating ? "Updating..." : "Change status"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => void handleBulkStatusChange(s)}
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

        {/* Sheet */}
        <TeamMemberSheet
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
        />

        {/* Add member dialog */}
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => { void utils.team.list.invalidate(); void utils.team.stats.invalidate() }}
        />
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors related to team page

- [ ] **Step 3: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -30`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/team/page.tsx
git commit -m "feat(team): rewrite team page with premium dashboard design

Sidebar with department/type filters, table/grid toggle, KPI cards,
inline skills/capacity/availability, bulk actions, URL-synced filters."
```

---

### Task 9: Verify and clean up

**Files:**
- Check: `src/components/team/team-member-card.tsx` for other usages

- [ ] **Step 1: Check if TeamMemberCard is used elsewhere**

Run: `grep -r "TeamMemberCard\|team-member-card" src/ --include="*.tsx" --include="*.ts" -l`

If only referenced from old `page.tsx` (now rewritten) and its own file, it can be retired. If referenced elsewhere, leave it.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Run build one final time**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -30`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(team): clean up after team page migration"
```
