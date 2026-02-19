import { relations } from "drizzle-orm/relations";
import { tenants, roles, users, sessions, auditLogs, customers, customerNotes, bookings, bookingStatusHistory, travelLogs, messageTemplates, services, venues, sentMessages, payments, invoices, apiKeys, notifications, notificationPreferences, integrations, integrationSyncLogs, projects, projectMembers, reviews, reviewRequests, reviewAutomationSettings, formTemplates, completedForms, appointmentCompletions, tasks, modules, moduleSettings, tenantModules, tenantModuleSettings, serviceCategories, availableSlots, addOns, serviceAddOns, tenantPortals, portalTemplates, workflows, workflowActions, workflowExecutions, organizationSettings, userAvailability, userCapacities, bookingAssignments, userIntegrations, userIntegrationSyncLogs, userExternalEvents, slotStaff, rolePermissions, permissions, userRoles, tenantFeatures, featureFlags } from "./schema";

export const rolesRelations = relations(roles, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [roles.tenantId],
		references: [tenants.id]
	}),
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	roles: many(roles),
	auditLogs: many(auditLogs),
	customers: many(customers),
	messageTemplates: many(messageTemplates),
	venues: many(venues),
	sentMessages: many(sentMessages),
	payments: many(payments),
	apiKeys: many(apiKeys),
	invoices: many(invoices),
	reviews: many(reviews),
	reviewRequests: many(reviewRequests),
	reviewAutomationSettings: many(reviewAutomationSettings),
	formTemplates: many(formTemplates),
	completedForms: many(completedForms),
	appointmentCompletions: many(appointmentCompletions),
	tasks: many(tasks),
	projects: many(projects),
	tenantModules: many(tenantModules),
	services: many(services),
	bookings: many(bookings),
	addOns: many(addOns),
	availableSlots: many(availableSlots),
	tenantPortals: many(tenantPortals),
	workflows: many(workflows),
	organizationSettings: many(organizationSettings),
	users: many(users),
	userCapacities: many(userCapacities),
	userExternalEvents: many(userExternalEvents),
	tenantFeatures: many(tenantFeatures),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	sessions: many(sessions),
	auditLogs: many(auditLogs),
	customers: many(customers),
	bookingStatusHistories: many(bookingStatusHistory),
	travelLogs: many(travelLogs),
	notifications: many(notifications),
	notificationPreferences: many(notificationPreferences),
	projectMembers: many(projectMembers),
	reviews_resolvedBy: many(reviews, {
		relationName: "reviews_resolvedBy_users_id"
	}),
	reviews_staffId: many(reviews, {
		relationName: "reviews_staffId_users_id"
	}),
	reviewRequests: many(reviewRequests),
	reviewAutomationSettings: many(reviewAutomationSettings),
	completedForms: many(completedForms),
	appointmentCompletions: many(appointmentCompletions),
	tasks: many(tasks),
	bookings_approvedById: many(bookings, {
		relationName: "bookings_approvedById_users_id"
	}),
	bookings_createdById: many(bookings, {
		relationName: "bookings_createdById_users_id"
	}),
	bookings_staffId: many(bookings, {
		relationName: "bookings_staffId_users_id"
	}),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [users.invitedById],
		references: [users.id],
		relationName: "users_invitedById_users_id"
	}),
	users: many(users, {
		relationName: "users_invitedById_users_id"
	}),
	userAvailabilities: many(userAvailability),
	userCapacities: many(userCapacities),
	bookingAssignments: many(bookingAssignments),
	userIntegrations_connectedBy: many(userIntegrations, {
		relationName: "userIntegrations_connectedBy_users_id"
	}),
	userIntegrations_userId: many(userIntegrations, {
		relationName: "userIntegrations_userId_users_id"
	}),
	userExternalEvents: many(userExternalEvents),
	slotStaffs: many(slotStaff),
	userRoles: many(userRoles),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	tenant: one(tenants, {
		fields: [auditLogs.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [customers.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [customers.preferredStaffId],
		references: [users.id]
	}),
	customerNotes: many(customerNotes),
	payments: many(payments),
	invoices: many(invoices),
	reviews: many(reviews),
	reviewRequests: many(reviewRequests),
	completedForms: many(completedForms),
	appointmentCompletions: many(appointmentCompletions),
	bookings: many(bookings),
}));

