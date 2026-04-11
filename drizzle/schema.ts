import { pgTable, uniqueIndex, index, foreignKey, uuid, text, integer, timestamp, bigint, jsonb, boolean, unique, numeric, date, varchar, check, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const assignmentStatus = pgEnum("AssignmentStatus", ['ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
export const auditSeverity = pgEnum("AuditSeverity", ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
export const availabilityMode = pgEnum("AvailabilityMode", ['CALENDAR_BASED', 'SLOT_BASED', 'HYBRID'])
export const availabilityType = pgEnum("AvailabilityType", ['RECURRING', 'SPECIFIC', 'BLOCKED'])
export const bookingSource = pgEnum("BookingSource", ['ADMIN', 'PORTAL', 'PHONE', 'WALK_IN', 'API'])
export const bookingStatus = pgEnum("BookingStatus", ['PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
export const calendarIntegrationProvider = pgEnum("CalendarIntegrationProvider", ['GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR'])
export const calendarSyncType = pgEnum("CalendarSyncType", ['FULL_SYNC', 'INCREMENTAL_SYNC', 'MANUAL_SYNC', 'BOOKING_PUSH', 'EVENT_IMPORT'])
export const capacityEnforcementMode = pgEnum("CapacityEnforcementMode", ['STRICT', 'FLEXIBLE'])
export const capacityMode = pgEnum("CapacityMode", ['TENANT_LEVEL', 'CALENDAR_LEVEL', 'STAFF_LEVEL'])
export const capacityUnit = pgEnum("CapacityUnit", ['COUNT', 'HOURS', 'POINTS'])
export const checklistStatus = pgEnum("ChecklistStatus", ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
export const checklistTemplateType = pgEnum("ChecklistTemplateType", ['ONBOARDING', 'OFFBOARDING'])
export const customFieldType = pgEnum("CustomFieldType", ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE'])
export const customerStatus = pgEnum("CustomerStatus", ['ACTIVE', 'INACTIVE', 'BLOCKED'])
export const employeeType = pgEnum("EmployeeType", ['EMPLOYEE', 'CONTRACTOR', 'FREELANCER'])
export const formSendTiming = pgEnum("FormSendTiming", ['ON_BOOKING', 'HOURS_24_BEFORE', 'DAYS_1_BEFORE', 'MANUAL'])
export const formStatus = pgEnum("FormStatus", ['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
export const integrationProvider = pgEnum("IntegrationProvider", ['GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'FREEAGENT', 'XERO', 'QUICKBOOKS', 'STRIPE', 'GOCARDLESS', 'TWILIO', 'SENDGRID'])
export const integrationStatus = pgEnum("IntegrationStatus", ['DISCONNECTED', 'CONNECTED', 'ERROR', 'EXPIRED'])
export const invoiceStatus = pgEnum("InvoiceStatus", ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'REFUNDED'])
export const locationType = pgEnum("LocationType", ['VENUE', 'CUSTOMER_HOME', 'CUSTOMER_WORK', 'OTHER'])
export const messageChannel = pgEnum("MessageChannel", ['EMAIL', 'SMS', 'PUSH'])
export const messageStatus = pgEnum("MessageStatus", ['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'])
export const moduleCategory = pgEnum("ModuleCategory", ['CORE', 'PREMIUM', 'CUSTOM', 'COMING_SOON'])
export const noteType = pgEnum("NoteType", ['GENERAL', 'CLINICAL', 'ADMIN', 'FOLLOW_UP'])
export const payRateType = pgEnum("PayRateType", ['HOURLY', 'DAILY', 'SALARY', 'COMMISSION', 'PIECE_RATE'])
export const paymentMethod = pgEnum("PaymentMethod", ['CARD', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'CASH', 'CHEQUE', 'OTHER'])
export const paymentStatus = pgEnum("PaymentStatus", ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'])
export const paymentType = pgEnum("PaymentType", ['DEPOSIT', 'PAYMENT', 'REFUND', 'CREDIT'])
export const planType = pgEnum("PlanType", ['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM'])
export const proficiencyLevel = pgEnum("ProficiencyLevel", ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
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
export const settingType = pgEnum("SettingType", ['BOOLEAN', 'NUMBER', 'TEXT', 'SELECT', 'JSON'])
export const skillType = pgEnum("SkillType", ['SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM'])
export const staffStatus = pgEnum("StaffStatus", ['ACTIVE', 'ON_LEAVE', 'UNAVAILABLE', 'TERMINATED'])
export const syncDirection = pgEnum("SyncDirection", ['PUSH', 'PULL', 'BIDIRECTIONAL'])
export const syncStatus = pgEnum("SyncStatus", ['SUCCESS', 'FAILED', 'SKIPPED'])
export const taskPriority = pgEnum("TaskPriority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const taskStatus = pgEnum("TaskStatus", ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
export const taskType = pgEnum("TaskType", ['GENERAL', 'DEVELOPMENT', 'DESIGN', 'TESTING', 'DOCUMENTATION', 'MEETING', 'RESEARCH'])
export const tenantStatus = pgEnum("TenantStatus", ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'DELETED'])
export const userStatus = pgEnum("UserStatus", ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'])
export const userType = pgEnum("UserType", ['OWNER', 'ADMIN', 'MEMBER', 'CUSTOMER', 'API'])
export const workflowActionType = pgEnum("WorkflowActionType", ['SEND_EMAIL', 'SEND_SMS', 'CREATE_CALENDAR_EVENT', 'UPDATE_BOOKING_STATUS', 'SEND_NOTIFICATION', 'CREATE_TASK', 'WEBHOOK'])
export const workflowExecutionStatus = pgEnum("WorkflowExecutionStatus", ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'])
export const outreachActivityType = pgEnum("outreach_activity_type", ['SENT', 'REPLIED', 'BOUNCED', 'OPTED_OUT', 'SKIPPED', 'CALL_COMPLETED', 'MEETING_BOOKED', 'CONVERTED', 'UNDONE'])
export const outreachContactStatus = pgEnum("outreach_contact_status", ['ACTIVE', 'REPLIED', 'BOUNCED', 'OPTED_OUT', 'CONVERTED', 'PAUSED', 'COMPLETED'])
export const outreachReplyCategory = pgEnum("outreach_reply_category", ['INTERESTED', 'NOT_NOW', 'NOT_INTERESTED', 'WRONG_PERSON', 'AUTO_REPLY'])
export const outreachSentiment = pgEnum("outreach_sentiment", ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_NOW'])
export const pipelineStageType = pgEnum("pipeline_stage_type", ['OPEN', 'WON', 'LOST'])


export const apiKeys = pgTable("api_keys", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	keyHash: text().notNull(),
	keyPrefix: text().notNull(),
	scopes: text().array(),
	rateLimit: integer().default(1000).notNull(),
	allowedIps: text().array(),
	allowedOrigins: text().array(),
	lastUsedAt: timestamp({ precision: 3, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageCount: bigint({ mode: "number" }).default(0).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	revokedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: uuid(),
}, (table) => [
	uniqueIndex("api_keys_keyHash_key").using("btree", table.keyHash.asc().nullsLast().op("text_ops")),
	index("api_keys_keyPrefix_idx").using("btree", table.keyPrefix.asc().nullsLast().op("text_ops")),
	index("api_keys_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "api_keys_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const portalTemplates = pgTable("portal_templates", {
	id: uuid().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	industry: text().notNull(),
	colorScheme: jsonb().notNull(),
	fonts: jsonb(),
	logoPosition: text().default('left').notNull(),
	stepFlow: jsonb().notNull(),
	requiresLocation: boolean().default(true).notNull(),
	locationTypes: text().array(),
	formSchema: jsonb().notNull(),
	defaultAvailabilityMode: availabilityMode().default('SLOT_BASED').notNull(),
	requiresApproval: boolean().default(false).notNull(),
	reservationMinutes: integer().default(15).notNull(),
	isActive: boolean().default(true).notNull(),
	isSystemTemplate: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	previewImage: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	skipReservation: boolean().default(false).notNull(),
}, (table) => [
	uniqueIndex("portal_templates_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const roles = pgTable("roles", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	color: text(),
	isSystem: boolean().default(false).notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("roles_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("roles_tenantId_name_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "roles_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	email: text().notNull(),
	emailVerified: timestamp({ precision: 3, mode: 'string' }),
	passwordHash: text(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	displayName: text(),
	avatarUrl: text(),
	phone: text(),
	phoneVerified: timestamp({ precision: 3, mode: 'string' }),
	timezone: text().default('Europe/London').notNull(),
	locale: text().default('en-GB').notNull(),
	type: userType().default('MEMBER').notNull(),
	status: userStatus().default('PENDING').notNull(),
	lastLoginAt: timestamp({ precision: 3, mode: 'string' }),
	lastActiveAt: timestamp({ precision: 3, mode: 'string' }),
	loginCount: integer().default(0).notNull(),
	failedLoginAttempts: integer().default(0).notNull(),
	lockedUntil: timestamp({ precision: 3, mode: 'string' }),
	twoFactorEnabled: boolean().default(false).notNull(),
	twoFactorSecret: text(),
	recoveryCodesHash: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
	invitedById: uuid(),
	isPlatformAdmin: boolean().default(false).notNull(),
	workosUserId: text("workos_user_id"),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("users_tenantId_email_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("text_ops")),
	index("users_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.invitedById],
			foreignColumns: [table.id],
			name: "users_invitedById_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	unique("users_workos_user_id_unique").on(table.workosUserId),
]);

export const permissions = pgTable("permissions", {
	id: uuid().primaryKey().notNull(),
	resource: text().notNull(),
	action: text().notNull(),
	description: text(),
}, (table) => [
	uniqueIndex("permissions_resource_action_key").using("btree", table.resource.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("text_ops")),
]);

export const sessions = pgTable("sessions", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	token: text().notNull(),
	refreshToken: text(),
	userAgent: text(),
	ipAddress: text(),
	deviceType: text(),
	deviceName: text(),
	country: text(),
	city: text(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	lastUsedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	revokedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	uniqueIndex("sessions_refreshToken_key").using("btree", table.refreshToken.asc().nullsLast().op("text_ops")),
	index("sessions_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	uniqueIndex("sessions_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("sessions_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const tenants = pgTable("tenants", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	domain: text(),
	plan: planType().default('STARTER').notNull(),
	status: tenantStatus().default('ACTIVE').notNull(),
	stripeCustomerId: text(),
	subscriptionId: text(),
	billingEmail: text(),
	maxUsers: integer().default(5).notNull(),
	maxStaff: integer().default(10).notNull(),
	maxBookingsMonth: integer().default(500).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageUsedBytes: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	storageLimitBytes: bigint({ mode: "number" }).default(sql`'5368709120'`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	trialEndsAt: timestamp({ precision: 3, mode: 'string' }),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
	productId: uuid(),
	planId: uuid(),
}, (table) => [
	uniqueIndex("tenants_domain_key").using("btree", table.domain.asc().nullsLast().op("text_ops")),
	index("tenants_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("tenants_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("tenants_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const services = pgTable("services", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	durationMinutes: integer().notNull(),
	bufferMinutes: integer().default(0).notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	taxRate: numeric({ precision: 5, scale:  4 }).default('0').notNull(),
	requiresDeposit: boolean().default(false).notNull(),
	depositAmount: numeric({ precision: 10, scale:  2 }),
	depositPercent: integer(),
	color: text(),
	sortOrder: integer().default(0).notNull(),
	active: boolean().default(true).notNull(),
	visibleInPortal: boolean().default(true).notNull(),
	categoryId: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	entertainer: text(),
	icon: text(),
	locationType: text(),
	metadata: jsonb(),
	requiresApproximateTime: boolean().default(false).notNull(),
	venueNames: text().array(),
}, (table) => [
	index("services_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("services_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "services_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [serviceCategories.id],
			name: "services_categoryId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const serviceCategories = pgTable("service_categories", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	sortOrder: integer().default(0).notNull(),
}, (table) => [
	uniqueIndex("service_categories_tenantId_name_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
]);

export const customers = pgTable("customers", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	email: text(),
	phone: text(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	county: text(),
	postcode: text(),
	country: text().default('GB').notNull(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	preferredStaffId: uuid(),
	notes: text(),
	tags: text().array(),
	marketingOptIn: boolean().default(false).notNull(),
	referralSource: text(),
	status: customerStatus().default('ACTIVE').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
	version: integer().default(1).notNull(),
	anonymisedAt: timestamp("anonymised_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("customers_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("customers_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	uniqueIndex("customers_tenantId_email_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("uuid_ops")),
	index("customers_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("customers_tenantId_lastName_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.lastName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "customers_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.preferredStaffId],
			foreignColumns: [users.id],
			name: "customers_preferredStaffId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const addOns = pgTable("add_ons", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	priceType: text().notNull(),
	fixedPrice: numeric({ precision: 10, scale:  2 }),
	perChildPrice: numeric({ precision: 10, scale:  2 }),
	tieredPricing: jsonb(),
	matchedDonation: boolean().default(false).notNull(),
	birthdayChildFree: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("add_ons_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("add_ons_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "add_ons_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const venues = pgTable("venues", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	addressLine1: text(),
	addressLine2: text(),
	city: text(),
	county: text(),
	postcode: text(),
	country: text().default('GB').notNull(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	phone: text(),
	email: text(),
	isDefault: boolean().default(false).notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	additionalCost: numeric({ precision: 10, scale:  2 }),
}, (table) => [
	index("venues_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "venues_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userCapacities = pgTable("user_capacities", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid(),
	date: date().notNull(),
	maxBookings: integer().default(1).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("user_capacities_tenantId_date_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("user_capacities_tenantId_userId_date_key").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.userId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_capacities_userId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "user_capacities_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const bookings = pgTable("bookings", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	bookingNumber: text().notNull(),
	customerId: uuid().notNull(),
	serviceId: uuid().notNull(),
	staffId: uuid(),
	venueId: uuid(),
	scheduledDate: date().notNull(),
	scheduledTime: text().notNull(),
	durationMinutes: integer().notNull(),
	endTime: text(),
	locationType: locationType().default('VENUE').notNull(),
	locationAddress: jsonb(),
	travelMinutes: integer(),
	travelMiles: numeric({ precision: 6, scale:  2 }),
	status: bookingStatus().default('PENDING').notNull(),
	statusChangedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	approvalRequestedAt: timestamp({ precision: 3, mode: 'string' }),
	approvalDeadlineAt: timestamp({ precision: 3, mode: 'string' }),
	approvedAt: timestamp({ precision: 3, mode: 'string' }),
	approvedById: uuid(),
	rejectionReason: text(),
	reservedAt: timestamp({ precision: 3, mode: 'string' }),
	reservationExpiresAt: timestamp({ precision: 3, mode: 'string' }),
	price: numeric({ precision: 10, scale:  2 }),
	taxAmount: numeric({ precision: 10, scale:  2 }),
	totalAmount: numeric({ precision: 10, scale:  2 }),
	depositRequired: numeric({ precision: 10, scale:  2 }),
	depositPaid: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	depositPaidAt: timestamp({ precision: 3, mode: 'string' }),
	customerNotes: text(),
	adminNotes: text(),
	source: bookingSource().default('ADMIN').notNull(),
	cancelledAt: timestamp({ precision: 3, mode: 'string' }),
	cancelledBy: uuid(),
	cancellationReason: text(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdById: uuid(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	projectId: uuid(),
	requiresApproval: boolean().default(false).notNull(),
	slotId: uuid(),
	customServiceName: text(),
	mileageCost: numeric({ precision: 10, scale:  2 }),
	confirmationTokenHash: text(),
	version: integer().default(1).notNull(),
}, (table) => [
	index("bookings_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("bookings_staffId_idx").using("btree", table.staffId.asc().nullsLast().op("uuid_ops")),
	index("bookings_staffId_scheduledDate_idx").using("btree", table.staffId.asc().nullsLast().op("date_ops"), table.scheduledDate.asc().nullsLast().op("date_ops")),
	index("bookings_tenantId_createdAt_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	index("bookings_tenantId_scheduledDate_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.scheduledDate.asc().nullsLast().op("uuid_ops")),
	index("bookings_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "bookings_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "bookings_customerId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "bookings_venueId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.approvedById],
			foreignColumns: [users.id],
			name: "bookings_approvedById_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "bookings_createdById_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "bookings_serviceId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.slotId],
			foreignColumns: [availableSlots.id],
			name: "bookings_slotId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [users.id],
			name: "bookings_staffId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const customerNotes = pgTable("customer_notes", {
	id: uuid().primaryKey().notNull(),
	customerId: uuid().notNull(),
	bookingId: uuid(),
	content: text().notNull(),
	type: noteType().default('GENERAL').notNull(),
	isPinned: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: uuid(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("customer_notes_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_notes_customerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "customer_notes_bookingId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const bookingStatusHistory = pgTable("booking_status_history", {
	id: uuid().primaryKey().notNull(),
	bookingId: uuid().notNull(),
	fromStatus: bookingStatus(),
	toStatus: bookingStatus().notNull(),
	reason: text(),
	changedById: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("booking_status_history_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "booking_status_history_bookingId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.changedById],
			foreignColumns: [users.id],
			name: "booking_status_history_changedById_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const travelLogs = pgTable("travel_logs", {
	id: uuid().primaryKey().notNull(),
	bookingId: uuid(),
	date: date().notNull(),
	fromPostcode: text(),
	toPostcode: text(),
	distanceMiles: numeric({ precision: 6, scale:  2 }).notNull(),
	durationMins: integer().notNull(),
	mileageRate: numeric({ precision: 10, scale:  4 }),
	mileageCost: numeric({ precision: 10, scale:  2 }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: uuid().notNull(),
}, (table) => [
	index("travel_logs_userId_date_idx").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "travel_logs_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const availableSlots = pgTable("available_slots", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	date: date().notNull(),
	time: text().notNull(),
	endTime: text(),
	available: boolean().default(true).notNull(),
	staffIds: uuid().array(),
	serviceIds: uuid().array(),
	venueId: uuid(),
	capacity: integer().default(1).notNull(),
	bookedCount: integer().default(0).notNull(),
	requiresApproval: boolean().default(false).notNull(),
	approvedAt: timestamp({ precision: 3, mode: 'string' }),
	approvedBy: uuid(),
	metadata: jsonb(),
	sortOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	estimatedLocation: text(),
	previousSlotId: uuid(),
	travelTimeFromPrev: integer(),
}, (table) => [
	index("available_slots_tenantId_available_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.available.asc().nullsLast().op("bool_ops")),
	index("available_slots_tenantId_date_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("available_slots_tenantId_date_time_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops"), table.time.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "available_slots_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "available_slots_venueId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.previousSlotId],
			foreignColumns: [table.id],
			name: "available_slots_previousSlotId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const userAvailability = pgTable("user_availability", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	type: availabilityType().notNull(),
	dayOfWeek: integer(),
	specificDate: date(),
	endDate: date(),
	startTime: text().notNull(),
	endTime: text().notNull(),
	reason: text(),
	isAllDay: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("user_availability_userId_dayOfWeek_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.dayOfWeek.asc().nullsLast().op("int4_ops")),
	index("user_availability_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_availability_userId_specificDate_idx").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.specificDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_availability_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const appointmentCompletions = pgTable("appointment_completions", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	bookingId: uuid().notNull(),
	customerId: uuid().notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedBy: uuid().notNull(),
	durationMinutes: integer(),
	actualStartTime: timestamp({ precision: 3, mode: 'string' }),
	actualEndTime: timestamp({ precision: 3, mode: 'string' }),
	sessionNotes: text(),
	nextAppointment: timestamp({ precision: 3, mode: 'string' }),
	followUpRequired: boolean().default(false).notNull(),
	paymentCollected: numeric({ precision: 10, scale:  2 }),
	paymentMethod: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("appointment_completions_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("appointment_completions_bookingId_key").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("appointment_completions_completedAt_idx").using("btree", table.completedAt.asc().nullsLast().op("timestamp_ops")),
	index("appointment_completions_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("appointment_completions_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "appointment_completions_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "appointment_completions_bookingId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "appointment_completions_customerId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.completedBy],
			foreignColumns: [users.id],
			name: "appointment_completions_completedBy_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	userId: uuid().primaryKey().notNull(),
	emailEnabled: boolean().default(true).notNull(),
	pushEnabled: boolean().default(true).notNull(),
	smsEnabled: boolean().default(false).notNull(),
	typePreferences: jsonb(),
	quietHoursEnabled: boolean().default(false).notNull(),
	quietHoursStart: text(),
	quietHoursEnd: text(),
	quietHoursDays: integer().array(),
	digestEnabled: boolean().default(false).notNull(),
	digestFrequency: text(),
	digestTime: text(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const sentMessages = pgTable("sent_messages", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	templateId: uuid(),
	channel: messageChannel().notNull(),
	trigger: text(),
	recipientType: text().notNull(),
	recipientId: uuid().notNull(),
	recipientEmail: text(),
	recipientPhone: text(),
	bookingId: uuid(),
	subject: text(),
	body: text().notNull(),
	status: messageStatus().default('QUEUED').notNull(),
	sentAt: timestamp({ precision: 3, mode: 'string' }),
	deliveredAt: timestamp({ precision: 3, mode: 'string' }),
	failedAt: timestamp({ precision: 3, mode: 'string' }),
	errorMessage: text(),
	providerRef: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("sentMessages_tenantId_bookingId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("sent_messages_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	index("sent_messages_tenantId_createdAt_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "sent_messages_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [messageTemplates.id],
			name: "sent_messages_templateId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "sent_messages_bookingId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const messageTemplates = pgTable("message_templates", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	trigger: text().notNull(),
	channel: messageChannel().notNull(),
	subject: text(),
	body: text().notNull(),
	bodyHtml: text(),
	active: boolean().default(true).notNull(),
	isSystem: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	serviceId: uuid(),
}, (table) => [
	index("message_templates_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("message_templates_tenantId_trigger_channel_serviceId_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.trigger.asc().nullsLast().op("text_ops"), table.channel.asc().nullsLast().op("text_ops"), table.serviceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "message_templates_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "message_templates_serviceId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const integrations = pgTable("integrations", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	provider: integrationProvider().notNull(),
	status: integrationStatus().default('DISCONNECTED').notNull(),
	accessToken: text(),
	refreshToken: text(),
	tokenExpiresAt: timestamp({ precision: 3, mode: 'string' }),
	config: jsonb(),
	lastSyncAt: timestamp({ precision: 3, mode: 'string' }),
	lastSyncError: text(),
	connectedAt: timestamp({ precision: 3, mode: 'string' }),
	connectedBy: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("integrations_tenantId_provider_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("uuid_ops")),
]);

export const notifications = pgTable("notifications", {
	id: uuid().primaryKey().notNull(),
	userId: uuid().notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	entityType: text(),
	entityId: uuid(),
	actionUrl: text(),
	read: boolean().default(false).notNull(),
	readAt: timestamp({ precision: 3, mode: 'string' }),
	dismissed: boolean().default(false).notNull(),
	channels: text().array(),
	emailSent: boolean().default(false).notNull(),
	pushSent: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("notifications_userId_createdAt_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("notifications_userId_read_idx").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.read.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const oauthStates = pgTable("oauth_states", {
	id: uuid().primaryKey().notNull(),
	state: text().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	staffId: uuid(),
	provider: calendarIntegrationProvider().notNull(),
	redirectUrl: text(),
	metadata: jsonb(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	usedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	codeVerifier: text().notNull(),
}, (table) => [
	index("oauth_states_expiresAt_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("oauth_states_state_idx").using("btree", table.state.asc().nullsLast().op("text_ops")),
	uniqueIndex("oauth_states_state_key").using("btree", table.state.asc().nullsLast().op("text_ops")),
]);

export const userIntegrationSyncLogs = pgTable("user_integration_sync_logs", {
	id: uuid().primaryKey().notNull(),
	userIntegrationId: uuid().notNull(),
	syncType: calendarSyncType().notNull(),
	direction: syncDirection().notNull(),
	status: syncStatus().notNull(),
	entityType: text(),
	entityId: uuid(),
	externalId: text(),
	itemsProcessed: integer().default(0).notNull(),
	itemsSucceeded: integer().default(0).notNull(),
	itemsFailed: integer().default(0).notNull(),
	errorMessage: text(),
	errorDetails: jsonb(),
	metadata: jsonb(),
	startedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	durationMs: integer(),
	externalEventId: text(),
}, (table) => [
	index("user_integration_sync_logs_externalEventId_idx").using("btree", table.externalEventId.asc().nullsLast().op("text_ops")),
	index("user_integration_sync_logs_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("user_integration_sync_logs_syncType_idx").using("btree", table.syncType.asc().nullsLast().op("enum_ops")),
	index("user_integration_sync_logs_userIntegrationId_startedAt_idx").using("btree", table.userIntegrationId.asc().nullsLast().op("timestamp_ops"), table.startedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.userIntegrationId],
			foreignColumns: [userIntegrations.id],
			name: "user_integration_sync_logs_userIntegrationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userIntegrations = pgTable("user_integrations", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	provider: calendarIntegrationProvider().notNull(),
	status: integrationStatus().default('DISCONNECTED').notNull(),
	encryptedAccessToken: text(),
	encryptedRefreshToken: text(),
	tokenExpiresAt: timestamp({ precision: 3, mode: 'string' }),
	tokenVersion: integer().default(1).notNull(),
	providerAccountId: text(),
	calendarId: text(),
	syncEnabled: boolean().default(true).notNull(),
	pushBookingsToCalendar: boolean().default(true).notNull(),
	blockTimeOnCalendar: boolean().default(true).notNull(),
	importCalendarEvents: boolean().default(false).notNull(),
	twoWaySync: boolean().default(false).notNull(),
	syncToken: text(),
	watchChannelId: text(),
	watchChannelToken: text(),
	watchChannelExpiration: timestamp({ precision: 3, mode: 'string' }),
	watchResourceId: text(),
	lastSyncAt: timestamp({ precision: 3, mode: 'string' }),
	lastSyncStatus: text(),
	lastSyncError: text(),
	nextSyncAt: timestamp({ precision: 3, mode: 'string' }),
	connectedAt: timestamp({ precision: 3, mode: 'string' }),
	connectedBy: uuid(),
	disconnectedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("user_integrations_lastSyncAt_idx").using("btree", table.lastSyncAt.asc().nullsLast().op("timestamp_ops")),
	index("user_integrations_provider_status_idx").using("btree", table.provider.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("user_integrations_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("user_integrations_tenantId_userId_provider_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("uuid_ops")),
	index("user_integrations_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_integrations_watchChannelExpiration_idx").using("btree", table.watchChannelExpiration.asc().nullsLast().op("timestamp_ops")),
	index("user_integrations_watchChannelId_idx").using("btree", table.watchChannelId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.connectedBy],
			foreignColumns: [users.id],
			name: "user_integrations_connectedBy_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_integrations_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("audit_logs_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("audit_logs_tenantId_createdAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_tenantId_entityType_entityId_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
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
]);

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
	senderName: text(),
	senderEmail: text(),
	replyToEmail: text(),
	emailFooter: text(),
	smsSignature: text(),
	customerLabel: text().default('customer').notNull(),
	bookingLabel: text().default('booking').notNull(),
	staffLabel: text().default('staff').notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	customCss: text(),
	fontFamily: text(),
	secondaryColor: text(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "organization_settings_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const invoices = pgTable("invoices", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	invoiceNumber: text().notNull(),
	customerId: uuid().notNull(),
	bookingId: uuid(),
	subtotal: numeric({ precision: 10, scale:  2 }).notNull(),
	taxAmount: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	discountAmount: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	totalAmount: numeric({ precision: 10, scale:  2 }).notNull(),
	amountPaid: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	amountDue: numeric({ precision: 10, scale:  2 }).notNull(),
	issueDate: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
	dueDate: date().notNull(),
	paidAt: timestamp({ precision: 3, mode: 'string' }),
	status: invoiceStatus().default('DRAFT').notNull(),
	lineItems: jsonb().notNull(),
	notes: text(),
	terms: text(),
	externalRef: text(),
	externalUrl: text(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	version: integer().default(1).notNull(),
}, (table) => [
	index("invoices_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("invoices_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("invoices_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("invoices_tenantId_invoiceNumber_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.invoiceNumber.asc().nullsLast().op("text_ops")),
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
]);

export const modules = pgTable("modules", {
	id: uuid().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: moduleCategory().default('CORE').notNull(),
	icon: text(),
	isActive: boolean().default(true).notNull(),
	setupFee: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	monthlyFee: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	features: jsonb().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("modules_category_idx").using("btree", table.category.asc().nullsLast().op("enum_ops")),
	index("modules_isActive_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("modules_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const payments = pgTable("payments", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	invoiceId: uuid(),
	bookingId: uuid(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	type: paymentType().default('PAYMENT').notNull(),
	method: paymentMethod(),
	status: paymentStatus().default('PENDING').notNull(),
	provider: text(),
	providerRef: text(),
	paidAt: timestamp({ precision: 3, mode: 'string' }),
	refundedAt: timestamp({ precision: 3, mode: 'string' }),
	description: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	stripeChargeId: text("stripe_charge_id"),
	stripeTransferId: text("stripe_transfer_id"),
	platformFeeAmount: numeric("platform_fee_amount", { precision: 10, scale:  2 }),
	idempotencyKey: text("idempotency_key"),
	gocardlessPaymentId: text("gocardless_payment_id"),
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
	unique("payments_stripe_payment_intent_id_unique").on(table.stripePaymentIntentId),
	unique("payments_idempotency_key_unique").on(table.idempotencyKey),
]);

export const projects = pgTable("projects", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	startDate: timestamp({ precision: 3, mode: 'string' }),
	endDate: timestamp({ precision: 3, mode: 'string' }),
	estimatedHours: integer(),
	actualHours: integer(),
	status: projectStatus().default('PLANNING').notNull(),
	priority: projectPriority().default('MEDIUM').notNull(),
	progress: integer().default(0).notNull(),
	budgetAmount: numeric({ precision: 10, scale:  2 }),
	actualCost: numeric({ precision: 10, scale:  2 }),
	type: projectType().default('INTERNAL').notNull(),
	isVisible: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("projects_startDate_idx").using("btree", table.startDate.asc().nullsLast().op("timestamp_ops")),
	index("projects_tenantId_priority_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.priority.asc().nullsLast().op("uuid_ops")),
	index("projects_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "projects_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const projectMembers = pgTable("project_members", {
	id: uuid().primaryKey().notNull(),
	projectId: uuid().notNull(),
	userId: uuid().notNull(),
	role: projectRole().default('MEMBER').notNull(),
	responsibilities: text().array().default([""]),
	weeklyHours: integer(),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	status: projectMemberStatus().default('ACTIVE').notNull(),
	joinedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	leftAt: timestamp({ precision: 3, mode: 'string' }),
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
]);

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const featureFlags = pgTable("feature_flags", {
	id: uuid().primaryKey().notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	category: text(),
	defaultValue: boolean().default(false).notNull(),
	defaultConfig: jsonb(),
	configSchema: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("feature_flags_key_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

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
	submittedAt: timestamp({ precision: 3, mode: 'string' }),
	ipAddress: text(),
	userAgent: text(),
	sessionKey: text(),
	status: formStatus().default('PENDING').notNull(),
	submittedBy: uuid(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	reminderSentAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	updatedBy: uuid(),
}, (table) => [
	index("form_templates_tenantId_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.active.asc().nullsLast().op("bool_ops")),
	index("form_templates_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "form_templates_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const reviewRequests = pgTable("review_requests", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	customerName: text().notNull(),
	customerEmail: text().notNull(),
	bookingId: uuid().notNull(),
	sentAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	sentBy: uuid(),
	status: reviewRequestStatus().default('PENDING').notNull(),
	respondedAt: timestamp({ precision: 3, mode: 'string' }),
	ratingGiven: integer(),
	responseSource: reviewSource(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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
]);

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
	resolvedAt: timestamp({ precision: 3, mode: 'string' }),
	resolvedBy: uuid(),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
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
]);

export const tasks = pgTable("tasks", {
	id: uuid().primaryKey().notNull(),
	projectId: uuid().notNull(),
	tenantId: uuid().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('TODO').notNull(),
	priority: taskPriority().default('MEDIUM').notNull(),
	assignedTo: uuid(),
	dueDate: timestamp({ precision: 3, mode: 'string' }),
	estimatedHours: integer(),
	actualHours: integer(),
	dependsOn: uuid(),
	blocking: uuid().array(),
	type: taskType().default('GENERAL').notNull(),
	progress: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("tasks_assignedTo_dueDate_idx").using("btree", table.assignedTo.asc().nullsLast().op("timestamp_ops"), table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("tasks_dueDate_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("tasks_projectId_status_idx").using("btree", table.projectId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("tasks_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
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
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
});

export const tenantModuleSettings = pgTable("tenant_module_settings", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	moduleId: uuid().notNull(),
	settingKey: text().notNull(),
	value: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("tenant_module_settings_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("tenant_module_settings_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("tenant_module_settings_tenantId_moduleId_settingKey_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.moduleId.asc().nullsLast().op("text_ops"), table.settingKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tenant_module_settings_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "tenant_module_settings_moduleId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const tenantModules = pgTable("tenant_modules", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	moduleId: uuid().notNull(),
	isEnabled: boolean().default(false).notNull(),
	isCustom: boolean().default(false).notNull(),
	setupPaid: boolean().default(false).notNull(),
	monthlyRate: numeric({ precision: 10, scale:  2 }),
	config: jsonb(),
	activatedAt: timestamp({ precision: 3, mode: 'string' }),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("tenant_modules_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("tenant_modules_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("tenant_modules_tenantId_moduleId_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.moduleId.asc().nullsLast().op("uuid_ops")),
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
]);

export const workflows = pgTable("workflows", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	enabled: boolean().default(true).notNull(),
	conditions: jsonb(),
	delay: integer(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	edges: jsonb(),
	isVisual: boolean().default(false).notNull(),
	nodes: jsonb(),
	viewport: jsonb(),
	version: integer().default(1).notNull(),
}, (table) => [
	index("workflows_tenantId_enabled_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.enabled.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "workflows_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const workflowExecutions = pgTable("workflow_executions", {
	id: uuid().primaryKey().notNull(),
	workflowId: uuid().notNull(),
	tenantId: uuid().notNull(),
	triggerEvent: text().notNull(),
	triggerData: jsonb().notNull(),
	status: workflowExecutionStatus().default('PENDING').notNull(),
	startedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	errorMessage: text(),
	actionsExecuted: integer().default(0).notNull(),
	actionResults: jsonb(),
}, (table) => [
	index("workflow_executions_tenantId_startedAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("workflow_executions_workflowId_status_idx").using("btree", table.workflowId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_executions_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
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
]);

export const discountCodes = pgTable("discount_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	code: text().notNull(),
	pricingRuleId: uuid(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	maxUses: integer(),
	currentUses: integer().default(0).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("discount_codes_tenantId_code_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	index("discount_codes_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "discount_codes_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pricingRuleId],
			foreignColumns: [pricingRules.id],
			name: "discount_codes_pricingRuleId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const pricingRules = pgTable("pricing_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	enabled: boolean().default(true).notNull(),
	sortOrder: integer().default(0).notNull(),
	conditions: jsonb().default({"logic":"AND","conditions":[]}).notNull(),
	modifierType: text().notNull(),
	modifierValue: numeric({ precision: 10, scale:  4 }).notNull(),
	serviceIds: uuid().array(),
	staffIds: uuid().array(),
	validFrom: timestamp({ withTimezone: true, mode: 'string' }),
	validUntil: timestamp({ withTimezone: true, mode: 'string' }),
	maxUses: integer(),
	currentUses: integer().default(0).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pricing_rules_tenantId_enabled_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.enabled.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pricing_rules_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const metricSnapshots = pgTable("metric_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	metricKey: text().notNull(),
	dimensions: jsonb().default({}).notNull(),
	periodType: text().notNull(),
	periodStart: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	value: numeric().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("metric_snapshots_tenantId_metricKey_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.metricKey.asc().nullsLast().op("text_ops")),
	index("metric_snapshots_tenantId_periodStart_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamptz_ops"), table.periodStart.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "metric_snapshots_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const stripeConnectAccounts = pgTable("stripe_connect_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	stripeAccountId: text().notNull(),
	status: text().default('pending').notNull(),
	chargesEnabled: boolean().default(false).notNull(),
	payoutsEnabled: boolean().default(false).notNull(),
	requirements: jsonb(),
	capabilities: jsonb(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("stripe_connect_accounts_stripeAccountId_key").using("btree", table.stripeAccountId.asc().nullsLast().op("text_ops")),
	uniqueIndex("stripe_connect_accounts_tenantId_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "stripe_connect_accounts_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const impersonationSessions = pgTable("impersonation_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	platformAdminId: uuid().notNull(),
	tenantId: uuid().notNull(),
	targetTenantUserId: uuid(),
	startedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp({ withTimezone: true, mode: 'string' }),
	ipAddress: text(),
	userAgent: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("impersonation_sessions_platformAdminId_idx").using("btree", table.platformAdminId.asc().nullsLast().op("uuid_ops")).where(sql`("endedAt" IS NULL)`),
	index("impersonation_sessions_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.platformAdminId],
			foreignColumns: [users.id],
			name: "impersonation_sessions_platformAdminId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "impersonation_sessions_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.targetTenantUserId],
			foreignColumns: [users.id],
			name: "impersonation_sessions_targetTenantUserId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const sagaLog = pgTable("saga_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	sagaType: text().notNull(),
	entityId: uuid().notNull(),
	status: text().notNull(),
	steps: jsonb().default([]).notNull(),
	startedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp({ withTimezone: true, mode: 'string' }),
	errorMessage: text(),
	requiresManualIntervention: boolean().default(false).notNull(),
}, (table) => [
	index("saga_log_entityId_idx").using("btree", table.entityId.asc().nullsLast().op("uuid_ops")),
	index("saga_log_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
]);

export const taxRules = pgTable("tax_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	rate: numeric({ precision: 6, scale:  4 }).notNull(),
	country: text().notNull(),
	taxCode: text(),
	appliesTo: text().default('ALL').notNull(),
	isDefault: boolean().default(false).notNull(),
	isReverseCharge: boolean().default(false).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("tax_rules_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tax_rules_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	url: text().notNull(),
	secret: text().notNull(),
	description: text(),
	events: text().array().notNull(),
	status: text().default('ACTIVE').notNull(),
	failureCount: integer().default(0).notNull(),
	lastSuccessAt: timestamp({ withTimezone: true, mode: 'string' }),
	lastFailureAt: timestamp({ withTimezone: true, mode: 'string' }),
	lastFailureReason: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("webhook_endpoints_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "webhook_endpoints_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const tenantPortals = pgTable("tenant_portals", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	templateId: uuid().notNull(),
	urlPath: text().notNull(),
	displayName: text().notNull(),
	colorOverrides: jsonb(),
	labelOverrides: jsonb(),
	formOverrides: jsonb(),
	requiresLocation: boolean().default(true).notNull(),
	maxTravelMinutes: integer(),
	travelPadding: integer().default(15).notNull(),
	availabilityMode: availabilityMode(),
	isActive: boolean().default(true).notNull(),
	isDefault: boolean().default(false).notNull(),
	sortOrder: integer().default(0).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	skipReservation: boolean(),
	bookingSettings: jsonb(),
}, (table) => [
	index("tenant_portals_tenantId_isActive_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	uniqueIndex("tenant_portals_tenantId_urlPath_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.urlPath.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "tenant_portals_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [portalTemplates.id],
			name: "tenant_portals_templateId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const serviceAddOns = pgTable("service_add_ons", {
	id: uuid().primaryKey().notNull(),
	serviceId: uuid().notNull(),
	addOnId: uuid().notNull(),
}, (table) => [
	uniqueIndex("service_add_ons_serviceId_addOnId_key").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops"), table.addOnId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "service_add_ons_serviceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.addOnId],
			foreignColumns: [addOns.id],
			name: "service_add_ons_addOnId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const bookingWaitlist = pgTable("booking_waitlist", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	serviceId: uuid().notNull(),
	staffId: uuid(),
	preferredDate: date(),
	preferredTimeStart: text(),
	preferredTimeEnd: text(),
	flexibilityDays: integer().default(3).notNull(),
	status: text().default('WAITING').notNull(),
	notifiedAt: timestamp({ withTimezone: true, mode: 'string' }),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("booking_waitlist_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("booking_waitlist_tenantId_status_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "booking_waitlist_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "booking_waitlist_customerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "booking_waitlist_serviceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [users.id],
			name: "booking_waitlist_staffId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	endpointId: uuid().notNull(),
	eventType: text().notNull(),
	eventId: text().notNull(),
	payload: jsonb().notNull(),
	attempt: integer().default(1).notNull(),
	status: text().notNull(),
	responseStatus: integer(),
	responseBody: text(),
	durationMs: integer(),
	deliveredAt: timestamp({ withTimezone: true, mode: 'string' }),
	nextRetryAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("webhook_deliveries_endpointId_idx").using("btree", table.endpointId.asc().nullsLast().op("uuid_ops")),
	index("webhook_deliveries_eventId_idx").using("btree", table.eventId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.endpointId],
			foreignColumns: [webhookEndpoints.id],
			name: "webhook_deliveries_endpointId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const bookingAssignments = pgTable("booking_assignments", {
	id: uuid().primaryKey().notNull(),
	bookingId: uuid().notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("booking_assignments_bookingId_idx").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("booking_assignments_bookingId_userId_key").using("btree", table.bookingId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("booking_assignments_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "booking_assignments_bookingId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "booking_assignments_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const integrationSyncLogs = pgTable("integration_sync_logs", {
	id: uuid().primaryKey().notNull(),
	integrationId: uuid().notNull(),
	direction: syncDirection().notNull(),
	entityType: text().notNull(),
	localId: uuid(),
	remoteId: text(),
	status: syncStatus().notNull(),
	errorMessage: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("integration_sync_logs_integrationId_createdAt_idx").using("btree", table.integrationId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.integrationId],
			foreignColumns: [integrations.id],
			name: "integration_sync_logs_integrationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userExternalEvents = pgTable("user_external_events", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	userIntegrationId: uuid().notNull(),
	externalEventId: text().notNull(),
	provider: calendarIntegrationProvider().notNull(),
	summary: text().notNull(),
	description: text(),
	location: text(),
	startTime: timestamp({ precision: 3, mode: 'string' }).notNull(),
	endTime: timestamp({ precision: 3, mode: 'string' }).notNull(),
	isAllDay: boolean().default(false).notNull(),
	blocksAvailability: boolean().default(true).notNull(),
	attendees: jsonb(),
	metadata: jsonb(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("user_external_events_blocksAvailability_idx").using("btree", table.blocksAvailability.asc().nullsLast().op("bool_ops")),
	index("user_external_events_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("user_external_events_userId_endTime_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.endTime.asc().nullsLast().op("timestamp_ops")),
	index("user_external_events_userId_startTime_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.startTime.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("user_external_events_userIntegrationId_externalEventId_key").using("btree", table.userIntegrationId.asc().nullsLast().op("text_ops"), table.externalEventId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userIntegrationId],
			foreignColumns: [userIntegrations.id],
			name: "user_external_events_userIntegrationId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_external_events_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "user_external_events_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("module_settings_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("module_settings_moduleId_idx").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("module_settings_moduleId_key_key").using("btree", table.moduleId.asc().nullsLast().op("text_ops"), table.key.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "module_settings_moduleId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const workflowActions = pgTable("workflow_actions", {
	id: uuid().primaryKey().notNull(),
	workflowId: uuid().notNull(),
	actionType: workflowActionType().notNull(),
	config: jsonb().notNull(),
	order: integer().default(0).notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("workflow_actions_workflowId_order_idx").using("btree", table.workflowId.asc().nullsLast().op("int4_ops"), table.order.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_actions_workflowId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const resourceAssignments = pgTable("resource_assignments", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	moduleSlug: text().notNull(),
	resourceType: text().notNull(),
	resourceId: uuid().notNull(),
	status: assignmentStatus().default('ASSIGNED').notNull(),
	weight: numeric({ precision: 4, scale:  2 }).default('1.00').notNull(),
	scheduledDate: date(),
	assignedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	startedAt: timestamp({ precision: 3, mode: 'string' }),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	assignedBy: uuid(),
	overrideReason: text(),
	metadata: jsonb(),
}, (table) => [
	index("resource_assignments_resourceId_idx").using("btree", table.resourceId.asc().nullsLast().op("uuid_ops")),
	index("resource_assignments_tenantId_moduleSlug_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.moduleSlug.asc().nullsLast().op("uuid_ops")),
	index("resource_assignments_tenant_user_status_date_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("uuid_ops"), table.scheduledDate.asc().nullsLast().op("uuid_ops")),
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
]);

export const resourceCapacities = pgTable("resource_capacities", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	capacityType: text().notNull(),
	maxConcurrent: integer(),
	maxDaily: integer(),
	maxWeekly: integer(),
	unit: capacityUnit().default('COUNT').notNull(),
	effectiveFrom: date().notNull(),
	effectiveUntil: date(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("resource_capacities_tenantId_userId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("resource_capacities_tenant_user_type_from_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.capacityType.asc().nullsLast().op("uuid_ops"), table.effectiveFrom.asc().nullsLast().op("date_ops")),
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
]);

export const staffCustomFieldDefinitions = pgTable("staff_custom_field_definitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	fieldKey: text().notNull(),
	label: text().notNull(),
	fieldType: customFieldType().notNull(),
	options: jsonb(),
	isRequired: boolean().default(false).notNull(),
	showOnCard: boolean().default(false).notNull(),
	showOnProfile: boolean().default(true).notNull(),
	sortOrder: integer().default(0).notNull(),
	groupName: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("staff_custom_field_defs_tenantId_fieldKey_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.fieldKey.asc().nullsLast().op("text_ops")),
	index("staff_custom_field_defs_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_custom_field_defs_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffChecklistProgress = pgTable("staff_checklist_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	templateId: uuid().notNull(),
	status: checklistStatus().default('NOT_STARTED').notNull(),
	items: jsonb().notNull(),
	startedAt: timestamp({ precision: 3, mode: 'string' }),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("staff_checklist_progress_tenantId_userId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_checklist_progress_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_checklist_progress_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [staffChecklistTemplates.id],
			name: "staff_checklist_progress_templateId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffChecklistTemplates = pgTable("staff_checklist_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	type: checklistTemplateType().default('ONBOARDING').notNull(),
	employeeType: text(),
	items: jsonb().notNull(),
	isDefault: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("staff_checklist_templates_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_checklist_templates_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffCustomFieldValues = pgTable("staff_custom_field_values", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	fieldDefinitionId: uuid().notNull(),
	value: jsonb().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("staff_custom_field_vals_tenant_user_field_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.fieldDefinitionId.asc().nullsLast().op("uuid_ops")),
	index("staff_custom_field_vals_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_custom_field_vals_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_custom_field_vals_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.fieldDefinitionId],
			foreignColumns: [staffCustomFieldDefinitions.id],
			name: "staff_custom_field_vals_fieldDefId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffDepartmentMembers = pgTable("staff_department_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	departmentId: uuid().notNull(),
	isPrimary: boolean().default(false).notNull(),
	joinedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("staff_dept_members_departmentId_idx").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("staff_dept_members_tenant_user_dept_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.departmentId.asc().nullsLast().op("uuid_ops")),
	index("staff_dept_members_userId_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_dept_members_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_dept_members_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [staffDepartments.id],
			name: "staff_dept_members_departmentId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffProfiles = pgTable("staff_profiles", {
	userId: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	bio: text(),
	jobTitle: text(),
	employeeType: employeeType(),
	staffStatus: staffStatus().default('ACTIVE').notNull(),
	startDate: timestamp({ precision: 3, mode: 'string' }),
	dayRate: numeric({ precision: 10, scale:  2 }),
	hourlyRate: numeric({ precision: 10, scale:  2 }),
	mileageRate: numeric({ precision: 10, scale:  4 }),
	bankAccountName: text(),
	bankSortCode: text(),
	bankAccountNumber: text(),
	homeLatitude: numeric("home_latitude", { precision: 9, scale:  6 }),
	homeLongitude: numeric("home_longitude", { precision: 9, scale:  6 }),
	lastAssignedAt: timestamp("last_assigned_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	reportsTo: uuid("reports_to"),
	dateOfBirth: date("date_of_birth"),
	taxId: text("tax_id"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactPhone: text("emergency_contact_phone"),
	emergencyContactRelation: text("emergency_contact_relation"),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	addressCity: text("address_city"),
	addressPostcode: text("address_postcode"),
	addressCountry: text("address_country"),
}, (table) => [
	index("staff_profiles_staffStatus_idx").using("btree", table.staffStatus.asc().nullsLast().op("enum_ops")),
	index("staff_profiles_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_profiles_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_profiles_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.reportsTo],
			foreignColumns: [users.id],
			name: "staff_profiles_reportsTo_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const staffDepartments = pgTable("staff_departments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	parentId: uuid(),
	managerId: uuid(),
	color: text(),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("staff_departments_parentId_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("staff_departments_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("staff_departments_tenantId_slug_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_departments_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "staff_departments_parentId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "staff_departments_managerId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const staffNotes = pgTable("staff_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	authorId: uuid().notNull(),
	content: text().notNull(),
	isPinned: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("staff_notes_tenantId_userId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_notes_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_notes_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "staff_notes_authorId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const staffPayRates = pgTable("staff_pay_rates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	rateType: payRateType().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: text().default('GBP').notNull(),
	effectiveFrom: date().notNull(),
	effectiveUntil: date(),
	reason: text(),
	createdBy: uuid(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("staff_pay_rates_tenantId_userId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "staff_pay_rates_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_pay_rates_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "staff_pay_rates_createdBy_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("skill_definitions_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("skill_definitions_tenantId_skillType_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.skillType.asc().nullsLast().op("enum_ops")),
	uniqueIndex("skill_definitions_tenant_slug_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.slug.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "skill_definitions_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

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
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("capacity_type_definitions_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("capacity_type_definitions_tenant_slug_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "capacity_type_definitions_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const resourceSkills = pgTable("resource_skills", {
	id: uuid().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	userId: uuid().notNull(),
	skillType: skillType().notNull(),
	skillId: text().notNull(),
	skillName: text().notNull(),
	proficiency: proficiencyLevel().default('INTERMEDIATE').notNull(),
	verifiedAt: timestamp({ precision: 3, mode: 'string' }),
	verifiedBy: uuid(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	skillDefinitionId: uuid(),
}, (table) => [
	index("resource_skills_tenantId_skillType_skillId_idx").using("btree", table.tenantId.asc().nullsLast().op("enum_ops"), table.skillType.asc().nullsLast().op("uuid_ops"), table.skillId.asc().nullsLast().op("enum_ops")),
	index("resource_skills_tenantId_userId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("resource_skills_tenant_user_type_id_key").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.skillType.asc().nullsLast().op("enum_ops"), table.skillId.asc().nullsLast().op("uuid_ops")),
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
]);

export const aiConversations = pgTable("ai_conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id").notNull(),
	title: text(),
	status: text().default('active').notNull(),
	tokenCount: integer("token_count").default(0).notNull(),
	costCents: integer("cost_cents").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	summary: text(),
	summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_ai_conversations_status").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_ai_conversations_tenant_user").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_conversations_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_conversations_user_id_users_id_fk"
		}),
]);

export const aiMessages = pgTable("ai_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	toolCalls: jsonb("tool_calls"),
	toolResults: jsonb("tool_results"),
	tokenUsage: jsonb("token_usage"),
	pageContext: jsonb("page_context"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_messages_conversation").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("idx_ai_messages_created").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "ai_messages_conversation_id_ai_conversations_id_fk"
		}),
]);

export const agentActions = pgTable("agent_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	messageId: uuid("message_id"),
	tenantId: uuid("tenant_id").notNull(),
	userId: uuid("user_id").notNull(),
	toolName: text("tool_name").notNull(),
	toolInput: jsonb("tool_input").notNull(),
	toolOutput: jsonb("tool_output"),
	status: text().default('pending').notNull(),
	guardrailTier: text("guardrail_tier").notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedBy: uuid("approved_by"),
	executedAt: timestamp("executed_at", { withTimezone: true, mode: 'string' }),
	error: text(),
	compensationData: jsonb("compensation_data"),
	isReversible: integer("is_reversible").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_agent_actions_conversation").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("idx_agent_actions_status").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_agent_actions_tenant_created").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [aiConversations.id],
			name: "agent_actions_conversation_id_ai_conversations_id_fk"
		}),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [aiMessages.id],
			name: "agent_actions_message_id_ai_messages_id_fk"
		}),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "agent_actions_tenant_id_tenants_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "agent_actions_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "agent_actions_approved_by_users_id_fk"
		}),
]);

export const aiCorrections = pgTable("ai_corrections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	toolName: text("tool_name").notNull(),
	attemptedInput: jsonb("attempted_input").notNull(),
	rejectionReason: text("rejection_reason"),
	correctAction: text("correct_action"),
	contextSummary: text("context_summary"),
	occurrenceCount: integer("occurrence_count").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_corrections_tenant_tool").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.toolName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_corrections_tenant_id_tenants_id_fk"
		}),
]);

export const aiKnowledgeChunks = pgTable("ai_knowledge_chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	sourceId: text("source_id").notNull(),
	sourceName: text("source_name").notNull(),
	content: text().notNull(),
	chunkIndex: integer("chunk_index").default(0).notNull(),
	embedding: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_knowledge_chunks_source").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.sourceId.asc().nullsLast().op("text_ops")),
	index("idx_ai_knowledge_chunks_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_knowledge_chunks_tenant_id_tenants_id_fk"
		}),
]);

export const aiMcpConnections = pgTable("ai_mcp_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	description: text(),
	serverUrl: text("server_url").notNull(),
	authType: text("auth_type").default('none').notNull(),
	authCredential: text("auth_credential"),
	cachedTools: jsonb("cached_tools"),
	toolsRefreshedAt: timestamp("tools_refreshed_at", { withTimezone: true, mode: 'string' }),
	defaultGuardrailTier: text("default_guardrail_tier").default('CONFIRM').notNull(),
	toolGuardrailOverrides: jsonb("tool_guardrail_overrides").default({}),
	healthStatus: text("health_status").default('healthy').notNull(),
	lastHealthCheck: timestamp("last_health_check", { withTimezone: true, mode: 'string' }),
	isEnabled: integer("is_enabled").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_mcp_connections_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_mcp_connections_tenant_id_tenants_id_fk"
		}),
]);

export const aiTenantConfig = pgTable("ai_tenant_config", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	isEnabled: integer("is_enabled").default(1).notNull(),
	maxTokenBudget: integer("max_token_budget").default(50000).notNull(),
	maxMessagesPerMinute: integer("max_messages_per_minute").default(20).notNull(),
	defaultModel: text("default_model").default('claude-sonnet-4-20250514').notNull(),
	guardrailOverrides: jsonb("guardrail_overrides").default({}),
	trustMetrics: jsonb("trust_metrics").default({}),
	verticalProfile: text("vertical_profile"),
	verticalCustomTerms: jsonb("vertical_custom_terms").default({}),
	morningBriefingEnabled: integer("morning_briefing_enabled").default(0).notNull(),
	morningBriefingTime: text("morning_briefing_time").default('08:00'),
	morningBriefingTimezone: text("morning_briefing_timezone").default('Europe/London'),
	morningBriefingDelivery: text("morning_briefing_delivery").default('in_app'),
	morningBriefingRecipientIds: jsonb("morning_briefing_recipient_ids").default([]),
	ghostOperatorEnabled: integer("ghost_operator_enabled").default(0).notNull(),
	ghostOperatorStartHour: integer("ghost_operator_start_hour").default(18),
	ghostOperatorEndHour: integer("ghost_operator_end_hour").default(8),
	ghostOperatorTimezone: text("ghost_operator_timezone").default('Europe/London'),
	ghostOperatorRules: jsonb("ghost_operator_rules").default([]),
	pasteToPipelineEnabled: integer("paste_to_pipeline_enabled").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_tenant_config_tenant_id_tenants_id_fk"
		}),
	unique("ai_tenant_config_tenant_id_unique").on(table.tenantId),
]);

export const aiWorkflowSuggestions = pgTable("ai_workflow_suggestions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	suggestedNodes: jsonb("suggested_nodes"),
	suggestedEdges: jsonb("suggested_edges"),
	detectedPattern: text("detected_pattern").notNull(),
	confidence: integer().default(50).notNull(),
	status: text().default('pending').notNull(),
	acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: 'string' }),
	dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_workflow_suggestions_tenant_status").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "ai_workflow_suggestions_tenant_id_tenants_id_fk"
		}),
]);

export const pipelines = pgTable("pipelines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	isDefault: boolean().default(false).notNull(),
	isArchived: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("pipelines_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("pipelines_tenantId_isDefault_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")).where(sql`("isDefault" = true)`),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pipelines_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const pipelineStages = pgTable("pipeline_stages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	pipelineId: uuid().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	position: integer().notNull(),
	color: text(),
	type: pipelineStageType().default('OPEN').notNull(),
	allowedTransitions: uuid().array().default([""]).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("pipeline_stages_pipelineId_idx").using("btree", table.pipelineId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("pipeline_stages_pipelineId_position_key").using("btree", table.pipelineId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("int4_ops")),
	uniqueIndex("pipeline_stages_pipelineId_slug_key").using("btree", table.pipelineId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	index("pipeline_stages_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pipeline_stages_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipelines.id],
			name: "pipeline_stages_pipelineId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const pipelineMembers = pgTable("pipeline_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	pipelineId: uuid().notNull(),
	customerId: uuid().notNull(),
	stageId: uuid().notNull(),
	dealValue: numeric({ precision: 12, scale:  2 }),
	lostReason: text(),
	enteredStageAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	addedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	closedAt: timestamp({ precision: 3, mode: 'string' }),
	metadata: jsonb().default({}),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("pipeline_members_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("pipeline_members_pipelineId_customerId_key").using("btree", table.pipelineId.asc().nullsLast().op("uuid_ops"), table.customerId.asc().nullsLast().op("uuid_ops")),
	index("pipeline_members_pipelineId_stageId_idx").using("btree", table.pipelineId.asc().nullsLast().op("uuid_ops"), table.stageId.asc().nullsLast().op("uuid_ops")),
	index("pipeline_members_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pipeline_members_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [pipelines.id],
			name: "pipeline_members_pipelineId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "pipeline_members_customerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.stageId],
			foreignColumns: [pipelineStages.id],
			name: "pipeline_members_stageId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const pipelineStageHistoryV2 = pgTable("pipeline_stage_history_v2", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	memberId: uuid().notNull(),
	fromStageId: uuid(),
	toStageId: uuid().notNull(),
	changedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	changedById: uuid(),
	dealValue: numeric({ precision: 12, scale:  2 }),
	lostReason: text(),
	notes: text(),
}, (table) => [
	index("pipeline_stage_history_v2_memberId_idx").using("btree", table.memberId.asc().nullsLast().op("uuid_ops")),
	index("pipeline_stage_history_v2_tenantId_changedAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.changedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "pipeline_stage_history_v2_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [pipelineMembers.id],
			name: "pipeline_stage_history_v2_memberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.changedById],
			foreignColumns: [users.id],
			name: "pipeline_stage_history_v2_changedById_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const outreachSequences = pgTable("outreach_sequences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	description: text(),
	sector: text().notNull(),
	targetIcp: text(),
	isActive: boolean().default(true).notNull(),
	abVariant: text(),
	pairedSequenceId: uuid(),
	steps: jsonb().notNull(),
	archivedAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("outreach_sequences_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("outreach_sequences_tenantId_sector_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.sector.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "outreach_sequences_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.pairedSequenceId],
			foreignColumns: [table.id],
			name: "outreach_sequences_pairedSequenceId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	check("outreach_sequences_ab_check", sql`("abVariant" IS NULL) OR ("pairedSequenceId" IS NOT NULL)`),
]);

export const outreachContacts = pgTable("outreach_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	customerId: uuid().notNull(),
	sequenceId: uuid().notNull(),
	assignedUserId: uuid(),
	status: outreachContactStatus().default('ACTIVE').notNull(),
	currentStep: integer().default(1).notNull(),
	nextDueAt: timestamp({ precision: 3, mode: 'string' }),
	enrolledAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp({ precision: 3, mode: 'string' }),
	lastActivityAt: timestamp({ precision: 3, mode: 'string' }),
	pipelineMemberId: uuid(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	sentiment: outreachSentiment(),
	replyCategory: outreachReplyCategory(),
	snoozedUntil: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	index("outreach_contacts_assignedUserId_idx").using("btree", table.assignedUserId.asc().nullsLast().op("uuid_ops")),
	index("outreach_contacts_customerId_idx").using("btree", table.customerId.asc().nullsLast().op("uuid_ops")),
	index("outreach_contacts_sequenceId_idx").using("btree", table.sequenceId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("outreach_contacts_tenantId_customerId_sequenceId_key").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.customerId.asc().nullsLast().op("uuid_ops"), table.sequenceId.asc().nullsLast().op("uuid_ops")),
	index("outreach_contacts_tenantId_status_nextDueAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.status.asc().nullsLast().op("timestamp_ops"), table.nextDueAt.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "outreach_contacts_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "outreach_contacts_customerId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.sequenceId],
			foreignColumns: [outreachSequences.id],
			name: "outreach_contacts_sequenceId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.assignedUserId],
			foreignColumns: [users.id],
			name: "outreach_contacts_assignedUserId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const outreachActivities = pgTable("outreach_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	contactId: uuid().notNull(),
	sequenceId: uuid().notNull(),
	customerId: uuid().notNull(),
	stepPosition: integer().notNull(),
	channel: text().notNull(),
	activityType: outreachActivityType().notNull(),
	deliveredTo: text(),
	notes: text(),
	occurredAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	performedByUserId: uuid(),
	previousState: jsonb(),
}, (table) => [
	index("outreach_activities_contactId_idx").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("outreach_activities_tenantId_occurredAt_idx").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	index("outreach_activities_tenantId_sequenceId_activityType_occurredAt").using("btree", table.tenantId.asc().nullsLast().op("timestamp_ops"), table.sequenceId.asc().nullsLast().op("timestamp_ops"), table.activityType.asc().nullsLast().op("timestamp_ops"), table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "outreach_activities_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [outreachContacts.id],
			name: "outreach_activities_contactId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.performedByUserId],
			foreignColumns: [users.id],
			name: "outreach_activities_performedByUserId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const outreachTemplates = pgTable("outreach_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	channel: text().notNull(),
	subject: text(),
	bodyMarkdown: text().notNull(),
	tags: text().array(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("outreach_templates_tenantId_category_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("text_ops")),
	index("outreach_templates_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "outreach_templates_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const outreachSnippets = pgTable("outreach_snippets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	bodyMarkdown: text().notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("outreach_snippets_tenantId_category_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("text_ops")),
	index("outreach_snippets_tenantId_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "outreach_snippets_tenantId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const productPlans = pgTable("product_plans", {
	id: uuid().primaryKey().notNull(),
	productId: uuid().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	priceMonthly: integer().notNull(),
	priceYearly: integer(),
	trialDays: integer().default(14).notNull(),
	stripePriceId: text().notNull(),
	features: jsonb().default([]).notNull(),
	isDefault: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_plans_productId_products_id_fk"
		}).onDelete("cascade"),
]);

export const products = pgTable("products", {
	id: uuid().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	tagline: text().notNull(),
	description: text().default('').notNull(),
	logoUrl: text(),
	domain: text(),
	moduleSlugs: text().array().default([""]).notNull(),
	isPublished: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	archivedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	unique("products_slug_unique").on(table.slug),
]);

export const slotStaff = pgTable("_SlotStaff", {
	a: uuid("A").notNull(),
	b: uuid("B").notNull(),
}, (table) => [
	index().using("btree", table.b.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.a],
			foreignColumns: [availableSlots.id],
			name: "_SlotStaff_A_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.b],
			foreignColumns: [users.id],
			name: "_SlotStaff_B_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.a, table.b], name: "_SlotStaff_AB_pkey"}),
]);

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid().notNull(),
	permissionId: uuid().notNull(),
	conditions: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_roleId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permissionId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_pkey"}),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid().notNull(),
	roleId: uuid().notNull(),
	grantedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	grantedBy: uuid(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_roleId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pkey"}),
]);

export const tenantFeatures = pgTable("tenant_features", {
	tenantId: uuid().notNull(),
	featureId: uuid().notNull(),
	enabled: boolean().default(true).notNull(),
	config: jsonb(),
	enabledAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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
	primaryKey({ columns: [table.tenantId, table.featureId], name: "tenant_features_pkey"}),
]);
