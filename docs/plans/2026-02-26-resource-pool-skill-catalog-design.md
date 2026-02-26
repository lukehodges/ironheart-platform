# Resource Pool — Skill Catalog & Capacity Type Registry

**Date:** 2026-02-26
**Status:** Approved
**Scope:** Skill catalog, capacity type registry, matching engine, module integration hooks

## Problem

The resource pool currently stores skills as freeform strings in `resource_skills.skillId`. This works but has no structure — no categorization, no expiry enforcement, no verification tracking, no tenant-level catalog for admins to manage. Capacity types are also implicit — modules assume bookings-style counting without a formal registry. The matching engine ("find me available staff with these skills") doesn't exist yet, forcing each module to roll its own staff lookup.

## Section 1: Data Model

### `skill_definitions` — Tenant-Level Skill Catalog

A master list of available skills per tenant. Admins pick from this catalog when assigning skills to staff.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → tenants | |
| slug | text | e.g. "pipe-fitting", "first-aid-cert" |
| name | text | "Pipe Fitting", "First Aid Certificate" |
| skillType | enum | SERVICE, CERTIFICATION, LANGUAGE, QUALIFICATION, EQUIPMENT, CUSTOM |
| category | text, nullable | Grouping label, e.g. "Trade Skills", "Safety" |
| description | text, nullable | |
| requiresVerification | boolean | default false — must someone verify this skill? |
| requiresExpiry | boolean | default false — is expiry date mandatory? |
| isActive | boolean | default true — false = deprecated, can't assign new |
| metadata | jsonb, nullable | Extensible |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**Unique constraint:** `(tenantId, slug)`

### Connection to `resource_skills`

`resource_skills` gains a new nullable column:

| Column | Type | Notes |
|--------|------|-------|
| skillDefinitionId | uuid FK → skill_definitions, nullable | Links to catalog entry |

- Cataloged skills: `skillDefinitionId` points to the definition
- Legacy freeform skills: `skillDefinitionId = null`, `skillId` text still works
- New assignments require `skillDefinitionId`

### `capacity_type_definitions` — Module-Registered Capacity Types

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenantId | uuid FK → tenants | |
| slug | text | e.g. "bookings", "projects" |
| name | text | "Bookings", "Projects" |
| description | text, nullable | |
| unit | enum | COUNT, HOURS, POINTS |
| defaultMaxDaily | integer, nullable | |
| defaultMaxWeekly | integer, nullable | |
| defaultMaxConcurrent | integer, nullable | |
| registeredByModule | text, nullable | "bookings", "projects", etc. |
| isActive | boolean | default true |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**Unique constraint:** `(tenantId, slug)`

Modules auto-register their capacity type on enable. On disable, the type is soft-deactivated (not deleted — historical assignments still reference it).

## Section 2: Resource Matching Engine

The "find me the right person" query that any module can call.

### Input

```ts
findAvailableStaff(tenantId, {
  requiredSkills?: { skillDefinitionId: string, minProficiency?: ProficiencyLevel }[]
  capacityType: string          // slug from capacity_type_definitions
  date: string                  // "YYYY-MM-DD"
  minAvailableCapacity?: number // default 1
  sortBy?: 'LEAST_LOADED' | 'MOST_SKILLED' | 'NEAREST' | 'ROUND_ROBIN'
  location?: { lat: number, lng: number }  // for NEAREST sort
})
```

### Pipeline (4 stages, each narrows the candidate set)

1. **Skill filter** — find users who have ALL required skills at or above min proficiency, with valid (non-expired) entries. Joins `resource_skills` to `skill_definitions`.
2. **Availability filter** — check `userAvailability` for the target date. Exclude BLOCKED users. Include SPECIFIC or RECURRING availability. Uses existing team repository logic.
3. **Capacity filter** — for the given capacityType + date, calculate current usage (`SUM(weight)` of active assignments) vs capacity limit. Include users with `available >= minAvailableCapacity`. Uses existing `getActiveWeightForDate`.
4. **Rank** — score remaining candidates:
   - `LEAST_LOADED`: lowest usage ratio (used / max)
   - `MOST_SKILLED`: highest proficiency sum across required skills
   - `NEAREST`: shortest distance from location to user coordinates
   - `ROUND_ROBIN`: longest time since `users.lastAssignedAt`

### Output

```ts
{
  candidates: RankedStaffCandidate[]  // userId, name, score, reasons[], capacityUsage
  totalMatched: number
}
```

### Location

`src/shared/resource-pool/resource-pool.service.ts` — top-level orchestration. Repository gets a new `findCandidates` method for the heavy SQL join. Service handles ranking logic.

## Section 3: Module Integration — Registration & Hooks

### Capacity Type Auto-Registration via Manifest

```ts
// in booking.manifest.ts
export const bookingManifest = {
  slug: 'bookings',
  // ...existing fields...
  resourcePool: {
    capacityType: {
      slug: 'bookings',
      name: 'Bookings',
      unit: 'COUNT' as const,
      defaultMaxDaily: 8,
      defaultMaxWeekly: null,
      defaultMaxConcurrent: null,
    }
  }
}
```

