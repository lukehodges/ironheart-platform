# Staff Module Production-Grade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the team/staff module from MVP to production-grade staff management — adding departments, pay rate versioning, notes, onboarding/offboarding, custom fields, Inngest lifecycle events, audit logging, and fixing 14 existing bugs.

**Architecture:** All new features extend the existing `src/modules/team/` module. New Drizzle schema tables go in a new `src/shared/db/schemas/staff.schema.ts` file re-exported from the schema barrel. The team repository, service, router, types, schemas, manifest, events, and index files are all extended. Tests follow the existing `globalThis.__teamTestSelectQueue` mock pattern.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Zod, Vitest, Inngest, Pino logger

---

## Task 1: Add new database schema tables

**Files:**
- Create: `src/shared/db/schemas/staff.schema.ts`
- Modify: `src/shared/db/schema.ts`
- Modify: `src/shared/db/schemas/auth.schema.ts`

**Step 1: Create the new staff schema file**

Create `src/shared/db/schemas/staff.schema.ts`:

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const payRateType = pgEnum("PayRateType", [
  'HOURLY', 'DAILY', 'SALARY', 'COMMISSION', 'PIECE_RATE',
])

export const checklistTemplateType = pgEnum("ChecklistTemplateType", [
  'ONBOARDING', 'OFFBOARDING',
])

export const checklistStatus = pgEnum("ChecklistStatus", [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED',
])

