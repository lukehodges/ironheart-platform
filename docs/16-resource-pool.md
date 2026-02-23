# Resource Pool

The resource pool is a shared infrastructure layer at `src/shared/resource-pool/` that centralizes staff skills, capacity, and work assignments across all modules. It replaces the old booking-specific patterns (e.g. `users.serviceIds`, `users.maxDailyBookings`) with a generic system that any module can consume.

## Why it exists

Previously, staff capacity and skill data was hardwired to the booking module. A staff member's `serviceIds` array and `maxDailyBookings` column on the `users` table only made sense for booking-based tenants. The resource pool abstracts this into three general-purpose tables so that any module -- bookings, projects, tickets, shifts -- can participate in the same capacity and skill system without owning its own staff logic.

**Key design decisions:**

- **Staff = Users.** No separate staff entity. The `isTeamMember` flag on `users` identifies staff.
- **Module-agnostic.** Capacity types are freeform strings (`bookings`, `projects`, `tickets`). No central registry table.
- **Weighted assignments.** Each assignment carries a `weight` (default 1.0). Capacity checks use `SUM(weight)` vs max.
- **Configurable enforcement.** Per-tenant `STRICT` (hard reject) or `FLEXIBLE` (warn + allow with override reason).

## Data Model

Three tables in `src/shared/db/schemas/resource-pool.schema.ts`:

### `resource_skills` -- What can staff do?

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenantId` | uuid FK | |
| `userId` | uuid FK | |
| `skillType` | enum | `SERVICE`, `CERTIFICATION`, `LANGUAGE`, `QUALIFICATION`, `EQUIPMENT`, `CUSTOM` |
| `skillId` | text | Service UUID for `SERVICE` type, freeform identifier for others (e.g. `forklift-class-b`) |
| `skillName` | text | Human-readable label |
| `proficiency` | enum | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT` (default `INTERMEDIATE`) |
| `verifiedAt` | timestamp | When skill was verified/certified |
| `verifiedBy` | uuid FK | Who verified it |
| `expiresAt` | timestamp | Null = never expires |
| `metadata` | jsonb | Flexible -- cert number, issuing body, etc. |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

Unique constraint: `(tenantId, userId, skillType, skillId)`

### `resource_capacities` -- How much can staff handle?

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenantId` | uuid FK | |
| `userId` | uuid FK | |
| `capacityType` | text | Module-defined: `bookings`, `projects`, `tickets`, etc. |
| `maxConcurrent` | integer | Max active at once (null = unlimited) |
| `maxDaily` | integer | Max per day (null = unlimited) |
| `maxWeekly` | integer | Max per week (null = unlimited) |
| `unit` | enum | `COUNT`, `HOURS`, `POINTS` |
| `effectiveFrom` | date | When this capacity rule starts |
| `effectiveUntil` | date | Null = no end date |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

Unique constraint: `(tenantId, userId, capacityType, effectiveFrom)` -- supports date-specific overrides.

### `resource_assignments` -- What is staff working on?

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `tenantId` | uuid FK | |
| `userId` | uuid FK | |
| `moduleSlug` | text | `bookings`, `projects`, `workflows`, etc. |
| `resourceType` | text | `booking`, `project`, `ticket`, `shift` |
| `resourceId` | uuid | FK to the actual record (not enforced -- cross-module) |
| `status` | enum | `ASSIGNED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `weight` | numeric(4,2) | Capacity cost, default 1.0 |
| `scheduledDate` | date | For daily capacity checks |
| `assignedAt` | timestamp | |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |
| `assignedBy` | uuid FK | |
| `overrideReason` | text | Populated when assignment exceeds capacity (flexible mode) |
| `metadata` | jsonb | Module-specific context |

Index: `(tenantId, userId, status, scheduledDate)` for capacity queries.

## Skills API

Import from `@/shared/resource-pool`:

```typescript
import { resourcePoolService } from '@/shared/resource-pool'
```

### `addSkill(tenantId, userId, input)`

Add a skill to a staff member. Duplicate `(tenantId, userId, skillType, skillId)` combinations will fail on the unique constraint.

```typescript
await resourcePoolService.addSkill(tenantId, userId, {
  skillType: 'SERVICE',
  skillId: serviceId,         // UUID of the service
  skillName: 'Deep Tissue Massage',
  proficiency: 'ADVANCED',    // optional, defaults to 'INTERMEDIATE'
  expiresAt: new Date('2027-01-01'),  // optional
  metadata: { certNumber: 'ABC-123' }, // optional
})
```

### `removeSkill(tenantId, userId, skillType, skillId)`

