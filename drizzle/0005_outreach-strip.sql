-- ============================================================================
-- Outreach module — fresh schema for the observatory.
--
-- Live DB state (checked 2026-06-14):
--   - The v2 outreach tables (companies/contacts/campaigns/templates/touches/
--     replies/dnc_list) and pipeline.deals were NEVER created in this DB
--     despite migration 0004 being marked applied. The relevant DROP IF EXISTS
--     statements are kept defensively but no-op.
--   - The kept enums (outreach_channel, outreach_delivery_status,
--     outreach_classifier) also don't exist — created here.
--   - raw_events doesn't exist either — replies.rawEventId has no FK for now.
--   - Untouched: outreach_sequences/contacts/activities/templates/snippets
--     (different OLD outreach system from 0000), customers/bookings/services/etc.
--
-- Three new tables match the spreadsheet:
--   outreach_leads             — roster (Master Lead List xlsx parity)
--   outreach_daily_activity    — funnel rollups per (date, owner)
--   outreach_weekly_hypothesis — 7-day iteration loop spine
--
-- Plus supporting:
--   outreach_touches  — send audit log (Gmail correlation via externalMessageId)
--   outreach_replies  — inbox triage
--   outreach_dnc_list — suppression
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Defensive drops of legacy v2 outreach tables (no-op if absent)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS "replies" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "touches" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "templates" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "campaigns" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "contacts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "companies" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "dnc_list" CASCADE;--> statement-breakpoint

DROP TYPE IF EXISTS "public"."outreach_campaign_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."outreach_company_source";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."outreach_employee_band";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."outreach_reply_status";--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Enums kept from the v2 design (will create only if missing)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "public"."outreach_channel" AS ENUM('email', 'linkedin', 'phone');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."outreach_delivery_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."outreach_classifier" AS ENUM('claude', 'luke', 'rule');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. New enums for the spreadsheet model
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."outreach_lead_status" AS ENUM('ready', 'draft', 'sent', 'skipped', 'dnc');--> statement-breakpoint
CREATE TYPE "public"."outreach_lead_owner" AS ENUM('luke', 'alex');--> statement-breakpoint
CREATE TYPE "public"."outreach_reply_sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."outreach_hypothesis_status" AS ENUM('active', 'complete');--> statement-breakpoint
CREATE TYPE "public"."outreach_hypothesis_verdict" AS ENUM('pending', 'testing', 'keep', 'mutate', 'kill', 'baseline');--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. outreach_weekly_hypothesis — FK target for leads + daily_activity
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_weekly_hypothesis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "week" text NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "targetSample" integer NOT NULL,
  "targetReplyPct" numeric(5,2) NOT NULL,
  "targetPositivePct" numeric(5,2) NOT NULL,
  "targetBooked" integer DEFAULT 0 NOT NULL,
  "status" "outreach_hypothesis_status" DEFAULT 'active' NOT NULL,
  "verdict" "outreach_hypothesis_verdict" DEFAULT 'pending' NOT NULL,
  "resultSummary" text,
  "replaces" text,
  "prevWeekId" uuid,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "weekly_hypothesis_tenantId_week_key" ON "outreach_weekly_hypothesis" USING btree ("tenantId","week");--> statement-breakpoint
CREATE INDEX "weekly_hypothesis_tenantId_status_idx" ON "outreach_weekly_hypothesis" USING btree ("tenantId","status");--> statement-breakpoint