export const customFieldType = pgEnum("CustomFieldType", [
  'TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE',
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const staffDepartments = pgTable("staff_departments", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  parentId: uuid(),
  managerId: uuid(),
  color: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("staff_departments_tenantId_slug_key").on(table.tenantId, table.slug),
  index("staff_departments_tenantId_idx").on(table.tenantId),
  index("staff_departments_parentId_idx").on(table.parentId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_departments_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "staff_departments_parentId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.managerId],
    foreignColumns: [users.id],
    name: "staff_departments_managerId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const staffDepartmentMembers = pgTable("staff_department_members", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  departmentId: uuid().notNull(),
  isPrimary: boolean().notNull().default(false),
  joinedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("staff_dept_members_tenant_user_dept_key").on(table.tenantId, table.userId, table.departmentId),
  index("staff_dept_members_userId_idx").on(table.userId),
  index("staff_dept_members_departmentId_idx").on(table.departmentId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_dept_members_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "staff_dept_members_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [staffDepartments.id],
    name: "staff_dept_members_departmentId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const staffPayRates = pgTable("staff_pay_rates", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  rateType: payRateType().notNull(),
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  currency: text().notNull().default('GBP'),
  effectiveFrom: date({ mode: 'date' }).notNull(),
  effectiveUntil: date({ mode: 'date' }),
  reason: text(),
  createdBy: uuid(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("staff_pay_rates_tenantId_userId_idx").on(table.tenantId, table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_pay_rates_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "staff_pay_rates_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [users.id],
    name: "staff_pay_rates_createdBy_fkey",
  }).onUpdate("cascade").onDelete("set null"),
])

export const staffNotes = pgTable("staff_notes", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  authorId: uuid().notNull(),
  content: text().notNull(),
  isPinned: boolean().notNull().default(false),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("staff_notes_tenantId_userId_idx").on(table.tenantId, table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_notes_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "staff_notes_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.authorId],
    foreignColumns: [users.id],
    name: "staff_notes_authorId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const staffChecklistTemplates = pgTable("staff_checklist_templates", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  type: checklistTemplateType().notNull().default('ONBOARDING'),
  employeeType: text(),
  items: jsonb().notNull(),
  isDefault: boolean().notNull().default(false),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("staff_checklist_templates_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_checklist_templates_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const staffChecklistProgress = pgTable("staff_checklist_progress", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  templateId: uuid().notNull(),
  status: checklistStatus().notNull().default('NOT_STARTED'),
  items: jsonb().notNull(),
  startedAt: timestamp({ precision: 3, mode: 'date' }),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("staff_checklist_progress_tenantId_userId_idx").on(table.tenantId, table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_checklist_progress_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "staff_checklist_progress_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [staffChecklistTemplates.id],
    name: "staff_checklist_progress_templateId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const staffCustomFieldDefinitions = pgTable("staff_custom_field_definitions", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  fieldKey: text().notNull(),
  label: text().notNull(),
  fieldType: customFieldType().notNull(),
  options: jsonb(),
  isRequired: boolean().notNull().default(false),
  showOnCard: boolean().notNull().default(false),
  showOnProfile: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  groupName: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("staff_custom_field_defs_tenantId_fieldKey_key").on(table.tenantId, table.fieldKey),
  index("staff_custom_field_defs_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_custom_field_defs_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])

export const staffCustomFieldValues = pgTable("staff_custom_field_values", {
  id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  fieldDefinitionId: uuid().notNull(),
  value: jsonb().notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("staff_custom_field_vals_tenant_user_field_key").on(table.tenantId, table.userId, table.fieldDefinitionId),
  index("staff_custom_field_vals_userId_idx").on(table.userId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "staff_custom_field_vals_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "staff_custom_field_vals_userId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.fieldDefinitionId],
    foreignColumns: [staffCustomFieldDefinitions.id],
    name: "staff_custom_field_vals_fieldDefId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])
```

**Step 2: Add new columns to `staff_profiles` in `auth.schema.ts`**

Add after the existing `lastAssignedAt` column (line 96), before `createdAt`:

```typescript
  // --- Phase 7: Staff module enhancements ---
  reportsTo: uuid('reports_to'),
  dateOfBirth: date('date_of_birth', { mode: 'date' }),
  taxId: text('tax_id'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelation: text('emergency_contact_relation'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  addressCity: text('address_city'),
  addressPostcode: text('address_postcode'),
  addressCountry: text('address_country'),
```

Add a foreign key for `reportsTo` in the table's constraint array:

```typescript
  foreignKey({
    columns: [table.reportsTo],
    foreignColumns: [users.id],
    name: "staff_profiles_reportsTo_fkey",
  }).onUpdate("cascade").onDelete("set null"),
```

**Step 3: Register in schema barrel**

Add to `src/shared/db/schema.ts`:

```typescript
export * from "./schemas/staff.schema"
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors from new schema — tables are just Drizzle definitions)

**Step 5: Commit**

```bash
git add src/shared/db/schemas/staff.schema.ts src/shared/db/schemas/auth.schema.ts src/shared/db/schema.ts
git commit -m "feat(team): add staff department, pay rate, notes, checklist, and custom field schema tables"
```

---

## Task 2: Add Inngest events for team lifecycle

**Files:**
- Modify: `src/shared/inngest.ts`

**Step 1: Add team lifecycle events to the `IronheartEvents` type**

Add before the closing `}` of `IronheartEvents` (after the last event entry):

```typescript
  "team/created": {
    data: { userId: string; tenantId: string; employeeType: string };
  };
  "team/updated": {
    data: { userId: string; tenantId: string; changes: string[] };
  };
  "team/deactivated": {
    data: { userId: string; tenantId: string };
  };
  "team/onboarding.completed": {
    data: { userId: string; tenantId: string; templateId: string };
  };
  "team/offboarding.completed": {
    data: { userId: string; tenantId: string; templateId: string };
  };
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/shared/inngest.ts
git commit -m "feat(team): add team lifecycle Inngest events"
```

---

## Task 3: Extend team types

**Files:**
- Modify: `src/modules/team/team.types.ts`

**Step 1: Add new types**

Replace the entire contents of `team.types.ts` with:

```typescript
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type EmployeeType = 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR'

export type AvailabilityType = 'RECURRING' | 'SPECIFIC' | 'BLOCKED'

export type PayRateType = 'HOURLY' | 'DAILY' | 'SALARY' | 'COMMISSION' | 'PIECE_RATE'

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'URL' | 'EMAIL' | 'PHONE'

export type ChecklistTemplateType = 'ONBOARDING' | 'OFFBOARDING'

export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface StaffMember {
  id: string
  tenantId: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  status: StaffStatus
  employeeType: EmployeeType | null
  isTeamMember: boolean
  hourlyRate: number | null
  staffStatus: string | null
  workosUserId: string | null
  jobTitle: string | null
  bio: string | null
  reportsTo: string | null
  departments: StaffDepartmentMembership[]
  createdAt: Date
  updatedAt: Date
}

export interface StaffDepartmentMembership {
  departmentId: string
  departmentName: string
  isPrimary: boolean
}

export type AvailabilityEntry =
  | {
      type: 'RECURRING'
      dayOfWeek: number
      startTime: string
      endTime: string
    }
  | {
      type: 'SPECIFIC'
      specificDate: string
      startTime: string
      endTime: string
    }
  | {
      type: 'BLOCKED'
      specificDate: string
      endDate?: string
      reason?: string
      isAllDay: boolean
    }

export interface AvailabilitySlot {
  startTime: string
  endTime: string
}

export interface TeamSchedule {
  userId: string
  date: string
  slots: Array<{ startTime: string; endTime: string }>
}

export interface CreateStaffInput {
  email: string
  name: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  jobTitle?: string
  departmentId?: string
}

export interface UpdateStaffInput {
  id: string
  email?: string
  name?: string
  phone?: string
  employeeType?: EmployeeType
  hourlyRate?: number
  status?: StaffStatus
  jobTitle?: string
  bio?: string
  reportsTo?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressCity?: string | null
  addressPostcode?: string | null
  addressCountry?: string | null
}

export interface Department {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  managerId: string | null
  color: string | null
  sortOrder: number
  isActive: boolean
  memberCount: number
  children: Department[]
}

export interface StaffNote {
  id: string
  tenantId: string
  userId: string
  authorId: string
  authorName: string
  content: string
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PayRate {
  id: string
  rateType: PayRateType
  amount: number
  currency: string
  effectiveFrom: Date
  effectiveUntil: Date | null
  reason: string | null
  createdBy: string | null
  createdAt: Date
}

export interface ChecklistTemplate {
  id: string
  tenantId: string
  name: string
  type: ChecklistTemplateType
  employeeType: string | null
  items: ChecklistItem[]
  isDefault: boolean
}

export interface ChecklistItem {
  key: string
  label: string
  description: string
  isRequired: boolean
  order: number
}

export interface ChecklistItemProgress extends ChecklistItem {
  completedAt: string | null
  completedBy: string | null
}

export interface ChecklistProgress {
  id: string
  userId: string
  templateId: string
  templateName: string
  status: ChecklistStatus
  items: ChecklistItemProgress[]
  startedAt: Date | null
  completedAt: Date | null
}

export interface CustomFieldDefinition {
  id: string
  tenantId: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  options: Array<{ value: string; label: string }> | null
  isRequired: boolean
  showOnCard: boolean
  showOnProfile: boolean
  sortOrder: number
  groupName: string | null
}

export interface CustomFieldValue {
  fieldDefinitionId: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  value: unknown
  groupName: string | null
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: FAIL — `StaffMember` now has `departments`, `jobTitle`, `bio`, `reportsTo` fields that are not set in the mapper in `team.repository.ts`. This is expected and will be fixed in Task 5.

**Step 3: Commit**

```bash
git add src/modules/team/team.types.ts
git commit -m "feat(team): extend types with departments, notes, pay rates, checklists, custom fields"
```

---

## Task 4: Extend Zod schemas

**Files:**
- Modify: `src/modules/team/team.schemas.ts`

**Step 1: Add new schemas**

Replace the entire contents of `team.schemas.ts` with:

```typescript
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export const availabilityEntrySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RECURRING'),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('SPECIFIC'),
    specificDate: z.string().regex(dateRegex),
    startTime: z.string().regex(timeRegex),
    endTime: z.string().regex(timeRegex),
  }),
  z.object({
    type: z.literal('BLOCKED'),
    specificDate: z.string().regex(dateRegex),
    endDate: z.string().regex(dateRegex).optional(),
    reason: z.string().max(255).optional(),
    isAllDay: z.boolean().default(true),
  }),
])

export const setAvailabilitySchema = z.object({
  userId: z.string(),
  entries: z.array(availabilityEntrySchema),
  replaceAll: z.boolean().default(false),
})

export const blockDatesSchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  reason: z.string().optional(),
})

export const getAvailabilitySchema = z.object({
  userId: z.string(),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  timezone: z.string().optional(),
})

export const getScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().regex(dateRegex),
  timezone: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Staff CRUD
// ---------------------------------------------------------------------------

export const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
})

export const updateStaffSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  hourlyRate: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  jobTitle: z.string().optional(),
  bio: z.string().max(2000).optional(),
  reportsTo: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  emergencyContactRelation: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressPostcode: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
})

export const listStaffSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  departmentId: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  managerId: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const updateDepartmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  parentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const departmentMemberSchema = z.object({
  userId: z.string(),
  departmentId: z.string(),
  isPrimary: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const createNoteSchema = z.object({
  userId: z.string(),
  content: z.string().min(1).max(5000),
})

export const updateNoteSchema = z.object({
  noteId: z.string(),
  content: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
})

export const listNotesSchema = z.object({
  userId: z.string(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Pay Rates
// ---------------------------------------------------------------------------

export const createPayRateSchema = z.object({
  userId: z.string(),
  rateType: z.enum(['HOURLY', 'DAILY', 'SALARY', 'COMMISSION', 'PIECE_RATE']),
  amount: z.number().positive(),
  currency: z.string().default('GBP'),
  effectiveFrom: z.string().regex(dateRegex),
  reason: z.string().max(255).optional(),
})

export const listPayRatesSchema = z.object({
  userId: z.string(),
})

// ---------------------------------------------------------------------------
// Onboarding / Offboarding Checklists
// ---------------------------------------------------------------------------

export const checklistItemSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().default(''),
  isRequired: z.boolean().default(false),
  order: z.number().int(),
})

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']),
  employeeType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'CONTRACTOR']).optional(),
  items: z.array(checklistItemSchema).min(1),
  isDefault: z.boolean().default(false),
})