On module enable → `resource-pool.service.upsertCapacityType(tenantId, manifest.resourcePool.capacityType)` inserts or reactivates the row.
On module disable → sets `isActive = false`.

### Skill Suggestion Hook

Modules declare suggested skills in their manifest:

```ts
resourcePool: {
  suggestedSkills: [
    { slug: 'haircut', name: 'Haircut', skillType: 'SERVICE' },
    { slug: 'color-treatment', name: 'Color Treatment', skillType: 'SERVICE' },
  ]
}
```

Seeded into `skill_definitions` as suggestions when the module is first enabled. Admins can rename, recategorize, or delete them.

### Service Methods

`resource-pool.service.ts` exposes:
- `registerModuleCapacity(tenantId, moduleSlug, capacityConfig)` — called during module enable
- `deactivateModuleCapacity(tenantId, moduleSlug)` — called during module disable
- `seedSuggestedSkills(tenantId, skills[])` — idempotent upsert by (tenantId, slug)

The module system's `enableModule`/`disableModule` flow calls these automatically. Modules never directly write to `capacity_type_definitions` or `skill_definitions`.

## Section 4: Migration Strategy — Freeform to Catalog

### Schema Change

Add nullable `skillDefinitionId` (uuid FK → skill_definitions) to `resource_skills`. All existing rows start with `null`.

### Three-Phase Migration

**Phase A — Add column, no behavior change.**
Add the column. Everything works as before.

**Phase B — Backfill cataloged skills.**
For each tenant, scan distinct `skillId` values in `resource_skills`. Auto-create `skill_definitions` entries (slug = kebab-case of skillId, name = skillId, skillType = CUSTOM). Update `resource_skills.skillDefinitionId` to point to the new definitions. Admin UI shows a "review uncategorized skills" prompt.

**Phase C — New assignments use catalog.**
New skill assignments require `skillDefinitionId`. `skillId` text column kept for backward compat but derived from the definition's slug. Matching engine joins on `skillDefinitionId` with fallback to `skillId` text match for unlinked legacy rows.

No big bang — tenants with uncataloged skills keep working. The catalog improves things incrementally.

## Section 5: API / Router Design

### Skill Definitions CRUD

```
skillDefinitions.list     — tenantProcedure      { search?, skillType?, category?, isActive? }
skillDefinitions.getById  — tenantProcedure      { id }
skillDefinitions.create   — permissionProcedure('resource-pool:manage')  { name, slug?, skillType, category?, ... }
skillDefinitions.update   — permissionProcedure('resource-pool:manage')  { id, partial fields }
skillDefinitions.delete   — permissionProcedure('resource-pool:manage')  soft-delete (isActive = false)
```

### Capacity Types

```
capacityTypes.list        — tenantProcedure      { isActive? }
capacityTypes.getById     — tenantProcedure      { id }
capacityTypes.update      — permissionProcedure('resource-pool:manage')  { id, defaultMaxDaily?, defaultMaxWeekly?, defaultMaxConcurrent? }
```

No create or delete — modules register capacity types via manifests. Admins tweak defaults only.

### Matching Engine

```
matching.findAvailable    — tenantProcedure      { requiredSkills?, capacityType, date, minAvailableCapacity?, sortBy?, location? }
```

### Enhanced Skill Assignment

```
skills.assign             — permissionProcedure('resource-pool:manage')  { userId, skillDefinitionId, proficiencyLevel?, expiresAt?, verifiedBy? }
skills.unassign           — permissionProcedure('resource-pool:manage')  { userId, skillDefinitionId }
skills.listForUser        — tenantProcedure      { userId }
```

### Router Structure

Sub-routers nested under the existing resource pool router:

```ts
resourcePoolRouter = t.router({
  // ...existing procedures (availability, capacity)...
  skillDefinitions: skillDefinitionsRouter,
  capacityTypes: capacityTypesRouter,
  matching: matchingRouter,
  skills: skillsRouter,
})
```

## Section 6: Testing Strategy

### Unit Tests (~25-30 new cases)

**Skill Definitions:** CRUD operations, unique constraint enforcement, filtering by skillType/category/isActive.

**Capacity Types:** Module registration upsert, deactivate on disable, default value updates, idempotent registration.

**Matching Engine (bulk of tests):**
- Skill filter — must have ALL required skills at minimum proficiency
- Expired skills excluded
- Availability filter — BLOCKED excluded, SPECIFIC/RECURRING included
- Capacity filter — at-max users excluded
- Combined filters narrow correctly
- Each ranking strategy returns correct order (LEAST_LOADED, MOST_SKILLED, ROUND_ROBIN, NEAREST)
- Empty result returns `{ candidates: [], totalMatched: 0 }`
- No required skills skips skill filter

**Migration Helpers:** Backfill creates definitions, links rows, unlinked legacy rows still match.

**Module Integration:** `seedSuggestedSkills` idempotent, manifest config flows through correctly.

### Not Tested

- No E2E tests — internal infrastructure, not user-facing flow
- No real geocoding for NEAREST — mock coordinates
