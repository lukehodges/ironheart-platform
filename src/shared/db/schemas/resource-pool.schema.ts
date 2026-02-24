import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  date,
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

export const skillType = pgEnum("SkillType", [
  'SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM'
])

export const proficiencyLevel = pgEnum("ProficiencyLevel", [
  'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
])

export const capacityUnit = pgEnum("CapacityUnit", ['COUNT', 'HOURS', 'POINTS'])

export const assignmentStatus = pgEnum("AssignmentStatus", [
  'ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
])

export const capacityEnforcementMode = pgEnum("CapacityEnforcementMode", [
  'STRICT', 'FLEXIBLE'
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const resourceSkills = pgTable("resource_skills", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  skillType: skillType().notNull(),
  skillId: text().notNull(),
  skillName: text().notNull(),
  proficiency: proficiencyLevel().default('INTERMEDIATE').notNull(),
  verifiedAt: timestamp({ precision: 3, mode: 'date' }),
  verifiedBy: uuid(),
  expiresAt: timestamp({ precision: 3, mode: 'date' }),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("resource_skills_tenant_user_type_id_key").on(
    table.tenantId, table.userId, table.skillType, table.skillId,
  ),
  index("resource_skills_tenantId_userId_idx").on(
    table.tenantId, table.userId,
  ),
  index("resource_skills_tenantId_skillType_skillId_idx").on(
    table.tenantId, table.skillType, table.skillId,
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_skills_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_skills_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.verifiedBy],
    foreignColumns: [users.id],
    name: "resource_skills_verifiedBy_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const resourceCapacities = pgTable("resource_capacities", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  capacityType: text().notNull(),
  maxConcurrent: integer(),
  maxDaily: integer(),
  maxWeekly: integer(),
  unit: capacityUnit().default('COUNT').notNull(),
  effectiveFrom: date({ mode: 'date' }).notNull(),
  effectiveUntil: date({ mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("resource_capacities_tenant_user_type_from_key").on(
    table.tenantId, table.userId, table.capacityType, table.effectiveFrom,
  ),
  index("resource_capacities_tenantId_userId_idx").on(
    table.tenantId, table.userId,
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_capacities_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_capacities_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

export const resourceAssignments = pgTable("resource_assignments", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  userId: uuid().notNull(),
  moduleSlug: text().notNull(),
  resourceType: text().notNull(),
  resourceId: uuid().notNull(),
  status: assignmentStatus().default('ASSIGNED').notNull(),
  weight: numeric({ precision: 4, scale: 2 }).default('1.00').notNull(),
  scheduledDate: date({ mode: 'date' }),
  assignedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  startedAt: timestamp({ precision: 3, mode: 'date' }),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  assignedBy: uuid(),
  overrideReason: text(),
  metadata: jsonb(),
}, (table) => [
  index("resource_assignments_tenant_user_status_date_idx").on(
    table.tenantId, table.userId, table.status, table.scheduledDate,
  ),
  index("resource_assignments_tenantId_moduleSlug_idx").on(
    table.tenantId, table.moduleSlug,
  ),
  index("resource_assignments_resourceId_idx").on(
    table.resourceId,
  ),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "resource_assignments_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "resource_assignments_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.assignedBy],
    foreignColumns: [users.id],
    name: "resource_assignments_assignedBy_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type ResourceSkill = typeof resourceSkills.$inferSelect
export type ResourceCapacity = typeof resourceCapacities.$inferSelect
export type ResourceAssignment = typeof resourceAssignments.$inferSelect