Remove a specific skill by type and ID.

```typescript
await resourcePoolService.removeSkill(tenantId, userId, 'CERTIFICATION', 'forklift-class-b')
```

### `listSkills(tenantId, userId, skillType?)`

List all skills for a staff member. Optionally filter by skill type.

```typescript
// All skills
const skills = await resourcePoolService.listSkills(tenantId, userId)

// Only certifications
const certs = await resourcePoolService.listSkills(tenantId, userId, 'CERTIFICATION')
```

### `findUsersWithSkill(tenantId, skillType, skillId, minProficiency?)`

Find all staff with a specific skill. Returns an array of user IDs. Optionally filter by minimum proficiency level.

```typescript
// All staff who can do this service
const userIds = await resourcePoolService.findUsersWithSkill(tenantId, 'SERVICE', serviceId)

// Only experts
const experts = await resourcePoolService.findUsersWithSkill(tenantId, 'EQUIPMENT', 'forklift-class-b', 'EXPERT')
```

Proficiency filtering is inclusive -- `'ADVANCED'` returns both `ADVANCED` and `EXPERT`.

### `checkSkillValid(tenantId, userId, skillType, skillId)`

Check if a staff member has a valid (non-expired) skill. Returns `boolean`.

```typescript
const isValid = await resourcePoolService.checkSkillValid(tenantId, userId, 'CERTIFICATION', 'first-aid')
```

Returns `false` if the skill does not exist or if `expiresAt` is in the past.

### Skill types

| Type | Use case |
|------|----------|
| `SERVICE` | Services the staff member can perform (links to service UUIDs) |
| `CERTIFICATION` | Certifications with optional expiry dates |
| `LANGUAGE` | Languages spoken |
| `QUALIFICATION` | Professional qualifications |
| `EQUIPMENT` | Equipment the staff member is licensed/trained to use |
| `CUSTOM` | Anything else |

## Capacity API

### `setCapacity(tenantId, userId, input)`

Create or set a capacity rule for a staff member. Date ranges allow temporary overrides (e.g. reduced capacity during training).

```typescript
await resourcePoolService.setCapacity(tenantId, userId, {
  capacityType: 'bookings',
  maxDaily: 8,
  maxConcurrent: 3,      // optional
  maxWeekly: 35,          // optional
  unit: 'COUNT',          // 'COUNT' | 'HOURS' | 'POINTS', defaults to 'COUNT'
  effectiveFrom: '2026-03-01',
  effectiveUntil: null,   // null = no end date
})
```

The unique constraint on `(tenantId, userId, capacityType, effectiveFrom)` means you create separate rows for different date ranges. The system picks the most recent applicable rule when checking capacity.

### `getCapacity(tenantId, userId, capacityType, date?)`

Get the applicable capacity rule for a staff member on a given date. Returns the most recent rule where `effectiveFrom <= date` and `effectiveUntil` is null or `>= date`. Returns `null` if no capacity rule exists (treated as unlimited).

```typescript
const capacity = await resourcePoolService.getCapacity(tenantId, userId, 'bookings', '2026-03-15')
// { id, capacityType: 'bookings', maxDaily: 8, maxConcurrent: 3, ... }
```

### `getCapacityUsage(tenantId, userId, capacityType, date)`

Get current capacity usage for a date. Returns a `CapacityUsage` object.

```typescript
const usage = await resourcePoolService.getCapacityUsage(tenantId, userId, 'bookings', '2026-03-15')
// {
//   capacityType: 'bookings',
//   used: 5,           // SUM(weight) of ASSIGNED + ACTIVE assignments
//   max: 8,            // from capacity rule (null if unlimited)
//   available: 3,      // max - used (null if unlimited)
//   isOver: false,      // true when used >= max
// }
```

### Capacity units

| Unit | Description |
|------|-------------|
| `COUNT` | Simple count of assignments (default) |
| `HOURS` | Time-based capacity |
| `POINTS` | Story points, complexity units, etc. |

The `unit` field is informational -- the capacity check always compares `SUM(weight)` against `maxDaily`. Your module defines what the weight means.

## Assignments API

### `requestAssignment(tenantId, input)` -- the core operation

Request a new assignment for a staff member. This is where capacity enforcement happens.

```typescript
const result = await resourcePoolService.requestAssignment(tenantId, {
  userId: staffId,
  moduleSlug: 'bookings',
  resourceType: 'booking',
  resourceId: bookingId,
  weight: 1,                    // capacity cost, default 1
  scheduledDate: '2026-03-15',  // for daily capacity checks
  assignedBy: actorId,          // optional
  overrideReason: undefined,    // required if FLEXIBLE mode + over capacity
  metadata: { serviceId },      // optional, module-specific
})
```