export const updateChecklistTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  items: z.array(checklistItemSchema).min(1).optional(),
  isDefault: z.boolean().optional(),
})

export const completeChecklistItemSchema = z.object({
  progressId: z.string(),
  itemKey: z.string(),
})

export const getChecklistProgressSchema = z.object({
  userId: z.string(),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']).optional(),
})

// ---------------------------------------------------------------------------
// Custom Fields
// ---------------------------------------------------------------------------

export const createCustomFieldDefSchema = z.object({
  fieldKey: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(100),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE']),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  isRequired: z.boolean().default(false),
  showOnCard: z.boolean().default(false),
  showOnProfile: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  groupName: z.string().max(50).optional(),
})

export const updateCustomFieldDefSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100).optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  isRequired: z.boolean().optional(),
  showOnCard: z.boolean().optional(),
  showOnProfile: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  groupName: z.string().max(50).nullable().optional(),
})

export const setCustomFieldValuesSchema = z.object({
  userId: z.string(),
  values: z.array(z.object({
    fieldDefinitionId: z.string(),
    value: z.unknown(),
  })),
})

export const getCustomFieldValuesSchema = z.object({
  userId: z.string(),
})
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: May show errors in router.ts from removed schema shape — will be fixed in later tasks.

**Step 3: Commit**

