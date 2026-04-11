# Phase 1: Universal Data Model - Research

**Researched:** 2026-04-11
**Domain:** Drizzle ORM schema migration, PostgreSQL table renaming, TypeScript module refactor
**Confidence:** HIGH

## Summary

Phase 1 is a schema and module rename operation with zero new external dependencies. The existing stack (Drizzle ORM 0.45.1, drizzle-kit 0.31.9, postgres.js, Zod v4, tRPC 11, Vitest 4) handles everything needed. The work is mechanical but wide: roughly 36 non-test TypeScript files reference the `bookings` table object and 31 reference `staffId`, spread across 10+ modules.

The critical strategic insight is that the DB table renames (`bookings` → `jobs`, `booking_assignments` → `job_assignments`, `user_availability` → `resource_availability`) must be done in PostgreSQL via `ALTER TABLE ... RENAME TO` — Drizzle-kit generates this automatically when you rename the `pgTable` first argument while keeping the TypeScript export name the same OR when you rename both and run `drizzle-kit generate`. The Drizzle schema changes must land first, tests come last.

The migration is additive-first: new tables (`resources`, `addresses`, `customerContacts`) and new columns on existing tables are added with nullables before any rename or backfill. This keeps the migration reversible at each step and prevents FK constraint failures during backfill. The spec's 10-step migration sequence is the correct order to follow.

**Primary recommendation:** New schema files first, then parallel TypeScript module rename (booking → jobs, scheduling availability rename), then repository layer updates, then wire + test. Never do a column rename and a FK update in the same migration file.

## Standard Stack

### Core (no new installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Schema definition, query builder | Already in use; `pgTable`, `pgEnum`, FK definitions |
| drizzle-kit | 0.31.9 | Migration generation from schema diff | Already configured; `npx drizzle-kit generate` |
| postgres.js | 3.4.x | DB driver | Already configured in `src/shared/db` |
| zod | 4.3.x | Input validation schemas | Already in use; z.uuid(), z.enum() patterns |
| vitest | 4.x | Test runner | `pool: "forks"` config already set |

### No new packages required
All work is pure refactoring of existing code. No npm installs.

## Architecture Patterns

### Recommended File Structure After Phase 1

```
src/shared/db/schemas/
  booking.schema.ts        # renamed: exports jobs, jobAssignments, jobStatusHistory
  scheduling.schema.ts     # renamed: exports resourceAvailability (was userAvailability)
  customer.schema.ts       # extended: adds type, crmStage, companyName
  resources.schema.ts      # NEW: resources, addresses, customerContacts

src/modules/
  booking/                 # renamed → jobs/ (all internal files renamed)
    jobs.types.ts
    jobs.schemas.ts
    jobs.repository.ts
    jobs.service.ts
    jobs.router.ts
    jobs.events.ts
    index.ts
    __tests__/jobs.service.test.ts
  scheduling/              # same dir name; internal refs updated
  resources/               # NEW module
    resources.types.ts
    resources.schemas.ts
    resources.repository.ts
    resources.service.ts
    resources.router.ts
    index.ts
    __tests__/resources.test.ts
```

### Pattern 1: Drizzle Table Rename (SQL-level)

**What:** Change the first string arg of `pgTable()` to rename the physical DB table. Drizzle-kit detects this as a rename and generates `ALTER TABLE "bookings" RENAME TO "jobs"`.

**When to use:** When the physical table name changes but the TypeScript export name may also change.

**Example:**
```typescript
// BEFORE in booking.schema.ts:
export const bookings = pgTable("bookings", { ... })

// AFTER in booking.schema.ts (renamed to jobs.schema.ts conceptually):
// Option A: rename export AND table string — drizzle-kit generates RENAME + update references
export const jobs = pgTable("jobs", { ... })

// drizzle-kit generate will prompt: "Was 'bookings' renamed to 'jobs'? [y/N]" — answer y
```

**Critical:** Run `npx drizzle-kit generate --name=phase1-universal-model` to generate the migration. Review the generated SQL before applying.

### Pattern 2: Adding Nullable Columns Before Backfill

**What:** Always add new FK columns as nullable first, backfill, then add constraints.

**When to use:** Any time a backfill is needed (resources.resourceId on jobAssignments).

**Example:**
```typescript
// Step 1: Add nullable column
resourceId: uuid().references(() => resources.id).onDelete("set null"),

// Step 2: SQL backfill (in a separate migration or seed script)
UPDATE job_assignments ja
SET resource_id = r.id
FROM resources r
WHERE r.user_id = ja.staff_id;

// Step 3: Optionally make NOT NULL after backfill if 100% coverage guaranteed
// (keep nullable initially — spec says "keep staffId temporarily")
```

