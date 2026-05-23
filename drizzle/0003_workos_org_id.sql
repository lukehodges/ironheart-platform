CREATE TYPE "public"."EngagementStage" AS ENUM('DISCOVERY', 'PROPOSAL', 'CONTRACTED', 'ONBOARDING', 'AUDITING', 'REPORTING', 'IMPLEMENTING', 'RETAINER', 'CLOSED_WON', 'CLOSED_LOST');--> statement-breakpoint
CREATE TYPE "public"."AuditLens" AS ENUM('REVENUE', 'OPERATIONS', 'FINANCE', 'TECHNOLOGY', 'TEAM');--> statement-breakpoint
CREATE TYPE "public"."AuditSessionStatus" AS ENUM('IN_PROGRESS', 'PROCESSING', 'READY_FOR_REPORT', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."FindingImpact" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."RagScore" AS ENUM('RED', 'AMBER', 'GREEN');--> statement-breakpoint
CREATE TYPE "public"."AuditReportStatus" AS ENUM('GENERATING', 'DRAFT', 'IN_REVIEW', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "audit_call_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auditSessionId" uuid NOT NULL,
	"contactUserId" uuid NOT NULL,
	"rawNotes" text DEFAULT '' NOT NULL,
	"callDate" timestamp (3),
	"callDuration" integer,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lensAnalysisId" uuid NOT NULL,
	"finding" text NOT NULL,
	"impact" "FindingImpact" NOT NULL,
	"evidence" text,
	"priority" integer NOT NULL,
	"estimatedAnnualWaste" integer,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_lens_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auditSessionId" uuid NOT NULL,
	"lens" "AuditLens" NOT NULL,
	"ragScore" "RagScore",
	"ragJustification" text,
	"currentState" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lensAnalysisId" uuid NOT NULL,
	"action" text NOT NULL,
	"estimatedEffort" text,
	"estimatedCost" integer,
	"priority" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"engagementId" uuid NOT NULL,
	"status" "AuditSessionStatus" DEFAULT 'IN_PROGRESS' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"engagementId" uuid NOT NULL,
	"auditSessionId" uuid NOT NULL,
	"status" "AuditReportStatus" DEFAULT 'GENERATING' NOT NULL,
	"contentHtml" text DEFAULT '' NOT NULL,
	"contentJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"executiveSummary" text DEFAULT '' NOT NULL,
	"totalEstimatedWaste" integer DEFAULT 0 NOT NULL,
	"driveFileId" text,
	"publishedAt" timestamp (3),
	"generatedBy" text DEFAULT 'manual' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "workosOrgId" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "stage" "EngagementStage" DEFAULT 'DISCOVERY';--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "clientTenantId" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "auditWindowStart" date;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "auditWindowEnd" date;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "closedReason" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "planeProjectId" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "driveFolderId" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "discoveryCallId" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "discoveryNotes" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "qualificationData" jsonb;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "problemStatement" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "requirements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "roiData" jsonb;--> statement-breakpoint
ALTER TABLE "audit_call_notes" ADD CONSTRAINT "audit_call_notes_sessionId_fkey" FOREIGN KEY ("auditSessionId") REFERENCES "public"."audit_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_lensId_fkey" FOREIGN KEY ("lensAnalysisId") REFERENCES "public"."audit_lens_analysis"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_lens_analysis" ADD CONSTRAINT "audit_lens_analysis_sessionId_fkey" FOREIGN KEY ("auditSessionId") REFERENCES "public"."audit_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_recommendations" ADD CONSTRAINT "audit_recommendations_lensId_fkey" FOREIGN KEY ("lensAnalysisId") REFERENCES "public"."audit_lens_analysis"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_sessions" ADD CONSTRAINT "audit_sessions_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_sessionId_fkey" FOREIGN KEY ("auditSessionId") REFERENCES "public"."audit_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_call_notes_sessionId_idx" ON "audit_call_notes" USING btree ("auditSessionId");--> statement-breakpoint
CREATE INDEX "audit_findings_lensId_idx" ON "audit_findings" USING btree ("lensAnalysisId");--> statement-breakpoint
CREATE INDEX "audit_lens_analysis_sessionId_idx" ON "audit_lens_analysis" USING btree ("auditSessionId");--> statement-breakpoint
CREATE INDEX "audit_recommendations_lensId_idx" ON "audit_recommendations" USING btree ("lensAnalysisId");--> statement-breakpoint
CREATE INDEX "audit_sessions_tenantId_idx" ON "audit_sessions" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "audit_sessions_engagementId_idx" ON "audit_sessions" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "audit_reports_tenantId_idx" ON "audit_reports" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "audit_reports_engagementId_idx" ON "audit_reports" USING btree ("engagementId");--> statement-breakpoint
CREATE INDEX "audit_reports_sessionId_idx" ON "audit_reports" USING btree ("auditSessionId");