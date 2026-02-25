# Staff Module Design — Production-Grade Staff Management

**Date:** 2026-02-25
**Status:** Approved
**Scope:** Staff module enhancements + architectural decisions for related modules

## Context

The current team/staff module is a solid MVP covering basic CRUD, availability, skills, and capacity. It needs to become a production-grade staff management system that works for any business type — from sole operators to 500+ staff operations, across field services, appointment-based, project-based, and general business use cases.

Service clients with custom booking and routing software are the target migration audience.

## Architectural Decisions

### Module Boundaries

The staff module owns **profile identity and organizational structure**. Time-based operations, integrations, and cross-cutting workflows live in separate modules.

**Staff module owns:**
- Staff profiles (employment details, emergency contacts, address)
- Pay rate versioning
- Departments / organizational hierarchy
- Internal notes
- Onboarding / offboarding checklists
- Custom fields
- Staff lifecycle events (create, update, deactivate)

**Separate modules (future):**

| Module | Responsibility | Connection to staff |
|---|---|---|
| `timesheet` | Clock in/out, timesheets, breaks, approval workflows | Reads staff profiles, writes time entries against userId |
| `leave` | Leave requests, approvals, balances, accrual policies | Writes BLOCKED availability entries into staff availability |
| `calendar-sync` | Google Calendar / Outlook / iCal integration | Reads availability + bookings, pushes/pulls events via OAuth |
| `scheduling` (existing, extended) | Unified staff calendar view, slot management, shift patterns | Aggregates from team, booking, leave, calendar-sync for display |
| `travel` / `field-ops` | Route optimization, mileage, territory management | Reads homeLatitude/homeLongitude from staff_profiles |
| `documents` (shared) | File storage for contracts, certs, ID copies | Linked to staff profiles via reference, also serves customers/projects |
| `payroll` | Pay calculation, integration with accounting | Reads pay rates from staff + timesheet data + leave balances |

### Unified Staff Calendar

Lives in the **scheduling module** — not the staff module. The scheduling module already owns time-slot logic and becomes the "time orchestrator" that aggregates all time-based data.

The staff profile renders a Calendar tab that calls `scheduling.getStaffCalendar`, which queries:
- `team.getAvailability()` → availability blocks
- `booking.listByStaff()` → appointments
- `leave.getByStaff()` → leave blocks (future)
- `calendarSync.getEvents()` → external events (future)

The existing `/admin/calendar` page gains per-staff drill-down capability.

Staff profile tabs after this work:
```
Overview | Calendar | Skills | Capacity | Availability | Assignments | Notes | Activity
```

---

## New Database Tables

### 1. `staff_departments`

Organizational grouping with optional nesting (max 3 levels recommended by UI).

```
staff_departments
  id            uuid PK default gen_random_uuid()
  tenantId      uuid FK → organizations NOT NULL
  name          text NOT NULL
  slug          text NOT NULL
  description   text
  parentId      uuid FK → staff_departments (self-referencing, nullable)
  managerId     uuid FK → users (nullable)
  color         text (hex color for UI grouping, nullable)
  sortOrder     integer NOT NULL default 0
  isActive      boolean NOT NULL default true
  createdAt     timestamptz NOT NULL default now()
  updatedAt     timestamptz NOT NULL default now()

  UNIQUE (tenantId, slug)
```

Design decisions:
- Self-referencing `parentId` enables nested hierarchy (Engineering → Frontend → Design)
- No separate "teams" vs "departments" — one nestable concept
- Tenant configures the label via `organizationSettings.departmentLabel` (e.g., "Teams", "Crews", "Regions")
- `managerId` is the department head, distinct from individual `reportsTo` chains
- `isActive` soft-disable instead of delete (preserves historical grouping)

### 2. `staff_department_members`

Many-to-many: staff can belong to multiple departments with one primary.