```bash
git add src/modules/team/team.schemas.ts
git commit -m "feat(team): add Zod schemas for departments, notes, pay rates, checklists, custom fields"
```

---

## Task 5: Extend team repository — staff CRUD fixes + departments

**Files:**
- Modify: `src/modules/team/team.repository.ts`

This is a large file. The changes are:

1. **Fix `mapToStaffMember`** to include new fields (`jobTitle`, `bio`, `reportsTo`, `departments`)
2. **Fix `deactivate`** to also set `users.status = SUSPENDED`
3. **Fix `getAssignedBookings`** to exclude CANCELLED/REJECTED bookings
4. **Add `employeeType` and `departmentId` server-side filters** to `listByTenant`
5. **Add department CRUD methods**
6. **Add notes CRUD methods**
7. **Add pay rate methods**
8. **Add checklist methods**
9. **Add custom field methods**

Due to the size, the full file contents are specified in the design doc. Key changes:

**Step 1: Update imports**

Add to imports from `@/shared/db/schema`:
```typescript
import {
  users,
  staffProfiles,
  userAvailability,
  bookings,
  staffDepartments,
  staffDepartmentMembers,
  staffNotes,
  staffPayRates,
  staffChecklistTemplates,
  staffChecklistProgress,
  staffCustomFieldDefinitions,
  staffCustomFieldValues,
} from "@/shared/db/schema";
```

