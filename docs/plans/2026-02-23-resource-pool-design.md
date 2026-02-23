# Resource Pool System — Staff/Team/Users Unification

**Date:** 2026-02-23
**Status:** Approved
**Scope:** Shared infrastructure + team module restructure + scheduling slim-down

## Problem

The current staff/team architecture is booking-centric. Staff capacity (`maxDailyBookings`), skills (`serviceIds`), and assignments are all hardwired to the booking module. Three separate admin pages (Team, Scheduling, Calendar) manage overlapping slices of the same staff data. This doesn't scale to a multi-industry platform where staff may be assigned to projects, tickets, shifts, or any other module-defined work.

## Design Decisions

- **Staff = Users stays.** The `isTeamMember` flag on the `users` table is the correct pattern (consistent with Workday/Salesforce). No separate staff entity.
- **Resource Pool model.** Three new shared tables centralize skills, capacity, and assignments. Modules consume the pool rather than owning their own staff logic.
- **Broad skill system.** Services, certifications, languages, qualifications, equipment, and custom skill types — each with proficiency and optional expiry.
- **Weighted assignments.** Each assignment has a capacity cost (default 1.0). Capacity checks use `SUM(weight)` vs max.
- **Configurable enforcement.** Per-tenant setting: `STRICT` (hard reject) or `FLEXIBLE` (warn + allow with override reason). Default: `FLEXIBLE`.
- **Team absorbs scheduling.** `/admin/team` becomes the single staff hub with a drill-in profile page. Scheduling page removed from nav.
- **No migration needed.** No production data — build from scratch, drop old columns directly.

## Data Model

### New Tables

#### `resource_skills`

What can staff do?

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → tenants | |
| userId | uuid FK → users | |
| skillType | enum | `SERVICE`, `CERTIFICATION`, `LANGUAGE`, `QUALIFICATION`, `EQUIPMENT`, `CUSTOM` |
| skillId | text | Service UUID for SERVICE type, freeform identifier for others (e.g. `forklift-class-b`) |
| skillName | text | Human-readable label (e.g. "Forklift Class B License") |
| proficiency | enum | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT` |
| verifiedAt | timestamp | When skill was verified/certified |
| verifiedBy | uuid FK → users | Who verified it |
| expiresAt | timestamp | Null = never expires. For certifications with renewal dates |
| metadata | jsonb | Flexible — cert number, issuing body, etc. |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Unique constraint: `(tenantId, userId, skillType, skillId)`

#### `resource_capacities`

How much can staff handle?

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → tenants | |
| userId | uuid FK → users | |
| capacityType | text | Module-defined: `bookings`, `projects`, `tickets`, etc. |
| maxConcurrent | integer | Max active at once (null = unlimited) |
| maxDaily | integer | Max per day (null = unlimited) |
| maxWeekly | integer | Max per week (null = unlimited) |
| unit | enum | `COUNT`, `HOURS`, `POINTS` |
| effectiveFrom | date | When this capacity rule starts |
| effectiveUntil | date | Null = no end date |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Unique constraint: `(tenantId, userId, capacityType, effectiveFrom)`

#### `resource_assignments`

What is staff working on?

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → tenants | |
| userId | uuid FK → users | |
| moduleSlug | text | `bookings`, `projects`, `workflows`, etc. |
| resourceType | text | `booking`, `project`, `ticket`, `shift` |
| resourceId | uuid | FK to the actual record (not enforced — cross-module) |
| status | enum | `ASSIGNED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| weight | numeric(4,2) | Capacity cost, default 1.0 |
| scheduledDate | date | For daily capacity checks |
| assignedAt | timestamp | |
| startedAt | timestamp | |
| completedAt | timestamp | |
| assignedBy | uuid FK → users | |
| overrideReason | text | Populated when assignment exceeds capacity (flexible mode) |
| metadata | jsonb | Module-specific context |

Index: `(tenantId, userId, status, scheduledDate)` for capacity queries.

### Changes to Existing Tables

**`users` — drop columns:**
- `serviceIds` — replaced by `resource_skills` rows (skillType=SERVICE)
- `maxDailyBookings` — replaced by `resource_capacities` row (capacityType=bookings)
- `maxConcurrentBookings` — replaced by `resource_capacities` row (capacityType=bookings)

**`users` — columns that stay:**
- `isTeamMember`, `staffStatus`, `employeeType` — identity/HR data
- `hourlyRate`, `dayRate`, `mileageRate` — pay rates
- `jobTitle`, `startDate`, `lastAssignedAt` — employment data
- `homeLatitude`, `homeLongitude` — geographic data

**`userCapacities` — deprecated.** Replaced by `resource_capacities` with `effectiveFrom`/`effectiveUntil` for date-specific overrides.

**`organizationSettings` — add column:**
- `capacityEnforcement`: enum `STRICT` | `FLEXIBLE` (default `FLEXIBLE`)

## Service Layer

Shared infrastructure at `src/shared/resource-pool/`. Not a module — modules consume it.

```
src/shared/resource-pool/
  resource-pool.types.ts
  resource-pool.schemas.ts
  resource-pool.repository.ts
  resource-pool.service.ts
  resource-pool.errors.ts
```

### Skills API

```
addSkill(tenantId, userId, { skillType, skillId, skillName, proficiency, expiresAt, ... })
removeSkill(tenantId, userId, skillType, skillId)
listSkills(tenantId, userId, { skillType? })  → ResourceSkill[]
findUsersWithSkill(tenantId, skillType, skillId, { minProficiency? })  → userId[]
checkSkillValid(tenantId, userId, skillType, skillId)  → boolean
```

### Capacities API