```
staff_department_members
  id            uuid PK default gen_random_uuid()
  tenantId      uuid FK → organizations NOT NULL
  userId        uuid FK → users NOT NULL ON DELETE CASCADE
  departmentId  uuid FK → staff_departments NOT NULL ON DELETE CASCADE
  isPrimary     boolean NOT NULL default false
  joinedAt      timestamptz NOT NULL default now()

  UNIQUE (tenantId, userId, departmentId)
```

Constraint: application-layer enforcement of max one `isPrimary = true` per `(tenantId, userId)`.

### 3. `staff_pay_rates`

Version history for pay rates — replaces single-field hourlyRate/dayRate as source of truth.

```
staff_pay_rates
  id              uuid PK default gen_random_uuid()
  tenantId        uuid FK → organizations NOT NULL
  userId          uuid FK → users NOT NULL ON DELETE CASCADE
  rateType        enum: HOURLY | DAILY | SALARY | COMMISSION | PIECE_RATE
  amount          numeric(10,2) NOT NULL
  currency        text NOT NULL default 'GBP'
  effectiveFrom   date NOT NULL
  effectiveUntil  date (nullable — null = current rate)
  reason          text (nullable — e.g., "annual review", "promotion")
  createdBy       uuid FK → users
  createdAt       timestamptz NOT NULL default now()
```

The existing `staff_profiles.hourlyRate` and `staff_profiles.dayRate` columns remain as quick-access cache, updated by the service layer when a new rate row is inserted with `effectiveUntil = null`.

### 4. `staff_notes`

Internal notes about a staff member.

```
staff_notes
  id          uuid PK default gen_random_uuid()
  tenantId    uuid FK → organizations NOT NULL
  userId      uuid FK → users NOT NULL ON DELETE CASCADE
  authorId    uuid FK → users NOT NULL
  content     text NOT NULL
  isPinned    boolean NOT NULL default false
  createdAt   timestamptz NOT NULL default now()
  updatedAt   timestamptz NOT NULL default now()
```

No threading — flat list, pinned notes float to top. Permission: `staff:notes:read` / `staff:notes:write`.

### 5. `staff_onboarding_templates`

Tenant-configurable checklists for new staff setup.

```
staff_onboarding_templates
  id            uuid PK default gen_random_uuid()
  tenantId      uuid FK → organizations NOT NULL
  name          text NOT NULL
  employeeType  enum (nullable — null = applies to all types)
  items         jsonb NOT NULL
  isDefault     boolean NOT NULL default false
  createdAt     timestamptz NOT NULL default now()
  updatedAt     timestamptz NOT NULL default now()
```

`items` JSONB structure:
```json
[
  {
    "key": "setup-login",
    "label": "Set up login credentials",
    "description": "Complete WorkOS account setup",
    "isRequired": true,
    "order": 1
  }
]
```

System default template (used when tenant has no custom template):
1. Set up login credentials
2. Complete profile information
3. Upload identification document
4. Confirm availability
5. Read company handbook

### 6. `staff_onboarding_progress`

Per-staff-member instance of an onboarding template.

```
staff_onboarding_progress
  id              uuid PK default gen_random_uuid()
  tenantId        uuid FK → organizations NOT NULL
  userId          uuid FK → users NOT NULL ON DELETE CASCADE
  templateId      uuid FK → staff_onboarding_templates NOT NULL
  status          enum: NOT_STARTED | IN_PROGRESS | COMPLETED
  items           jsonb NOT NULL
  startedAt       timestamptz
  completedAt     timestamptz
  createdAt       timestamptz NOT NULL default now()
  updatedAt       timestamptz NOT NULL default now()
```

`items` JSONB structure (copy of template items + completion tracking):
```json
[
  {
    "key": "setup-login",
    "label": "Set up login credentials",
    "description": "Complete WorkOS account setup",
    "isRequired": true,
    "order": 1,
    "completedAt": "2026-02-25T10:00:00Z",
    "completedBy": "uuid-of-admin-or-self"
  }
]
```

Flow:
1. `team.create` stamps a copy of the matching template (by employeeType or default)
2. Items are marked complete by admin or staff member (self-service)
3. When all required items are done → status = COMPLETED, Inngest event `team/onboarding.completed` fires
4. Profile Overview tab shows progress bar until complete

