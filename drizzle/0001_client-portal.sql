CREATE TYPE "public"."ApprovalRequestStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."DeliverableStatus" AS ENUM('PENDING', 'DELIVERED', 'ACCEPTED');--> statement-breakpoint
CREATE TYPE "public"."EngagementStatus" AS ENUM('DRAFT', 'PROPOSED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."EngagementType" AS ENUM('PROJECT', 'RETAINER');--> statement-breakpoint
CREATE TYPE "public"."MilestoneStatus" AS ENUM('UPCOMING', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."PortalInvoiceStatus" AS ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."PortalPaymentMethod" AS ENUM('STRIPE', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."ProposalStatus" AS ENUM('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'SUPERSEDED');--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"deliverableId" uuid,
	"milestoneId" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "ApprovalRequestStatus" DEFAULT 'PENDING' NOT NULL,
	"clientComment" text,
	"respondedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"milestoneId" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "DeliverableStatus" DEFAULT 'PENDING' NOT NULL,
	"fileUrl" text,
	"fileName" text,
	"fileSize" integer,
	"deliveredAt" timestamp (3),
	"acceptedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "MilestoneStatus" DEFAULT 'UPCOMING' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"dueDate" date,
	"completedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"type" "EngagementType" NOT NULL,
	"status" "EngagementStatus" DEFAULT 'DRAFT' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startDate" date,
	"endDate" date,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"passwordHash" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"milestoneId" uuid,
	"proposalPaymentIndex" integer,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"status" "PortalInvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
	"dueDate" date NOT NULL,
	"paidAt" timestamp (3),
	"paymentMethod" "PortalPaymentMethod",
	"paymentReference" text,
	"token" text NOT NULL,
	"sentAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"token" text NOT NULL,
	"tokenExpiresAt" timestamp (3) NOT NULL,
	"sessionToken" text,
	"sessionExpiresAt" timestamp (3),
	"lastAccessedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"status" "ProposalStatus" DEFAULT 'DRAFT' NOT NULL,
	"scope" text NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" integer NOT NULL,
	"paymentSchedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"terms" text,
	"token" text NOT NULL,
	"tokenExpiresAt" timestamp (3) NOT NULL,
	"sentAt" timestamp (3),
	"approvedAt" timestamp (3),
	"declinedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreach_sequences" DROP CONSTRAINT "outreach_sequences_ab_check";--> statement-breakpoint
DROP INDEX "outreach_activities_tenantId_sequenceId_activityType_occurredAt";--> statement-breakpoint
DROP INDEX "api_keys_keyHash_key";--> statement-breakpoint
DROP INDEX "api_keys_keyPrefix_idx";--> statement-breakpoint
DROP INDEX "api_keys_tenantId_idx";--> statement-breakpoint
DROP INDEX "portal_templates_slug_key";--> statement-breakpoint
DROP INDEX "roles_tenantId_idx";--> statement-breakpoint
DROP INDEX "roles_tenantId_name_key";--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_status_idx";--> statement-breakpoint
DROP INDEX "users_tenantId_email_key";--> statement-breakpoint
DROP INDEX "users_tenantId_idx";--> statement-breakpoint
DROP INDEX "permissions_resource_action_key";--> statement-breakpoint
DROP INDEX "sessions_refreshToken_key";--> statement-breakpoint
DROP INDEX "sessions_token_idx";--> statement-breakpoint
DROP INDEX "sessions_token_key";--> statement-breakpoint
DROP INDEX "sessions_userId_idx";--> statement-breakpoint
DROP INDEX "tenants_domain_key";--> statement-breakpoint
DROP INDEX "tenants_slug_idx";--> statement-breakpoint
DROP INDEX "tenants_slug_key";--> statement-breakpoint
DROP INDEX "tenants_status_idx";--> statement-breakpoint
DROP INDEX "services_tenantId_active_idx";--> statement-breakpoint
DROP INDEX "services_tenantId_idx";--> statement-breakpoint
DROP INDEX "service_categories_tenantId_name_key";--> statement-breakpoint
DROP INDEX "customers_email_idx";--> statement-breakpoint
DROP INDEX "customers_phone_idx";--> statement-breakpoint
DROP INDEX "customers_tenantId_email_key";--> statement-breakpoint
DROP INDEX "customers_tenantId_idx";--> statement-breakpoint
DROP INDEX "customers_tenantId_lastName_idx";--> statement-breakpoint
DROP INDEX "add_ons_tenantId_active_idx";--> statement-breakpoint
DROP INDEX "add_ons_tenantId_idx";--> statement-breakpoint
DROP INDEX "venues_tenantId_idx";--> statement-breakpoint
DROP INDEX "user_capacities_tenantId_date_idx";--> statement-breakpoint
DROP INDEX "user_capacities_tenantId_userId_date_key";--> statement-breakpoint
DROP INDEX "bookings_customerId_idx";--> statement-breakpoint
DROP INDEX "bookings_staffId_idx";--> statement-breakpoint
DROP INDEX "bookings_staffId_scheduledDate_idx";--> statement-breakpoint
DROP INDEX "bookings_tenantId_createdAt_idx";--> statement-breakpoint
DROP INDEX "bookings_tenantId_scheduledDate_idx";--> statement-breakpoint
DROP INDEX "bookings_tenantId_status_idx";--> statement-breakpoint
DROP INDEX "customer_notes_customerId_idx";--> statement-breakpoint
DROP INDEX "booking_status_history_bookingId_idx";--> statement-breakpoint
DROP INDEX "travel_logs_userId_date_idx";--> statement-breakpoint
DROP INDEX "available_slots_tenantId_available_idx";--> statement-breakpoint
DROP INDEX "available_slots_tenantId_date_idx";--> statement-breakpoint
DROP INDEX "available_slots_tenantId_date_time_idx";--> statement-breakpoint
DROP INDEX "user_availability_userId_dayOfWeek_idx";--> statement-breakpoint
DROP INDEX "user_availability_userId_idx";--> statement-breakpoint
DROP INDEX "user_availability_userId_specificDate_idx";--> statement-breakpoint
DROP INDEX "appointment_completions_bookingId_idx";--> statement-breakpoint
DROP INDEX "appointment_completions_bookingId_key";--> statement-breakpoint
DROP INDEX "appointment_completions_completedAt_idx";--> statement-breakpoint
DROP INDEX "appointment_completions_customerId_idx";--> statement-breakpoint
DROP INDEX "appointment_completions_tenantId_idx";--> statement-breakpoint
DROP INDEX "sentMessages_tenantId_bookingId_idx";--> statement-breakpoint
DROP INDEX "sent_messages_bookingId_idx";--> statement-breakpoint
DROP INDEX "sent_messages_tenantId_createdAt_idx";--> statement-breakpoint
DROP INDEX "message_templates_tenantId_idx";--> statement-breakpoint
DROP INDEX "message_templates_tenantId_trigger_channel_serviceId_key";--> statement-breakpoint
DROP INDEX "integrations_tenantId_provider_key";--> statement-breakpoint
DROP INDEX "notifications_userId_createdAt_idx";--> statement-breakpoint
DROP INDEX "notifications_userId_read_idx";--> statement-breakpoint
DROP INDEX "oauth_states_expiresAt_idx";--> statement-breakpoint
DROP INDEX "oauth_states_state_idx";--> statement-breakpoint
DROP INDEX "oauth_states_state_key";--> statement-breakpoint
DROP INDEX "user_integration_sync_logs_externalEventId_idx";--> statement-breakpoint
DROP INDEX "user_integration_sync_logs_status_idx";--> statement-breakpoint
DROP INDEX "user_integration_sync_logs_syncType_idx";--> statement-breakpoint
DROP INDEX "user_integration_sync_logs_userIntegrationId_startedAt_idx";--> statement-breakpoint
DROP INDEX "user_integrations_lastSyncAt_idx";--> statement-breakpoint
DROP INDEX "user_integrations_provider_status_idx";--> statement-breakpoint
DROP INDEX "user_integrations_tenantId_idx";--> statement-breakpoint
DROP INDEX "user_integrations_tenantId_userId_provider_key";--> statement-breakpoint
DROP INDEX "user_integrations_userId_idx";--> statement-breakpoint
DROP INDEX "user_integrations_watchChannelExpiration_idx";--> statement-breakpoint
DROP INDEX "user_integrations_watchChannelId_idx";--> statement-breakpoint
DROP INDEX "audit_logs_action_idx";--> statement-breakpoint
DROP INDEX "audit_logs_tenantId_createdAt_idx";--> statement-breakpoint
DROP INDEX "audit_logs_tenantId_entityType_entityId_idx";--> statement-breakpoint
DROP INDEX "audit_logs_userId_idx";--> statement-breakpoint
DROP INDEX "invoices_customerId_idx";--> statement-breakpoint
DROP INDEX "invoices_status_idx";--> statement-breakpoint
DROP INDEX "invoices_tenantId_idx";--> statement-breakpoint
DROP INDEX "invoices_tenantId_invoiceNumber_key";--> statement-breakpoint
DROP INDEX "modules_category_idx";--> statement-breakpoint
DROP INDEX "modules_isActive_idx";--> statement-breakpoint
DROP INDEX "modules_slug_key";--> statement-breakpoint
DROP INDEX "payments_customerId_idx";--> statement-breakpoint
DROP INDEX "payments_invoiceId_idx";--> statement-breakpoint
DROP INDEX "payments_tenantId_idx";--> statement-breakpoint
DROP INDEX "projects_startDate_idx";--> statement-breakpoint
DROP INDEX "projects_tenantId_priority_idx";--> statement-breakpoint
DROP INDEX "projects_tenantId_status_idx";--> statement-breakpoint
DROP INDEX "project_members_projectId_idx";--> statement-breakpoint
DROP INDEX "project_members_projectId_userId_key";--> statement-breakpoint
DROP INDEX "project_members_userId_idx";--> statement-breakpoint
DROP INDEX "feature_flags_key_key";--> statement-breakpoint
DROP INDEX "completed_forms_bookingId_idx";--> statement-breakpoint
DROP INDEX "completed_forms_customerId_idx";--> statement-breakpoint
DROP INDEX "completed_forms_status_idx";--> statement-breakpoint
DROP INDEX "completed_forms_submittedAt_idx";--> statement-breakpoint
DROP INDEX "completed_forms_templateId_idx";--> statement-breakpoint
DROP INDEX "completed_forms_tenantId_idx";--> statement-breakpoint
DROP INDEX "form_templates_tenantId_active_idx";--> statement-breakpoint
DROP INDEX "form_templates_tenantId_idx";--> statement-breakpoint
DROP INDEX "review_requests_bookingId_idx";--> statement-breakpoint
DROP INDEX "review_requests_customerId_idx";--> statement-breakpoint
DROP INDEX "review_requests_status_idx";--> statement-breakpoint
DROP INDEX "review_requests_tenantId_idx";--> statement-breakpoint
DROP INDEX "reviews_bookingId_idx";--> statement-breakpoint
DROP INDEX "reviews_createdAt_idx";--> statement-breakpoint
DROP INDEX "reviews_customerId_idx";--> statement-breakpoint
DROP INDEX "reviews_staffId_idx";--> statement-breakpoint
DROP INDEX "reviews_tenantId_idx";--> statement-breakpoint
DROP INDEX "tasks_assignedTo_dueDate_idx";--> statement-breakpoint
DROP INDEX "tasks_dueDate_idx";--> statement-breakpoint
DROP INDEX "tasks_projectId_status_idx";--> statement-breakpoint
DROP INDEX "tasks_tenantId_status_idx";--> statement-breakpoint
DROP INDEX "tenant_module_settings_moduleId_idx";--> statement-breakpoint
DROP INDEX "tenant_module_settings_tenantId_idx";--> statement-breakpoint
DROP INDEX "tenant_module_settings_tenantId_moduleId_settingKey_key";--> statement-breakpoint
DROP INDEX "tenant_modules_moduleId_idx";--> statement-breakpoint
DROP INDEX "tenant_modules_tenantId_idx";--> statement-breakpoint
DROP INDEX "tenant_modules_tenantId_moduleId_key";--> statement-breakpoint
DROP INDEX "workflows_tenantId_enabled_idx";--> statement-breakpoint
DROP INDEX "workflow_executions_tenantId_startedAt_idx";--> statement-breakpoint
DROP INDEX "workflow_executions_workflowId_status_idx";--> statement-breakpoint
DROP INDEX "review_automation_settings_tenantId_key";--> statement-breakpoint
DROP INDEX "discount_codes_tenantId_code_key";--> statement-breakpoint
DROP INDEX "discount_codes_tenantId_idx";--> statement-breakpoint
DROP INDEX "pricing_rules_tenantId_enabled_idx";--> statement-breakpoint
DROP INDEX "metric_snapshots_tenantId_metricKey_idx";--> statement-breakpoint
DROP INDEX "metric_snapshots_tenantId_periodStart_idx";--> statement-breakpoint
DROP INDEX "stripe_connect_accounts_stripeAccountId_key";--> statement-breakpoint
DROP INDEX "stripe_connect_accounts_tenantId_key";--> statement-breakpoint
DROP INDEX "impersonation_sessions_platformAdminId_idx";--> statement-breakpoint
DROP INDEX "impersonation_sessions_tenantId_idx";--> statement-breakpoint
DROP INDEX "saga_log_entityId_idx";--> statement-breakpoint
DROP INDEX "saga_log_tenantId_status_idx";--> statement-breakpoint
DROP INDEX "tax_rules_tenantId_idx";--> statement-breakpoint
DROP INDEX "webhook_endpoints_tenantId_idx";--> statement-breakpoint
DROP INDEX "tenant_portals_tenantId_isActive_idx";--> statement-breakpoint
DROP INDEX "tenant_portals_tenantId_urlPath_key";--> statement-breakpoint
DROP INDEX "service_add_ons_serviceId_addOnId_key";--> statement-breakpoint
DROP INDEX "booking_waitlist_customerId_idx";--> statement-breakpoint
DROP INDEX "booking_waitlist_tenantId_status_idx";--> statement-breakpoint
DROP INDEX "webhook_deliveries_endpointId_idx";--> statement-breakpoint
DROP INDEX "webhook_deliveries_eventId_idx";--> statement-breakpoint
DROP INDEX "booking_assignments_bookingId_idx";--> statement-breakpoint
DROP INDEX "booking_assignments_bookingId_userId_key";--> statement-breakpoint
DROP INDEX "booking_assignments_userId_idx";--> statement-breakpoint
DROP INDEX "integration_sync_logs_integrationId_createdAt_idx";--> statement-breakpoint
DROP INDEX "user_external_events_blocksAvailability_idx";--> statement-breakpoint
DROP INDEX "user_external_events_tenantId_idx";--> statement-breakpoint
DROP INDEX "user_external_events_userId_endTime_idx";--> statement-breakpoint
DROP INDEX "user_external_events_userId_startTime_idx";--> statement-breakpoint
DROP INDEX "user_external_events_userIntegrationId_externalEventId_key";--> statement-breakpoint
DROP INDEX "module_settings_category_idx";--> statement-breakpoint
DROP INDEX "module_settings_moduleId_idx";--> statement-breakpoint
DROP INDEX "module_settings_moduleId_key_key";--> statement-breakpoint
DROP INDEX "workflow_actions_workflowId_order_idx";--> statement-breakpoint
DROP INDEX "resource_assignments_resourceId_idx";--> statement-breakpoint
DROP INDEX "resource_assignments_tenantId_moduleSlug_idx";--> statement-breakpoint
DROP INDEX "resource_assignments_tenant_user_status_date_idx";--> statement-breakpoint
DROP INDEX "resource_capacities_tenantId_userId_idx";--> statement-breakpoint
DROP INDEX "resource_capacities_tenant_user_type_from_key";--> statement-breakpoint
DROP INDEX "staff_custom_field_defs_tenantId_fieldKey_key";--> statement-breakpoint
DROP INDEX "staff_custom_field_defs_tenantId_idx";--> statement-breakpoint
DROP INDEX "staff_checklist_progress_tenantId_userId_idx";--> statement-breakpoint
DROP INDEX "staff_checklist_templates_tenantId_idx";--> statement-breakpoint
DROP INDEX "staff_custom_field_vals_tenant_user_field_key";--> statement-breakpoint
DROP INDEX "staff_custom_field_vals_userId_idx";--> statement-breakpoint
DROP INDEX "staff_dept_members_departmentId_idx";--> statement-breakpoint
DROP INDEX "staff_dept_members_tenant_user_dept_key";--> statement-breakpoint
DROP INDEX "staff_dept_members_userId_idx";--> statement-breakpoint
DROP INDEX "staff_profiles_staffStatus_idx";--> statement-breakpoint
DROP INDEX "staff_profiles_tenantId_idx";--> statement-breakpoint
DROP INDEX "staff_departments_parentId_idx";--> statement-breakpoint
DROP INDEX "staff_departments_tenantId_idx";--> statement-breakpoint
DROP INDEX "staff_departments_tenantId_slug_key";--> statement-breakpoint
DROP INDEX "staff_notes_tenantId_userId_idx";--> statement-breakpoint
DROP INDEX "staff_pay_rates_tenantId_userId_idx";--> statement-breakpoint
DROP INDEX "skill_definitions_tenantId_idx";--> statement-breakpoint
DROP INDEX "skill_definitions_tenantId_skillType_idx";--> statement-breakpoint
DROP INDEX "skill_definitions_tenant_slug_key";--> statement-breakpoint
DROP INDEX "capacity_type_definitions_tenantId_idx";--> statement-breakpoint
DROP INDEX "capacity_type_definitions_tenant_slug_key";--> statement-breakpoint
DROP INDEX "resource_skills_tenantId_skillType_skillId_idx";--> statement-breakpoint
DROP INDEX "resource_skills_tenantId_userId_idx";--> statement-breakpoint
DROP INDEX "resource_skills_tenant_user_type_id_key";--> statement-breakpoint
DROP INDEX "idx_ai_conversations_status";--> statement-breakpoint
DROP INDEX "idx_ai_conversations_tenant_user";--> statement-breakpoint
DROP INDEX "idx_ai_messages_conversation";--> statement-breakpoint
DROP INDEX "idx_ai_messages_created";--> statement-breakpoint
DROP INDEX "idx_agent_actions_conversation";--> statement-breakpoint
DROP INDEX "idx_agent_actions_status";--> statement-breakpoint
DROP INDEX "idx_agent_actions_tenant_created";--> statement-breakpoint
DROP INDEX "idx_ai_corrections_tenant_tool";--> statement-breakpoint
DROP INDEX "idx_ai_knowledge_chunks_source";--> statement-breakpoint
DROP INDEX "idx_ai_knowledge_chunks_tenant";--> statement-breakpoint
DROP INDEX "idx_ai_mcp_connections_tenant";--> statement-breakpoint
DROP INDEX "idx_ai_workflow_suggestions_tenant_status";--> statement-breakpoint
DROP INDEX "pipelines_tenantId_idx";--> statement-breakpoint
DROP INDEX "pipelines_tenantId_isDefault_key";--> statement-breakpoint
DROP INDEX "pipeline_stages_pipelineId_idx";--> statement-breakpoint
DROP INDEX "pipeline_stages_pipelineId_position_key";--> statement-breakpoint
DROP INDEX "pipeline_stages_pipelineId_slug_key";--> statement-breakpoint
DROP INDEX "pipeline_stages_tenantId_idx";--> statement-breakpoint
DROP INDEX "pipeline_members_customerId_idx";--> statement-breakpoint
DROP INDEX "pipeline_members_pipelineId_customerId_key";--> statement-breakpoint
DROP INDEX "pipeline_members_pipelineId_stageId_idx";--> statement-breakpoint
DROP INDEX "pipeline_members_tenantId_idx";--> statement-breakpoint
DROP INDEX "pipeline_stage_history_v2_memberId_idx";--> statement-breakpoint
DROP INDEX "pipeline_stage_history_v2_tenantId_changedAt_idx";--> statement-breakpoint
DROP INDEX "outreach_sequences_tenantId_idx";--> statement-breakpoint
DROP INDEX "outreach_sequences_tenantId_sector_idx";--> statement-breakpoint
DROP INDEX "outreach_contacts_assignedUserId_idx";--> statement-breakpoint
DROP INDEX "outreach_contacts_customerId_idx";--> statement-breakpoint
DROP INDEX "outreach_contacts_sequenceId_idx";--> statement-breakpoint
DROP INDEX "outreach_contacts_tenantId_customerId_sequenceId_key";--> statement-breakpoint
DROP INDEX "outreach_contacts_tenantId_status_nextDueAt_idx";--> statement-breakpoint
DROP INDEX "outreach_activities_contactId_idx";--> statement-breakpoint
DROP INDEX "outreach_activities_tenantId_occurredAt_idx";--> statement-breakpoint
DROP INDEX "outreach_templates_tenantId_category_idx";--> statement-breakpoint
DROP INDEX "outreach_templates_tenantId_idx";--> statement-breakpoint
DROP INDEX "outreach_snippets_tenantId_category_idx";--> statement-breakpoint
DROP INDEX "outreach_snippets_tenantId_idx";--> statement-breakpoint
DROP INDEX "_SlotStaff_B_index";--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "responsibilities" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_knowledge_chunks" ALTER COLUMN "metadata" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_mcp_connections" ALTER COLUMN "tool_guardrail_overrides" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ALTER COLUMN "guardrail_overrides" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ALTER COLUMN "trust_metrics" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ALTER COLUMN "vertical_custom_terms" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ALTER COLUMN "morning_briefing_recipient_ids" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ALTER COLUMN "ghost_operator_rules" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "pipeline_stages" ALTER COLUMN "allowedTransitions" SET DEFAULT '{}'::uuid[];--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "moduleSlugs" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."deliverables"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."engagement_milestones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."engagement_milestones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "engagement_milestones" ADD CONSTRAINT "engagement_milestones_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "portal_credentials" ADD CONSTRAINT "portal_credentials_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD CONSTRAINT "portal_invoices_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD CONSTRAINT "portal_invoices_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."engagement_milestones"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "approval_requests_engagementId_idx" ON "approval_requests" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "deliverables_engagementId_idx" ON "deliverables" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "deliverables_milestoneId_idx" ON "deliverables" USING btree ("milestoneId");--> statement-breakpoint
CREATE INDEX "engagement_milestones_engagementId_idx" ON "engagement_milestones" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "engagements_tenantId_idx" ON "engagements" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "engagements_customerId_idx" ON "engagements" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "engagements_tenantId_status_idx" ON "engagements" USING btree ("tenantId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_credentials_customerId_key" ON "portal_credentials" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "portal_invoices_engagementId_idx" ON "portal_invoices" USING btree ("engagementId");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_invoices_token_key" ON "portal_invoices" USING btree ("token");--> statement-breakpoint
CREATE INDEX "portal_sessions_customerId_idx" ON "portal_sessions" USING btree ("customerId");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_sessions_token_key" ON "portal_sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_sessions_sessionToken_key" ON "portal_sessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "proposals_engagementId_idx" ON "proposals" USING btree ("engagementId");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_token_key" ON "proposals" USING btree ("token");--> statement-breakpoint
CREATE INDEX "outreach_activities_tenantId_sequenceId_activityType_occurredAt_idx" ON "outreach_activities" USING btree ("tenantId","sequenceId","activityType","occurredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys" USING btree ("keyHash");--> statement-breakpoint
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys" USING btree ("keyPrefix");--> statement-breakpoint
CREATE INDEX "api_keys_tenantId_idx" ON "api_keys" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_templates_slug_key" ON "portal_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "roles_tenantId_idx" ON "roles" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles" USING btree ("tenantId","name");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users" USING btree ("tenantId","email");--> statement-breakpoint
CREATE INDEX "users_tenantId_idx" ON "users" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions" USING btree ("refreshToken");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "services_tenantId_active_idx" ON "services" USING btree ("tenantId","active");--> statement-breakpoint
CREATE INDEX "services_tenantId_idx" ON "services" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_tenantId_name_key" ON "service_categories" USING btree ("tenantId","name");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenantId_email_key" ON "customers" USING btree ("tenantId","email");--> statement-breakpoint
CREATE INDEX "customers_tenantId_idx" ON "customers" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "customers_tenantId_lastName_idx" ON "customers" USING btree ("tenantId","lastName");--> statement-breakpoint
CREATE INDEX "add_ons_tenantId_active_idx" ON "add_ons" USING btree ("tenantId","active");--> statement-breakpoint
CREATE INDEX "add_ons_tenantId_idx" ON "add_ons" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "venues_tenantId_idx" ON "venues" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "user_capacities_tenantId_date_idx" ON "user_capacities" USING btree ("tenantId","date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_capacities_tenantId_userId_date_key" ON "user_capacities" USING btree ("tenantId","userId","date");--> statement-breakpoint
CREATE INDEX "bookings_customerId_idx" ON "bookings" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "bookings_staffId_idx" ON "bookings" USING btree ("staffId");--> statement-breakpoint
CREATE INDEX "bookings_staffId_scheduledDate_idx" ON "bookings" USING btree ("staffId","scheduledDate");--> statement-breakpoint
CREATE INDEX "bookings_tenantId_createdAt_idx" ON "bookings" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "bookings_tenantId_scheduledDate_idx" ON "bookings" USING btree ("tenantId","scheduledDate");--> statement-breakpoint
CREATE INDEX "bookings_tenantId_status_idx" ON "bookings" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "booking_status_history_bookingId_idx" ON "booking_status_history" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "travel_logs_userId_date_idx" ON "travel_logs" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_available_idx" ON "available_slots" USING btree ("tenantId","available");--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_date_idx" ON "available_slots" USING btree ("tenantId","date");--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_date_time_idx" ON "available_slots" USING btree ("tenantId","date","time");--> statement-breakpoint
CREATE INDEX "user_availability_userId_dayOfWeek_idx" ON "user_availability" USING btree ("userId","dayOfWeek");--> statement-breakpoint
CREATE INDEX "user_availability_userId_idx" ON "user_availability" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_availability_userId_specificDate_idx" ON "user_availability" USING btree ("userId","specificDate");--> statement-breakpoint
CREATE INDEX "appointment_completions_bookingId_idx" ON "appointment_completions" USING btree ("bookingId");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_completions_bookingId_key" ON "appointment_completions" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "appointment_completions_completedAt_idx" ON "appointment_completions" USING btree ("completedAt");--> statement-breakpoint
CREATE INDEX "appointment_completions_customerId_idx" ON "appointment_completions" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "appointment_completions_tenantId_idx" ON "appointment_completions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "sentMessages_tenantId_bookingId_idx" ON "sent_messages" USING btree ("tenantId","bookingId");--> statement-breakpoint
CREATE INDEX "sent_messages_bookingId_idx" ON "sent_messages" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "sent_messages_tenantId_createdAt_idx" ON "sent_messages" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "message_templates_tenantId_idx" ON "message_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_tenantId_trigger_channel_serviceId_key" ON "message_templates" USING btree ("tenantId","trigger","channel","serviceId");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_tenantId_provider_key" ON "integrations" USING btree ("tenantId","provider");--> statement-breakpoint
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "notifications_userId_read_idx" ON "notifications" USING btree ("userId","read");--> statement-breakpoint
CREATE INDEX "oauth_states_expiresAt_idx" ON "oauth_states" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "oauth_states_state_idx" ON "oauth_states" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_externalEventId_idx" ON "user_integration_sync_logs" USING btree ("externalEventId");--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_status_idx" ON "user_integration_sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_syncType_idx" ON "user_integration_sync_logs" USING btree ("syncType");--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_userIntegrationId_startedAt_idx" ON "user_integration_sync_logs" USING btree ("userIntegrationId","startedAt");--> statement-breakpoint
CREATE INDEX "user_integrations_lastSyncAt_idx" ON "user_integrations" USING btree ("lastSyncAt");--> statement-breakpoint
CREATE INDEX "user_integrations_provider_status_idx" ON "user_integrations" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "user_integrations_tenantId_idx" ON "user_integrations" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_integrations_tenantId_userId_provider_key" ON "user_integrations" USING btree ("tenantId","userId","provider");--> statement-breakpoint
CREATE INDEX "user_integrations_userId_idx" ON "user_integrations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_integrations_watchChannelExpiration_idx" ON "user_integrations" USING btree ("watchChannelExpiration");--> statement-breakpoint
CREATE INDEX "user_integrations_watchChannelId_idx" ON "user_integrations" USING btree ("watchChannelId");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs" USING btree ("tenantId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs" USING btree ("tenantId","entityType","entityId");--> statement-breakpoint
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "invoices_customerId_idx" ON "invoices" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_tenantId_idx" ON "invoices" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices" USING btree ("tenantId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "modules_category_idx" ON "modules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "modules_isActive_idx" ON "modules" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_slug_key" ON "modules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "payments_customerId_idx" ON "payments" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "payments_invoiceId_idx" ON "payments" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "payments_tenantId_idx" ON "payments" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "projects_startDate_idx" ON "projects" USING btree ("startDate");--> statement-breakpoint
CREATE INDEX "projects_tenantId_priority_idx" ON "projects" USING btree ("tenantId","priority");--> statement-breakpoint
CREATE INDEX "projects_tenantId_status_idx" ON "projects" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "project_members_projectId_idx" ON "project_members" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members" USING btree ("projectId","userId");--> statement-breakpoint
CREATE INDEX "project_members_userId_idx" ON "project_members" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "completed_forms_bookingId_idx" ON "completed_forms" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "completed_forms_customerId_idx" ON "completed_forms" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "completed_forms_status_idx" ON "completed_forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "completed_forms_submittedAt_idx" ON "completed_forms" USING btree ("submittedAt");--> statement-breakpoint
CREATE INDEX "completed_forms_templateId_idx" ON "completed_forms" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "completed_forms_tenantId_idx" ON "completed_forms" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "form_templates_tenantId_active_idx" ON "form_templates" USING btree ("tenantId","active");--> statement-breakpoint
CREATE INDEX "form_templates_tenantId_idx" ON "form_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "review_requests_bookingId_idx" ON "review_requests" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "review_requests_customerId_idx" ON "review_requests" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "review_requests_status_idx" ON "review_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "review_requests_tenantId_idx" ON "review_requests" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "reviews_bookingId_idx" ON "reviews" USING btree ("bookingId");--> statement-breakpoint
CREATE INDEX "reviews_createdAt_idx" ON "reviews" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "reviews_customerId_idx" ON "reviews" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "reviews_staffId_idx" ON "reviews" USING btree ("staffId");--> statement-breakpoint
CREATE INDEX "reviews_tenantId_idx" ON "reviews" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "tasks_assignedTo_dueDate_idx" ON "tasks" USING btree ("assignedTo","dueDate");--> statement-breakpoint
CREATE INDEX "tasks_dueDate_idx" ON "tasks" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "tasks_projectId_status_idx" ON "tasks" USING btree ("projectId","status");--> statement-breakpoint
CREATE INDEX "tasks_tenantId_status_idx" ON "tasks" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tenant_module_settings_moduleId_idx" ON "tenant_module_settings" USING btree ("moduleId");--> statement-breakpoint
CREATE INDEX "tenant_module_settings_tenantId_idx" ON "tenant_module_settings" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_module_settings_tenantId_moduleId_settingKey_key" ON "tenant_module_settings" USING btree ("tenantId","moduleId","settingKey");--> statement-breakpoint
CREATE INDEX "tenant_modules_moduleId_idx" ON "tenant_modules" USING btree ("moduleId");--> statement-breakpoint
CREATE INDEX "tenant_modules_tenantId_idx" ON "tenant_modules" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_modules_tenantId_moduleId_key" ON "tenant_modules" USING btree ("tenantId","moduleId");--> statement-breakpoint
CREATE INDEX "workflows_tenantId_enabled_idx" ON "workflows" USING btree ("tenantId","enabled");--> statement-breakpoint
CREATE INDEX "workflow_executions_tenantId_startedAt_idx" ON "workflow_executions" USING btree ("tenantId","startedAt");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflowId_status_idx" ON "workflow_executions" USING btree ("workflowId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "review_automation_settings_tenantId_key" ON "review_automation_settings" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_tenantId_code_key" ON "discount_codes" USING btree ("tenantId","code");--> statement-breakpoint
CREATE INDEX "discount_codes_tenantId_idx" ON "discount_codes" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "pricing_rules_tenantId_enabled_idx" ON "pricing_rules" USING btree ("tenantId","enabled");--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_metricKey_idx" ON "metric_snapshots" USING btree ("tenantId","metricKey");--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_periodStart_idx" ON "metric_snapshots" USING btree ("tenantId","periodStart");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_stripeAccountId_key" ON "stripe_connect_accounts" USING btree ("stripeAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_tenantId_key" ON "stripe_connect_accounts" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "impersonation_sessions_platformAdminId_idx" ON "impersonation_sessions" USING btree ("platformAdminId") WHERE "endedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "impersonation_sessions_tenantId_idx" ON "impersonation_sessions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "saga_log_entityId_idx" ON "saga_log" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "saga_log_tenantId_status_idx" ON "saga_log" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "tax_rules_tenantId_idx" ON "tax_rules" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_tenantId_idx" ON "webhook_endpoints" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "tenant_portals_tenantId_isActive_idx" ON "tenant_portals" USING btree ("tenantId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_portals_tenantId_urlPath_key" ON "tenant_portals" USING btree ("tenantId","urlPath");--> statement-breakpoint
CREATE UNIQUE INDEX "service_add_ons_serviceId_addOnId_key" ON "service_add_ons" USING btree ("serviceId","addOnId");--> statement-breakpoint
CREATE INDEX "booking_waitlist_customerId_idx" ON "booking_waitlist" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "booking_waitlist_tenantId_status_idx" ON "booking_waitlist" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries" USING btree ("endpointId");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_eventId_idx" ON "webhook_deliveries" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "booking_assignments_bookingId_idx" ON "booking_assignments" USING btree ("bookingId");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_assignments_bookingId_userId_key" ON "booking_assignments" USING btree ("bookingId","userId");--> statement-breakpoint
CREATE INDEX "booking_assignments_userId_idx" ON "booking_assignments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "integration_sync_logs_integrationId_createdAt_idx" ON "integration_sync_logs" USING btree ("integrationId","createdAt");--> statement-breakpoint
CREATE INDEX "user_external_events_blocksAvailability_idx" ON "user_external_events" USING btree ("blocksAvailability");--> statement-breakpoint
CREATE INDEX "user_external_events_tenantId_idx" ON "user_external_events" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "user_external_events_userId_endTime_idx" ON "user_external_events" USING btree ("userId","endTime");--> statement-breakpoint
CREATE INDEX "user_external_events_userId_startTime_idx" ON "user_external_events" USING btree ("userId","startTime");--> statement-breakpoint
CREATE UNIQUE INDEX "user_external_events_userIntegrationId_externalEventId_key" ON "user_external_events" USING btree ("userIntegrationId","externalEventId");--> statement-breakpoint
CREATE INDEX "module_settings_category_idx" ON "module_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "module_settings_moduleId_idx" ON "module_settings" USING btree ("moduleId");--> statement-breakpoint
CREATE UNIQUE INDEX "module_settings_moduleId_key_key" ON "module_settings" USING btree ("moduleId","key");--> statement-breakpoint
CREATE INDEX "workflow_actions_workflowId_order_idx" ON "workflow_actions" USING btree ("workflowId","order");--> statement-breakpoint
CREATE INDEX "resource_assignments_resourceId_idx" ON "resource_assignments" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "resource_assignments_tenantId_moduleSlug_idx" ON "resource_assignments" USING btree ("tenantId","moduleSlug");--> statement-breakpoint
CREATE INDEX "resource_assignments_tenant_user_status_date_idx" ON "resource_assignments" USING btree ("tenantId","userId","status","scheduledDate");--> statement-breakpoint
CREATE INDEX "resource_capacities_tenantId_userId_idx" ON "resource_capacities" USING btree ("tenantId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_capacities_tenant_user_type_from_key" ON "resource_capacities" USING btree ("tenantId","userId","capacityType","effectiveFrom");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_custom_field_defs_tenantId_fieldKey_key" ON "staff_custom_field_definitions" USING btree ("tenantId","fieldKey");--> statement-breakpoint
CREATE INDEX "staff_custom_field_defs_tenantId_idx" ON "staff_custom_field_definitions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "staff_checklist_progress_tenantId_userId_idx" ON "staff_checklist_progress" USING btree ("tenantId","userId");--> statement-breakpoint
CREATE INDEX "staff_checklist_templates_tenantId_idx" ON "staff_checklist_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_custom_field_vals_tenant_user_field_key" ON "staff_custom_field_values" USING btree ("tenantId","userId","fieldDefinitionId");--> statement-breakpoint
CREATE INDEX "staff_custom_field_vals_userId_idx" ON "staff_custom_field_values" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "staff_dept_members_departmentId_idx" ON "staff_department_members" USING btree ("departmentId");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_dept_members_tenant_user_dept_key" ON "staff_department_members" USING btree ("tenantId","userId","departmentId");--> statement-breakpoint
CREATE INDEX "staff_dept_members_userId_idx" ON "staff_department_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "staff_profiles_staffStatus_idx" ON "staff_profiles" USING btree ("staffStatus");--> statement-breakpoint
CREATE INDEX "staff_profiles_tenantId_idx" ON "staff_profiles" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "staff_departments_parentId_idx" ON "staff_departments" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "staff_departments_tenantId_idx" ON "staff_departments" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_departments_tenantId_slug_key" ON "staff_departments" USING btree ("tenantId","slug");--> statement-breakpoint
CREATE INDEX "staff_notes_tenantId_userId_idx" ON "staff_notes" USING btree ("tenantId","userId");--> statement-breakpoint
CREATE INDEX "staff_pay_rates_tenantId_userId_idx" ON "staff_pay_rates" USING btree ("tenantId","userId");--> statement-breakpoint
CREATE INDEX "skill_definitions_tenantId_idx" ON "skill_definitions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "skill_definitions_tenantId_skillType_idx" ON "skill_definitions" USING btree ("tenantId","skillType");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_definitions_tenant_slug_key" ON "skill_definitions" USING btree ("tenantId","slug");--> statement-breakpoint
CREATE INDEX "capacity_type_definitions_tenantId_idx" ON "capacity_type_definitions" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "capacity_type_definitions_tenant_slug_key" ON "capacity_type_definitions" USING btree ("tenantId","slug");--> statement-breakpoint
CREATE INDEX "resource_skills_tenantId_skillType_skillId_idx" ON "resource_skills" USING btree ("tenantId","skillType","skillId");--> statement-breakpoint
CREATE INDEX "resource_skills_tenantId_userId_idx" ON "resource_skills" USING btree ("tenantId","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_skills_tenant_user_type_id_key" ON "resource_skills" USING btree ("tenantId","userId","skillType","skillId");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_status" ON "ai_conversations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_tenant_user" ON "ai_conversations" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_ai_messages_created" ON "ai_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_conversation" ON "agent_actions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_status" ON "agent_actions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_agent_actions_tenant_created" ON "agent_actions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_corrections_tenant_tool" ON "ai_corrections" USING btree ("tenant_id","tool_name");--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_chunks_source" ON "ai_knowledge_chunks" USING btree ("tenant_id","source_id");--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_chunks_tenant" ON "ai_knowledge_chunks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_mcp_connections_tenant" ON "ai_mcp_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ai_workflow_suggestions_tenant_status" ON "ai_workflow_suggestions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "pipelines_tenantId_idx" ON "pipelines" USING btree ("tenantId");--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_tenantId_isDefault_key" ON "pipelines" USING btree ("tenantId") WHERE "isDefault" = true;--> statement-breakpoint
CREATE INDEX "pipeline_stages_pipelineId_idx" ON "pipeline_stages" USING btree ("pipelineId");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_pipelineId_position_key" ON "pipeline_stages" USING btree ("pipelineId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_pipelineId_slug_key" ON "pipeline_stages" USING btree ("pipelineId","slug");--> statement-breakpoint
CREATE INDEX "pipeline_stages_tenantId_idx" ON "pipeline_stages" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "pipeline_members_customerId_idx" ON "pipeline_members" USING btree ("customerId");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_members_pipelineId_customerId_key" ON "pipeline_members" USING btree ("pipelineId","customerId");--> statement-breakpoint
CREATE INDEX "pipeline_members_pipelineId_stageId_idx" ON "pipeline_members" USING btree ("pipelineId","stageId");--> statement-breakpoint
CREATE INDEX "pipeline_members_tenantId_idx" ON "pipeline_members" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "pipeline_stage_history_v2_memberId_idx" ON "pipeline_stage_history_v2" USING btree ("memberId");--> statement-breakpoint
CREATE INDEX "pipeline_stage_history_v2_tenantId_changedAt_idx" ON "pipeline_stage_history_v2" USING btree ("tenantId","changedAt");--> statement-breakpoint
CREATE INDEX "outreach_sequences_tenantId_idx" ON "outreach_sequences" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "outreach_sequences_tenantId_sector_idx" ON "outreach_sequences" USING btree ("tenantId","sector");--> statement-breakpoint
CREATE INDEX "outreach_contacts_assignedUserId_idx" ON "outreach_contacts" USING btree ("assignedUserId");--> statement-breakpoint
CREATE INDEX "outreach_contacts_customerId_idx" ON "outreach_contacts" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "outreach_contacts_sequenceId_idx" ON "outreach_contacts" USING btree ("sequenceId");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_contacts_tenantId_customerId_sequenceId_key" ON "outreach_contacts" USING btree ("tenantId","customerId","sequenceId");--> statement-breakpoint
CREATE INDEX "outreach_contacts_tenantId_status_nextDueAt_idx" ON "outreach_contacts" USING btree ("tenantId","status","nextDueAt");--> statement-breakpoint
CREATE INDEX "outreach_activities_contactId_idx" ON "outreach_activities" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "outreach_activities_tenantId_occurredAt_idx" ON "outreach_activities" USING btree ("tenantId","occurredAt");--> statement-breakpoint
CREATE INDEX "outreach_templates_tenantId_category_idx" ON "outreach_templates" USING btree ("tenantId","category");--> statement-breakpoint
CREATE INDEX "outreach_templates_tenantId_idx" ON "outreach_templates" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "outreach_snippets_tenantId_category_idx" ON "outreach_snippets" USING btree ("tenantId","category");--> statement-breakpoint
CREATE INDEX "outreach_snippets_tenantId_idx" ON "outreach_snippets" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "_SlotStaff_B_index" ON "_SlotStaff" USING btree ("B");--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_ab_check" CHECK ("abVariant" IS NULL OR "pairedSequenceId" IS NOT NULL);