Add `notInArray` to drizzle-orm imports.

**Step 2: Fix `mapToStaffMember` to include new fields**

The mapper now accepts an optional `departments` array and reads `jobTitle`, `bio`, `reportsTo` from the profile row.

**Step 3: Fix `deactivate` method**

Inside the transaction, after setting `staffProfiles.staffStatus = TERMINATED`, add:
```typescript
await tx
  .update(users)
  .set({ status: "SUSPENDED", updatedAt: now })
  .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
```

**Step 4: Fix `getAssignedBookings` to exclude cancelled**

Add to the where clause:
```typescript
notInArray(bookings.status, ['CANCELLED', 'REJECTED']),
```

**Step 5: Add `employeeType` filter to `listByTenant`**

In the conditions building, after the status filter:
```typescript
if (opts.employeeType) {
  const dbType = mapDomainEmployeeType(opts.employeeType);
  if (dbType) {
    conditions.push(eq(staffProfiles.employeeType, dbType));
  }
}
```

**Step 6: Add department methods**

Implement: `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`, `addDepartmentMember`, `removeDepartmentMember`, `getDepartmentMembers`.

**Step 7: Add notes methods**

Implement: `listNotes`, `createNote`, `updateNote`, `deleteNote`.

**Step 8: Add pay rate methods**

Implement: `listPayRates`, `createPayRate`.

**Step 9: Add checklist methods**

Implement: `listChecklistTemplates`, `createChecklistTemplate`, `updateChecklistTemplate`, `getChecklistProgress`, `createChecklistProgress`, `completeChecklistItem`.

**Step 10: Add custom field methods**

Implement: `listCustomFieldDefinitions`, `createCustomFieldDefinition`, `updateCustomFieldDefinition`, `deleteCustomFieldDefinition`, `getCustomFieldValues`, `setCustomFieldValues`.

**Step 11: Commit**

```bash
git add src/modules/team/team.repository.ts
git commit -m "feat(team): extend repository with departments, notes, pay rates, checklists, custom fields + bug fixes"
```

---

## Task 6: Extend team service — business logic + audit + events

**Files:**
- Modify: `src/modules/team/team.service.ts`

**Step 1: Add imports**

```typescript
import { auditLog } from "@/shared/audit/audit-logger";
import { inngest } from "@/shared/inngest";
```

**Step 2: Add audit logging to `createStaff`**

After successful creation:
```typescript
await auditLog({
  tenantId: ctx.tenantId,
  actorId: ctx.user!.id,
  action: 'created',
  resourceType: 'team-member',
  resourceId: member.id,
  resourceName: member.name,
});

await inngest.send({
  name: "team/created",
  data: {
    userId: member.id,
    tenantId: ctx.tenantId,
    employeeType: input.employeeType ?? 'EMPLOYED',
  },
});
```

**Step 3: Add audit logging to `updateStaff`**

After successful update:
```typescript
const changedFields = Object.keys(input).filter(k => k !== 'id' && input[k as keyof typeof input] !== undefined);
await auditLog({
  tenantId: ctx.tenantId,
  actorId: ctx.user!.id,
  action: 'updated',
  resourceType: 'team-member',
  resourceId: userId,
  resourceName: updated.name,
});

await inngest.send({
  name: "team/updated",
  data: { userId, tenantId: ctx.tenantId, changes: changedFields },
});
```

**Step 4: Fix `deactivateStaff` — add audit + event**

```typescript
await auditLog({
  tenantId: ctx.tenantId,
  actorId: ctx.user!.id,
  action: 'deleted',
  resourceType: 'team-member',
  resourceId: userId,
  resourceName: existing.name,
});

await inngest.send({
  name: "team/deactivated",
  data: { userId, tenantId: ctx.tenantId },
});
```

**Step 5: Add department service methods**