### 7. `staff_offboarding_progress`

Same structure as onboarding but for exit process. Triggered by `team.deactivate`.

```
staff_offboarding_progress
  id              uuid PK default gen_random_uuid()
  tenantId        uuid FK → organizations NOT NULL
  userId          uuid FK → users NOT NULL ON DELETE CASCADE
  templateId      uuid FK → staff_onboarding_templates NOT NULL
  status          enum: NOT_STARTED | IN_PROGRESS | COMPLETED
  items           jsonb NOT NULL
  startedAt       timestamptz
  completedAt     timestamptz
  createdAt       timestamptz NOT NULL default now()
  updatedAt       timestamptz NOT NULL default now()
```

Uses the same template table (templates have a `type` context — actually, let's add a field):

**Amendment to `staff_onboarding_templates`:** Add `type enum: ONBOARDING | OFFBOARDING` default `ONBOARDING`.

Default offboarding checklist:
1. Revoke system access
2. Reassign open bookings
3. Transfer customer relationships
4. Collect equipment
5. Final timesheet review
6. Remove from active rotas

### 8. `staff_custom_field_definitions`

Tenant-configurable fields for industry-specific data.

```
staff_custom_field_definitions
  id            uuid PK default gen_random_uuid()
  tenantId      uuid FK → organizations NOT NULL
  fieldKey      text NOT NULL
  label         text NOT NULL
  fieldType     enum: TEXT | NUMBER | DATE | SELECT | MULTI_SELECT | BOOLEAN | URL | EMAIL | PHONE
  options       jsonb (for SELECT/MULTI_SELECT — [{ value, label }])
  isRequired    boolean NOT NULL default false
  showOnCard    boolean NOT NULL default false
  showOnProfile boolean NOT NULL default true
  sortOrder     integer NOT NULL default 0
  groupName     text (nullable — visual grouping, e.g., "Licenses", "Preferences")
  createdAt     timestamptz NOT NULL default now()
  updatedAt     timestamptz NOT NULL default now()

  UNIQUE (tenantId, fieldKey)
```

### 9. `staff_custom_field_values`

Actual values stored per staff member per custom field.

```
staff_custom_field_values
  id                  uuid PK default gen_random_uuid()
  tenantId            uuid FK → organizations NOT NULL
  userId              uuid FK → users NOT NULL ON DELETE CASCADE
  fieldDefinitionId   uuid FK → staff_custom_field_definitions NOT NULL ON DELETE CASCADE
  value               jsonb NOT NULL
  createdAt           timestamptz NOT NULL default now()
  updatedAt           timestamptz NOT NULL default now()

  UNIQUE (tenantId, userId, fieldDefinitionId)
```

JSONB value storage avoids the classic EAV string-only problem. A date is stored as a JSON string in ISO format, a number as a JSON number, etc. Validation happens in the service layer based on `fieldType` + `isRequired`.

---

## Modified Tables

### `staff_profiles` — New columns

| Column | Type | Purpose |
|---|---|---|
| `reportsTo` | uuid FK → users, nullable | Direct manager for org-chart / reporting hierarchy |
| `dateOfBirth` | date, nullable | HR compliance, age verification |
| `taxId` | text, nullable | National insurance / tax ID (encrypted at application level) |
| `emergencyContactName` | text, nullable | Safety requirement |
| `emergencyContactPhone` | text, nullable | Safety requirement |
| `emergencyContactRelation` | text, nullable | Safety requirement |
| `addressLine1` | text, nullable | HR record |
| `addressLine2` | text, nullable | HR record |
| `addressCity` | text, nullable | HR record |
| `addressPostcode` | text, nullable | HR record |
| `addressCountry` | text, nullable | HR record |

### `staff_profiles` — Existing column fixes

| Column | Fix |
|---|---|
| `bankAccountName` | Encrypt at application level before storage |
| `bankSortCode` | Encrypt at application level before storage |
| `bankAccountNumber` | Encrypt at application level before storage |

### `organizationSettings` — New columns

| Column | Type | Purpose |
|---|---|---|
| `departmentLabel` | text, default 'Departments' | Customizable label ("Teams", "Crews", "Regions") |

---

## Bug Fixes (Existing Code)

### Critical

1. **AvailabilityEditor init bug** — `useState` initializer runs before tRPC resolves, grid always starts empty.
   Fix: Use `useEffect` to sync grid state when `availabilityData` changes.

2. **`team.deactivate` doesn't touch `users.status`** — staff can still log in after deactivation.
   Fix: Set `users.status = SUSPENDED`, revoke WorkOS session, emit `team/deactivated` event, create offboarding checklist.

3. **Bank details in plaintext** — `bankSortCode`, `bankAccountNumber` stored unencrypted.
   Fix: Application-level encryption (AES-256-GCM) using a tenant-scoped key before storage. Decrypt on read in the service layer. Show masked values in API responses (e.g., `****1234`) unless explicit permission `staff:sensitive:read`.

### High

4. **No audit logging** — manifest declares audit resources but zero entries emitted.
   Fix: Emit audit log entries in the service layer on create, update, deactivate, availability change, skill change.

5. **Inngest events empty** — no async workflows on staff lifecycle.
   Fix: Register events: `team/created`, `team/updated`, `team/deactivated`, `team/onboarding.completed`, `team/offboarding.completed`.

6. **No WorkOS provisioning** — creating a staff member doesn't create a login.
   Fix: On `team.create`, call WorkOS to provision user and send invitation email. On deactivate, revoke WorkOS session.

### Medium

7. **`getAssignedBookings` includes CANCELLED** — schedule shows ghost bookings.
   Fix: Add `notInArray(bookings.status, ['CANCELLED', 'REJECTED'])` filter.

8. **`setCapacity` always inserts** — duplicate date range throws constraint error.
   Fix: Use `onConflictDoUpdate` for upsert behavior.

9. **Capacity enforcement hardcoded to FLEXIBLE** — STRICT mode is dead code.
   Fix: Add `capacityEnforcement` to `organizationSettings` or module settings.

10. **Server-side `employeeType` filter missing** — client-side only, breaks at scale.
    Fix: Add `employeeType` to `listStaffSchema` and repository query.

11. **AssignmentsTab no pagination** — hard-capped at 20 records with no "load more".
    Fix: Add cursor-based pagination controls.

12. **ActivityTab no pagination** — hard-capped at 50 records.
    Fix: Add cursor-based pagination controls.

13. **AvailabilityIndicator is status-only** — shows "Available today" for any ACTIVE member regardless of actual schedule.
    Fix: Call `team.getSchedule` or `team.getAvailability` to derive true availability for today.

14. **Skill ID is free text** — no autocomplete or catalog lookup.
    Fix: Add `team.listSkillCatalog` procedure that returns previously-used skill IDs for the tenant, enabling autocomplete in the AddSkillDialog.

---

## New Inngest Events

Add to `src/shared/inngest.ts`:

```typescript
"team/created":     { userId: string, tenantId: string, employeeType: string }
"team/updated":     { userId: string, tenantId: string, changes: string[] }
"team/deactivated": { userId: string, tenantId: string }
"team/onboarding.completed":  { userId: string, tenantId: string, templateId: string }
"team/offboarding.completed": { userId: string, tenantId: string, templateId: string }
```

---

## New Permissions

Add to `teamManifest.permissions`:

| Permission | Description |
|---|---|
| `staff:notes:read` | View internal notes on staff profiles |
| `staff:notes:write` | Create/edit/pin internal notes |
| `staff:sensitive:read` | View unmasked bank details, tax ID, date of birth |
| `staff:departments:write` | Create/edit/delete departments |
| `staff:onboarding:write` | Manage onboarding/offboarding templates |
| `staff:custom-fields:write` | Define custom field schemas |

---

## New tRPC Procedures

### Department management
- `team.departments.list` — tenantProcedure, returns tree structure
- `team.departments.create` — permissionProcedure('staff:departments:write')
- `team.departments.update` — permissionProcedure('staff:departments:write')
- `team.departments.delete` — permissionProcedure('staff:departments:write'), soft-delete
- `team.departments.addMember` — permissionProcedure('staff:write')
- `team.departments.removeMember` — permissionProcedure('staff:write')

### Notes
- `team.notes.list` — permissionProcedure('staff:notes:read'), paginated
- `team.notes.create` — permissionProcedure('staff:notes:write')
- `team.notes.update` — permissionProcedure('staff:notes:write'), own notes only
- `team.notes.delete` — permissionProcedure('staff:notes:write'), own notes only
- `team.notes.togglePin` — permissionProcedure('staff:notes:write')

### Pay rates
- `team.payRates.list` — permissionProcedure('staff:sensitive:read'), returns history
- `team.payRates.create` — permissionProcedure('staff:write'), auto-closes previous rate

### Onboarding
- `team.onboarding.getProgress` — tenantProcedure
- `team.onboarding.completeItem` — tenantProcedure (self or admin)
- `team.onboarding.templates.list` — permissionProcedure('staff:onboarding:write')
- `team.onboarding.templates.create` — permissionProcedure('staff:onboarding:write')
- `team.onboarding.templates.update` — permissionProcedure('staff:onboarding:write')

### Custom fields
- `team.customFields.listDefinitions` — tenantProcedure
- `team.customFields.createDefinition` — permissionProcedure('staff:custom-fields:write')
- `team.customFields.updateDefinition` — permissionProcedure('staff:custom-fields:write')
- `team.customFields.deleteDefinition` — permissionProcedure('staff:custom-fields:write')
- `team.customFields.getValues` — tenantProcedure (for a specific userId)
- `team.customFields.setValues` — permissionProcedure('staff:write')

### Staff finder (wire up existing dead code)
- `team.findAvailable` — tenantProcedure, implements LEAST_LOADED / MOST_SKILLED / NEAREST / ROUND_ROBIN sort strategies

### Skill catalog
- `team.listSkillCatalog` — tenantProcedure, returns distinct skill IDs/names used by this tenant for autocomplete

---

## UI Changes

### Team list page (`/admin/team`)
- Department grouping toggle (flat grid vs collapsible department sections)
- Server-side employee type filter
- Bulk actions toolbar (select multiple → change status, assign department)
- True availability indicator (schedule-based, not status-based)
- Custom field values on cards when `showOnCard = true`

### Staff profile page (`/admin/team/[id]`)
- **Overview tab**: Add emergency contact section, address section, department badges, reporting line, pay rate (current + "view history" link), onboarding progress bar (if not complete), custom fields by group
- **Calendar tab** (NEW): Rendered by scheduling module's `StaffCalendar` component
- **Notes tab** (NEW): Pinned notes at top, chronological list below, add note form
- **Availability tab**: Fix init bug so existing availability populates the grid
- **Assignments tab**: Add pagination controls
- **Activity tab**: Add pagination controls

### Department management (NEW)
- Accessible from Settings or as a sub-page under Team
- Tree view of departments with drag-to-reorder
- Create/edit department dialog (name, description, color, parent, manager)
- Member assignment via staff search

### Custom fields settings (NEW)
- Accessible from Settings → Staff Custom Fields
- CRUD for field definitions with preview
- Drag-to-reorder

### Onboarding templates settings (NEW)
- Accessible from Settings → Onboarding
- Template CRUD with item list editor
- Preview of checklist

---

## What This Design Does NOT Include

These are explicitly deferred to separate modules:

- Time tracking / timesheets (→ `timesheet` module)
- Leave / PTO management (→ `leave` module)
- Google Calendar / Outlook sync (→ `calendar-sync` integration)
- Shift / rota patterns (→ `scheduling` module extension)
- Travel routing / mileage (→ `travel` module)
- Document storage (→ `documents` shared module)
- Payroll calculation (→ `payroll` module)
- Staff self-service portal (→ future, uses existing procedures with different auth context)
