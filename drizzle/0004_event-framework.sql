CREATE TYPE "public"."audit_log_op" AS ENUM('insert', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."event_subscription_delivery" AS ENUM('webhook', 'log', 'noop');--> statement-breakpoint
CREATE TYPE "public"."outreach_campaign_status" AS ENUM('draft', 'active', 'paused', 'complete');--> statement-breakpoint
CREATE TYPE "public"."outreach_channel" AS ENUM('email', 'linkedin', 'phone');--> statement-breakpoint
CREATE TYPE "public"."outreach_classifier" AS ENUM('claude', 'luke', 'rule');--> statement-breakpoint
CREATE TYPE "public"."outreach_company_source" AS ENUM('cold', 'referral', 'inbound', 'manual');--> statement-breakpoint
CREATE TYPE "public"."outreach_delivery_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."outreach_employee_band" AS ENUM('1-2', '3-15', '15-50', '50+');--> statement-breakpoint
CREATE TYPE "public"."outreach_reply_status" AS ENUM('none', 'positive', 'negative', 'ooo', 'converter', 'wrong_person', 'auto_reply');--> statement-breakpoint
CREATE TYPE "public"."deal_event_kind" AS ENUM('stage_changed', 'note_added', 'meeting_booked', 'proposal_sent', 'contract_signed');--> statement-breakpoint
CREATE TYPE "public"."deal_product" AS ENUM('audit', 'build_sprint', 'retainer', 'other');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('qualified', 'demo', 'proposal', 'won', 'lost', 'dormant');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"actor" text NOT NULL,
	"tableName" text NOT NULL,
	"rowId" text NOT NULL,
	"op" "audit_log_op" NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"kinds" text[] DEFAULT '{}'::text[] NOT NULL,
	"delivery" "event_subscription_delivery" DEFAULT 'log' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor" bigint DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastDeliveredAt" timestamp (3),
	"lastError" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenantId" uuid,
	"kind" text NOT NULL,
	"entityType" text,
	"entityId" uuid,
	"payload" jsonb NOT NULL,
	"at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actor" text
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"entityType" text NOT NULL,
	"entityId" uuid NOT NULL,
	"source" text NOT NULL,
	"externalId" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid,
	"providerSlug" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secretsRef" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"syncCursor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lastSyncAt" timestamp (3),
	"lastSyncError" text,
	"installedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid,
	"source" text NOT NULL,
	"sourceEventId" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"receivedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processedAt" timestamp (3),
	"processorVersion" integer DEFAULT 0 NOT NULL,
	"error" text,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" "outreach_channel" NOT NULL,
	"city" text,
	"industryFocus" text,
	"status" "outreach_campaign_status" DEFAULT 'draft' NOT NULL,
	"startedAt" timestamp (3),
	"endedAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" text,
	"employeeBand" "outreach_employee_band",
	"city" text,
	"country" text,
	"ownerLed" boolean DEFAULT false NOT NULL,
	"source" "outreach_company_source" DEFAULT 'cold' NOT NULL,
	"doNotContact" boolean DEFAULT false NOT NULL,
	"dncReason" text,
	"dncAt" timestamp (3),
	"enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"companyId" uuid NOT NULL,
	"fullName" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"linkedinUrl" text,
	"isOwner" boolean DEFAULT false NOT NULL,
	"isDecisionMaker" boolean DEFAULT false NOT NULL,
	"bounced" boolean DEFAULT false NOT NULL,
	"doNotContact" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dnc_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"email" text,
	"domain" text,
	"reason" text,
	"addedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"addedBy" text
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"touchId" uuid,
	"contactId" uuid NOT NULL,
	"receivedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"subject" text,
	"body" text,
	"classifiedAs" text,
	"classifiedBy" "outreach_classifier",
	"classificationConfidence" numeric(5, 4),
	"needsReview" boolean DEFAULT true NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"handledAt" timestamp (3),
	"rawEventId" uuid,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" "outreach_channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"parentId" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "touches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"campaignId" uuid,
	"contactId" uuid NOT NULL,
	"templateId" uuid,
	"channel" "outreach_channel" NOT NULL,
	"sentAt" timestamp (3),
	"subjectRendered" text,
	"bodyRendered" text,
	"deliveryStatus" "outreach_delivery_status" DEFAULT 'queued' NOT NULL,
	"openAt" timestamp (3),
	"clickAt" timestamp (3),
	"replyStatus" "outreach_reply_status" DEFAULT 'none' NOT NULL,
	"replyAt" timestamp (3),
	"replySummary" text,
	"nextAction" text,
	"nextActionAt" timestamp (3),
	"externalMessageId" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"dealId" uuid NOT NULL,
	"kind" "deal_event_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actor" text
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"companyId" uuid NOT NULL,
	"primaryContactId" uuid,
	"originTouchId" uuid,
	"name" text NOT NULL,
	"stage" "deal_stage" DEFAULT 'qualified' NOT NULL,
	"product" "deal_product" DEFAULT 'other' NOT NULL,
	"valueEstimate" numeric(12, 2),
	"probability" integer,
	"expectedClose" date,
	"ownerUserId" uuid,
	"notes" text,
	"closedAt" timestamp (3),
	"closeReason" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "deals_probability_range" CHECK ("probability" IS NULL OR ("probability" >= 0 AND "probability" <= 100))
);
--> statement-breakpoint
CREATE TABLE "engagement_org_chart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"engagementId" uuid NOT NULL,
	"parentId" uuid,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"headcount" integer,
	"contactUserId" uuid,
	"contactEmail" text,
	"contactName" text,
	"contactRole" text,
	"interviewMode" text DEFAULT 'OWNER_ONLY' NOT NULL,
	"sampleSize" integer,
	"templateSlugOverride" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lastEditedBy" text NOT NULL,
	"lastEditedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"formSendId" uuid,
	"kind" text DEFAULT 'PERSON' NOT NULL,
	"audit_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"interview_status" text DEFAULT 'NONE' NOT NULL,
	"form_status" text DEFAULT 'NONE' NOT NULL,
	"tenure_years" integer,
	"email" text,
	"is_founder" boolean DEFAULT false NOT NULL,
	"is_fractional" boolean DEFAULT false NOT NULL,
	"avatar_color" text,
	"edge_style" text DEFAULT 'SOLID' NOT NULL,
	"notes" text,
	"extra_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_org_chart_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagementId" uuid NOT NULL,
	"nodeId" uuid,
	"actorType" text NOT NULL,
	"actorId" text,
	"actorName" text NOT NULL,
	"action" text NOT NULL,
	"fromValue" jsonb,
	"toValue" jsonb,
	"message" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pipeline_stage_history_v2" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pipeline_stages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pipelines" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outreach_activities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outreach_contacts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outreach_sequences" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outreach_snippets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outreach_templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "pipeline_members" CASCADE;--> statement-breakpoint
