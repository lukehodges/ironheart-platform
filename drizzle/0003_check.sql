ALTER TYPE "public"."MessageTrigger" ADD VALUE 'REVIEW_REQUEST';--> statement-breakpoint
CREATE TABLE "booking_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"serviceId" uuid NOT NULL,
	"staffId" uuid,
	"preferredDate" date,
	"preferredTimeStart" text,
	"preferredTimeEnd" text,
	"flexibilityDays" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'WAITING' NOT NULL,
	"notifiedAt" timestamp with time zone,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"code" text NOT NULL,
	"pricingRuleId" uuid,
	"expiresAt" timestamp with time zone,
	"maxUses" integer,
	"currentUses" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"metricKey" text NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"periodType" text NOT NULL,
	"periodStart" timestamp with time zone NOT NULL,
	"value" numeric NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb DEFAULT '{"logic":"AND","conditions":[]}'::jsonb NOT NULL,
	"modifierType" text NOT NULL,
	"modifierValue" numeric(10, 4) NOT NULL,
	"serviceIds" uuid[],
	"staffIds" uuid[],
	"validFrom" timestamp with time zone,
	"validUntil" timestamp with time zone,
	"maxUses" integer,
	"currentUses" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saga_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"sagaType" text NOT NULL,
	"entityId" uuid NOT NULL,
	"status" text NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
	"errorMessage" text,
	"requiresManualIntervention" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_connect_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"stripeAccountId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chargesEnabled" boolean DEFAULT false NOT NULL,
	"payoutsEnabled" boolean DEFAULT false NOT NULL,
	"requirements" jsonb,
	"capabilities" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(6, 4) NOT NULL,
	"country" text NOT NULL,
	"taxCode" text,
	"appliesTo" text DEFAULT 'ALL' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isReverseCharge" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpointId" uuid NOT NULL,
	"eventType" text NOT NULL,
	"eventId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"responseStatus" integer,
	"responseBody" text,
	"durationMs" integer,
	"deliveredAt" timestamp with time zone,
	"nextRetryAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"description" text,
	"events" text[] NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"lastSuccessAt" timestamp with time zone,
	"lastFailureAt" timestamp with time zone,
	"lastFailureReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_projectId_fkey";
--> statement-breakpoint
DROP INDEX "user_external_events_userIntegrationId_externalEventId_key";--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "responsibilities" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "serviceIds" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "anonymised_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_templates" ADD COLUMN "bodyHtml" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_charge_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_transfer_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "platform_fee_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gocardless_payment_id" text;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD COLUMN "trigger" "MessageTrigger";--> statement-breakpoint
ALTER TABLE "user_integrations" ADD COLUMN "syncToken" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stripe_connect_accounts" ADD CONSTRAINT "stripe_connect_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "booking_waitlist_tenantId_status_idx" ON "booking_waitlist" USING btree ("tenantId" uuid_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "booking_waitlist_customerId_idx" ON "booking_waitlist" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_tenantId_code_key" ON "discount_codes" USING btree ("tenantId" uuid_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "discount_codes_tenantId_idx" ON "discount_codes" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_metricKey_idx" ON "metric_snapshots" USING btree ("tenantId" uuid_ops,"metricKey" text_ops);--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_periodStart_idx" ON "metric_snapshots" USING btree ("tenantId" uuid_ops,"periodStart" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "pricing_rules_tenantId_enabled_idx" ON "pricing_rules" USING btree ("tenantId" uuid_ops,"enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "saga_log_tenantId_status_idx" ON "saga_log" USING btree ("tenantId" uuid_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "saga_log_entityId_idx" ON "saga_log" USING btree ("entityId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_stripeAccountId_key" ON "stripe_connect_accounts" USING btree ("stripeAccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_tenantId_key" ON "stripe_connect_accounts" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "tax_rules_tenantId_idx" ON "tax_rules" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries" USING btree ("endpointId" uuid_ops);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_eventId_idx" ON "webhook_deliveries" USING btree ("eventId" text_ops);--> statement-breakpoint
CREATE INDEX "webhook_endpoints_tenantId_idx" ON "webhook_endpoints" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "bookings_tenantId_createdAt_idx" ON "bookings" USING btree ("tenantId" uuid_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "sentMessages_tenantId_bookingId_idx" ON "sent_messages" USING btree ("tenantId" uuid_ops,"bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_watchChannelId_idx" ON "user_integrations" USING btree ("watchChannelId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_external_events_userIntegrationId_externalEventId_key" ON "user_external_events" USING btree ("userIntegrationId" uuid_ops,"externalEventId" text_ops);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key");