export const customerNotesRelations = relations(customerNotes, ({one}) => ({
	customer: one(customers, {
		fields: [customerNotes.customerId],
		references: [customers.id]
	}),
	booking: one(bookings, {
		fields: [customerNotes.bookingId],
		references: [bookings.id]
	}),
}));

export const bookingsRelations = relations(bookings, ({one, many}) => ({
	customerNotes: many(customerNotes),
	bookingStatusHistories: many(bookingStatusHistory),
	sentMessages: many(sentMessages),
	payments: many(payments),
	invoices: many(invoices),
	reviews: many(reviews),
	reviewRequests: many(reviewRequests),
	completedForms: many(completedForms),
	appointmentCompletions: many(appointmentCompletions),
	tenant: one(tenants, {
		fields: [bookings.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [bookings.customerId],
		references: [customers.id]
	}),
	venue: one(venues, {
		fields: [bookings.venueId],
		references: [venues.id]
	}),
	user_approvedById: one(users, {
		fields: [bookings.approvedById],
		references: [users.id],
		relationName: "bookings_approvedById_users_id"
	}),
	user_createdById: one(users, {
		fields: [bookings.createdById],
		references: [users.id],
		relationName: "bookings_createdById_users_id"
	}),
	service: one(services, {
		fields: [bookings.serviceId],
		references: [services.id]
	}),
	project: one(projects, {
		fields: [bookings.projectId],
		references: [projects.id]
	}),
	availableSlot: one(availableSlots, {
		fields: [bookings.slotId],
		references: [availableSlots.id]
	}),
	user_staffId: one(users, {
		fields: [bookings.staffId],
		references: [users.id],
		relationName: "bookings_staffId_users_id"
	}),
	bookingAssignments: many(bookingAssignments),
}));

export const bookingStatusHistoryRelations = relations(bookingStatusHistory, ({one}) => ({
	booking: one(bookings, {
		fields: [bookingStatusHistory.bookingId],
		references: [bookings.id]
	}),
	user: one(users, {
		fields: [bookingStatusHistory.changedById],
		references: [users.id]
	}),
}));

export const travelLogsRelations = relations(travelLogs, ({one}) => ({
	user: one(users, {
		fields: [travelLogs.userId],
		references: [users.id]
	}),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [messageTemplates.tenantId],
		references: [tenants.id]
	}),
	service: one(services, {
		fields: [messageTemplates.serviceId],
		references: [services.id]
	}),
	sentMessages: many(sentMessages),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	messageTemplates: many(messageTemplates),
	reviews: many(reviews),
	tenant: one(tenants, {
		fields: [services.tenantId],
		references: [tenants.id]
	}),
	serviceCategory: one(serviceCategories, {
		fields: [services.categoryId],
		references: [serviceCategories.id]
	}),
	bookings: many(bookings),
	serviceAddOns: many(serviceAddOns),
}));

export const venuesRelations = relations(venues, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [venues.tenantId],
		references: [tenants.id]
	}),
	bookings: many(bookings),
	availableSlots: many(availableSlots),
}));