DROP TABLE "pipeline_stage_history_v2" CASCADE;--> statement-breakpoint
DROP TABLE "pipeline_stages" CASCADE;--> statement-breakpoint
DROP TABLE "pipelines" CASCADE;--> statement-breakpoint
DROP TABLE "outreach_activities" CASCADE;--> statement-breakpoint
DROP TABLE "outreach_contacts" CASCADE;--> statement-breakpoint
DROP TABLE "outreach_sequences" CASCADE;--> statement-breakpoint
DROP TABLE "outreach_snippets" CASCADE;--> statement-breakpoint
DROP TABLE "outreach_templates" CASCADE;--> statement-breakpoint
ALTER TABLE "form_templates" ADD COLUMN "engagementId" uuid;--> statement-breakpoint
ALTER TABLE "form_templates" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD COLUMN "pdfStorageKey" text;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD COLUMN "pdfStorageUrl" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "raw_events" ADD CONSTRAINT "raw_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dnc_list" ADD CONSTRAINT "dnc_list_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_touchId_fkey" FOREIGN KEY ("touchId") REFERENCES "public"."touches"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_rawEventId_fkey" FOREIGN KEY ("rawEventId") REFERENCES "public"."raw_events"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "touches" ADD CONSTRAINT "touches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "touches" ADD CONSTRAINT "touches_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "touches" ADD CONSTRAINT "touches_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "touches" ADD CONSTRAINT "touches_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_originTouchId_fkey" FOREIGN KEY ("originTouchId") REFERENCES "public"."touches"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "engagement_org_chart" ADD CONSTRAINT "engagement_org_chart_engagementId_engagements_id_fk" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_tenantId_tableName_at_idx" ON "audit_log" USING btree ("tenantId","tableName","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_at_idx" ON "audit_log" USING btree ("actor","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_subscriptions_tenantId_enabled_idx" ON "event_subscriptions" USING btree ("tenantId","enabled");--> statement-breakpoint
CREATE INDEX "events_tenantId_kind_at_idx" ON "events" USING btree ("tenantId","kind","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "events_entityType_entityId_at_idx" ON "events" USING btree ("entityType","entityId","at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "identities_tenantId_source_externalId_key" ON "identities" USING btree ("tenantId","source","externalId");--> statement-breakpoint
CREATE INDEX "identities_entityType_entityId_idx" ON "identities" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "identities_tenantId_source_idx" ON "identities" USING btree ("tenantId","source");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_tenantId_providerSlug_name_key" ON "integration_connections" USING btree ("tenantId","providerSlug","name");--> statement-breakpoint
CREATE INDEX "integration_connections_tenantId_enabled_idx" ON "integration_connections" USING btree ("tenantId","enabled");--> statement-breakpoint
CREATE INDEX "integration_connections_userId_idx" ON "integration_connections" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_events_source_sourceEventId_key" ON "raw_events" USING btree ("source","sourceEventId");--> statement-breakpoint
CREATE INDEX "raw_events_unprocessed_idx" ON "raw_events" USING btree ("receivedAt") WHERE "processedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "raw_events_tenantId_source_receivedAt_idx" ON "raw_events" USING btree ("tenantId","source","receivedAt");--> statement-breakpoint
CREATE INDEX "campaigns_tenantId_status_idx" ON "campaigns" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "companies_tenantId_domain_idx" ON "companies" USING btree ("tenantId","domain");--> statement-breakpoint
CREATE INDEX "companies_tenantId_city_idx" ON "companies" USING btree ("tenantId","city");--> statement-breakpoint
CREATE INDEX "companies_tenantId_doNotContact_idx" ON "companies" USING btree ("tenantId","doNotContact");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenantId_email_key" ON "contacts" USING btree ("tenantId","email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "contacts_companyId_idx" ON "contacts" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "contacts_tenantId_email_idx" ON "contacts" USING btree ("tenantId","email");--> statement-breakpoint
CREATE UNIQUE INDEX "dnc_list_tenantId_email_key" ON "dnc_list" USING btree ("tenantId","email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dnc_list_tenantId_domain_key" ON "dnc_list" USING btree ("tenantId","domain") WHERE "domain" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "replies_tenantId_needsReview_idx" ON "replies" USING btree ("tenantId") WHERE "needsReview" = true;--> statement-breakpoint
CREATE INDEX "replies_touchId_idx" ON "replies" USING btree ("touchId");--> statement-breakpoint
CREATE INDEX "replies_contactId_receivedAt_idx" ON "replies" USING btree ("contactId","receivedAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "templates_tenantId_active_idx" ON "templates" USING btree ("tenantId","active");--> statement-breakpoint
CREATE INDEX "touches_tenantId_contactId_sentAt_idx" ON "touches" USING btree ("tenantId","contactId","sentAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "touches_campaignId_idx" ON "touches" USING btree ("campaignId");--> statement-breakpoint
CREATE INDEX "touches_awaiting_reply_idx" ON "touches" USING btree ("deliveryStatus") WHERE "replyStatus" = 'none';--> statement-breakpoint
CREATE INDEX "deal_events_dealId_at_idx" ON "deal_events" USING btree ("dealId","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deals_tenantId_stage_idx" ON "deals" USING btree ("tenantId","stage");--> statement-breakpoint
CREATE INDEX "deals_tenantId_ownerUserId_idx" ON "deals" USING btree ("tenantId","ownerUserId");--> statement-breakpoint
CREATE INDEX "deals_companyId_idx" ON "deals" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "idx_org_chart_engagement" ON "engagement_org_chart" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "idx_org_chart_parent" ON "engagement_org_chart" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "idx_org_chart_tenant" ON "engagement_org_chart" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "idx_org_chart_form_send" ON "engagement_org_chart" USING btree ("formSendId");--> statement-breakpoint
CREATE INDEX "idx_org_chart_activity_engagement" ON "engagement_org_chart_activity" USING btree ("engagementId","createdAt" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "form_templates_tenantId_engagementId_idx" ON "form_templates" USING btree ("tenantId","engagementId");--> statement-breakpoint
DROP TYPE "public"."pipeline_stage_type";--> statement-breakpoint
DROP TYPE "public"."outreach_activity_type";--> statement-breakpoint
DROP TYPE "public"."outreach_contact_status";--> statement-breakpoint
DROP TYPE "public"."outreach_reply_category";--> statement-breakpoint
DROP TYPE "public"."outreach_sentiment";