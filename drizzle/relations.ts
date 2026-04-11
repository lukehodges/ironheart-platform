import { relations } from "drizzle-orm/relations";
import { tenants, apiKeys, roles, users, sessions, services, serviceCategories, customers, addOns, venues, userCapacities, bookings, availableSlots, customerNotes, bookingStatusHistory, travelLogs, userAvailability, appointmentCompletions, notificationPreferences, sentMessages, messageTemplates, notifications, userIntegrations, userIntegrationSyncLogs, auditLogs, organizationSettings, invoices, payments, projects, projectMembers, completedForms, formTemplates, reviewRequests, reviews, tasks, tenantModuleSettings, modules, tenantModules, workflows, workflowExecutions, reviewAutomationSettings, discountCodes, pricingRules, metricSnapshots, stripeConnectAccounts, impersonationSessions, taxRules, webhookEndpoints, tenantPortals, portalTemplates, serviceAddOns, bookingWaitlist, webhookDeliveries, bookingAssignments, integrations, integrationSyncLogs, userExternalEvents, moduleSettings, workflowActions, resourceAssignments, resourceCapacities, staffCustomFieldDefinitions, staffChecklistProgress, staffChecklistTemplates, staffCustomFieldValues, staffDepartmentMembers, staffDepartments, staffProfiles, staffNotes, staffPayRates, skillDefinitions, capacityTypeDefinitions, resourceSkills, aiConversations, aiMessages, agentActions, aiCorrections, aiKnowledgeChunks, aiMcpConnections, aiTenantConfig, aiWorkflowSuggestions, pipelines, pipelineStages, pipelineMembers, pipelineStageHistoryV2, outreachSequences, outreachContacts, outreachActivities, outreachTemplates, outreachSnippets, products, productPlans, slotStaff, rolePermissions, permissions, userRoles, tenantFeatures, featureFlags } from "./schema";

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	tenant: one(tenants, {
		fields: [apiKeys.tenantId],
		references: [tenants.id]
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	apiKeys: many(apiKeys),
	roles: many(roles),
	users: many(users),
	services: many(services),
	customers: many(customers),
	addOns: many(addOns),
	venues: many(venues),
	userCapacities: many(userCapacities),
	bookings: many(bookings),
	availableSlots: many(availableSlots),
	appointmentCompletions: many(appointmentCompletions),
	sentMessages: many(sentMessages),
	messageTemplates: many(messageTemplates),
	auditLogs: many(auditLogs),
	organizationSettings: many(organizationSettings),
	invoices: many(invoices),
	payments: many(payments),
	projects: many(projects),
	completedForms: many(completedForms),
	formTemplates: many(formTemplates),
	reviewRequests: many(reviewRequests),
	reviews: many(reviews),
	tasks: many(tasks),
	tenantModuleSettings: many(tenantModuleSettings),
	tenantModules: many(tenantModules),
	workflows: many(workflows),
	reviewAutomationSettings: many(reviewAutomationSettings),
	discountCodes: many(discountCodes),
	pricingRules: many(pricingRules),
	metricSnapshots: many(metricSnapshots),
	stripeConnectAccounts: many(stripeConnectAccounts),
	impersonationSessions: many(impersonationSessions),
	taxRules: many(taxRules),
	webhookEndpoints: many(webhookEndpoints),
	tenantPortals: many(tenantPortals),
	bookingWaitlists: many(bookingWaitlist),
	userExternalEvents: many(userExternalEvents),
	resourceAssignments: many(resourceAssignments),
	resourceCapacities: many(resourceCapacities),
	staffCustomFieldDefinitions: many(staffCustomFieldDefinitions),
	staffChecklistProgresses: many(staffChecklistProgress),
	staffChecklistTemplates: many(staffChecklistTemplates),
	staffCustomFieldValues: many(staffCustomFieldValues),
	staffDepartmentMembers: many(staffDepartmentMembers),
	staffProfiles: many(staffProfiles),
	staffDepartments: many(staffDepartments),
	staffNotes: many(staffNotes),
	staffPayRates: many(staffPayRates),
	skillDefinitions: many(skillDefinitions),
	capacityTypeDefinitions: many(capacityTypeDefinitions),
	resourceSkills: many(resourceSkills),
	aiConversations: many(aiConversations),
	agentActions: many(agentActions),
	aiCorrections: many(aiCorrections),
	aiKnowledgeChunks: many(aiKnowledgeChunks),
	aiMcpConnections: many(aiMcpConnections),
	aiTenantConfigs: many(aiTenantConfig),
	aiWorkflowSuggestions: many(aiWorkflowSuggestions),
	pipelines: many(pipelines),
	pipelineStages: many(pipelineStages),
	pipelineMembers: many(pipelineMembers),
	pipelineStageHistoryV2s: many(pipelineStageHistoryV2),
	outreachSequences: many(outreachSequences),
	outreachContacts: many(outreachContacts),
	outreachActivities: many(outreachActivities),
	outreachTemplates: many(outreachTemplates),
	outreachSnippets: many(outreachSnippets),
	tenantFeatures: many(tenantFeatures),
}));