ALTER TABLE "outreach_weekly_hypothesis" ADD CONSTRAINT "weekly_hypothesis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_weekly_hypothesis" ADD CONSTRAINT "weekly_hypothesis_prevWeekId_fkey" FOREIGN KEY ("prevWeekId") REFERENCES "public"."outreach_weekly_hypothesis"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. outreach_leads — the roster
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "number" integer NOT NULL,
  "owner" "outreach_lead_owner" NOT NULL,
  "status" "outreach_lead_status" DEFAULT 'ready' NOT NULL,
  "name" text NOT NULL,
  "company" text NOT NULL,
  "category" text,
  "email" text,
  "website" text,
  "source" text,
  "researched" boolean DEFAULT false NOT NULL,
  "followUpFlag" boolean DEFAULT false NOT NULL,
  "lastContactedAt" date,
  "nextFollowUpAt" date,
  "reply" boolean DEFAULT false NOT NULL,
  "replySentiment" "outreach_reply_sentiment",
  "researchNotes" text,
  "notes" text,
  "hypothesisWeekId" uuid,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "leads_tenantId_email_key" ON "outreach_leads" USING btree ("tenantId","email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_tenantId_number_key" ON "outreach_leads" USING btree ("tenantId","number");--> statement-breakpoint
CREATE INDEX "leads_tenantId_status_idx" ON "outreach_leads" USING btree ("tenantId","status");--> statement-breakpoint
CREATE INDEX "leads_tenantId_owner_idx" ON "outreach_leads" USING btree ("tenantId","owner");--> statement-breakpoint
CREATE INDEX "leads_tenantId_lastContactedAt_idx" ON "outreach_leads" USING btree ("tenantId","lastContactedAt" DESC);--> statement-breakpoint
CREATE INDEX "leads_tenantId_hypothesisWeekId_idx" ON "outreach_leads" USING btree ("tenantId","hypothesisWeekId");--> statement-breakpoint

ALTER TABLE "outreach_leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_leads" ADD CONSTRAINT "leads_hypothesisWeekId_fkey" FOREIGN KEY ("hypothesisWeekId") REFERENCES "public"."outreach_weekly_hypothesis"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. outreach_daily_activity — dashboard spine
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_daily_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "date" date NOT NULL,
  "owner" "outreach_lead_owner" NOT NULL,
  "channel" "outreach_channel" DEFAULT 'email' NOT NULL,
  "hypothesisWeekId" uuid,
  "sent" integer DEFAULT 0 NOT NULL,
  "replies" integer DEFAULT 0 NOT NULL,
  "positive" integer DEFAULT 0 NOT NULL,
  "meetingsBooked" integer DEFAULT 0 NOT NULL,
  "meetingsTaken" integer DEFAULT 0 NOT NULL,
  "interested" integer DEFAULT 0 NOT NULL,
  "closed" integer DEFAULT 0 NOT NULL,
  "newUpfront" numeric(10,2) DEFAULT '0' NOT NULL,
  "newRetainer" numeric(10,2) DEFAULT '0' NOT NULL,
  "notes" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX "daily_activity_tenantId_date_owner_key" ON "outreach_daily_activity" USING btree ("tenantId","date","owner");--> statement-breakpoint
CREATE INDEX "daily_activity_tenantId_date_idx" ON "outreach_daily_activity" USING btree ("tenantId","date" DESC);--> statement-breakpoint
CREATE INDEX "daily_activity_tenantId_hypothesisWeekId_idx" ON "outreach_daily_activity" USING btree ("tenantId","hypothesisWeekId");--> statement-breakpoint

ALTER TABLE "outreach_daily_activity" ADD CONSTRAINT "daily_activity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_daily_activity" ADD CONSTRAINT "daily_activity_hypothesisWeekId_fkey" FOREIGN KEY ("hypothesisWeekId") REFERENCES "public"."outreach_weekly_hypothesis"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 7. outreach_touches — historical send log (slim)
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_touches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "leadId" uuid NOT NULL,
  "channel" "outreach_channel" NOT NULL,
  "sentAt" timestamp(3),
  "subjectRendered" text,
  "bodyRendered" text,
  "deliveryStatus" "outreach_delivery_status" DEFAULT 'queued' NOT NULL,
  "externalMessageId" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE INDEX "touches_tenantId_leadId_sentAt_idx" ON "outreach_touches" USING btree ("tenantId","leadId","sentAt" DESC);--> statement-breakpoint
CREATE INDEX "touches_tenantId_externalMessageId_idx" ON "outreach_touches" USING btree ("tenantId","externalMessageId");--> statement-breakpoint

ALTER TABLE "outreach_touches" ADD CONSTRAINT "touches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_touches" ADD CONSTRAINT "touches_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."outreach_leads"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 8. outreach_replies — inbox triage (Gmail processor writes here)
--    rawEventId column kept but no FK — raw_events table is unbuilt.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "touchId" uuid,
  "leadId" uuid NOT NULL,
  "receivedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "subject" text,
  "body" text,
  "sentiment" "outreach_reply_sentiment",
  "classifiedBy" "outreach_classifier",
  "needsReview" boolean DEFAULT true NOT NULL,
  "handled" boolean DEFAULT false NOT NULL,
  "handledAt" timestamp(3),
  "rawEventId" uuid,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint

CREATE INDEX "replies_tenantId_needsReview_idx" ON "outreach_replies" USING btree ("tenantId") WHERE "needsReview" = true;--> statement-breakpoint
CREATE INDEX "replies_tenantId_leadId_receivedAt_idx" ON "outreach_replies" USING btree ("tenantId","leadId","receivedAt" DESC);--> statement-breakpoint
CREATE INDEX "replies_touchId_idx" ON "outreach_replies" USING btree ("touchId");--> statement-breakpoint

ALTER TABLE "outreach_replies" ADD CONSTRAINT "replies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_replies" ADD CONSTRAINT "replies_touchId_fkey" FOREIGN KEY ("touchId") REFERENCES "public"."outreach_touches"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_replies" ADD CONSTRAINT "replies_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."outreach_leads"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 9. outreach_dnc_list — suppression
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_dnc_list" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenantId" uuid NOT NULL,
  "email" text,
  "domain" text,
  "reason" text,
  "addedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "addedBy" text
);--> statement-breakpoint

CREATE UNIQUE INDEX "dnc_list_tenantId_email_key" ON "outreach_dnc_list" USING btree ("tenantId","email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dnc_list_tenantId_domain_key" ON "outreach_dnc_list" USING btree ("tenantId","domain") WHERE "domain" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "outreach_dnc_list" ADD CONSTRAINT "dnc_list_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;