**Return type is a discriminated union:**

```typescript
type AssignmentResult =
  | { success: true; assignmentId: string }
  | {
      success: false
      reason: 'CAPACITY_EXCEEDED'
      capacityType: string
      current: number
      max: number
      enforcement: 'STRICT' | 'FLEXIBLE'
    }
```

### Capacity enforcement flow

1. If no `scheduledDate` is provided, skip capacity checks entirely -- assignment is created.
2. Look up the applicable capacity rule for `(userId, moduleSlug, scheduledDate)`.
3. If no capacity rule exists, or `maxDaily` is null, treat as unlimited -- assignment is created.
4. Calculate current usage: `SUM(weight) WHERE status IN ('ASSIGNED','ACTIVE') AND scheduledDate = date`.
5. If `currentUsage + weight <= maxDaily` -- assignment is created.
6. If capacity would be exceeded:
   - **STRICT mode**: Reject. Return `{ success: false, ... }` with details.
   - **FLEXIBLE mode without `overrideReason`**: Reject. Return `{ success: false, enforcement: 'FLEXIBLE' }`. The caller should prompt the user for a reason and retry.
   - **FLEXIBLE mode with `overrideReason`**: Allow. Assignment is created with the override reason logged in `resource_assignments.overrideReason`.

### `completeAssignment(tenantId, assignmentId)`

Mark an assignment as `COMPLETED`. Sets `completedAt` to now. Throws `NotFoundError` if not found.

```typescript
await resourcePoolService.completeAssignment(tenantId, assignmentId)
```

### `cancelAssignment(tenantId, assignmentId)`

Mark an assignment as `CANCELLED`. Sets `completedAt` to now. Throws `NotFoundError` if not found.

```typescript
await resourcePoolService.cancelAssignment(tenantId, assignmentId)
```

### `listAssignments(tenantId, userId, opts?)`

List assignments for a staff member with optional filters. Uses cursor-based pagination.

```typescript
const { rows, hasMore } = await resourcePoolService.listAssignments(tenantId, userId, {
  moduleSlug: 'bookings',     // optional filter
  status: 'ACTIVE',           // optional filter
  startDate: '2026-03-01',    // optional date range
  endDate: '2026-03-31',      // optional date range
  limit: 50,                  // default 50, max 100
  cursor: undefined,          // for pagination
})
```

## Workload API

### `getStaffWorkload(tenantId, userId, date)`

Get a summary of a staff member's workload across all capacity types for a given date. This merges capacity rules with actual assignment counts.

```typescript
const workload = await resourcePoolService.getStaffWorkload(tenantId, userId, '2026-03-15')
// {
//   userId: '...',
//   date: '2026-03-15',
//   capacities: [
//     { capacityType: 'bookings', used: 5, max: 8, available: 3, isOver: false },
//     { capacityType: 'projects', used: 2, max: null, available: null, isOver: false },
//   ]
// }
```

The `capacities` array includes:
- All capacity types that have a rule defined (even if no assignments exist for the date)
- All module slugs that have assignments (even if no capacity rule exists -- shown with `max: null`)

## Integration Guide

The resource pool is **not a module** -- it's shared infrastructure. Modules consume it by importing `resourcePoolService` and/or using its schemas for tRPC input validation. The team module is the canonical example of integration.

### How the team module integrates

The team router (`src/modules/team/team.router.ts`) exposes resource pool operations through its own tRPC endpoints:

```typescript
// src/modules/team/team.router.ts
import { resourcePoolService } from '@/shared/resource-pool'
import {
  addSkillSchema,
  removeSkillSchema,
  listSkillsSchema,
  setCapacitySchema as rpSetCapacitySchema,
  getCapacitySchema as rpGetCapacitySchema,
  getWorkloadSchema,
  listAssignmentsSchema,
} from '@/shared/resource-pool/resource-pool.schemas'

export const teamRouter = router({
  // ... staff CRUD and availability (owned by team) ...

  // Skills -- delegates to resource pool
  listSkills: moduleProcedure
    .input(listSkillsSchema)
    .query(({ ctx, input }) =>
      resourcePoolService.listSkills(ctx.tenantId, input.userId, input.skillType)
    ),

  addSkill: modulePermission('staff:write')
    .input(addSkillSchema)
    .mutation(({ ctx, input }) =>
      resourcePoolService.addSkill(ctx.tenantId, input.userId, {
        skillType: input.skillType,
        skillId: input.skillId,
        skillName: input.skillName,
        proficiency: input.proficiency,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        metadata: input.metadata,
      })
    ),

  // Capacity -- delegates to resource pool
  setCapacity: modulePermission('staff:write')
    .input(rpSetCapacitySchema)
    .mutation(({ ctx, input }) =>
      resourcePoolService.setCapacity(ctx.tenantId, input.userId, {
        capacityType: input.capacityType,
        maxConcurrent: input.maxConcurrent,
        maxDaily: input.maxDaily,
        maxWeekly: input.maxWeekly,
        unit: input.unit,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      })
    ),

  // Workload -- delegates to resource pool
  getWorkload: moduleProcedure
    .input(getWorkloadSchema)
    .query(({ ctx, input }) =>
      resourcePoolService.getStaffWorkload(ctx.tenantId, input.userId, input.date)
    ),
})
```