export const rolesRelations = relations(roles, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [roles.tenantId],
		references: [tenants.id]
	}),
	rolePermissions: many(rolePermissions),
	userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({one, many}) => ({
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
	sessions: many(sessions),
	customers: many(customers),
	userCapacities: many(userCapacities),
	bookings_approvedById: many(bookings, {
		relationName: "bookings_approvedById_users_id"
	}),
	bookings_createdById: many(bookings, {
		relationName: "bookings_createdById_users_id"
	}),
	bookings_staffId: many(bookings, {
		relationName: "bookings_staffId_users_id"
	}),
	bookingStatusHistories: many(bookingStatusHistory),
	travelLogs: many(travelLogs),
	userAvailabilities: many(userAvailability),
	appointmentCompletions: many(appointmentCompletions),
	notificationPreferences: many(notificationPreferences),
	notifications: many(notifications),
	userIntegrations_connectedBy: many(userIntegrations, {
		relationName: "userIntegrations_connectedBy_users_id"
	}),
	userIntegrations_userId: many(userIntegrations, {
		relationName: "userIntegrations_userId_users_id"
	}),
	auditLogs: many(auditLogs),
	projectMembers: many(projectMembers),
	completedForms: many(completedForms),
	reviewRequests: many(reviewRequests),
	reviews_resolvedBy: many(reviews, {
		relationName: "reviews_resolvedBy_users_id"
	}),
	reviews_staffId: many(reviews, {
		relationName: "reviews_staffId_users_id"
	}),
	tasks: many(tasks),
	reviewAutomationSettings: many(reviewAutomationSettings),
	impersonationSessions_platformAdminId: many(impersonationSessions, {
		relationName: "impersonationSessions_platformAdminId_users_id"
	}),
	impersonationSessions_targetTenantUserId: many(impersonationSessions, {
		relationName: "impersonationSessions_targetTenantUserId_users_id"
	}),
	bookingWaitlists: many(bookingWaitlist),
	bookingAssignments: many(bookingAssignments),
	userExternalEvents: many(userExternalEvents),
	resourceAssignments_userId: many(resourceAssignments, {
		relationName: "resourceAssignments_userId_users_id"
	}),
	resourceAssignments_assignedBy: many(resourceAssignments, {
		relationName: "resourceAssignments_assignedBy_users_id"
	}),
	resourceCapacities: many(resourceCapacities),
	staffChecklistProgresses: many(staffChecklistProgress),
	staffCustomFieldValues: many(staffCustomFieldValues),
	staffDepartmentMembers: many(staffDepartmentMembers),
	staffProfiles_userId: many(staffProfiles, {
		relationName: "staffProfiles_userId_users_id"
	}),
	staffProfiles_reportsTo: many(staffProfiles, {
		relationName: "staffProfiles_reportsTo_users_id"
	}),
	staffDepartments: many(staffDepartments),
	staffNotes_userId: many(staffNotes, {
		relationName: "staffNotes_userId_users_id"
	}),
	staffNotes_authorId: many(staffNotes, {
		relationName: "staffNotes_authorId_users_id"
	}),
	staffPayRates_userId: many(staffPayRates, {
		relationName: "staffPayRates_userId_users_id"
	}),
	staffPayRates_createdBy: many(staffPayRates, {
		relationName: "staffPayRates_createdBy_users_id"
	}),
	resourceSkills_userId: many(resourceSkills, {
		relationName: "resourceSkills_userId_users_id"
	}),
	resourceSkills_verifiedBy: many(resourceSkills, {
		relationName: "resourceSkills_verifiedBy_users_id"
	}),
	aiConversations: many(aiConversations),
	agentActions_userId: many(agentActions, {
		relationName: "agentActions_userId_users_id"
	}),
	agentActions_approvedBy: many(agentActions, {
		relationName: "agentActions_approvedBy_users_id"
	}),
	pipelineStageHistoryV2s: many(pipelineStageHistoryV2),
	outreachContacts: many(outreachContacts),
	outreachActivities: many(outreachActivities),
	slotStaffs: many(slotStaff),
	userRoles: many(userRoles),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [services.tenantId],
		references: [tenants.id]
	}),
	serviceCategory: one(serviceCategories, {
		fields: [services.categoryId],
		references: [serviceCategories.id]
	}),
	bookings: many(bookings),
	messageTemplates: many(messageTemplates),
	reviews: many(reviews),
	serviceAddOns: many(serviceAddOns),
	bookingWaitlists: many(bookingWaitlist),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({many}) => ({
	services: many(services),
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
	bookings: many(bookings),
	customerNotes: many(customerNotes),
	appointmentCompletions: many(appointmentCompletions),
	invoices: many(invoices),
	payments: many(payments),
	completedForms: many(completedForms),
	reviewRequests: many(reviewRequests),
	reviews: many(reviews),
	bookingWaitlists: many(bookingWaitlist),
	pipelineMembers: many(pipelineMembers),
	outreachContacts: many(outreachContacts),
}));

