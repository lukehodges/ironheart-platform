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