**Pattern summary:**
1. Import `resourcePoolService` and the relevant schemas from `@/shared/resource-pool`
2. Create tRPC endpoints that validate input with the resource pool schemas
3. Delegate to `resourcePoolService` methods, passing `ctx.tenantId` and validated input
4. Use appropriate procedure tier (`moduleProcedure` for reads, `modulePermission(...)` for writes)

### How a booking module would integrate

When creating a booking that assigns staff:

```typescript
// In booking.service.ts
import { resourcePoolService } from '@/shared/resource-pool'

async function assignStaffToBooking(tenantId: string, bookingId: string, staffId: string, date: string, actorId: string) {
  const result = await resourcePoolService.requestAssignment(tenantId, {
    userId: staffId,
    moduleSlug: 'bookings',
    resourceType: 'booking',
    resourceId: bookingId,
    weight: 1,
    scheduledDate: date,
    assignedBy: actorId,
  })

  if (!result.success) {
    // Handle capacity exceeded -- either reject or prompt for override
    if (result.enforcement === 'STRICT') {
      throw new BadRequestError(`Staff member is at capacity (${result.current}/${result.max})`)
    }
    // FLEXIBLE mode -- return info to frontend so it can prompt for override reason
    return { needsOverride: true, current: result.current, max: result.max }
  }

  return { assignmentId: result.assignmentId }
}
```

When a booking is completed or cancelled:

```typescript
await resourcePoolService.completeAssignment(tenantId, assignmentId)
// or
await resourcePoolService.cancelAssignment(tenantId, assignmentId)
```

### Protocol for new modules

When adding resource pool support to a new module:

1. **Choose a capacity type** -- a string like `'projects'`, `'tickets'`, etc. No registration needed.
2. **Set staff capacities** -- admins configure via the Team profile Capacity tab. Your module can provide defaults when enabled.
3. **Request assignments** -- call `resourcePoolService.requestAssignment()` with your `moduleSlug`, `resourceType`, `resourceId`, and `weight`.
4. **Handle enforcement** -- if result is `{ success: false }`, check `enforcement` to decide whether to reject or prompt for an override reason.
5. **Complete/cancel** -- call `completeAssignment()` or `cancelAssignment()` when work finishes.
6. **Optional skill matching** -- use `findUsersWithSkill()` or `checkSkillValid()` to match staff to work.

## Configuration

### `capacityEnforcement` org setting

The `organizationSettings.capacityEnforcement` column controls how the resource pool handles assignments that exceed capacity. This is a per-tenant setting.

| Value | Behavior |
|-------|----------|
| `STRICT` | Hard reject. `requestAssignment()` returns `{ success: false }` and the assignment is not created. |
| `FLEXIBLE` (default) | Soft warning. If `overrideReason` is provided, the assignment is created with the reason logged. If no reason is provided, it returns `{ success: false }` so the caller can prompt the user. |

The enforcement mode is looked up from `organizationSettings` on every `requestAssignment()` call where capacity is exceeded.

## File reference

| File | Purpose |
|------|---------|
| `src/shared/resource-pool/resource-pool.types.ts` | All TypeScript types and interfaces |
| `src/shared/resource-pool/resource-pool.schemas.ts` | Zod schemas for tRPC input validation |
| `src/shared/resource-pool/resource-pool.repository.ts` | Drizzle queries (DB layer) |
| `src/shared/resource-pool/resource-pool.service.ts` | Business logic (capacity enforcement, workload aggregation) |
| `src/shared/resource-pool/index.ts` | Barrel exports |
| `src/shared/db/schemas/resource-pool.schema.ts` | Drizzle table definitions and enums |

---

*Last updated: 2026-02-23*