export const addOnsRelations = relations(addOns, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [addOns.tenantId],
		references: [tenants.id]
	}),
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

export const bookingsRelations = relations(bookings, ({one, many}) => ({
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
	availableSlot: one(availableSlots, {
		fields: [bookings.slotId],
		references: [availableSlots.id]
	}),
	user_staffId: one(users, {
		fields: [bookings.staffId],
		references: [users.id],
		relationName: "bookings_staffId_users_id"
	}),
	customerNotes: many(customerNotes),
	bookingStatusHistories: many(bookingStatusHistory),
	appointmentCompletions: many(appointmentCompletions),
	sentMessages: many(sentMessages),
	invoices: many(invoices),
	payments: many(payments),
	completedForms: many(completedForms),
	reviewRequests: many(reviewRequests),
	reviews: many(reviews),
	bookingAssignments: many(bookingAssignments),
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

export const userAvailabilityRelations = relations(userAvailability, ({one}) => ({
	user: one(users, {
		fields: [userAvailability.userId],
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

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
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

export const messageTemplatesRelations = relations(messageTemplates, ({one, many}) => ({
	sentMessages: many(sentMessages),
	tenant: one(tenants, {
		fields: [messageTemplates.tenantId],
		references: [tenants.id]
	}),
	service: one(services, {
		fields: [messageTemplates.serviceId],
		references: [services.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const userIntegrationSyncLogsRelations = relations(userIntegrationSyncLogs, ({one}) => ({
	userIntegration: one(userIntegrations, {
		fields: [userIntegrationSyncLogs.userIntegrationId],
		references: [userIntegrations.id]
	}),
}));

export const userIntegrationsRelations = relations(userIntegrations, ({one, many}) => ({
	userIntegrationSyncLogs: many(userIntegrationSyncLogs),
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
	userExternalEvents: many(userExternalEvents),
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

export const organizationSettingsRelations = relations(organizationSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [organizationSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
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
	payments: many(payments),
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

export const projectsRelations = relations(projects, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [projects.tenantId],
		references: [tenants.id]
	}),
	projectMembers: many(projectMembers),
	tasks: many(tasks),
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

export const formTemplatesRelations = relations(formTemplates, ({one, many}) => ({
	completedForms: many(completedForms),
	tenant: one(tenants, {
		fields: [formTemplates.tenantId],
		references: [tenants.id]
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

export const tenantModuleSettingsRelations = relations(tenantModuleSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantModuleSettings.tenantId],
		references: [tenants.id]
	}),
	module: one(modules, {
		fields: [tenantModuleSettings.moduleId],
		references: [modules.id]
	}),
}));

export const modulesRelations = relations(modules, ({many}) => ({
	tenantModuleSettings: many(tenantModuleSettings),
	tenantModules: many(tenantModules),
	moduleSettings: many(moduleSettings),
}));

export const tenantModulesRelations = relations(tenantModules, ({one}) => ({
	tenant: one(tenants, {
		fields: [tenantModules.tenantId],
		references: [tenants.id]
	}),
	module: one(modules, {
		fields: [tenantModules.moduleId],
		references: [modules.id]
	}),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [workflows.tenantId],
		references: [tenants.id]
	}),
	workflowExecutions: many(workflowExecutions),
	workflowActions: many(workflowActions),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({one}) => ({
	workflow: one(workflows, {
		fields: [workflowExecutions.workflowId],
		references: [workflows.id]
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

export const discountCodesRelations = relations(discountCodes, ({one}) => ({
	tenant: one(tenants, {
		fields: [discountCodes.tenantId],
		references: [tenants.id]
	}),
	pricingRule: one(pricingRules, {
		fields: [discountCodes.pricingRuleId],
		references: [pricingRules.id]
	}),
}));

export const pricingRulesRelations = relations(pricingRules, ({one, many}) => ({
	discountCodes: many(discountCodes),
	tenant: one(tenants, {
		fields: [pricingRules.tenantId],
		references: [tenants.id]
	}),
}));

export const metricSnapshotsRelations = relations(metricSnapshots, ({one}) => ({
	tenant: one(tenants, {
		fields: [metricSnapshots.tenantId],
		references: [tenants.id]
	}),
}));

export const stripeConnectAccountsRelations = relations(stripeConnectAccounts, ({one}) => ({
	tenant: one(tenants, {
		fields: [stripeConnectAccounts.tenantId],
		references: [tenants.id]
	}),
}));

export const impersonationSessionsRelations = relations(impersonationSessions, ({one}) => ({
	user_platformAdminId: one(users, {
		fields: [impersonationSessions.platformAdminId],
		references: [users.id],
		relationName: "impersonationSessions_platformAdminId_users_id"
	}),
	tenant: one(tenants, {
		fields: [impersonationSessions.tenantId],
		references: [tenants.id]
	}),
	user_targetTenantUserId: one(users, {
		fields: [impersonationSessions.targetTenantUserId],
		references: [users.id],
		relationName: "impersonationSessions_targetTenantUserId_users_id"
	}),
}));

export const taxRulesRelations = relations(taxRules, ({one}) => ({
	tenant: one(tenants, {
		fields: [taxRules.tenantId],
		references: [tenants.id]
	}),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [webhookEndpoints.tenantId],
		references: [tenants.id]
	}),
	webhookDeliveries: many(webhookDeliveries),
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

export const bookingWaitlistRelations = relations(bookingWaitlist, ({one}) => ({
	tenant: one(tenants, {
		fields: [bookingWaitlist.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [bookingWaitlist.customerId],
		references: [customers.id]
	}),
	service: one(services, {
		fields: [bookingWaitlist.serviceId],
		references: [services.id]
	}),
	user: one(users, {
		fields: [bookingWaitlist.staffId],
		references: [users.id]
	}),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({one}) => ({
	webhookEndpoint: one(webhookEndpoints, {
		fields: [webhookDeliveries.endpointId],
		references: [webhookEndpoints.id]
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

export const integrationSyncLogsRelations = relations(integrationSyncLogs, ({one}) => ({
	integration: one(integrations, {
		fields: [integrationSyncLogs.integrationId],
		references: [integrations.id]
	}),
}));

export const integrationsRelations = relations(integrations, ({many}) => ({
	integrationSyncLogs: many(integrationSyncLogs),
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

export const moduleSettingsRelations = relations(moduleSettings, ({one}) => ({
	module: one(modules, {
		fields: [moduleSettings.moduleId],
		references: [modules.id]
	}),
}));

export const workflowActionsRelations = relations(workflowActions, ({one}) => ({
	workflow: one(workflows, {
		fields: [workflowActions.workflowId],
		references: [workflows.id]
	}),
}));

export const resourceAssignmentsRelations = relations(resourceAssignments, ({one}) => ({
	tenant: one(tenants, {
		fields: [resourceAssignments.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [resourceAssignments.userId],
		references: [users.id],
		relationName: "resourceAssignments_userId_users_id"
	}),
	user_assignedBy: one(users, {
		fields: [resourceAssignments.assignedBy],
		references: [users.id],
		relationName: "resourceAssignments_assignedBy_users_id"
	}),
}));

export const resourceCapacitiesRelations = relations(resourceCapacities, ({one}) => ({
	tenant: one(tenants, {
		fields: [resourceCapacities.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [resourceCapacities.userId],
		references: [users.id]
	}),
}));

export const staffCustomFieldDefinitionsRelations = relations(staffCustomFieldDefinitions, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [staffCustomFieldDefinitions.tenantId],
		references: [tenants.id]
	}),
	staffCustomFieldValues: many(staffCustomFieldValues),
}));

export const staffChecklistProgressRelations = relations(staffChecklistProgress, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffChecklistProgress.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [staffChecklistProgress.userId],
		references: [users.id]
	}),
	staffChecklistTemplate: one(staffChecklistTemplates, {
		fields: [staffChecklistProgress.templateId],
		references: [staffChecklistTemplates.id]
	}),
}));

export const staffChecklistTemplatesRelations = relations(staffChecklistTemplates, ({one, many}) => ({
	staffChecklistProgresses: many(staffChecklistProgress),
	tenant: one(tenants, {
		fields: [staffChecklistTemplates.tenantId],
		references: [tenants.id]
	}),
}));

export const staffCustomFieldValuesRelations = relations(staffCustomFieldValues, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffCustomFieldValues.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [staffCustomFieldValues.userId],
		references: [users.id]
	}),
	staffCustomFieldDefinition: one(staffCustomFieldDefinitions, {
		fields: [staffCustomFieldValues.fieldDefinitionId],
		references: [staffCustomFieldDefinitions.id]
	}),
}));

export const staffDepartmentMembersRelations = relations(staffDepartmentMembers, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffDepartmentMembers.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [staffDepartmentMembers.userId],
		references: [users.id]
	}),
	staffDepartment: one(staffDepartments, {
		fields: [staffDepartmentMembers.departmentId],
		references: [staffDepartments.id]
	}),
}));

export const staffDepartmentsRelations = relations(staffDepartments, ({one, many}) => ({
	staffDepartmentMembers: many(staffDepartmentMembers),
	tenant: one(tenants, {
		fields: [staffDepartments.tenantId],
		references: [tenants.id]
	}),
	staffDepartment: one(staffDepartments, {
		fields: [staffDepartments.parentId],
		references: [staffDepartments.id],
		relationName: "staffDepartments_parentId_staffDepartments_id"
	}),
	staffDepartments: many(staffDepartments, {
		relationName: "staffDepartments_parentId_staffDepartments_id"
	}),
	user: one(users, {
		fields: [staffDepartments.managerId],
		references: [users.id]
	}),
}));

export const staffProfilesRelations = relations(staffProfiles, ({one}) => ({
	user_userId: one(users, {
		fields: [staffProfiles.userId],
		references: [users.id],
		relationName: "staffProfiles_userId_users_id"
	}),
	tenant: one(tenants, {
		fields: [staffProfiles.tenantId],
		references: [tenants.id]
	}),
	user_reportsTo: one(users, {
		fields: [staffProfiles.reportsTo],
		references: [users.id],
		relationName: "staffProfiles_reportsTo_users_id"
	}),
}));

export const staffNotesRelations = relations(staffNotes, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffNotes.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [staffNotes.userId],
		references: [users.id],
		relationName: "staffNotes_userId_users_id"
	}),
	user_authorId: one(users, {
		fields: [staffNotes.authorId],
		references: [users.id],
		relationName: "staffNotes_authorId_users_id"
	}),
}));

export const staffPayRatesRelations = relations(staffPayRates, ({one}) => ({
	tenant: one(tenants, {
		fields: [staffPayRates.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [staffPayRates.userId],
		references: [users.id],
		relationName: "staffPayRates_userId_users_id"
	}),
	user_createdBy: one(users, {
		fields: [staffPayRates.createdBy],
		references: [users.id],
		relationName: "staffPayRates_createdBy_users_id"
	}),
}));

export const skillDefinitionsRelations = relations(skillDefinitions, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [skillDefinitions.tenantId],
		references: [tenants.id]
	}),
	resourceSkills: many(resourceSkills),
}));

export const capacityTypeDefinitionsRelations = relations(capacityTypeDefinitions, ({one}) => ({
	tenant: one(tenants, {
		fields: [capacityTypeDefinitions.tenantId],
		references: [tenants.id]
	}),
}));

export const resourceSkillsRelations = relations(resourceSkills, ({one}) => ({
	tenant: one(tenants, {
		fields: [resourceSkills.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [resourceSkills.userId],
		references: [users.id],
		relationName: "resourceSkills_userId_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [resourceSkills.verifiedBy],
		references: [users.id],
		relationName: "resourceSkills_verifiedBy_users_id"
	}),
	skillDefinition: one(skillDefinitions, {
		fields: [resourceSkills.skillDefinitionId],
		references: [skillDefinitions.id]
	}),
}));

export const aiConversationsRelations = relations(aiConversations, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [aiConversations.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [aiConversations.userId],
		references: [users.id]
	}),
	aiMessages: many(aiMessages),
	agentActions: many(agentActions),
}));

export const aiMessagesRelations = relations(aiMessages, ({one, many}) => ({
	aiConversation: one(aiConversations, {
		fields: [aiMessages.conversationId],
		references: [aiConversations.id]
	}),
	agentActions: many(agentActions),
}));

export const agentActionsRelations = relations(agentActions, ({one}) => ({
	aiConversation: one(aiConversations, {
		fields: [agentActions.conversationId],
		references: [aiConversations.id]
	}),
	aiMessage: one(aiMessages, {
		fields: [agentActions.messageId],
		references: [aiMessages.id]
	}),
	tenant: one(tenants, {
		fields: [agentActions.tenantId],
		references: [tenants.id]
	}),
	user_userId: one(users, {
		fields: [agentActions.userId],
		references: [users.id],
		relationName: "agentActions_userId_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [agentActions.approvedBy],
		references: [users.id],
		relationName: "agentActions_approvedBy_users_id"
	}),
}));

export const aiCorrectionsRelations = relations(aiCorrections, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiCorrections.tenantId],
		references: [tenants.id]
	}),
}));

export const aiKnowledgeChunksRelations = relations(aiKnowledgeChunks, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiKnowledgeChunks.tenantId],
		references: [tenants.id]
	}),
}));

export const aiMcpConnectionsRelations = relations(aiMcpConnections, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiMcpConnections.tenantId],
		references: [tenants.id]
	}),
}));

