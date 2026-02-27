import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
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
// Skill Catalog
// ---------------------------------------------------------------------------

export const skillDefinitions = pgTable("skill_definitions", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  slug: text().notNull(),
  name: text().notNull(),
  skillType: skillType().notNull(),
  category: text(),
  description: text(),
  requiresVerification: boolean().default(false).notNull(),
  requiresExpiry: boolean().default(false).notNull(),
  isActive: boolean().default(true).notNull(),
  metadata: jsonb(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("skill_definitions_tenant_slug_key").on(table.tenantId, table.slug),
  index("skill_definitions_tenantId_idx").on(table.tenantId),
  index("skill_definitions_tenantId_skillType_idx").on(table.tenantId, table.skillType),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "skill_definitions_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
])

// ---------------------------------------------------------------------------
// Capacity Type Registry
// ---------------------------------------------------------------------------

export const capacityTypeDefinitions = pgTable("capacity_type_definitions", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  slug: text().notNull(),
  name: text().notNull(),
  description: text(),
  unit: capacityUnit().default('COUNT').notNull(),
  defaultMaxDaily: integer(),
  defaultMaxWeekly: integer(),
  defaultMaxConcurrent: integer(),
  registeredByModule: text(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  uniqueIndex("capacity_type_definitions_tenant_slug_key").on(table.tenantId, table.slug),
  index("capacity_type_definitions_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "capacity_type_definitions_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
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
  skillDefinitionId: uuid(),
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
  foreignKey({
    columns: [table.skillDefinitionId],
    foreignColumns: [skillDefinitions.id],
    name: "resource_skills_skillDefinitionId_fkey"
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
export type SkillDefinition = typeof skillDefinitions.$inferSelect
export type CapacityTypeDefinition = typeof capacityTypeDefinitions.$inferSelect