### Pattern 3: Schema Barrel Exports (Preserving Imports)

**What:** The barrel `src/shared/db/schema.ts` re-exports all schemas. Renaming exports breaks all callers. Prefer adding new exports alongside old ones during transition.

**When to use:** During any export rename that has 30+ callers.

**Example:**
```typescript
// In schema.ts barrel — add new alongside old during transition:
export * from "./schemas/jobs.schema"     // new name
// Keep old re-export path until all callers updated:
// export * from "./schemas/booking.schema"  // remove after all callers migrated
```

### Pattern 4: New Module Creation (resources)

Follow established module structure. The `resources` module is a new first-class module:

```typescript
// resources.types.ts — interfaces only, no Zod
export type ResourceType = 'PERSON' | 'VEHICLE' | 'ROOM' | 'EQUIPMENT' | 'VIRTUAL'
export interface Resource { id: string; tenantId: string; type: ResourceType; ... }

// resources.repository.ts — Drizzle queries only
export const resourceRepository = {
  async findById(tenantId: string, resourceId: string) {
    const result = await db.select().from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.tenantId, tenantId)))
      .limit(1);
    return result[0] ?? null;
  },
  // backfill helper:
  async createFromUser(user: { id: string; tenantId: string; firstName: string; lastName: string }) {
    const [resource] = await db.insert(resources).values({
      id: crypto.randomUUID(),
      tenantId: user.tenantId,
      type: 'PERSON',
      name: `${user.firstName} ${user.lastName}`,
      userId: user.id,
      isActive: true,
      travelEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return resource!;
  }
}
```

### Anti-Patterns to Avoid

