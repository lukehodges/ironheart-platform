-- Sync Drizzle schema with database: add missing columns and tables

-- New enums
CREATE TYPE "public"."ProposalSectionType" AS ENUM('PHASE', 'RECURRING', 'AD_HOC');
CREATE TYPE "public"."PaymentRuleTrigger" AS ENUM('MILESTONE_COMPLETE', 'RECURRING', 'RELATIVE_DATE', 'FIXED_DATE', 'ON_APPROVAL');
CREATE TYPE "public"."RecurringInterval" AS ENUM('MONTHLY', 'QUARTERLY');

-- Add missing enum values
ALTER TYPE "public"."EngagementType" ADD VALUE IF NOT EXISTS 'HYBRID';
ALTER TYPE "public"."EngagementStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "public"."PortalInvoiceStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- engagements: activeProposalId
ALTER TABLE "engagements" ADD COLUMN IF NOT EXISTS "activeProposalId" uuid;

-- proposals: version, revisionOf
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "revisionOf" uuid;

-- engagement_milestones: sourceSectionId
ALTER TABLE "engagement_milestones" ADD COLUMN IF NOT EXISTS "sourceSectionId" uuid;

-- deliverables: sourceProposalItemId
ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "sourceProposalItemId" uuid;

-- portal_invoices: sourcePaymentRuleId, stripePaymentIntentId, stripePaymentUrl, invoiceNumber
ALTER TABLE "portal_invoices" ADD COLUMN IF NOT EXISTS "sourcePaymentRuleId" uuid;
ALTER TABLE "portal_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" text;
ALTER TABLE "portal_invoices" ADD COLUMN IF NOT EXISTS "stripePaymentUrl" text;
ALTER TABLE "portal_invoices" ADD COLUMN IF NOT EXISTS "invoiceNumber" text;

-- New table: proposal_sections
CREATE TABLE IF NOT EXISTS "proposal_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposalId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "ProposalSectionType" NOT NULL,
	"sortOrder" integer NOT NULL DEFAULT 0,
	"estimatedDuration" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "proposal_sections_proposalId_idx" ON "proposal_sections" ("proposalId");
ALTER TABLE "proposal_sections" DROP CONSTRAINT IF EXISTS "proposal_sections_proposalId_fkey";
ALTER TABLE "proposal_sections" ADD CONSTRAINT "proposal_sections_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- New table: proposal_items
CREATE TABLE IF NOT EXISTS "proposal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sectionId" uuid NOT NULL,
	"proposalId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"acceptanceCriteria" text,
	"sortOrder" integer NOT NULL DEFAULT 0,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "proposal_items_sectionId_idx" ON "proposal_items" ("sectionId");
CREATE INDEX IF NOT EXISTS "proposal_items_proposalId_idx" ON "proposal_items" ("proposalId");
ALTER TABLE "proposal_items" DROP CONSTRAINT IF EXISTS "proposal_items_sectionId_fkey";
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "proposal_sections"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "proposal_items" DROP CONSTRAINT IF EXISTS "proposal_items_proposalId_fkey";
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- New table: payment_rules
CREATE TABLE IF NOT EXISTS "payment_rules" (
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
	"autoSend" boolean NOT NULL DEFAULT false,
	"sortOrder" integer NOT NULL DEFAULT 0,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "payment_rules_proposalId_idx" ON "payment_rules" ("proposalId");
CREATE INDEX IF NOT EXISTS "payment_rules_tenantId_idx" ON "payment_rules" ("tenantId");
ALTER TABLE "payment_rules" DROP CONSTRAINT IF EXISTS "payment_rules_proposalId_fkey";
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "payment_rules" DROP CONSTRAINT IF EXISTS "payment_rules_tenantId_fkey";
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "payment_rules" DROP CONSTRAINT IF EXISTS "payment_rules_sectionId_fkey";
ALTER TABLE "payment_rules" ADD CONSTRAINT "payment_rules_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "proposal_sections"("id") ON UPDATE CASCADE ON DELETE SET NULL;