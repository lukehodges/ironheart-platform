-- Phase 1: Universal Data Model Migration
-- Creates new tables (resources, addresses, customer_contacts)
-- Renames existing tables (bookings→jobs, booking_assignments→job_assignments, user_availability→resource_availability)
-- Renames bookingId→jobId columns on related tables
-- Adds new columns and enums

--> statement-breakpoint
-- New enums
CREATE TYPE "public"."ResourceType" AS ENUM('PERSON', 'VEHICLE', 'ROOM', 'EQUIPMENT', 'VIRTUAL');
--> statement-breakpoint
CREATE TYPE "public"."ContactRole" AS ENUM('PRIMARY', 'BILLING', 'SITE_CONTACT', 'GUARDIAN', 'EMERGENCY');
--> statement-breakpoint
CREATE TYPE "public"."JobType" AS ENUM('APPOINTMENT', 'CLASS', 'TEAM_JOB', 'ROUTE_JOB', 'RECURRING_INSTANCE', 'PROJECT_TASK');
--> statement-breakpoint
CREATE TYPE "public"."PricingStrategy" AS ENUM('FIXED', 'TIERED', 'QUOTED', 'FORMULA', 'TIME_AND_MATERIALS', 'RETAINER');
--> statement-breakpoint
CREATE TYPE "public"."AssignmentRole" AS ENUM('LEAD', 'SUPPORT', 'DRIVER', 'OBSERVER');
--> statement-breakpoint
CREATE TYPE "public"."CustomerType" AS ENUM('INDIVIDUAL', 'COMPANY');
--> statement-breakpoint
CREATE TYPE "public"."CrmStage" AS ENUM('PROSPECT', 'ACTIVE', 'CHURNED');
--> statement-breakpoint

-- Create addresses table (must be before resources due to FK)
CREATE TABLE "addresses" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenantId" uuid NOT NULL,
  "line1" text NOT NULL,
  "line2" text,
  "city" text NOT NULL,
  "county" text,
  "postcode" text NOT NULL,
  "country" text DEFAULT 'GB' NOT NULL,
  "lat" numeric(10, 7),
  "lng" numeric(10, 7),
  "geocodedAt" timestamp(3),
  "label" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "addresses_tenantId_idx" ON "addresses" USING btree ("tenantId");
--> statement-breakpoint
CREATE INDEX "addresses_tenantId_postcode_idx" ON "addresses" USING btree ("tenantId","postcode");
--> statement-breakpoint

-- Create resources table
CREATE TABLE "resources" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenantId" uuid NOT NULL,
  "type" "ResourceType" NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "capacity" integer DEFAULT 1 NOT NULL,
  "homeAddressId" uuid,
  "travelEnabled" boolean DEFAULT false NOT NULL,
  "skillTags" text[],
  "userId" uuid,
  "isActive" boolean DEFAULT true NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_homeAddressId_fkey" FOREIGN KEY ("homeAddressId") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "resources_tenantId_type_idx" ON "resources" USING btree ("tenantId","type");
--> statement-breakpoint
CREATE INDEX "resources_tenantId_isActive_idx" ON "resources" USING btree ("tenantId","isActive");
--> statement-breakpoint
CREATE INDEX "resources_userId_idx" ON "resources" USING btree ("userId");
--> statement-breakpoint

-- Create customer_contacts table
CREATE TABLE "customer_contacts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "customerId" uuid NOT NULL,
  "tenantId" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "role" "ContactRole" NOT NULL,
  "receivesNotifications" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "customer_contacts_customerId_idx" ON "customer_contacts" USING btree ("customerId");
--> statement-breakpoint
CREATE INDEX "customer_contacts_tenantId_idx" ON "customer_contacts" USING btree ("tenantId");
--> statement-breakpoint

-- Rename bookings → jobs
ALTER TABLE "bookings" RENAME TO "jobs";
--> statement-breakpoint

-- Rename booking_assignments → job_assignments
ALTER TABLE "booking_assignments" RENAME TO "job_assignments";
--> statement-breakpoint

-- Rename user_availability → resource_availability
ALTER TABLE "user_availability" RENAME TO "resource_availability";
--> statement-breakpoint

-- Rename bookingId → jobId in booking_status_history (rename table too)
ALTER TABLE "booking_status_history" RENAME TO "job_status_history";
--> statement-breakpoint
ALTER TABLE "job_status_history" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint

-- Update FK constraint name on job_status_history
ALTER TABLE "job_status_history" DROP CONSTRAINT IF EXISTS "booking_status_history_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "job_status_history" ADD CONSTRAINT "job_status_history_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in job_assignments, add resourceId and role
ALTER TABLE "job_assignments" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "job_assignments" DROP CONSTRAINT IF EXISTS "booking_assignments_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "job_assignments" ADD COLUMN "resourceId" uuid;
--> statement-breakpoint
ALTER TABLE "job_assignments" ADD COLUMN "role" "AssignmentRole" DEFAULT 'LEAD' NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Add resourceId to resource_availability
ALTER TABLE "resource_availability" ADD COLUMN "resourceId" uuid;
--> statement-breakpoint
ALTER TABLE "resource_availability" ADD CONSTRAINT "resource_availability_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Add new columns to jobs table
ALTER TABLE "jobs" ADD COLUMN "type" "JobType" DEFAULT 'APPOINTMENT' NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "pricingStrategy" "PricingStrategy" DEFAULT 'FIXED' NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "quotedAmount" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "quoteApprovedAt" timestamp(3);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "quoteApprovedById" uuid;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "contractId" uuid;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "primaryAddressId" uuid;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quoteApprovedById_fkey" FOREIGN KEY ("quoteApprovedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Add new columns to customers table
ALTER TABLE "customers" ADD COLUMN "type" "CustomerType" DEFAULT 'INDIVIDUAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "crmStage" "CrmStage" DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "companyName" text;
--> statement-breakpoint

-- Rename bookingId → jobId in appointment_completions
ALTER TABLE "appointment_completions" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "appointment_completions" DROP CONSTRAINT IF EXISTS "appointment_completions_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "appointment_completions" ADD CONSTRAINT "appointment_completions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in customer_notes
ALTER TABLE "customer_notes" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "customer_notes" DROP CONSTRAINT IF EXISTS "customer_notes_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in travel_logs
ALTER TABLE "travel_logs" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in invoices
ALTER TABLE "invoices" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in payments
ALTER TABLE "payments" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in reviews
ALTER TABLE "reviews" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in review_requests
ALTER TABLE "review_requests" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "review_requests" DROP CONSTRAINT IF EXISTS "review_requests_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in completed_forms
ALTER TABLE "completed_forms" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "completed_forms" DROP CONSTRAINT IF EXISTS "completed_forms_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
--> statement-breakpoint

-- Rename bookingId → jobId in sent_messages
ALTER TABLE "sent_messages" RENAME COLUMN "bookingId" TO "jobId";
--> statement-breakpoint
ALTER TABLE "sent_messages" DROP CONSTRAINT IF EXISTS "sent_messages_bookingId_fkey";
--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE cascade;