export const sentMessagesRelations = relations(sentMessages, ({one}) => ({
	tenant: one(tenants, {
		fields: [sentMessages.tenantId],
		references: [tenants.id]
	}),
	messageTemplate: one(messageTemplates, {
		fields: [sentMessages.templateId],
		references: [messageTemplates.id]
	}),
	booking: one(bookings, {
		fields: [sentMessages.bookingId],
		references: [bookings.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	tenant: one(tenants, {
		fields: [payments.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [payments.customerId],
		references: [customers.id]
	}),
	invoice: one(invoices, {
		fields: [payments.invoiceId],
		references: [invoices.id]
	}),
	booking: one(bookings, {
		fields: [payments.bookingId],
		references: [bookings.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	payments: many(payments),
	tenant: one(tenants, {
		fields: [invoices.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [invoices.customerId],
		references: [customers.id]
	}),
	booking: one(bookings, {
		fields: [invoices.bookingId],
		references: [bookings.id]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	tenant: one(tenants, {
		fields: [apiKeys.tenantId],
		references: [tenants.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const integrationSyncLogsRelations = relations(integrationSyncLogs, ({one}) => ({
	integration: one(integrations, {
		fields: [integrationSyncLogs.integrationId],
		references: [integrations.id]
	}),
}));

export const integrationsRelations = relations(integrations, ({many}) => ({
	integrationSyncLogs: many(integrationSyncLogs),
}));

export const projectMembersRelations = relations(projectMembers, ({one}) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	projectMembers: many(projectMembers),
	tasks: many(tasks),
	tenant: one(tenants, {
		fields: [projects.tenantId],
		references: [tenants.id]
	}),
	bookings: many(bookings),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	tenant: one(tenants, {
		fields: [reviews.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [reviews.customerId],
		references: [customers.id]
	}),
	booking: one(bookings, {
		fields: [reviews.bookingId],
		references: [bookings.id]
	}),
	service: one(services, {
		fields: [reviews.serviceId],
		references: [services.id]
	}),
	user_resolvedBy: one(users, {
		fields: [reviews.resolvedBy],
		references: [users.id],
		relationName: "reviews_resolvedBy_users_id"
	}),
	user_staffId: one(users, {
		fields: [reviews.staffId],
		references: [users.id],
		relationName: "reviews_staffId_users_id"
	}),
}));

export const reviewRequestsRelations = relations(reviewRequests, ({one}) => ({
	tenant: one(tenants, {
		fields: [reviewRequests.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [reviewRequests.customerId],
		references: [customers.id]
	}),
	booking: one(bookings, {
		fields: [reviewRequests.bookingId],
		references: [bookings.id]
	}),
	user: one(users, {
		fields: [reviewRequests.sentBy],
		references: [users.id]
	}),
}));

export const reviewAutomationSettingsRelations = relations(reviewAutomationSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [reviewAutomationSettings.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [reviewAutomationSettings.updatedBy],
		references: [users.id]
	}),
}));

export const formTemplatesRelations = relations(formTemplates, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [formTemplates.tenantId],
		references: [tenants.id]
	}),
	completedForms: many(completedForms),
}));

export const completedFormsRelations = relations(completedForms, ({one}) => ({
	tenant: one(tenants, {
		fields: [completedForms.tenantId],
		references: [tenants.id]
	}),
	formTemplate: one(formTemplates, {
		fields: [completedForms.templateId],
		references: [formTemplates.id]
	}),
	customer: one(customers, {
		fields: [completedForms.customerId],
		references: [customers.id]
	}),
	booking: one(bookings, {
		fields: [completedForms.bookingId],
		references: [bookings.id]
	}),
	user: one(users, {
		fields: [completedForms.submittedBy],
		references: [users.id]
	}),
}));

export const appointmentCompletionsRelations = relations(appointmentCompletions, ({one}) => ({
	tenant: one(tenants, {
		fields: [appointmentCompletions.tenantId],
		references: [tenants.id]
	}),
	booking: one(bookings, {
		fields: [appointmentCompletions.bookingId],
		references: [bookings.id]
	}),
	customer: one(customers, {
		fields: [appointmentCompletions.customerId],
		references: [customers.id]
	}),
	user: one(users, {
		fields: [appointmentCompletions.completedBy],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [tasks.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id]
	}),
	task: one(tasks, {
		fields: [tasks.dependsOn],
		references: [tasks.id],
		relationName: "tasks_dependsOn_tasks_id"
	}),
	tasks: many(tasks, {
		relationName: "tasks_dependsOn_tasks_id"
	}),
}));

export const moduleSettingsRelations = relations(moduleSettings, ({one}) => ({
	module: one(modules, {
		fields: [moduleSettings.moduleId],
		references: [modules.id]
	}),
}));

export const modulesRelations = relations(modules, ({many}) => ({
	moduleSettings: many(moduleSettings),
	tenantModules: many(tenantModules),
}));

export const tenantModuleSettingsRelations = relations(tenantModuleSettings, ({one}) => ({
	tenantModule: one(tenantModules, {
		fields: [tenantModuleSettings.tenantId],
		references: [tenantModules.tenantId]
	}),
}));

export const tenantModulesRelations = relations(tenantModules, ({one, many}) => ({
	tenantModuleSettings: many(tenantModuleSettings),
	tenant: one(tenants, {
		fields: [tenantModules.tenantId],
		references: [tenants.id]
	}),
	module: one(modules, {
		fields: [tenantModules.moduleId],
		references: [modules.id]
	}),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({many}) => ({
	services: many(services),
}));

export const availableSlotsRelations = relations(availableSlots, ({one, many}) => ({
	bookings: many(bookings),
	tenant: one(tenants, {
		fields: [availableSlots.tenantId],
		references: [tenants.id]
	}),
	venue: one(venues, {
		fields: [availableSlots.venueId],
		references: [venues.id]
	}),
	availableSlot: one(availableSlots, {
		fields: [availableSlots.previousSlotId],
		references: [availableSlots.id],
		relationName: "availableSlots_previousSlotId_availableSlots_id"
	}),
	availableSlots: many(availableSlots, {
		relationName: "availableSlots_previousSlotId_availableSlots_id"
	}),
	slotStaffs: many(slotStaff),
}));

export const addOnsRelations = relations(addOns, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [addOns.tenantId],
		references: [tenants.id]
	}),
	serviceAddOns: many(serviceAddOns),
}));

export const serviceAddOnsRelations = relations(serviceAddOns, ({one}) => ({
	service: one(services, {
		fields: [serviceAddOns.serviceId],
		references: [services.id]
	}),
	addOn: one(addOns, {
		fields: [serviceAddOns.addOnId],
		references: [addOns.id]
	}),
}));

export const tenantPortalsRelations = relations(tenantPortals, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantPortals.tenantId],
		references: [tenants.id]
	}),
	portalTemplate: one(portalTemplates, {
		fields: [tenantPortals.templateId],
		references: [portalTemplates.id]
	}),
}));

export const portalTemplatesRelations = relations(portalTemplates, ({many}) => ({
	tenantPortals: many(tenantPortals),
}));

export const workflowActionsRelations = relations(workflowActions, ({one}) => ({
	workflow: one(workflows, {
		fields: [workflowActions.workflowId],
		references: [workflows.id]
	}),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	workflowActions: many(workflowActions),
	workflowExecutions: many(workflowExecutions),
	tenant: one(tenants, {
		fields: [workflows.tenantId],
		references: [tenants.id]
	}),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({one}) => ({
	workflow: one(workflows, {
		fields: [workflowExecutions.workflowId],
		references: [workflows.id]
	}),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [organizationSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const userAvailabilityRelations = relations(userAvailability, ({one}) => ({
	user: one(users, {
		fields: [userAvailability.userId],
		references: [users.id]
	}),
}));

export const userCapacitiesRelations = relations(userCapacities, ({one}) => ({
	user: one(users, {
		fields: [userCapacities.userId],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [userCapacities.tenantId],
		references: [tenants.id]
	}),
}));

export const bookingAssignmentsRelations = relations(bookingAssignments, ({one}) => ({
	booking: one(bookings, {
		fields: [bookingAssignments.bookingId],
		references: [bookings.id]
	}),
	user: one(users, {
		fields: [bookingAssignments.userId],
		references: [users.id]
	}),
}));

export const userIntegrationsRelations = relations(userIntegrations, ({one, many}) => ({
	user_connectedBy: one(users, {
		fields: [userIntegrations.connectedBy],
		references: [users.id],
		relationName: "userIntegrations_connectedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [userIntegrations.userId],
		references: [users.id],
		relationName: "userIntegrations_userId_users_id"
	}),
	userIntegrationSyncLogs: many(userIntegrationSyncLogs),
	userExternalEvents: many(userExternalEvents),
}));

export const userIntegrationSyncLogsRelations = relations(userIntegrationSyncLogs, ({one}) => ({
	userIntegration: one(userIntegrations, {
		fields: [userIntegrationSyncLogs.userIntegrationId],
		references: [userIntegrations.id]
	}),
}));

export const userExternalEventsRelations = relations(userExternalEvents, ({one}) => ({
	userIntegration: one(userIntegrations, {
		fields: [userExternalEvents.userIntegrationId],
		references: [userIntegrations.id]
	}),
	user: one(users, {
		fields: [userExternalEvents.userId],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [userExternalEvents.tenantId],
		references: [tenants.id]
	}),
}));

export const slotStaffRelations = relations(slotStaff, ({one}) => ({
	availableSlot: one(availableSlots, {
		fields: [slotStaff.a],
		references: [availableSlots.id]
	}),
	user: one(users, {
		fields: [slotStaff.b],
		references: [users.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const tenantFeaturesRelations = relations(tenantFeatures, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantFeatures.tenantId],
		references: [tenants.id]
	}),
	featureFlag: one(featureFlags, {
		fields: [tenantFeatures.featureId],
		references: [featureFlags.id]
	}),
}));

export const featureFlagsRelations = relations(featureFlags, ({many}) => ({
	tenantFeatures: many(tenantFeatures),
}));