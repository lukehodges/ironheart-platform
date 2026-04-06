CREATE TYPE "public"."PaymentRuleTrigger" AS ENUM('MILESTONE_COMPLETE', 'RECURRING', 'RELATIVE_DATE', 'FIXED_DATE', 'ON_APPROVAL');--> statement-breakpoint
CREATE TYPE "public"."ProposalSectionType" AS ENUM('PHASE', 'RECURRING', 'AD_HOC');--> statement-breakpoint
CREATE TYPE "public"."RecurringInterval" AS ENUM('MONTHLY', 'QUARTERLY');--> statement-breakpoint
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."EngagementStatus" ADD VALUE 'PAUSED';--> statement-breakpoint
ALTER TYPE "public"."EngagementType" ADD VALUE 'HYBRID';--> statement-breakpoint
ALTER TYPE "public"."PortalInvoiceStatus" ADD VALUE 'VOID';--> statement-breakpoint
CREATE TABLE "payment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposalId" uuid NOT NULL,
	"tenantId" uuid NOT NULL,
	"sectionId" uuid,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"trigger" "PaymentRuleTrigger" NOT NULL,
	"recurringInterval" "RecurringInterval",
	"relativeDays" integer,
	"fixedDate" date,
	"autoSend" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sectionId" uuid NOT NULL,
	"proposalId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"acceptanceCriteria" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposalId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "ProposalSectionType" NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"estimatedDuration" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "sourceProposalItemId" uuid;--> statement-breakpoint
ALTER TABLE "engagement_milestones" ADD COLUMN "sourceSectionId" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "activeProposalId" uuid;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD COLUMN "sourcePaymentRuleId" uuid;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD COLUMN "stripePaymentIntentId" text;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD COLUMN "stripePaymentUrl" text;--> statement-breakpoint
ALTER TABLE "portal_invoices" ADD COLUMN "invoiceNumber" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "revisionOf" uuid;--> statement-breakpoint
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."proposal_sections"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."proposal_sections"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "proposal_sections" ADD CONSTRAINT "proposal_sections_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "payment_rules_proposalId_idx" ON "payment_rules" USING btree ("proposalId");--> statement-breakpoint
CREATE INDEX "payment_rules_tenantId_idx" ON "payment_rules" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "proposal_items_sectionId_idx" ON "proposal_items" USING btree ("sectionId");--> statement-breakpoint
CREATE INDEX "proposal_items_proposalId_idx" ON "proposal_items" USING btree ("proposalId");--> statement-breakpoint
CREATE INDEX "proposal_sections_proposalId_idx" ON "proposal_sections" USING btree ("proposalId");