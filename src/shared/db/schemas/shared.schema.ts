import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  numeric,
  date,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants, availabilityMode, moduleCategory, settingType } from "./tenant.schema"
import { users } from "./auth.schema"
import { customers } from "./customer.schema"
import { services } from "./services.schema"
import { capacityMode } from "./scheduling.schema"
import { bookings } from "./booking.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const auditSeverity = pgEnum("AuditSeverity", ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
export const invoiceStatus = pgEnum("InvoiceStatus", ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'REFUNDED'])
export const paymentMethod = pgEnum("PaymentMethod", ['CARD', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'CASH', 'CHEQUE', 'OTHER'])
export const paymentStatus = pgEnum("PaymentStatus", ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'])
export const paymentType = pgEnum("PaymentType", ['DEPOSIT', 'PAYMENT', 'REFUND', 'CREDIT'])
export const projectMemberStatus = pgEnum("ProjectMemberStatus", ['ACTIVE', 'INACTIVE', 'LEFT'])
export const projectPriority = pgEnum("ProjectPriority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const projectRole = pgEnum("ProjectRole", ['OWNER', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER'])
export const projectStatus = pgEnum("ProjectStatus", ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
export const projectType = pgEnum("ProjectType", ['INTERNAL', 'CLIENT', 'DEVELOPMENT', 'MAINTENANCE', 'RESEARCH'])
export const reviewIssueCategory = pgEnum("ReviewIssueCategory", ['WAIT_TIME', 'SERVICE_QUALITY', 'PRICING', 'COMMUNICATION', 'STAFF_ATTITUDE', 'FACILITY', 'OTHER'])
export const reviewRequestStatus = pgEnum("ReviewRequestStatus", ['PENDING', 'SENT', 'DELIVERED', 'COMPLETED', 'BOUNCED', 'IGNORED'])
export const reviewResolutionStatus = pgEnum("ReviewResolutionStatus", ['PENDING', 'CONTACTED', 'RESOLVED', 'DISMISSED'])
export const reviewSource = pgEnum("ReviewSource", ['GOOGLE', 'FACEBOOK', 'PRIVATE', 'INTERNAL'])
export const reviewTiming = pgEnum("ReviewTiming", ['HOURS_2', 'HOURS_24', 'DAYS_3'])
export const taskPriority = pgEnum("TaskPriority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const taskStatus = pgEnum("TaskStatus", ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
export const taskType = pgEnum("TaskType", ['GENERAL', 'DEVELOPMENT', 'DESIGN', 'TESTING', 'DOCUMENTATION', 'MEETING', 'RESEARCH'])
export const workflowActionType = pgEnum("WorkflowActionType", ['SEND_EMAIL', 'SEND_SMS', 'CREATE_CALENDAR_EVENT', 'UPDATE_BOOKING_STATUS', 'SEND_NOTIFICATION', 'CREATE_TASK', 'WEBHOOK'])
export const workflowExecutionStatus = pgEnum("WorkflowExecutionStatus", ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
export const formSendTiming = pgEnum("FormSendTiming", ['ON_BOOKING', 'HOURS_24_BEFORE', 'DAYS_1_BEFORE', 'MANUAL'])
export const formStatus = pgEnum("FormStatus", ['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'date' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'date' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
})

export const featureFlags = pgTable("feature_flags", {
	id: uuid().primaryKey().notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	defaultValue: boolean().default(false).notNull(),
	defaultConfig: jsonb(),
	configSchema: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("feature_flags_key_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
])

export const tenantFeatures = pgTable("tenant_features", {
	tenantId: uuid().notNull(),
	featureId: uuid().notNull(),
	enabled: boolean().default(true).notNull(),
	config: jsonb(),
	enabledAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	enabledBy: uuid(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "tenant_features_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.featureId],
		foreignColumns: [featureFlags.id],
		name: "tenant_features_featureId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.tenantId, table.featureId], name: "tenant_features_pkey" }),
])

export const auditLogs = pgTable("audit_logs", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid(),
	action: text().notNull(),
	entityType: text(),
	entityId: uuid(),
	oldValues: jsonb(),
	newValues: jsonb(),
	ipAddress: text(),
	userAgent: text(),
	sessionId: uuid(),
	requestId: text(),
	severity: auditSeverity().default('INFO').notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("audit_logs_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("audit_logs_tenantId_createdAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_tenantId_entityType_entityId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.entityType.asc().nullsLast().op("uuid_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("audit_logs_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "audit_logs_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "audit_logs_userId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const modules = pgTable("modules", {
	id: uuid().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: moduleCategory().default('CORE').notNull(),
	icon: text(),
	isActive: boolean().default(true).notNull(),
	setupFee: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	monthlyFee: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	features: jsonb().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("modules_category_idx").using("btree", table.category.asc().nullsLast().op("enum_ops")),
	index("modules_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("modules_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
])

export const moduleSettings = pgTable("module_settings", {
	id: uuid().primaryKey().notNull(),
	moduleId: uuid().notNull(),
	key: text().notNull(),
	label: text().notNull(),
	type: settingType().default('BOOLEAN').notNull(),
	defaultValue: jsonb(),
	options: jsonb(),
	validation: jsonb(),
	description: text(),
	category: text(),
	order: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("module_settings_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("module_settings_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("module_settings_moduleId_key_key").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops"), table.key.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.moduleId],
		foreignColumns: [modules.id],
		name: "module_settings_moduleId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const tenantModules = pgTable("tenant_modules", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	moduleId: uuid().notNull(),
	isEnabled: boolean().default(false).notNull(),
	isCustom: boolean().default(false).notNull(),
	setupPaid: boolean().default(false).notNull(),
	monthlyRate: numeric({ precision: 10, scale: 2 }),
	config: jsonb(),
	activatedAt: timestamp({ precision: 3, mode: 'date' }),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("tenant_modules_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("tenant_modules_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "tenant_modules_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.moduleId],
		foreignColumns: [modules.id],
		name: "tenant_modules_moduleId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const tenantModuleSettings = pgTable("tenant_module_settings", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	moduleId: uuid().notNull(),
	settingKey: text().notNull(),
	value: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("tenant_module_settings_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("tenant_module_settings_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("tenant_module_settings_tenantId_moduleId_settingKey_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.moduleId.asc().nullsLast().op("text_ops"), table.settingKey.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.tenantId, table.moduleId],
		foreignColumns: [tenantModules.tenantId, tenantModules.moduleId],
		name: "tenant_module_settings_tenantId_moduleId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const organizationSettings = pgTable("organization_settings", {
	tenantId: uuid().primaryKey().notNull(),
	businessName: text().notNull(),
	legalName: text(),
	registrationNo: text(),
	vatNumber: text(),
	email: text(),
	phone: text(),
	website: text(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	county: text(),
	postcode: text(),
	country: text().default('GB').notNull(),
	timezone: text().default('Europe/London').notNull(),
	currency: text().default('GBP').notNull(),
	dateFormat: text().default('dd/MM/yyyy').notNull(),
	timeFormat: text().default('HH:mm').notNull(),
	weekStartsOn: integer().default(1).notNull(),
	logoUrl: text(),
	faviconUrl: text(),
	primaryColor: text().default('#3B82F6').notNull(),
	accentColor: text().default('#10B981').notNull(),
	businessHours: jsonb(),
	bookingWindowDays: integer().default(30).notNull(),
	minNoticeHours: integer().default(24).notNull(),
	bufferMinutes: integer().default(15).notNull(),
	allowSameDayBook: boolean().default(false).notNull(),
	slotDurationMins: integer().default(30).notNull(),
	senderName: text(),
	senderEmail: text(),
	replyToEmail: text(),
	emailFooter: text(),
	smsSignature: text(),
	customerLabel: text().default('customer').notNull(),
	bookingLabel: text().default('booking').notNull(),
	staffLabel: text().default('staff').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	availabilityMode: availabilityMode().default('CALENDAR_BASED').notNull(),
	capacityMode: capacityMode().default('TENANT_LEVEL').notNull(),
	defaultSlotCapacity: integer().default(1).notNull(),
	slotApprovalEnabled: boolean().default(false).notNull(),
	slotApprovalHours: integer().default(48).notNull(),
	customCss: text(),
	fontFamily: text(),
	secondaryColor: text(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "organization_settings_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const projects = pgTable("projects", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	startDate: timestamp({ precision: 3, mode: 'date' }),
	endDate: timestamp({ precision: 3, mode: 'date' }),
	estimatedHours: integer(),
	actualHours: integer(),
	status: projectStatus().default('PLANNING').notNull(),
	priority: projectPriority().default('MEDIUM').notNull(),
	progress: integer().default(0).notNull(),
	budgetAmount: numeric({ precision: 10, scale: 2 }),
	actualCost: numeric({ precision: 10, scale: 2 }),
	type: projectType().default('INTERNAL').notNull(),
	isVisible: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("projects_startDate_idx").using("btree", table.startDate.asc().nullsLast().op("timestamp_ops")),
	index("projects_tenantId_priority_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.priority.asc().nullsLast().op("enum_ops")),
	index("projects_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "projects_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const projectMembers = pgTable("project_members", {
	id: uuid().primaryKey().notNull(),
	projectId: uuid().notNull(),
	userId: uuid().notNull(),
	role: projectRole().default('MEMBER').notNull(),
	responsibilities: text().array().default([]),
	weeklyHours: integer(),
	hourlyRate: numeric({ precision: 10, scale: 2 }),
	status: projectMemberStatus().default('ACTIVE').notNull(),
	joinedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	leftAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("project_members_projectId_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("project_members_projectId_userId_key").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("project_members_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "project_members_projectId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "project_members_userId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
])

export const tasks = pgTable("tasks", {
	id: uuid().primaryKey().notNull(),
	projectId: uuid().notNull(),
	tenantId: uuid().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('TODO').notNull(),
	priority: taskPriority().default('MEDIUM').notNull(),
	assignedTo: uuid(),
	dueDate: timestamp({ precision: 3, mode: 'date' }),
	estimatedHours: integer(),
	actualHours: integer(),
	dependsOn: uuid(),
	blocking: uuid().array(),
	type: taskType().default('GENERAL').notNull(),
	progress: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("tasks_assignedTo_dueDate_idx").using("btree", table.assignedTo.asc().nullsLast().op("timestamp_ops"), table.dueDate.asc().nullsLast().op("uuid_ops")),
	index("tasks_dueDate_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("tasks_projectId_status_idx").using("btree", table.projectId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("tasks_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.projectId],
		foreignColumns: [projects.id],
		name: "tasks_projectId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "tasks_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.assignedTo],
		foreignColumns: [users.id],
		name: "tasks_assignedTo_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.dependsOn],
		foreignColumns: [table.id],
		name: "tasks_dependsOn_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const workflows = pgTable("workflows", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	enabled: boolean().default(true).notNull(),
	triggerEvent: text().notNull(),
	conditions: jsonb(),
	delay: integer(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	edges: jsonb(),
	isVisual: boolean().default(false).notNull(),
	nodes: jsonb(),
	viewport: jsonb(),
}, (table) => [
	index("workflows_tenantId_enabled_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.enabled.asc().nullsLast().op("bool_ops")),
	index("workflows_triggerEvent_idx").using("btree", table.triggerEvent.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "workflows_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const workflowActions = pgTable("workflow_actions", {
	id: uuid().primaryKey().notNull(),
	workflowId: uuid().notNull(),
	actionType: workflowActionType().notNull(),
	config: jsonb().notNull(),
	order: integer().default(0).notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("workflow_actions_workflowId_order_idx").using("btree", table.workflowId.asc().nullsLast().op("int4_ops"), table.order.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.workflowId],
		foreignColumns: [workflows.id],
		name: "workflow_actions_workflowId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const workflowExecutions = pgTable("workflow_executions", {
	id: uuid().primaryKey().notNull(),
	workflowId: uuid().notNull(),
	tenantId: uuid().notNull(),
	triggerEvent: text().notNull(),
	triggerData: jsonb().notNull(),
	status: workflowExecutionStatus().default('PENDING').notNull(),
	startedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'date' }),
	errorMessage: text(),
	actionsExecuted: integer().default(0).notNull(),
	actionResults: jsonb(),
}, (table) => [
	index("workflow_executions_tenantId_startedAt_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.startedAt.asc().nullsLast().op("uuid_ops")),
	index("workflow_executions_workflowId_status_idx").using("btree", table.workflowId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.workflowId],
		foreignColumns: [workflows.id],
		name: "workflow_executions_workflowId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const invoices = pgTable("invoices", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	invoiceNumber: text().notNull(),
	customerId: uuid().notNull(),
	bookingId: uuid(),
	subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
	taxAmount: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	discountAmount: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	totalAmount: numeric({ precision: 10, scale: 2 }).notNull(),
	amountPaid: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
	amountDue: numeric({ precision: 10, scale: 2 }).notNull(),
	issueDate: date({ mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	dueDate: date({ mode: 'date' }).notNull(),
	paidAt: timestamp({ precision: 3, mode: 'date' }),
	status: invoiceStatus().default('DRAFT').notNull(),
	lineItems: jsonb().notNull(),
	notes: text(),
	terms: text(),
	externalRef: text(),
	externalUrl: text(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("invoices_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("invoices_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("invoices_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("invoices_tenantId_invoiceNumber_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.invoiceNumber.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "invoices_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [customers.id],
		name: "invoices_customerId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "invoices_bookingId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const payments = pgTable("payments", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	invoiceId: uuid(),
	bookingId: uuid(),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	currency: text().default('GBP').notNull(),
	type: paymentType().default('PAYMENT').notNull(),
	method: paymentMethod(),
	status: paymentStatus().default('PENDING').notNull(),
	provider: text(),
	providerRef: text(),
	paidAt: timestamp({ precision: 3, mode: 'date' }),
	refundedAt: timestamp({ precision: 3, mode: 'date' }),
	description: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	index("payments_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("payments_invoiceId_idx").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	index("payments_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "payments_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [customers.id],
		name: "payments_customerId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.invoiceId],
		foreignColumns: [invoices.id],
		name: "payments_invoiceId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "payments_bookingId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const reviews = pgTable("reviews", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	customerName: text().notNull(),
	customerEmail: text().notNull(),
	bookingId: uuid(),
	staffId: uuid(),
	serviceId: uuid(),
	rating: integer().default(5).notNull(),
	text: text(),
	source: reviewSource().default('PRIVATE').notNull(),
	isPublic: boolean().default(true).notNull(),
	issueCategory: reviewIssueCategory(),
	resolutionStatus: reviewResolutionStatus(),
	resolutionNotes: text(),
	resolvedAt: timestamp({ precision: 3, mode: 'date' }),
	resolvedBy: uuid(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'date' }),
}, (table) => [
	index("reviews_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("reviews_createdAt_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("reviews_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("reviews_staffId_idx").using("btree", table.staffId.asc().nullsLast().op("uuid_ops")),
	index("reviews_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "reviews_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [customers.id],
		name: "reviews_customerId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "reviews_bookingId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.serviceId],
		foreignColumns: [services.id],
		name: "reviews_serviceId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.resolvedBy],
		foreignColumns: [users.id],
		name: "reviews_resolvedBy_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.staffId],
		foreignColumns: [users.id],
		name: "reviews_staffId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const reviewRequests = pgTable("review_requests", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	customerName: text().notNull(),
	customerEmail: text().notNull(),
	bookingId: uuid().notNull(),
	sentAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	sentBy: uuid(),
	status: reviewRequestStatus().default('PENDING').notNull(),
	respondedAt: timestamp({ precision: 3, mode: 'date' }),
	ratingGiven: integer(),
	responseSource: reviewSource(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("review_requests_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("review_requests_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("review_requests_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("review_requests_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "review_requests_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [customers.id],
		name: "review_requests_customerId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "review_requests_bookingId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
		columns: [table.sentBy],
		foreignColumns: [users.id],
		name: "review_requests_sentBy_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const reviewAutomationSettings = pgTable("review_automation_settings", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	enabled: boolean().default(true).notNull(),
	timing: reviewTiming().default('HOURS_24').notNull(),
	preScreenEnabled: boolean().default(true).notNull(),
	messageTemplate: text().notNull(),
	googleEnabled: boolean().default(false).notNull(),
	facebookEnabled: boolean().default(false).notNull(),
	privateEnabled: boolean().default(true).notNull(),
	autoPublicMinRating: integer().default(4).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	updatedBy: uuid(),
}, (table) => [
	uniqueIndex("review_automation_settings_tenantId_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "review_automation_settings_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.updatedBy],
		foreignColumns: [users.id],
		name: "review_automation_settings_updatedBy_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const formTemplates = pgTable("form_templates", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	fields: jsonb().notNull(),
	attachedServices: uuid().array(),
	sendTiming: formSendTiming().default('ON_BOOKING').notNull(),
	completionRequired: boolean().default(false).notNull(),
	allowGuestAccess: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	active: boolean().default(true).notNull(),
	isPublic: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	updatedBy: uuid(),
}, (table) => [
	index("form_templates_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("form_templates_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "form_templates_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
])

export const completedForms = pgTable("completed_forms", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	templateId: uuid().notNull(),
	templateName: text().notNull(),
	customerId: uuid().notNull(),
	customerName: text().notNull(),
	customerEmail: text().notNull(),
	bookingId: uuid(),
	responses: jsonb().notNull(),
	signature: text(),
	submittedAt: timestamp({ precision: 3, mode: 'date' }),
	ipAddress: text(),
	userAgent: text(),
	sessionKey: text(),
	status: formStatus().default('PENDING').notNull(),
	submittedBy: uuid(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }),
	reminderSentAt: timestamp({ precision: 3, mode: 'date' }),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("completed_forms_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("completed_forms_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("completed_forms_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("completed_forms_submittedAt_idx").using("btree", table.submittedAt.asc().nullsLast().op("timestamp_ops")),
	index("completed_forms_templateId_idx").using("btree", table.templateId.asc().nullsLast().op("uuid_ops")),
	index("completed_forms_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "completed_forms_tenantId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [formTemplates.id],
		name: "completed_forms_templateId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [customers.id],
		name: "completed_forms_customerId_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.bookingId],
		foreignColumns: [bookings.id],
		name: "completed_forms_bookingId_fkey"
	}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
		columns: [table.submittedBy],
		foreignColumns: [users.id],
		name: "completed_forms_submittedBy_fkey"
	}).onUpdate("cascade").onDelete("set null"),
])

export const signupRequest = pgTable("SignupRequest", {
	id: uuid().primaryKey().notNull(),
	businessName: text().notNull(),
	contactName: text().notNull(),
	email: text().notNull(),
	phone: text(),
	industry: text().notNull(),
	message: text(),
	status: text().default('PENDING').notNull(),
	tenantId: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
})