export const aiTenantConfigRelations = relations(aiTenantConfig, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiTenantConfig.tenantId],
		references: [tenants.id]
	}),
}));

export const aiWorkflowSuggestionsRelations = relations(aiWorkflowSuggestions, ({one}) => ({
	tenant: one(tenants, {
		fields: [aiWorkflowSuggestions.tenantId],
		references: [tenants.id]
	}),
}));

export const pipelinesRelations = relations(pipelines, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [pipelines.tenantId],
		references: [tenants.id]
	}),
	pipelineStages: many(pipelineStages),
	pipelineMembers: many(pipelineMembers),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [pipelineStages.tenantId],
		references: [tenants.id]
	}),
	pipeline: one(pipelines, {
		fields: [pipelineStages.pipelineId],
		references: [pipelines.id]
	}),
	pipelineMembers: many(pipelineMembers),
}));

export const pipelineMembersRelations = relations(pipelineMembers, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [pipelineMembers.tenantId],
		references: [tenants.id]
	}),
	pipeline: one(pipelines, {
		fields: [pipelineMembers.pipelineId],
		references: [pipelines.id]
	}),
	customer: one(customers, {
		fields: [pipelineMembers.customerId],
		references: [customers.id]
	}),
	pipelineStage: one(pipelineStages, {
		fields: [pipelineMembers.stageId],
		references: [pipelineStages.id]
	}),
	pipelineStageHistoryV2s: many(pipelineStageHistoryV2),
}));