- **Renaming TypeScript exports and DB table string in different PRs:** Causes drift between schema.ts and the actual DB. Always do both in the same migration wave.
- **Dropping `bookings` table before verifying all foreign keys migrated:** invoices, payments, reviews, reviewRequests, completedForms all FK to `bookings.id`. These must update their FK to point to `jobs.id` before the physical rename OR the FK constraint names must be updated in the migration.
- **Assuming `ALTER TABLE RENAME` is zero-downtime:** It requires an AccessExclusiveLock. For production Postgres, wrap in short transactions. In dev/test this is fine.
- **Updating Inngest event names before updating all consumers:** booking/* events are consumed by scheduling.events.ts, notification.events.ts, calendar-sync.repository.ts. Update inngest.ts event catalog and all consumers atomically.
- **Creating resource rows without a transaction:** The backfill (team members → resources) must be idempotent. Use `ON CONFLICT DO NOTHING` or check existence first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration generation | Manual ALTER TABLE scripts | `npx drizzle-kit generate` | Tracks schema diff, generates correct RENAME vs ADD |
| UUID generation | Custom ID function | `crypto.randomUUID()` (already used) | Already consistent across codebase |
| Backfill idempotency | Complex state tracking | `ON CONFLICT DO NOTHING` in INSERT | Postgres handles duplicates atomically |
| Enum definition | Raw string columns | `pgEnum()` (Drizzle) | Type-safe, generates correct CREATE TYPE |
| Decimal columns | `numeric` as `text` | `numeric({ precision, scale })` | Already the pattern; `decimal` is alias |

**Key insight:** drizzle-kit's rename detection (interactive prompt during `generate`) eliminates the need to write raw DDL for table renames. The risk is accidentally generating a DROP + CREATE instead of RENAME — always review generated SQL.

## Common Pitfalls

### Pitfall 1: drizzle-kit generates DROP+CREATE instead of RENAME

**What goes wrong:** If you rename both the TypeScript export AND the pgTable string argument in the same `generate` run without answering the interactive rename prompt correctly, drizzle-kit may generate `DROP TABLE bookings; CREATE TABLE jobs;` — which destroys all data.

**Why it happens:** drizzle-kit uses heuristics to detect renames. If it can't match the old and new table, it defaults to drop+create.

**How to avoid:**
1. Run `npx drizzle-kit generate --name=phase1`
2. Read the generated SQL carefully before applying
3. Look for `RENAME TO` — if you see `DROP TABLE` for `bookings`, abort and investigate
4. Apply with `npx drizzle-kit migrate` only after SQL review

**Warning signs:** Generated SQL contains `DROP TABLE "bookings"` without a preceding `ALTER TABLE "bookings" RENAME TO`.

### Pitfall 2: Foreign Key Constraint Names Must Be Updated

**What goes wrong:** After renaming `bookings` to `jobs`, FK constraints in other tables still reference the OLD constraint name. These constraints remain valid (Postgres renames them implicitly), but Drizzle schema FK declarations will no longer match the actual DB constraint name — causing drift.

**Why it happens:** Postgres renames FK constraints automatically when you rename the referenced table, but the constraint names in the Drizzle schema still say `invoices_bookingId_fkey`.

**How to avoid:** After renaming `bookings` → `jobs`, update FK constraint names in the schema files for invoices, payments, reviews, reviewRequests, completedForms, completedForms that reference the old name. Generate a migration to rename the constraints too, or accept the drift and track it.

**Warning signs:** `drizzle-kit push` or `generate` flags "constraint mismatch" warnings.

### Pitfall 3: 36 Files Reference `bookings` Object — Missing One Causes tsc Failure

**What goes wrong:** After renaming the export from `bookings` to `jobs` in the schema, any file that still imports `{ bookings }` from `@/shared/db/schema` will fail tsc.

**Why it happens:** Wide surface area. Files referencing `bookings` object include: booking.repository.ts, booking.service.ts, booking.events.ts, scheduling.service.ts, scheduling.repository.ts, scheduling.events.ts, notification/notification.repository.ts, calendar-sync/calendar-sync.repository.ts, customer/customer.repository.ts, search/search.repository.ts, analytics/analytics.repository.ts, analytics/analytics.service.ts, tenant/tenant.repository.ts, integrations/integrations.repository.ts, team/team.repository.ts, shared/db/schemas/shared.schema.ts, shared/db/schemas/notifications.schema.ts (FK import), ai/* files.

**How to avoid:** After schema rename, run `tsc --noEmit` immediately. Fix ALL errors before moving to next step. Do NOT use `// @ts-ignore` as a workaround.

**Warning signs:** `tsc` output shows `Module has no exported member 'bookings'`.

### Pitfall 4: Inngest Event Name Migration is Not Atomic

**What goes wrong:** Renaming `booking/*` events to `job/*` in inngest.ts while some Inngest functions still listen to the old event names causes those functions to stop firing.

**Why it happens:** Inngest functions bind to specific event names. If you rename the event type in the catalog but leave consumers using the old name, the functions become unreachable without error.

**How to avoid:** The spec says to update event names as part of the module rename. Update inngest.ts event catalog AND all consumers (scheduling.events.ts, booking.events.ts → jobs.events.ts, notification.events.ts, review.service.ts, calendar-sync) in the same code wave.

**Warning signs:** Tests that mock `inngest.send` and assert event names will catch this if written correctly.

### Pitfall 5: Backfill Must Handle Missing staffProfiles

**What goes wrong:** The backfill creates a `resources` row for every user where `isTeamMember = true`. But in the current schema, `isTeamMember` is a computed field derived from the presence of a `staff_profiles` row (not a column on `users`). The query must JOIN `users` → `staff_profiles` to find team members.

**Why it happens:** The `users` table has no `isTeamMember` column. This is confirmed in auth.schema.ts. `isTeamMember` is computed at runtime in `team.repository.ts` (`mapDbUser`) by checking `profile !== null`.

**How to avoid:** Backfill query must be:
```sql
INSERT INTO resources (id, tenant_id, type, name, user_id, is_active, travel_enabled, created_at, updated_at)
SELECT gen_random_uuid(), u.tenant_id, 'PERSON',
       COALESCE(u.display_name, u.first_name || ' ' || u.last_name),
       u.id, true, false, NOW(), NOW()
FROM users u
INNER JOIN staff_profiles sp ON sp.user_id = u.id
ON CONFLICT (user_id) DO NOTHING;  -- only if unique constraint added
```

**Warning signs:** Resources table exists but has 0 rows after backfill.

### Pitfall 6: Drizzle Relations File Must Be Updated

**What goes wrong:** `src/shared/db/relations.ts` declares Drizzle relational query relations. After renaming tables, these declarations break.

**Why it happens:** Drizzle's relational API (`db.query.bookings.findMany`) uses the export name. After rename to `jobs`, any relational API call using `bookings` breaks.

**How to avoid:** Update `relations.ts` as part of the schema rename step. Check which modules use `db.query.*` vs `db.select().from(*)` — the latter is used exclusively in this codebase, so relations.ts impact may be minimal, but it must still compile.

**Warning signs:** `tsc` errors in relations.ts.

## Code Examples

Verified patterns from the existing codebase:

### Adding a New Schema File (resources.schema.ts)
```typescript
// Source: existing pattern in src/shared/db/schemas/resource-pool.schema.ts
import {
  pgTable, pgEnum, uuid, text, integer, boolean, decimal,
  jsonb, timestamp, index, foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"

export const resourceType = pgEnum("ResourceType", [
  'PERSON', 'VEHICLE', 'ROOM', 'EQUIPMENT', 'VIRTUAL'
])

export const resources = pgTable("resources", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  type: resourceType().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  capacity: integer().default(1).notNull(),
  homeAddressId: uuid(),
  travelEnabled: boolean().default(false).notNull(),
  skillTags: text().array(),
  userId: uuid(),
  isActive: boolean().default(true).notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("resources_tenantId_type_idx").on(table.tenantId, table.type),
  index("resources_tenantId_isActive_idx").on(table.tenantId, table.isActive),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resources_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resources_userId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])
```

### Renaming Table Export + DB Name (booking → jobs)
```typescript
// Source: existing pattern; booking.schema.ts becomes jobs content

// BEFORE:
export const bookings = pgTable("bookings", { ... })
export const bookingAssignments = pgTable("booking_assignments", { ... })
export const bookingStatusHistory = pgTable("booking_status_history", { ... })

// AFTER (same file, updated):
export const jobs = pgTable("jobs", {
  // all existing columns plus new ones:
  type: jobType().default('APPOINTMENT').notNull(),
  pricingStrategy: pricingStrategy().default('FIXED').notNull(),
  quotedAmount: numeric({ precision: 10, scale: 2 }),
  primaryAddressId: uuid(),
  // ... all existing columns ...
})
export const jobAssignments = pgTable("job_assignments", {
  // existing + new:
  resourceId: uuid(),  // nullable initially
  staffId: uuid(),     // keep temporarily
  role: assignmentRole().default('LEAD'),
})
export const jobStatusHistory = pgTable("job_status_history", { ... })
```

### Barrel Export Update (schema.ts)
```typescript
// Source: src/shared/db/schema.ts — add new, update renamed
export * from "./schemas/resources.schema"   // NEW
export * from "./schemas/jobs.schema"        // was booking.schema — file renamed
// Remove: export * from "./schemas/booking.schema"
```

### Drizzle Pagination Pattern (already established)
```typescript
// Source: booking.repository.ts (established pattern)
const rows = await db.select().from(jobs)
  .where(and(...conditions))
  .orderBy(desc(jobs.createdAt))
  .limit(limit + 1);
const hasMore = rows.length > limit;
return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
```

### Transaction Backfill Pattern
```typescript
// Source: customer.service.ts (established pattern)
await db.transaction(async (tx) => {
  const staffMembers = await tx
    .select({ id: users.id, tenantId: users.tenantId, firstName: users.firstName, lastName: users.lastName, displayName: users.displayName })
    .from(users)
    .innerJoin(staffProfiles, eq(staffProfiles.userId, users.id));

  if (staffMembers.length === 0) return;

  await tx.insert(resources).values(
    staffMembers.map((u) => ({
      id: crypto.randomUUID(),
      tenantId: u.tenantId,
      type: 'PERSON' as const,
      name: u.displayName ?? `${u.firstName} ${u.lastName}`,
      slug: u.id,  // use userId as slug initially
      userId: u.id,
      isActive: true,
      travelEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  ).onConflictDoNothing();
});
```

## Impact Assessment: What Touches What

This is a broad refactor. The table below maps each affected area:

| Area | Scope | Notes |
|------|-------|-------|
| `booking.schema.ts` → `jobs.schema.ts` | 1 file rewritten | New enums, new columns, rename 3 exports |
| `scheduling.schema.ts` | 1 file updated | `userAvailability` → `resourceAvailability` export |
| `customer.schema.ts` | 1 file updated | Add 3 new columns |
| `resources.schema.ts` | 1 new file | resources, addresses, customerContacts |
| `shared/db/schema.ts` | 1 file updated | Barrel export update |
| `shared/db/relations.ts` | 1 file updated | All booking refs → jobs |
| `shared/inngest.ts` | 1 file updated | booking/* → job/* event names |
| `modules/booking/` → `modules/jobs/` | ~12 files renamed+updated | All internal refs updated |
| `modules/scheduling/` | ~8 files updated | userAvailability → resourceAvailability refs |
| `modules/customer/` | 1 file updated | customer.repository.ts |
| `modules/notification/` | 2 files updated | repository + variable-builder |
| `modules/review/` | 3 files updated | service, repository, schemas |
| `modules/calendar-sync/` | 1 file updated | repository |
| `modules/integrations/` | 1 file updated | repository |
| `modules/search/` | 1 file updated | repository |
| `modules/analytics/` | 3 files updated | service, repository, types |
| `modules/team/` | 1 file updated | repository (bookings ref) |
| `modules/tenant/` | 1 file updated | repository (bookings ref) |
| `modules/workflow/` | 1 file updated | types (booking event refs) |
| `modules/ai/` | 3 files updated | tools + features + verticals |
| `modules/resources/` | ~6 new files | New module |
| `server/root.ts` | 1 file updated | booking → jobs router, add resources |
| `app/api/inngest/route.ts` | 1 file updated | bookingFunctions → jobFunctions |
| `shared/module-system/` | 2 files updated | register-all.ts, startup.ts |
| `shared/db/schemas/shared.schema.ts` | 1 file updated | FK import from jobs.schema |
| `shared/db/schemas/notifications.schema.ts` | 1 file updated | FK import from jobs.schema |
| Tests | All booking tests updated | Mock names changed |

**Total: ~50 files to update + 7 new files.**

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `bookings` table + staffId | `jobs` table + resourceId | More general; supports non-person resources |
| `user_availability` | `resource_availability` | Same data, renamed for consistency |
| `booking_assignments` | `job_assignments` | Same data + resourceId + role |
| Staff-only address in staffProfiles | Normalized `addresses` table | Reusable across jobs, resources, customers |
| Flat customer (individual only) | Customer + type + crmStage + customerContacts | Supports companies, multi-contact |

## Open Questions

1. **Should `booking.schema.ts` be physically renamed to `jobs.schema.ts` or kept as `booking.schema.ts` with updated exports?**
   - What we know: The barrel `schema.ts` imports by filename. Renaming the file breaks nothing if the barrel is updated atomically.
   - What's unclear: Whether a filename rename causes issues with git history or IDE references outside the codebase.
   - Recommendation: Rename the file to `jobs.schema.ts` for clarity, update the barrel in the same commit.

2. **Should `booking/*` Inngest events be renamed to `job/*` in Phase 1?**
   - What we know: The spec says "Update Inngest events: booking/* → job/*". 8 files reference booking/* event strings.
   - What's unclear: The spec acknowledges this is disruptive; it's a judgment call whether to do it in Phase 1 or Phase 2.
   - Recommendation: Rename in Phase 1 (per spec) since all tests are unit tests with mocked Inngest — no live event infrastructure at risk. Ensures the data model is internally consistent.

3. **Does `user_availability` need a new unique constraint after rename to `resource_availability`?**
   - What we know: The current `user_availability` table has FK to `users.id` via `userId`. The spec says rename only. No FK change required unless resourceId replaces userId.
   - What's unclear: The spec says rename the table but does not specify whether `userId` on this table becomes `resourceId`.
   - Recommendation: Keep `userId` FK on `resourceAvailability` for now. The scheduling module can use `resources.userId` to look up availability. Full migration to `resourceId` is Phase 2 scope per spec.

4. **Are there any Playwright or e2e tests that reference booking route names?**
   - What we know: `@playwright/test` is in devDependencies. The tRPC router will change `booking:` → `job:` keys.
   - What's unclear: Whether any e2e tests exist that call the tRPC booking router.
   - Recommendation: Check `tests/` or `e2e/` directories before starting Plan 01-03. If e2e tests exist, they need updating alongside the router rename.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/shared/db/schemas/*.ts` — all schema files read
- Direct codebase inspection: `src/modules/booking/booking.repository.ts` — complete file read
- Direct codebase inspection: `src/shared/inngest.ts` — event catalog inspected
- Direct codebase inspection: `src/server/root.ts` — router wiring inspected
- Direct codebase inspection: `package.json` — all versions confirmed
- Direct codebase inspection: `drizzle.config.ts` — migration config confirmed

### Secondary (MEDIUM confidence)
- Drizzle ORM 0.45.x behavior for table renames: based on established usage in existing migrations (0000_moaning_spot.sql exists, indicating drizzle-kit has been used successfully)
- Drizzle-kit interactive rename prompt behavior: based on drizzle-kit 0.31.x documentation patterns — verify with `--dry-run` flag before applying

### Tertiary (LOW confidence — verify before relying)
- Postgres `ALTER TABLE RENAME` lock behavior in production: recommend validating against actual DB version before production deploy (dev/test is fine)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions read directly from package.json
- Architecture: HIGH — all file paths and import structures read from codebase
- Impact scope (50 files): HIGH — grepped all module imports
- Drizzle rename detection behavior: MEDIUM — confirmed drizzle-kit is set up and migrations exist, behavior inferred from docs patterns
- Pitfalls: HIGH — derived from direct codebase analysis, not assumptions

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (drizzle-kit is fast-moving; verify rename behavior if drizzle-kit version bumps)