```
setCapacity(tenantId, userId, { capacityType, maxDaily, maxConcurrent, maxWeekly, unit, effectiveFrom, effectiveUntil })
getCapacity(tenantId, userId, capacityType, date?)  → ResourceCapacity | null
getCapacityUsage(tenantId, userId, capacityType, date)  → { used, max, available, isOver }
```

### Assignments API

```
requestAssignment(tenantId, { userId, moduleSlug, resourceType, resourceId, weight?, scheduledDate, assignedBy, overrideReason?, metadata? })
  → { success: true, assignmentId } | { success: false, reason, current, max, enforcement }

completeAssignment(tenantId, assignmentId)
cancelAssignment(tenantId, assignmentId)
listAssignments(tenantId, userId, { moduleSlug?, status?, dateRange? })  → ResourceAssignment[]
getStaffWorkload(tenantId, userId, date)  → WorkloadSummary
```

### Staff Recommendation API

Replaces booking-specific smart assignment in scheduling module. Generalized for any module.

```
findAvailableStaff(tenantId, {
  requiredSkills?: { skillType, skillId, minProficiency? }[],
  capacityType: string,
  date: date,
  minAvailableCapacity?: number,
  sortBy?: 'LEAST_LOADED' | 'MOST_SKILLED' | 'NEAREST' | 'ROUND_ROBIN',
  location?: { lat, lng }
})  → RankedStaffCandidate[]
```

### Capacity Enforcement Flow

1. `requestAssignment()` calculates current usage: `SUM(weight) WHERE status IN ('ASSIGNED','ACTIVE') AND scheduledDate = date`
2. Compares against `resource_capacities` for this `capacityType`
3. If within limits → insert assignment, return success
4. If exceeded + tenant enforcement = `STRICT` → reject, return failure with details
5. If exceeded + tenant enforcement = `FLEXIBLE` → require `overrideReason` from caller, insert assignment with override logged, return success
6. Override reasons captured in `resource_assignments.overrideReason` for audit trail

## Existing Module Changes

### Booking Module

- Assignment goes through `resourcePool.requestAssignment()` instead of directly writing `staffId`
- `staffId` FK on bookings stays for query performance — resource pool is the source of truth for capacity, booking table is the source of truth for the booking
- Skill matching uses `resourcePool.findAvailableStaff({ requiredSkills: [{ skillType: 'SERVICE', skillId }] })` instead of checking `users.serviceIds`

### Scheduling Module

- **Loses:** Smart assignment logic (moves to resource pool), staff management UI
- **Keeps:** Slot CRUD (`availableSlots`), slot queries, recurring slot generation, travel time calculations
- Becomes a focused slot management service

### Team Module

- Staff CRUD stays
- Availability management stays (owns `userAvailability` — time-based, not capacity-based)
- Capacity management delegates to `resourcePool.setCapacity()` / `getCapacity()`
- Skill management delegates to `resourcePool.addSkill()` / `listSkills()`
- Schedule/workload queries use `resourcePool.listAssignments()` + `getStaffWorkload()`

## UX Structure

### `/admin/team` — Staff Hub

**List view (enhanced):**
- Staff grid with status + employee type filters, search
- Workload badges on each card (e.g. "5/8 bookings today") from `getStaffWorkload()`
- Skill tags as chips on cards
- Availability indicator (green/amber/red) based on today's availability + capacity

**Sidebar sheet (click staff card):**
- Profile summary
- Today's workload across all capacity types
- Current active assignments
- Quick actions: edit profile, block dates, view full profile

### `/admin/team/[id]` — Staff Profile Page

| Tab | Content | Data Source |
|-----|---------|-------------|
| **Overview** | Profile, employment details, contact, HR fields | `users` table |
| **Skills** | Full skill registry — add/remove/edit. Expiry warnings. | `resource_skills` |
| **Capacity** | All capacity types with current/max. Set limits. Date overrides. | `resource_capacities` + `resource_assignments` |
| **Availability** | Weekly recurring schedule, specific dates, blocked periods. Calendar viz. | `userAvailability` |
| **Assignments** | Filterable list of all assignments across modules. | `resource_assignments` |
| **Activity** | Audit log for this staff member. | `auditLogs` |

### Navigation Change

```
Before:              After:
├── Team             ├── Team
├── Scheduling       │   └── /admin/team/[id]
├── Calendar         ├── Calendar
```

Scheduling removed from top-level nav. Slot management accessible within Team or as a utility for tenants that use slot-based scheduling.

Calendar stays as a cross-module timeline view.

## Module Integration Protocol

When a future module wants to use the resource pool:

1. **Declare a capacity type** — string convention (e.g. `'projects'`). No registry table needed.
2. **Set staff capacities** — admin configures via Team profile Capacity tab. Module can provide defaults when enabled.
3. **Request assignments** — call `resourcePool.requestAssignment()` with moduleSlug, resourceType, resourceId, weight.
4. **Handle enforcement** — if `STRICT` and exceeded, reject. If `FLEXIBLE` and exceeded, prompt user for override reason.
5. **Complete/cancel** — call `resourcePool.completeAssignment()` or `cancelAssignment()` when work finishes.
6. **Optional skill matching** — call `resourcePool.findAvailableStaff()` with required skills.

## Build Order

1. Schema — create 3 new tables, add `capacityEnforcement` to `organizationSettings`, drop old columns from `users`
2. Resource pool service — build `src/shared/resource-pool/` (types, schemas, repository, service, errors)
3. Team module refactor — wire to resource pool for skills + capacity
4. Booking module refactor — wire assignment through resource pool
5. Scheduling module slim-down — move smart assignment out, keep slot CRUD
6. Frontend — build `/admin/team/[id]` profile page, enhance list view, remove scheduling from nav
7. Tests — resource pool unit tests, integration tests for module delegation