export const pipelineStageHistoryV2Relations = relations(pipelineStageHistoryV2, ({one}) => ({
	tenant: one(tenants, {
		fields: [pipelineStageHistoryV2.tenantId],
		references: [tenants.id]
	}),
	pipelineMember: one(pipelineMembers, {
		fields: [pipelineStageHistoryV2.memberId],
		references: [pipelineMembers.id]
	}),
	user: one(users, {
		fields: [pipelineStageHistoryV2.changedById],
		references: [users.id]
	}),
}));

export const outreachSequencesRelations = relations(outreachSequences, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [outreachSequences.tenantId],
		references: [tenants.id]
	}),
	outreachSequence: one(outreachSequences, {
		fields: [outreachSequences.pairedSequenceId],
		references: [outreachSequences.id],
		relationName: "outreachSequences_pairedSequenceId_outreachSequences_id"
	}),
	outreachSequences: many(outreachSequences, {
		relationName: "outreachSequences_pairedSequenceId_outreachSequences_id"
	}),
	outreachContacts: many(outreachContacts),
}));

export const outreachContactsRelations = relations(outreachContacts, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [outreachContacts.tenantId],
		references: [tenants.id]
	}),
	customer: one(customers, {
		fields: [outreachContacts.customerId],
		references: [customers.id]
	}),
	outreachSequence: one(outreachSequences, {
		fields: [outreachContacts.sequenceId],
		references: [outreachSequences.id]
	}),
	user: one(users, {
		fields: [outreachContacts.assignedUserId],
		references: [users.id]
	}),
	outreachActivities: many(outreachActivities),
}));

export const outreachActivitiesRelations = relations(outreachActivities, ({one}) => ({
	tenant: one(tenants, {
		fields: [outreachActivities.tenantId],
		references: [tenants.id]
	}),
	outreachContact: one(outreachContacts, {
		fields: [outreachActivities.contactId],
		references: [outreachContacts.id]
	}),
	user: one(users, {
		fields: [outreachActivities.performedByUserId],
		references: [users.id]
	}),
}));

export const outreachTemplatesRelations = relations(outreachTemplates, ({one}) => ({
	tenant: one(tenants, {
		fields: [outreachTemplates.tenantId],
		references: [tenants.id]
	}),
}));

export const outreachSnippetsRelations = relations(outreachSnippets, ({one}) => ({
	tenant: one(tenants, {
		fields: [outreachSnippets.tenantId],
		references: [tenants.id]
	}),
}));

export const productPlansRelations = relations(productPlans, ({one}) => ({
	product: one(products, {
		fields: [productPlans.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	productPlans: many(productPlans),
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