Implement: `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`, `addDepartmentMember`, `removeDepartmentMember`.

Each write operation emits an audit log entry with `resourceType: 'department'`.

**Step 6: Add notes service methods**

Implement: `listNotes`, `createNote`, `updateNote`, `deleteNote`, `toggleNotePin`.

**Step 7: Add pay rates service methods**

Implement: `listPayRates`, `createPayRate` (auto-closes the previous rate's `effectiveUntil`).

**Step 8: Add checklist service methods**

Implement: `getChecklistProgress`, `completeChecklistItem` (fires `team/onboarding.completed` when all required items done), `listChecklistTemplates`, `createChecklistTemplate`, `updateChecklistTemplate`.

**Step 9: Add custom fields service methods**

Implement: `listCustomFieldDefinitions`, `createCustomFieldDefinition`, `updateCustomFieldDefinition`, `deleteCustomFieldDefinition`, `getCustomFieldValues`, `setCustomFieldValues` (validates value types against definitions).

**Step 10: Add `listSkillCatalog` method**

Query distinct `(skillId, skillName)` from `resource_skills` for the tenant, for autocomplete.

**Step 11: Commit**

```bash
git add src/modules/team/team.service.ts
git commit -m "feat(team): extend service with audit logging, Inngest events, departments, notes, pay rates, checklists, custom fields"
```

---

## Task 7: Extend team router

**Files:**
- Modify: `src/modules/team/team.router.ts`

**Step 1: Add new schema imports**

Import all the new schemas from `team.schemas.ts`.

**Step 2: Add department routes (nested router)**

```typescript
departments: router({
  list: moduleProcedure
    .query(({ ctx }) => teamService.listDepartments(ctx)),

  create: modulePermission("staff:departments:write")
    .input(createDepartmentSchema)
    .mutation(({ ctx, input }) => teamService.createDepartment(ctx, input)),

  update: modulePermission("staff:departments:write")
    .input(updateDepartmentSchema)
    .mutation(({ ctx, input }) => teamService.updateDepartment(ctx, input)),

  delete: modulePermission("staff:departments:write")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => teamService.deleteDepartment(ctx, input.id)),

  addMember: modulePermission("staff:write")
    .input(departmentMemberSchema)
    .mutation(({ ctx, input }) => teamService.addDepartmentMember(ctx, input)),

  removeMember: modulePermission("staff:write")
    .input(z.object({ userId: z.string(), departmentId: z.string() }))
    .mutation(({ ctx, input }) => teamService.removeDepartmentMember(ctx, input.userId, input.departmentId)),
}),
```

**Step 3: Add notes routes**

```typescript
notes: router({
  list: modulePermission("staff:notes:read")
    .input(listNotesSchema)
    .query(({ ctx, input }) => teamService.listNotes(ctx, input)),

  create: modulePermission("staff:notes:write")
    .input(createNoteSchema)
    .mutation(({ ctx, input }) => teamService.createNote(ctx, input)),

  update: modulePermission("staff:notes:write")
    .input(updateNoteSchema)
    .mutation(({ ctx, input }) => teamService.updateNote(ctx, input)),

  delete: modulePermission("staff:notes:write")
    .input(z.object({ noteId: z.string() }))
    .mutation(({ ctx, input }) => teamService.deleteNote(ctx, input.noteId)),
}),
```

**Step 4: Add pay rates routes**

```typescript
payRates: router({
  list: modulePermission("staff:sensitive:read")
    .input(listPayRatesSchema)
    .query(({ ctx, input }) => teamService.listPayRates(ctx, input.userId)),

  create: modulePermission("staff:write")
    .input(createPayRateSchema)
    .mutation(({ ctx, input }) => teamService.createPayRate(ctx, input)),
}),
```

**Step 5: Add checklist routes**

```typescript
onboarding: router({
  getProgress: moduleProcedure
    .input(getChecklistProgressSchema)
    .query(({ ctx, input }) => teamService.getChecklistProgress(ctx, input.userId, input.type)),

  completeItem: moduleProcedure
    .input(completeChecklistItemSchema)
    .mutation(({ ctx, input }) => teamService.completeChecklistItem(ctx, input.progressId, input.itemKey)),

  templates: router({
    list: modulePermission("staff:onboarding:write")
      .query(({ ctx }) => teamService.listChecklistTemplates(ctx)),

    create: modulePermission("staff:onboarding:write")
      .input(createChecklistTemplateSchema)
      .mutation(({ ctx, input }) => teamService.createChecklistTemplate(ctx, input)),

    update: modulePermission("staff:onboarding:write")
      .input(updateChecklistTemplateSchema)
      .mutation(({ ctx, input }) => teamService.updateChecklistTemplate(ctx, input)),
  }),
}),
```

**Step 6: Add custom fields routes**

```typescript
customFields: router({
  listDefinitions: moduleProcedure
    .query(({ ctx }) => teamService.listCustomFieldDefinitions(ctx)),

  createDefinition: modulePermission("staff:custom-fields:write")
    .input(createCustomFieldDefSchema)
    .mutation(({ ctx, input }) => teamService.createCustomFieldDefinition(ctx, input)),

  updateDefinition: modulePermission("staff:custom-fields:write")
    .input(updateCustomFieldDefSchema)
    .mutation(({ ctx, input }) => teamService.updateCustomFieldDefinition(ctx, input)),

  deleteDefinition: modulePermission("staff:custom-fields:write")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => teamService.deleteCustomFieldDefinition(ctx, input.id)),

  getValues: moduleProcedure
    .input(getCustomFieldValuesSchema)
    .query(({ ctx, input }) => teamService.getCustomFieldValues(ctx, input.userId)),

  setValues: modulePermission("staff:write")
    .input(setCustomFieldValuesSchema)
    .mutation(({ ctx, input }) => teamService.setCustomFieldValues(ctx, input)),
}),
```

**Step 7: Add skill catalog route**

```typescript
listSkillCatalog: moduleProcedure
  .query(({ ctx }) => teamService.listSkillCatalog(ctx)),
```

**Step 8: Commit**

```bash
git add src/modules/team/team.router.ts
git commit -m "feat(team): extend router with department, notes, pay rate, checklist, custom field routes"
```

---

## Task 8: Update manifest and events

**Files:**
- Modify: `src/modules/team/team.manifest.ts`
- Modify: `src/modules/team/team.events.ts`
- Modify: `src/modules/team/index.ts`

**Step 1: Update manifest permissions and audit resources**

```typescript
export const teamManifest: ModuleManifest = {
  slug: 'team',
  name: 'Team',
  description: 'Staff management, availability, capacity, departments, and onboarding',
  icon: 'UserCheck',
  category: 'operations',
  dependencies: [],
  routes: [
    { path: '/admin/team', label: 'Team', permission: 'team:read' },
    { path: '/admin/team/[id]', label: 'Staff Profile', permission: 'staff:read' },
  ],
  sidebarItems: [
    { title: 'Team', href: '/admin/team', icon: 'UserCheck', section: 'operations', permission: 'team:read' },
  ],
  analyticsWidgets: [
    { id: 'staff-utilization', type: 'heatmap', label: 'Staff Utilization', size: '2x2',
      dataSource: { procedure: 'team.analytics.utilization' } },
  ],
  permissions: [
    'team:read', 'team:write',
    'staff:read', 'staff:write',
    'staff:notes:read', 'staff:notes:write',
    'staff:sensitive:read',
    'staff:departments:write',
    'staff:onboarding:write',
    'staff:custom-fields:write',
  ],
  eventsProduced: [
    'team/created', 'team/updated', 'team/deactivated',
    'team/onboarding.completed', 'team/offboarding.completed',
  ],
  eventsConsumed: [],
  isCore: false,
  availability: 'standard',
  auditResources: ['team-member', 'availability', 'department', 'staff-note', 'pay-rate'],
}
```

**Step 2: Update `team.events.ts`**

For now keep the empty array — team lifecycle events are fire-and-forget from the service. Add a comment noting the events are emitted from `teamService`, not consumed as Inngest functions.

```typescript
import { inngest } from "@/shared/inngest";

/**
 * Team Inngest functions.
 *
 * Team lifecycle events (team/created, team/updated, team/deactivated) are
 * emitted directly from teamService. They can be consumed by the workflow
 * engine or notification module. No team-specific Inngest functions are
 * needed at this time.
 */
export const teamFunctions: ReturnType<typeof inngest.createFunction>[] = [];
```

**Step 3: Update barrel export**

Add new type exports to `src/modules/team/index.ts`:

```typescript
export { teamRouter } from "./team.router";
export type { TeamRouter } from "./team.router";
export { teamFunctions } from "./team.events";
export { teamService } from "./team.service";
export type {
  StaffMember,
  AvailabilityEntry,
  TeamSchedule,
  Department,
  StaffNote,
  PayRate,
  ChecklistProgress,
  CustomFieldDefinition,
  CustomFieldValue,
} from "./team.types";
```

**Step 4: Commit**

```bash
git add src/modules/team/team.manifest.ts src/modules/team/team.events.ts src/modules/team/index.ts
git commit -m "feat(team): update manifest permissions, audit resources, and barrel exports"
```

---

## Task 9: Write tests for new features

**Files:**
- Modify: `src/modules/team/__tests__/team.availability.test.ts`
- Create: `src/modules/team/__tests__/team.departments.test.ts`
- Create: `src/modules/team/__tests__/team.notes.test.ts`
- Create: `src/modules/team/__tests__/team.pay-rates.test.ts`
- Create: `src/modules/team/__tests__/team.checklists.test.ts`
- Create: `src/modules/team/__tests__/team.custom-fields.test.ts`

Each test file follows the existing pattern: `vi.mock('@/shared/db')` with the `globalThis.__teamTestSelectQueue` chainable mock, `vi.mock('drizzle-orm')`, `vi.mock('@/shared/logger')`.

Tests to write:

**Departments:**
- `listDepartments` returns a tree structure
- `createDepartment` auto-generates slug from name
- `updateDepartment` throws NotFoundError for missing department
- `deleteDepartment` sets `isActive = false` (soft delete)
- `addDepartmentMember` with `isPrimary` clears other primaries

**Notes:**
- `listNotes` returns pinned notes first, then chronological
- `createNote` stores with authorId from context
- `updateNote` throws ForbiddenError if author doesn't match
- `deleteNote` throws ForbiddenError if author doesn't match

**Pay Rates:**
- `createPayRate` auto-closes previous rate's `effectiveUntil`
- `listPayRates` returns ordered by `effectiveFrom` descending

**Checklists:**
- `completeChecklistItem` marks item as complete with timestamp
- `completeChecklistItem` transitions status to COMPLETED when all required items done
- `completeChecklistItem` fires `team/onboarding.completed` event on completion

**Custom Fields:**
- `setCustomFieldValues` validates TEXT field accepts string
- `setCustomFieldValues` validates NUMBER field rejects string
- `setCustomFieldValues` validates SELECT field rejects value not in options
- `setCustomFieldValues` validates required fields cannot be null

**Step 1: Write all test files**

Each file creates its own `setQueue` and mock pattern. Import the repository/service under test AFTER mocks.

**Step 2: Run tests**

Run: `npx vitest run src/modules/team/__tests__/`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/modules/team/__tests__/
git commit -m "test(team): add tests for departments, notes, pay rates, checklists, custom fields"
```

---

## Task 10: Final verification

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new)

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Fix any remaining issues**

Address any type errors, import issues, or test failures.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore(team): fix remaining type errors and build issues"
```

---

## Execution Order and Dependencies

```
Task 1 (schema)
  └──→ Task 2 (inngest events) — independent, can run in parallel
  └──→ Task 3 (types) — depends on Task 1 (references new table types)
         └──→ Task 4 (schemas) — depends on Task 3 (references new types)
                └──→ Task 5 (repository) — depends on Tasks 1, 3, 4
                       └──→ Task 6 (service) — depends on Task 5
                              └──→ Task 7 (router) — depends on Task 6
                                     └──→ Task 8 (manifest/events/index) — depends on Task 7
                                            └──→ Task 9 (tests) — depends on all above
                                                   └──→ Task 10 (verification) — depends on all above
```

Tasks 1 and 2 can run in parallel. All others are sequential.
