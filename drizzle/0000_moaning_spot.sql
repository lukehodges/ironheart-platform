-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."AssignmentStatus" AS ENUM('ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."AuditSeverity" AS ENUM('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."AvailabilityMode" AS ENUM('CALENDAR_BASED', 'SLOT_BASED', 'HYBRID');--> statement-breakpoint
CREATE TYPE "public"."AvailabilityType" AS ENUM('RECURRING', 'SPECIFIC', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."BookingSource" AS ENUM('ADMIN', 'PORTAL', 'PHONE', 'WALK_IN', 'API');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."CalendarIntegrationProvider" AS ENUM('GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR');--> statement-breakpoint
CREATE TYPE "public"."CalendarSyncType" AS ENUM('FULL_SYNC', 'INCREMENTAL_SYNC', 'MANUAL_SYNC', 'BOOKING_PUSH', 'EVENT_IMPORT');--> statement-breakpoint
CREATE TYPE "public"."CapacityEnforcementMode" AS ENUM('STRICT', 'FLEXIBLE');--> statement-breakpoint
CREATE TYPE "public"."CapacityMode" AS ENUM('TENANT_LEVEL', 'CALENDAR_LEVEL', 'STAFF_LEVEL');--> statement-breakpoint
CREATE TYPE "public"."CapacityUnit" AS ENUM('COUNT', 'HOURS', 'POINTS');--> statement-breakpoint
CREATE TYPE "public"."ChecklistStatus" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."ChecklistTemplateType" AS ENUM('ONBOARDING', 'OFFBOARDING');--> statement-breakpoint
CREATE TYPE "public"."CustomFieldType" AS ENUM('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE');--> statement-breakpoint
CREATE TYPE "public"."CustomerStatus" AS ENUM('ACTIVE', 'INACTIVE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."EmployeeType" AS ENUM('EMPLOYEE', 'CONTRACTOR', 'FREELANCER');--> statement-breakpoint
CREATE TYPE "public"."FormSendTiming" AS ENUM('ON_BOOKING', 'HOURS_24_BEFORE', 'DAYS_1_BEFORE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."FormStatus" AS ENUM('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."IntegrationProvider" AS ENUM('GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'FREEAGENT', 'XERO', 'QUICKBOOKS', 'STRIPE', 'GOCARDLESS', 'TWILIO', 'SENDGRID');--> statement-breakpoint
CREATE TYPE "public"."IntegrationStatus" AS ENUM('DISCONNECTED', 'CONNECTED', 'ERROR', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."InvoiceStatus" AS ENUM('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."LocationType" AS ENUM('VENUE', 'CUSTOMER_HOME', 'CUSTOMER_WORK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."MessageChannel" AS ENUM('EMAIL', 'SMS', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."MessageStatus" AS ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');--> statement-breakpoint
CREATE TYPE "public"."ModuleCategory" AS ENUM('CORE', 'PREMIUM', 'CUSTOM', 'COMING_SOON');--> statement-breakpoint
CREATE TYPE "public"."NoteType" AS ENUM('GENERAL', 'CLINICAL', 'ADMIN', 'FOLLOW_UP');--> statement-breakpoint
CREATE TYPE "public"."PayRateType" AS ENUM('HOURLY', 'DAILY', 'SALARY', 'COMMISSION', 'PIECE_RATE');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('CARD', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'CASH', 'CHEQUE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."PaymentType" AS ENUM('DEPOSIT', 'PAYMENT', 'REFUND', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."PlanType" AS ENUM('STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."ProficiencyLevel" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."ProjectMemberStatus" AS ENUM('ACTIVE', 'INACTIVE', 'LEFT');--> statement-breakpoint
CREATE TYPE "public"."ProjectPriority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."ProjectRole" AS ENUM('OWNER', 'MANAGER', 'LEAD', 'MEMBER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."ProjectStatus" AS ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ProjectType" AS ENUM('INTERNAL', 'CLIENT', 'DEVELOPMENT', 'MAINTENANCE', 'RESEARCH');--> statement-breakpoint
CREATE TYPE "public"."ReviewIssueCategory" AS ENUM('WAIT_TIME', 'SERVICE_QUALITY', 'PRICING', 'COMMUNICATION', 'STAFF_ATTITUDE', 'FACILITY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ReviewRequestStatus" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'COMPLETED', 'BOUNCED', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."ReviewResolutionStatus" AS ENUM('PENDING', 'CONTACTED', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."ReviewSource" AS ENUM('GOOGLE', 'FACEBOOK', 'PRIVATE', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "public"."ReviewTiming" AS ENUM('HOURS_2', 'HOURS_24', 'DAYS_3');--> statement-breakpoint
CREATE TYPE "public"."SettingType" AS ENUM('BOOLEAN', 'NUMBER', 'TEXT', 'SELECT', 'JSON');--> statement-breakpoint
CREATE TYPE "public"."SkillType" AS ENUM('SERVICE', 'CERTIFICATION', 'LANGUAGE', 'QUALIFICATION', 'EQUIPMENT', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."StaffStatus" AS ENUM('ACTIVE', 'ON_LEAVE', 'UNAVAILABLE', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."SyncDirection" AS ENUM('PUSH', 'PULL', 'BIDIRECTIONAL');--> statement-breakpoint
CREATE TYPE "public"."SyncStatus" AS ENUM('SUCCESS', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."TaskPriority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."TaskStatus" AS ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."TaskType" AS ENUM('GENERAL', 'DEVELOPMENT', 'DESIGN', 'TESTING', 'DOCUMENTATION', 'MEETING', 'RESEARCH');--> statement-breakpoint
CREATE TYPE "public"."TenantStatus" AS ENUM('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."UserStatus" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."UserType" AS ENUM('OWNER', 'ADMIN', 'MEMBER', 'CUSTOMER', 'API');--> statement-breakpoint
CREATE TYPE "public"."WorkflowActionType" AS ENUM('SEND_EMAIL', 'SEND_SMS', 'CREATE_CALENDAR_EVENT', 'UPDATE_BOOKING_STATUS', 'SEND_NOTIFICATION', 'CREATE_TASK', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."WorkflowExecutionStatus" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."outreach_activity_type" AS ENUM('SENT', 'REPLIED', 'BOUNCED', 'OPTED_OUT', 'SKIPPED', 'CALL_COMPLETED', 'MEETING_BOOKED', 'CONVERTED', 'UNDONE');--> statement-breakpoint
CREATE TYPE "public"."outreach_contact_status" AS ENUM('ACTIVE', 'REPLIED', 'BOUNCED', 'OPTED_OUT', 'CONVERTED', 'PAUSED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."outreach_reply_category" AS ENUM('INTERESTED', 'NOT_NOW', 'NOT_INTERESTED', 'WRONG_PERSON', 'AUTO_REPLY');--> statement-breakpoint
CREATE TYPE "public"."outreach_sentiment" AS ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NOT_NOW');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage_type" AS ENUM('OPEN', 'WON', 'LOST');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"keyHash" text NOT NULL,
	"keyPrefix" text NOT NULL,
	"scopes" text[],
	"rateLimit" integer DEFAULT 1000 NOT NULL,
	"allowedIps" text[],
	"allowedOrigins" text[],
	"lastUsedAt" timestamp(3),
	"usageCount" bigint DEFAULT 0 NOT NULL,
	"expiresAt" timestamp(3),
	"revokedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdBy" uuid
);
--> statement-breakpoint
CREATE TABLE "portal_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"industry" text NOT NULL,
	"colorScheme" jsonb NOT NULL,
	"fonts" jsonb,
	"logoPosition" text DEFAULT 'left' NOT NULL,
	"stepFlow" jsonb NOT NULL,
	"requiresLocation" boolean DEFAULT true NOT NULL,
	"locationTypes" text[],
	"formSchema" jsonb NOT NULL,
	"defaultAvailabilityMode" "AvailabilityMode" DEFAULT 'SLOT_BASED' NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"reservationMinutes" integer DEFAULT 15 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isSystemTemplate" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"previewImage" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"skipReservation" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"isSystem" boolean DEFAULT false NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp(3),
	"passwordHash" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"displayName" text,
	"avatarUrl" text,
	"phone" text,
	"phoneVerified" timestamp(3),
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"locale" text DEFAULT 'en-GB' NOT NULL,
	"type" "UserType" DEFAULT 'MEMBER' NOT NULL,
	"status" "UserStatus" DEFAULT 'PENDING' NOT NULL,
	"lastLoginAt" timestamp(3),
	"lastActiveAt" timestamp(3),
	"loginCount" integer DEFAULT 0 NOT NULL,
	"failedLoginAttempts" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp(3),
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"twoFactorSecret" text,
	"recoveryCodesHash" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"deletedAt" timestamp(3),
	"invitedById" uuid,
	"isPlatformAdmin" boolean DEFAULT false NOT NULL,
	"workos_user_id" text,
	CONSTRAINT "users_workos_user_id_unique" UNIQUE("workos_user_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"token" text NOT NULL,
	"refreshToken" text,
	"userAgent" text,
	"ipAddress" text,
	"deviceType" text,
	"deviceName" text,
	"country" text,
	"city" text,
	"expiresAt" timestamp(3) NOT NULL,
	"lastUsedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"revokedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"plan" "PlanType" DEFAULT 'STARTER' NOT NULL,
	"status" "TenantStatus" DEFAULT 'ACTIVE' NOT NULL,
	"stripeCustomerId" text,
	"subscriptionId" text,
	"billingEmail" text,
	"maxUsers" integer DEFAULT 5 NOT NULL,
	"maxStaff" integer DEFAULT 10 NOT NULL,
	"maxBookingsMonth" integer DEFAULT 500 NOT NULL,
	"storageUsedBytes" bigint DEFAULT 0 NOT NULL,
	"storageLimitBytes" bigint DEFAULT '5368709120' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"trialEndsAt" timestamp(3),
	"deletedAt" timestamp(3),
	"productId" uuid,
	"planId" uuid
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"durationMinutes" integer NOT NULL,
	"bufferMinutes" integer DEFAULT 0 NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"taxRate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"requiresDeposit" boolean DEFAULT false NOT NULL,
	"depositAmount" numeric(10, 2),
	"depositPercent" integer,
	"color" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"visibleInPortal" boolean DEFAULT true NOT NULL,
	"categoryId" uuid,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"entertainer" text,
	"icon" text,
	"locationType" text,
	"metadata" jsonb,
	"requiresApproximateTime" boolean DEFAULT false NOT NULL,
	"venueNames" text[]
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text,
	"phone" text,
	"addressLine1" text,
	"addressLine2" text,
	"city" text,
	"county" text,
	"postcode" text,
	"country" text DEFAULT 'GB' NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"preferredStaffId" uuid,
	"notes" text,
	"tags" text[],
	"marketingOptIn" boolean DEFAULT false NOT NULL,
	"referralSource" text,
	"status" "CustomerStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"deletedAt" timestamp(3),
	"version" integer DEFAULT 1 NOT NULL,
	"anonymised_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "add_ons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"priceType" text NOT NULL,
	"fixedPrice" numeric(10, 2),
	"perChildPrice" numeric(10, 2),
	"tieredPricing" jsonb,
	"matchedDonation" boolean DEFAULT false NOT NULL,
	"birthdayChildFree" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"addressLine1" text,
	"addressLine2" text,
	"city" text,
	"county" text,
	"postcode" text,
	"country" text DEFAULT 'GB' NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"phone" text,
	"email" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"additionalCost" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "user_capacities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid,
	"date" date NOT NULL,
	"maxBookings" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"bookingNumber" text NOT NULL,
	"customerId" uuid NOT NULL,
	"serviceId" uuid NOT NULL,
	"staffId" uuid,
	"venueId" uuid,
	"scheduledDate" date NOT NULL,
	"scheduledTime" text NOT NULL,
	"durationMinutes" integer NOT NULL,
	"endTime" text,
	"locationType" "LocationType" DEFAULT 'VENUE' NOT NULL,
	"locationAddress" jsonb,
	"travelMinutes" integer,
	"travelMiles" numeric(6, 2),
	"status" "BookingStatus" DEFAULT 'PENDING' NOT NULL,
	"statusChangedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"approvalRequestedAt" timestamp(3),
	"approvalDeadlineAt" timestamp(3),
	"approvedAt" timestamp(3),
	"approvedById" uuid,
	"rejectionReason" text,
	"reservedAt" timestamp(3),
	"reservationExpiresAt" timestamp(3),
	"price" numeric(10, 2),
	"taxAmount" numeric(10, 2),
	"totalAmount" numeric(10, 2),
	"depositRequired" numeric(10, 2),
	"depositPaid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"depositPaidAt" timestamp(3),
	"customerNotes" text,
	"adminNotes" text,
	"source" "BookingSource" DEFAULT 'ADMIN' NOT NULL,
	"cancelledAt" timestamp(3),
	"cancelledBy" uuid,
	"cancellationReason" text,
	"completedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdById" uuid,
	"updatedAt" timestamp(3) NOT NULL,
	"projectId" uuid,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"slotId" uuid,
	"customServiceName" text,
	"mileageCost" numeric(10, 2),
	"confirmationTokenHash" text,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customerId" uuid NOT NULL,
	"bookingId" uuid,
	"content" text NOT NULL,
	"type" "NoteType" DEFAULT 'GENERAL' NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdBy" uuid,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bookingId" uuid NOT NULL,
	"fromStatus" "BookingStatus",
	"toStatus" "BookingStatus" NOT NULL,
	"reason" text,
	"changedById" uuid,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bookingId" uuid,
	"date" date NOT NULL,
	"fromPostcode" text,
	"toPostcode" text,
	"distanceMiles" numeric(6, 2) NOT NULL,
	"durationMins" integer NOT NULL,
	"mileageRate" numeric(10, 4),
	"mileageCost" numeric(10, 2),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "available_slots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"endTime" text,
	"available" boolean DEFAULT true NOT NULL,
	"staffIds" uuid[],
	"serviceIds" uuid[],
	"venueId" uuid,
	"capacity" integer DEFAULT 1 NOT NULL,
	"bookedCount" integer DEFAULT 0 NOT NULL,
	"requiresApproval" boolean DEFAULT false NOT NULL,
	"approvedAt" timestamp(3),
	"approvedBy" uuid,
	"metadata" jsonb,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"estimatedLocation" text,
	"previousSlotId" uuid,
	"travelTimeFromPrev" integer
);
--> statement-breakpoint
CREATE TABLE "user_availability" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"type" "AvailabilityType" NOT NULL,
	"dayOfWeek" integer,
	"specificDate" date,
	"endDate" date,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"reason" text,
	"isAllDay" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"bookingId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"completedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedBy" uuid NOT NULL,
	"durationMinutes" integer,
	"actualStartTime" timestamp(3),
	"actualEndTime" timestamp(3),
	"sessionNotes" text,
	"nextAppointment" timestamp(3),
	"followUpRequired" boolean DEFAULT false NOT NULL,
	"paymentCollected" numeric(10, 2),
	"paymentMethod" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"pushEnabled" boolean DEFAULT true NOT NULL,
	"smsEnabled" boolean DEFAULT false NOT NULL,
	"typePreferences" jsonb,
	"quietHoursEnabled" boolean DEFAULT false NOT NULL,
	"quietHoursStart" text,
	"quietHoursEnd" text,
	"quietHoursDays" integer[],
	"digestEnabled" boolean DEFAULT false NOT NULL,
	"digestFrequency" text,
	"digestTime" text,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"templateId" uuid,
	"channel" "MessageChannel" NOT NULL,
	"trigger" text,
	"recipientType" text NOT NULL,
	"recipientId" uuid NOT NULL,
	"recipientEmail" text,
	"recipientPhone" text,
	"bookingId" uuid,
	"subject" text,
	"body" text NOT NULL,
	"status" "MessageStatus" DEFAULT 'QUEUED' NOT NULL,
	"sentAt" timestamp(3),
	"deliveredAt" timestamp(3),
	"failedAt" timestamp(3),
	"errorMessage" text,
	"providerRef" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"trigger" text NOT NULL,
	"channel" "MessageChannel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"bodyHtml" text,
	"active" boolean DEFAULT true NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"serviceId" uuid
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"provider" "IntegrationProvider" NOT NULL,
	"status" "IntegrationStatus" DEFAULT 'DISCONNECTED' NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"tokenExpiresAt" timestamp(3),
	"config" jsonb,
	"lastSyncAt" timestamp(3),
	"lastSyncError" text,
	"connectedAt" timestamp(3),
	"connectedBy" uuid,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entityType" text,
	"entityId" uuid,
	"actionUrl" text,
	"read" boolean DEFAULT false NOT NULL,
	"readAt" timestamp(3),
	"dismissed" boolean DEFAULT false NOT NULL,
	"channels" text[],
	"emailSent" boolean DEFAULT false NOT NULL,
	"pushSent" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"staffId" uuid,
	"provider" "CalendarIntegrationProvider" NOT NULL,
	"redirectUrl" text,
	"metadata" jsonb,
	"expiresAt" timestamp(3) NOT NULL,
	"usedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"codeVerifier" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_integration_sync_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userIntegrationId" uuid NOT NULL,
	"syncType" "CalendarSyncType" NOT NULL,
	"direction" "SyncDirection" NOT NULL,
	"status" "SyncStatus" NOT NULL,
	"entityType" text,
	"entityId" uuid,
	"externalId" text,
	"itemsProcessed" integer DEFAULT 0 NOT NULL,
	"itemsSucceeded" integer DEFAULT 0 NOT NULL,
	"itemsFailed" integer DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"errorDetails" jsonb,
	"metadata" jsonb,
	"startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3),
	"durationMs" integer,
	"externalEventId" text
);
--> statement-breakpoint
CREATE TABLE "user_integrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"provider" "CalendarIntegrationProvider" NOT NULL,
	"status" "IntegrationStatus" DEFAULT 'DISCONNECTED' NOT NULL,
	"encryptedAccessToken" text,
	"encryptedRefreshToken" text,
	"tokenExpiresAt" timestamp(3),
	"tokenVersion" integer DEFAULT 1 NOT NULL,
	"providerAccountId" text,
	"calendarId" text,
	"syncEnabled" boolean DEFAULT true NOT NULL,
	"pushBookingsToCalendar" boolean DEFAULT true NOT NULL,
	"blockTimeOnCalendar" boolean DEFAULT true NOT NULL,
	"importCalendarEvents" boolean DEFAULT false NOT NULL,
	"twoWaySync" boolean DEFAULT false NOT NULL,
	"syncToken" text,
	"watchChannelId" text,
	"watchChannelToken" text,
	"watchChannelExpiration" timestamp(3),
	"watchResourceId" text,
	"lastSyncAt" timestamp(3),
	"lastSyncStatus" text,
	"lastSyncError" text,
	"nextSyncAt" timestamp(3),
	"connectedAt" timestamp(3),
	"connectedBy" uuid,
	"disconnectedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid,
	"action" text NOT NULL,
	"entityType" text,
	"entityId" uuid,
	"oldValues" jsonb,
	"newValues" jsonb,
	"ipAddress" text,
	"userAgent" text,
	"sessionId" uuid,
	"requestId" text,
	"severity" "AuditSeverity" DEFAULT 'INFO' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"tenantId" uuid PRIMARY KEY NOT NULL,
	"businessName" text NOT NULL,
	"legalName" text,
	"registrationNo" text,
	"vatNumber" text,
	"email" text,
	"phone" text,
	"website" text,
	"addressLine1" text,
	"addressLine2" text,
	"city" text,
	"county" text,
	"postcode" text,
	"country" text DEFAULT 'GB' NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"dateFormat" text DEFAULT 'dd/MM/yyyy' NOT NULL,
	"timeFormat" text DEFAULT 'HH:mm' NOT NULL,
	"weekStartsOn" integer DEFAULT 1 NOT NULL,
	"logoUrl" text,
	"faviconUrl" text,
	"primaryColor" text DEFAULT '#3B82F6' NOT NULL,
	"accentColor" text DEFAULT '#10B981' NOT NULL,
	"businessHours" jsonb,
	"senderName" text,
	"senderEmail" text,
	"replyToEmail" text,
	"emailFooter" text,
	"smsSignature" text,
	"customerLabel" text DEFAULT 'customer' NOT NULL,
	"bookingLabel" text DEFAULT 'booking' NOT NULL,
	"staffLabel" text DEFAULT 'staff' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"customCss" text,
	"fontFamily" text,
	"secondaryColor" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"invoiceNumber" text NOT NULL,
	"customerId" uuid NOT NULL,
	"bookingId" uuid,
	"subtotal" numeric(10, 2) NOT NULL,
	"taxAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"amountPaid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amountDue" numeric(10, 2) NOT NULL,
	"issueDate" date DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"dueDate" date NOT NULL,
	"paidAt" timestamp(3),
	"status" "InvoiceStatus" DEFAULT 'DRAFT' NOT NULL,
	"lineItems" jsonb NOT NULL,
	"notes" text,
	"terms" text,
	"externalRef" text,
	"externalUrl" text,
	"lastSyncedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "ModuleCategory" DEFAULT 'CORE' NOT NULL,
	"icon" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"setupFee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monthlyFee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"features" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"invoiceId" uuid,
	"bookingId" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"type" "PaymentType" DEFAULT 'PAYMENT' NOT NULL,
	"method" "PaymentMethod",
	"status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
	"provider" text,
	"providerRef" text,
	"paidAt" timestamp(3),
	"refundedAt" timestamp(3),
	"description" text,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"stripe_transfer_id" text,
	"platform_fee_amount" numeric(10, 2),
	"idempotency_key" text,
	"gocardless_payment_id" text,
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"startDate" timestamp(3),
	"endDate" timestamp(3),
	"estimatedHours" integer,
	"actualHours" integer,
	"status" "ProjectStatus" DEFAULT 'PLANNING' NOT NULL,
	"priority" "ProjectPriority" DEFAULT 'MEDIUM' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"budgetAmount" numeric(10, 2),
	"actualCost" numeric(10, 2),
	"type" "ProjectType" DEFAULT 'INTERNAL' NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"completedAt" timestamp(3),
	"deletedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" "ProjectRole" DEFAULT 'MEMBER' NOT NULL,
	"responsibilities" text[] DEFAULT '{""}',
	"weeklyHours" integer,
	"hourlyRate" numeric(10, 2),
	"status" "ProjectMemberStatus" DEFAULT 'ACTIVE' NOT NULL,
	"joinedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"leftAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"defaultValue" boolean DEFAULT false NOT NULL,
	"defaultConfig" jsonb,
	"configSchema" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completed_forms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"templateId" uuid NOT NULL,
	"templateName" text NOT NULL,
	"customerId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"customerEmail" text NOT NULL,
	"bookingId" uuid,
	"responses" jsonb NOT NULL,
	"signature" text,
	"submittedAt" timestamp(3),
	"ipAddress" text,
	"userAgent" text,
	"sessionKey" text,
	"status" "FormStatus" DEFAULT 'PENDING' NOT NULL,
	"submittedBy" uuid,
	"expiresAt" timestamp(3),
	"reminderSentAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fields" jsonb NOT NULL,
	"attachedServices" uuid[],
	"sendTiming" "FormSendTiming" DEFAULT 'ON_BOOKING' NOT NULL,
	"completionRequired" boolean DEFAULT false NOT NULL,
	"allowGuestAccess" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedBy" uuid
);
--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"customerEmail" text NOT NULL,
	"bookingId" uuid NOT NULL,
	"sentAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"sentBy" uuid,
	"status" "ReviewRequestStatus" DEFAULT 'PENDING' NOT NULL,
	"respondedAt" timestamp(3),
	"ratingGiven" integer,
	"responseSource" "ReviewSource",
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"customerEmail" text NOT NULL,
	"bookingId" uuid,
	"staffId" uuid,
	"serviceId" uuid,
	"rating" integer DEFAULT 5 NOT NULL,
	"text" text,
	"source" "ReviewSource" DEFAULT 'PRIVATE' NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"issueCategory" "ReviewIssueCategory",
	"resolutionStatus" "ReviewResolutionStatus",
	"resolutionNotes" text,
	"resolvedAt" timestamp(3),
	"resolvedBy" uuid,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"deletedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"tenantId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "TaskStatus" DEFAULT 'TODO' NOT NULL,
	"priority" "TaskPriority" DEFAULT 'MEDIUM' NOT NULL,
	"assignedTo" uuid,
	"dueDate" timestamp(3),
	"estimatedHours" integer,
	"actualHours" integer,
	"dependsOn" uuid,
	"blocking" uuid[],
	"type" "TaskType" DEFAULT 'GENERAL' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"completedAt" timestamp(3),
	"deletedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "SignupRequest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"businessName" text NOT NULL,
	"contactName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"industry" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"tenantId" uuid,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_module_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"moduleId" uuid NOT NULL,
	"settingKey" text NOT NULL,
	"value" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"moduleId" uuid NOT NULL,
	"isEnabled" boolean DEFAULT false NOT NULL,
	"isCustom" boolean DEFAULT false NOT NULL,
	"setupPaid" boolean DEFAULT false NOT NULL,
	"monthlyRate" numeric(10, 2),
	"config" jsonb,
	"activatedAt" timestamp(3),
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb,
	"delay" integer,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"edges" jsonb,
	"isVisual" boolean DEFAULT false NOT NULL,
	"nodes" jsonb,
	"viewport" jsonb,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflowId" uuid NOT NULL,
	"tenantId" uuid NOT NULL,
	"triggerEvent" text NOT NULL,
	"triggerData" jsonb NOT NULL,
	"status" "WorkflowExecutionStatus" DEFAULT 'PENDING' NOT NULL,
	"startedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3),
	"errorMessage" text,
	"actionsExecuted" integer DEFAULT 0 NOT NULL,
	"actionResults" jsonb
);
--> statement-breakpoint
CREATE TABLE "review_automation_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"timing" "ReviewTiming" DEFAULT 'HOURS_24' NOT NULL,
	"preScreenEnabled" boolean DEFAULT true NOT NULL,
	"messageTemplate" text NOT NULL,
	"googleEnabled" boolean DEFAULT false NOT NULL,
	"facebookEnabled" boolean DEFAULT false NOT NULL,
	"privateEnabled" boolean DEFAULT true NOT NULL,
	"autoPublicMinRating" integer DEFAULT 4 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"updatedBy" uuid
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
CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platformAdminId" uuid NOT NULL,
	"tenantId" uuid NOT NULL,
	"targetTenantUserId" uuid,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"endedAt" timestamp with time zone,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "tenant_portals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"templateId" uuid NOT NULL,
	"urlPath" text NOT NULL,
	"displayName" text NOT NULL,
	"colorOverrides" jsonb,
	"labelOverrides" jsonb,
	"formOverrides" jsonb,
	"requiresLocation" boolean DEFAULT true NOT NULL,
	"maxTravelMinutes" integer,
	"travelPadding" integer DEFAULT 15 NOT NULL,
	"availabilityMode" "AvailabilityMode",
	"isActive" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"skipReservation" boolean,
	"bookingSettings" jsonb
);
--> statement-breakpoint
CREATE TABLE "service_add_ons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"serviceId" uuid NOT NULL,
	"addOnId" uuid NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "booking_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bookingId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_sync_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"integrationId" uuid NOT NULL,
	"direction" "SyncDirection" NOT NULL,
	"entityType" text NOT NULL,
	"localId" uuid,
	"remoteId" text,
	"status" "SyncStatus" NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_external_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"userIntegrationId" uuid NOT NULL,
	"externalEventId" text NOT NULL,
	"provider" "CalendarIntegrationProvider" NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"location" text,
	"startTime" timestamp(3) NOT NULL,
	"endTime" timestamp(3) NOT NULL,
	"isAllDay" boolean DEFAULT false NOT NULL,
	"blocksAvailability" boolean DEFAULT true NOT NULL,
	"attendees" jsonb,
	"metadata" jsonb,
	"lastSyncedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"deletedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "module_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"moduleId" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "SettingType" DEFAULT 'BOOLEAN' NOT NULL,
	"defaultValue" jsonb,
	"options" jsonb,
	"validation" jsonb,
	"description" text,
	"category" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflowId" uuid NOT NULL,
	"actionType" "WorkflowActionType" NOT NULL,
	"config" jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"moduleSlug" text NOT NULL,
	"resourceType" text NOT NULL,
	"resourceId" uuid NOT NULL,
	"status" "AssignmentStatus" DEFAULT 'ASSIGNED' NOT NULL,
	"weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"scheduledDate" date,
	"assignedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"startedAt" timestamp(3),
	"completedAt" timestamp(3),
	"assignedBy" uuid,
	"overrideReason" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "resource_capacities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"capacityType" text NOT NULL,
	"maxConcurrent" integer,
	"maxDaily" integer,
	"maxWeekly" integer,
	"unit" "CapacityUnit" DEFAULT 'COUNT' NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveUntil" date,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"fieldKey" text NOT NULL,
	"label" text NOT NULL,
	"fieldType" "CustomFieldType" NOT NULL,
	"options" jsonb,
	"isRequired" boolean DEFAULT false NOT NULL,
	"showOnCard" boolean DEFAULT false NOT NULL,
	"showOnProfile" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"groupName" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_checklist_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"templateId" uuid NOT NULL,
	"status" "ChecklistStatus" DEFAULT 'NOT_STARTED' NOT NULL,
	"items" jsonb NOT NULL,
	"startedAt" timestamp(3),
	"completedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "ChecklistTemplateType" DEFAULT 'ONBOARDING' NOT NULL,
	"employeeType" text,
	"items" jsonb NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"fieldDefinitionId" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"departmentId" uuid NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"joinedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"bio" text,
	"jobTitle" text,
	"employeeType" "EmployeeType",
	"staffStatus" "StaffStatus" DEFAULT 'ACTIVE' NOT NULL,
	"startDate" timestamp(3),
	"dayRate" numeric(10, 2),
	"hourlyRate" numeric(10, 2),
	"mileageRate" numeric(10, 4),
	"bankAccountName" text,
	"bankSortCode" text,
	"bankAccountNumber" text,
	"home_latitude" numeric(9, 6),
	"home_longitude" numeric(9, 6),
	"last_assigned_at" timestamp with time zone,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"reports_to" uuid,
	"date_of_birth" date,
	"tax_id" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"address_line1" text,
	"address_line2" text,
	"address_city" text,
	"address_postcode" text,
	"address_country" text
);
--> statement-breakpoint
CREATE TABLE "staff_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parentId" uuid,
	"managerId" uuid,
	"color" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"content" text NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_pay_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"rateType" "PayRateType" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"effectiveFrom" date NOT NULL,
	"effectiveUntil" date,
	"reason" text,
	"createdBy" uuid,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"skillType" "SkillType" NOT NULL,
	"category" text,
	"description" text,
	"requiresVerification" boolean DEFAULT false NOT NULL,
	"requiresExpiry" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capacity_type_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" "CapacityUnit" DEFAULT 'COUNT' NOT NULL,
	"defaultMaxDaily" integer,
	"defaultMaxWeekly" integer,
	"defaultMaxConcurrent" integer,
	"registeredByModule" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_skills" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenantId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"skillType" "SkillType" NOT NULL,
	"skillId" text NOT NULL,
	"skillName" text NOT NULL,
	"proficiency" "ProficiencyLevel" DEFAULT 'INTERMEDIATE' NOT NULL,
	"verifiedAt" timestamp(3),
	"verifiedBy" uuid,
	"expiresAt" timestamp(3),
	"metadata" jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"skillDefinitionId" uuid
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"status" text DEFAULT 'active' NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text,
	"summary_updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"token_usage" jsonb,
	"page_context" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"tool_input" jsonb NOT NULL,
	"tool_output" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"guardrail_tier" text NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"executed_at" timestamp with time zone,
	"error" text,
	"compensation_data" jsonb,
	"is_reversible" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"attempted_input" jsonb NOT NULL,
	"rejection_reason" text,
	"correct_action" text,
	"context_summary" text,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"embedding" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_mcp_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"server_url" text NOT NULL,
	"auth_type" text DEFAULT 'none' NOT NULL,
	"auth_credential" text,
	"cached_tools" jsonb,
	"tools_refreshed_at" timestamp with time zone,
	"default_guardrail_tier" text DEFAULT 'CONFIRM' NOT NULL,
	"tool_guardrail_overrides" jsonb DEFAULT '{}'::jsonb,
	"health_status" text DEFAULT 'healthy' NOT NULL,
	"last_health_check" timestamp with time zone,
	"is_enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tenant_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_enabled" integer DEFAULT 1 NOT NULL,
	"max_token_budget" integer DEFAULT 50000 NOT NULL,
	"max_messages_per_minute" integer DEFAULT 20 NOT NULL,
	"default_model" text DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"guardrail_overrides" jsonb DEFAULT '{}'::jsonb,
	"trust_metrics" jsonb DEFAULT '{}'::jsonb,
	"vertical_profile" text,
	"vertical_custom_terms" jsonb DEFAULT '{}'::jsonb,
	"morning_briefing_enabled" integer DEFAULT 0 NOT NULL,
	"morning_briefing_time" text DEFAULT '08:00',
	"morning_briefing_timezone" text DEFAULT 'Europe/London',
	"morning_briefing_delivery" text DEFAULT 'in_app',
	"morning_briefing_recipient_ids" jsonb DEFAULT '[]'::jsonb,
	"ghost_operator_enabled" integer DEFAULT 0 NOT NULL,
	"ghost_operator_start_hour" integer DEFAULT 18,
	"ghost_operator_end_hour" integer DEFAULT 8,
	"ghost_operator_timezone" text DEFAULT 'Europe/London',
	"ghost_operator_rules" jsonb DEFAULT '[]'::jsonb,
	"paste_to_pipeline_enabled" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_tenant_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "ai_workflow_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggested_nodes" jsonb,
	"suggested_edges" jsonb,
	"detected_pattern" text NOT NULL,
	"confidence" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"pipelineId" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"position" integer NOT NULL,
	"color" text,
	"type" "pipeline_stage_type" DEFAULT 'OPEN' NOT NULL,
	"allowedTransitions" uuid[] DEFAULT '{""}' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"pipelineId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"stageId" uuid NOT NULL,
	"dealValue" numeric(12, 2),
	"lostReason" text,
	"enteredStageAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"addedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closedAt" timestamp(3),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_history_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"memberId" uuid NOT NULL,
	"fromStageId" uuid,
	"toStageId" uuid NOT NULL,
	"changedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"changedById" uuid,
	"dealValue" numeric(12, 2),
	"lostReason" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "outreach_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sector" text NOT NULL,
	"targetIcp" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"abVariant" text,
	"pairedSequenceId" uuid,
	"steps" jsonb NOT NULL,
	"archivedAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "outreach_sequences_ab_check" CHECK (("abVariant" IS NULL) OR ("pairedSequenceId" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "outreach_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"sequenceId" uuid NOT NULL,
	"assignedUserId" uuid,
	"status" "outreach_contact_status" DEFAULT 'ACTIVE' NOT NULL,
	"currentStep" integer DEFAULT 1 NOT NULL,
	"nextDueAt" timestamp(3),
	"enrolledAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completedAt" timestamp(3),
	"lastActivityAt" timestamp(3),
	"pipelineMemberId" uuid,
	"notes" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"sentiment" "outreach_sentiment",
	"replyCategory" "outreach_reply_category",
	"snoozedUntil" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "outreach_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"contactId" uuid NOT NULL,
	"sequenceId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"stepPosition" integer NOT NULL,
	"channel" text NOT NULL,
	"activityType" "outreach_activity_type" NOT NULL,
	"deliveredTo" text,
	"notes" text,
	"occurredAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"performedByUserId" uuid,
	"previousState" jsonb
);
--> statement-breakpoint
CREATE TABLE "outreach_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"bodyMarkdown" text NOT NULL,
	"tags" text[],
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_snippets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"bodyMarkdown" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"productId" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"priceMonthly" integer NOT NULL,
	"priceYearly" integer,
	"trialDays" integer DEFAULT 14 NOT NULL,
	"stripePriceId" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isDefault" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logoUrl" text,
	"domain" text,
	"moduleSlugs" text[] DEFAULT '{""}' NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"archivedAt" timestamp(3),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "_SlotStaff" (
	"A" uuid NOT NULL,
	"B" uuid NOT NULL,
	CONSTRAINT "_SlotStaff_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"roleId" uuid NOT NULL,
	"permissionId" uuid NOT NULL,
	"conditions" jsonb,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("roleId","permissionId")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"userId" uuid NOT NULL,
	"roleId" uuid NOT NULL,
	"grantedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"grantedBy" uuid,
	"expiresAt" timestamp(3),
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
CREATE TABLE "tenant_features" (
	"tenantId" uuid NOT NULL,
	"featureId" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"enabledAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"enabledBy" uuid,
	CONSTRAINT "tenant_features_pkey" PRIMARY KEY("tenantId","featureId")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferredStaffId_fkey" FOREIGN KEY ("preferredStaffId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_capacities" ADD CONSTRAINT "user_capacities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_capacities" ADD CONSTRAINT "user_capacities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."available_slots"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "travel_logs" ADD CONSTRAINT "travel_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "available_slots" ADD CONSTRAINT "available_slots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "available_slots" ADD CONSTRAINT "available_slots_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "available_slots" ADD CONSTRAINT "available_slots_previousSlotId_fkey" FOREIGN KEY ("previousSlotId") REFERENCES "public"."available_slots"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_completions" ADD CONSTRAINT "appointment_completions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_completions" ADD CONSTRAINT "appointment_completions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_completions" ADD CONSTRAINT "appointment_completions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_completions" ADD CONSTRAINT "appointment_completions_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sent_messages" ADD CONSTRAINT "sent_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_integration_sync_logs" ADD CONSTRAINT "user_integration_sync_logs_userIntegrationId_fkey" FOREIGN KEY ("userIntegrationId") REFERENCES "public"."user_integrations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_connectedBy_fkey" FOREIGN KEY ("connectedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."form_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "completed_forms" ADD CONSTRAINT "completed_forms_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_dependsOn_fkey" FOREIGN KEY ("dependsOn") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_module_settings" ADD CONSTRAINT "tenant_module_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_module_settings" ADD CONSTRAINT "tenant_module_settings_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_automation_settings" ADD CONSTRAINT "review_automation_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "review_automation_settings" ADD CONSTRAINT "review_automation_settings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "public"."pricing_rules"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "stripe_connect_accounts" ADD CONSTRAINT "stripe_connect_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_targetTenantUserId_fkey" FOREIGN KEY ("targetTenantUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_portals" ADD CONSTRAINT "tenant_portals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_portals" ADD CONSTRAINT "tenant_portals_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."portal_templates"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_add_ons" ADD CONSTRAINT "service_add_ons_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_add_ons" ADD CONSTRAINT "service_add_ons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_waitlist" ADD CONSTRAINT "booking_waitlist_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_external_events" ADD CONSTRAINT "user_external_events_userIntegrationId_fkey" FOREIGN KEY ("userIntegrationId") REFERENCES "public"."user_integrations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_external_events" ADD CONSTRAINT "user_external_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_external_events" ADD CONSTRAINT "user_external_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "module_settings" ADD CONSTRAINT "module_settings_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_capacities" ADD CONSTRAINT "resource_capacities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_capacities" ADD CONSTRAINT "resource_capacities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_custom_field_definitions" ADD CONSTRAINT "staff_custom_field_defs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_checklist_progress" ADD CONSTRAINT "staff_checklist_progress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_checklist_progress" ADD CONSTRAINT "staff_checklist_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_checklist_progress" ADD CONSTRAINT "staff_checklist_progress_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."staff_checklist_templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_checklist_templates" ADD CONSTRAINT "staff_checklist_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_custom_field_values" ADD CONSTRAINT "staff_custom_field_vals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_custom_field_values" ADD CONSTRAINT "staff_custom_field_vals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_custom_field_values" ADD CONSTRAINT "staff_custom_field_vals_fieldDefId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "public"."staff_custom_field_definitions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department_members" ADD CONSTRAINT "staff_dept_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department_members" ADD CONSTRAINT "staff_dept_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department_members" ADD CONSTRAINT "staff_dept_members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."staff_departments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_reportsTo_fkey" FOREIGN KEY ("reports_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."staff_departments"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_notes" ADD CONSTRAINT "staff_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_pay_rates" ADD CONSTRAINT "staff_pay_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_pay_rates" ADD CONSTRAINT "staff_pay_rates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_pay_rates" ADD CONSTRAINT "staff_pay_rates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "skill_definitions" ADD CONSTRAINT "skill_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "capacity_type_definitions" ADD CONSTRAINT "capacity_type_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_skills" ADD CONSTRAINT "resource_skills_skillDefinitionId_fkey" FOREIGN KEY ("skillDefinitionId") REFERENCES "public"."skill_definitions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_knowledge_chunks" ADD CONSTRAINT "ai_knowledge_chunks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_mcp_connections" ADD CONSTRAINT "ai_mcp_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tenant_config" ADD CONSTRAINT "ai_tenant_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workflow_suggestions" ADD CONSTRAINT "ai_workflow_suggestions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_members" ADD CONSTRAINT "pipeline_members_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_members" ADD CONSTRAINT "pipeline_members_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_members" ADD CONSTRAINT "pipeline_members_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_members" ADD CONSTRAINT "pipeline_members_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_stage_history_v2" ADD CONSTRAINT "pipeline_stage_history_v2_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_stage_history_v2" ADD CONSTRAINT "pipeline_stage_history_v2_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."pipeline_members"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pipeline_stage_history_v2" ADD CONSTRAINT "pipeline_stage_history_v2_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_pairedSequenceId_fkey" FOREIGN KEY ("pairedSequenceId") REFERENCES "public"."outreach_sequences"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "public"."outreach_sequences"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_activities" ADD CONSTRAINT "outreach_activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_activities" ADD CONSTRAINT "outreach_activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."outreach_contacts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_activities" ADD CONSTRAINT "outreach_activities_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_templates" ADD CONSTRAINT "outreach_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "outreach_snippets" ADD CONSTRAINT "outreach_snippets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_plans" ADD CONSTRAINT "product_plans_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "_SlotStaff" ADD CONSTRAINT "_SlotStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."available_slots"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_SlotStaff" ADD CONSTRAINT "_SlotStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."feature_flags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys" USING btree ("keyHash" text_ops);--> statement-breakpoint
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys" USING btree ("keyPrefix" text_ops);--> statement-breakpoint
CREATE INDEX "api_keys_tenantId_idx" ON "api_keys" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "portal_templates_slug_key" ON "portal_templates" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "roles_tenantId_idx" ON "roles" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles" USING btree ("tenantId" text_ops,"name" text_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users" USING btree ("tenantId" text_ops,"email" text_ops);--> statement-breakpoint
CREATE INDEX "users_tenantId_idx" ON "users" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions" USING btree ("resource" text_ops,"action" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions" USING btree ("refreshToken" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants" USING btree ("domain" text_ops);--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "services_tenantId_active_idx" ON "services" USING btree ("tenantId" bool_ops,"active" bool_ops);--> statement-breakpoint
CREATE INDEX "services_tenantId_idx" ON "services" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_tenantId_name_key" ON "service_categories" USING btree ("tenantId" text_ops,"name" text_ops);--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenantId_email_key" ON "customers" USING btree ("tenantId" text_ops,"email" uuid_ops);--> statement-breakpoint
CREATE INDEX "customers_tenantId_idx" ON "customers" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "customers_tenantId_lastName_idx" ON "customers" USING btree ("tenantId" text_ops,"lastName" text_ops);--> statement-breakpoint
CREATE INDEX "add_ons_tenantId_active_idx" ON "add_ons" USING btree ("tenantId" bool_ops,"active" bool_ops);--> statement-breakpoint
CREATE INDEX "add_ons_tenantId_idx" ON "add_ons" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "venues_tenantId_idx" ON "venues" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_capacities_tenantId_date_idx" ON "user_capacities" USING btree ("tenantId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_capacities_tenantId_userId_date_key" ON "user_capacities" USING btree ("tenantId" date_ops,"userId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "bookings_customerId_idx" ON "bookings" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "bookings_staffId_idx" ON "bookings" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "bookings_staffId_scheduledDate_idx" ON "bookings" USING btree ("staffId" date_ops,"scheduledDate" date_ops);--> statement-breakpoint
CREATE INDEX "bookings_tenantId_createdAt_idx" ON "bookings" USING btree ("tenantId" uuid_ops,"createdAt" uuid_ops);--> statement-breakpoint
CREATE INDEX "bookings_tenantId_scheduledDate_idx" ON "bookings" USING btree ("tenantId" uuid_ops,"scheduledDate" uuid_ops);--> statement-breakpoint
CREATE INDEX "bookings_tenantId_status_idx" ON "bookings" USING btree ("tenantId" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "booking_status_history_bookingId_idx" ON "booking_status_history" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "travel_logs_userId_date_idx" ON "travel_logs" USING btree ("userId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_available_idx" ON "available_slots" USING btree ("tenantId" bool_ops,"available" bool_ops);--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_date_idx" ON "available_slots" USING btree ("tenantId" date_ops,"date" date_ops);--> statement-breakpoint
CREATE INDEX "available_slots_tenantId_date_time_idx" ON "available_slots" USING btree ("tenantId" date_ops,"date" date_ops,"time" date_ops);--> statement-breakpoint
CREATE INDEX "user_availability_userId_dayOfWeek_idx" ON "user_availability" USING btree ("userId" int4_ops,"dayOfWeek" int4_ops);--> statement-breakpoint
CREATE INDEX "user_availability_userId_idx" ON "user_availability" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_availability_userId_specificDate_idx" ON "user_availability" USING btree ("userId" date_ops,"specificDate" date_ops);--> statement-breakpoint
CREATE INDEX "appointment_completions_bookingId_idx" ON "appointment_completions" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_completions_bookingId_key" ON "appointment_completions" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "appointment_completions_completedAt_idx" ON "appointment_completions" USING btree ("completedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "appointment_completions_customerId_idx" ON "appointment_completions" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "appointment_completions_tenantId_idx" ON "appointment_completions" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "sentMessages_tenantId_bookingId_idx" ON "sent_messages" USING btree ("tenantId" uuid_ops,"bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "sent_messages_bookingId_idx" ON "sent_messages" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "sent_messages_tenantId_createdAt_idx" ON "sent_messages" USING btree ("tenantId" uuid_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "message_templates_tenantId_idx" ON "message_templates" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_tenantId_trigger_channel_serviceId_key" ON "message_templates" USING btree ("tenantId" text_ops,"trigger" text_ops,"channel" text_ops,"serviceId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_tenantId_provider_key" ON "integrations" USING btree ("tenantId" uuid_ops,"provider" uuid_ops);--> statement-breakpoint
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications" USING btree ("userId" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notifications_userId_read_idx" ON "notifications" USING btree ("userId" bool_ops,"read" bool_ops);--> statement-breakpoint
CREATE INDEX "oauth_states_expiresAt_idx" ON "oauth_states" USING btree ("expiresAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "oauth_states_state_idx" ON "oauth_states" USING btree ("state" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states" USING btree ("state" text_ops);--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_externalEventId_idx" ON "user_integration_sync_logs" USING btree ("externalEventId" text_ops);--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_status_idx" ON "user_integration_sync_logs" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_syncType_idx" ON "user_integration_sync_logs" USING btree ("syncType" enum_ops);--> statement-breakpoint
CREATE INDEX "user_integration_sync_logs_userIntegrationId_startedAt_idx" ON "user_integration_sync_logs" USING btree ("userIntegrationId" timestamp_ops,"startedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_lastSyncAt_idx" ON "user_integrations" USING btree ("lastSyncAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_provider_status_idx" ON "user_integrations" USING btree ("provider" enum_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_tenantId_idx" ON "user_integrations" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_integrations_tenantId_userId_provider_key" ON "user_integrations" USING btree ("tenantId" uuid_ops,"userId" uuid_ops,"provider" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_userId_idx" ON "user_integrations" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_watchChannelExpiration_idx" ON "user_integrations" USING btree ("watchChannelExpiration" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_integrations_watchChannelId_idx" ON "user_integrations" USING btree ("watchChannelId" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs" USING btree ("tenantId" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs" USING btree ("tenantId" text_ops,"entityType" text_ops,"entityId" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "invoices_customerId_idx" ON "invoices" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "invoices_tenantId_idx" ON "invoices" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices" USING btree ("tenantId" text_ops,"invoiceNumber" text_ops);--> statement-breakpoint
CREATE INDEX "modules_category_idx" ON "modules" USING btree ("category" enum_ops);--> statement-breakpoint
CREATE INDEX "modules_isActive_idx" ON "modules" USING btree ("isActive" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "modules_slug_key" ON "modules" USING btree ("slug" text_ops);--> statement-breakpoint
CREATE INDEX "payments_customerId_idx" ON "payments" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "payments_invoiceId_idx" ON "payments" USING btree ("invoiceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "payments_tenantId_idx" ON "payments" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "projects_startDate_idx" ON "projects" USING btree ("startDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "projects_tenantId_priority_idx" ON "projects" USING btree ("tenantId" uuid_ops,"priority" uuid_ops);--> statement-breakpoint
CREATE INDEX "projects_tenantId_status_idx" ON "projects" USING btree ("tenantId" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "project_members_projectId_idx" ON "project_members" USING btree ("projectId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members" USING btree ("projectId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "project_members_userId_idx" ON "project_members" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_bookingId_idx" ON "completed_forms" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_customerId_idx" ON "completed_forms" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_status_idx" ON "completed_forms" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_submittedAt_idx" ON "completed_forms" USING btree ("submittedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_templateId_idx" ON "completed_forms" USING btree ("templateId" uuid_ops);--> statement-breakpoint
CREATE INDEX "completed_forms_tenantId_idx" ON "completed_forms" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "form_templates_tenantId_active_idx" ON "form_templates" USING btree ("tenantId" bool_ops,"active" bool_ops);--> statement-breakpoint
CREATE INDEX "form_templates_tenantId_idx" ON "form_templates" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "review_requests_bookingId_idx" ON "review_requests" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "review_requests_customerId_idx" ON "review_requests" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "review_requests_status_idx" ON "review_requests" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "review_requests_tenantId_idx" ON "review_requests" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "reviews_bookingId_idx" ON "reviews" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "reviews_createdAt_idx" ON "reviews" USING btree ("createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "reviews_customerId_idx" ON "reviews" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "reviews_staffId_idx" ON "reviews" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "reviews_tenantId_idx" ON "reviews" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_assignedTo_dueDate_idx" ON "tasks" USING btree ("assignedTo" timestamp_ops,"dueDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "tasks_dueDate_idx" ON "tasks" USING btree ("dueDate" timestamp_ops);--> statement-breakpoint
CREATE INDEX "tasks_projectId_status_idx" ON "tasks" USING btree ("projectId" enum_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "tasks_tenantId_status_idx" ON "tasks" USING btree ("tenantId" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "tenant_module_settings_moduleId_idx" ON "tenant_module_settings" USING btree ("moduleId" uuid_ops);--> statement-breakpoint
CREATE INDEX "tenant_module_settings_tenantId_idx" ON "tenant_module_settings" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_module_settings_tenantId_moduleId_settingKey_key" ON "tenant_module_settings" USING btree ("tenantId" uuid_ops,"moduleId" text_ops,"settingKey" text_ops);--> statement-breakpoint
CREATE INDEX "tenant_modules_moduleId_idx" ON "tenant_modules" USING btree ("moduleId" uuid_ops);--> statement-breakpoint
CREATE INDEX "tenant_modules_tenantId_idx" ON "tenant_modules" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_modules_tenantId_moduleId_key" ON "tenant_modules" USING btree ("tenantId" uuid_ops,"moduleId" uuid_ops);--> statement-breakpoint
CREATE INDEX "workflows_tenantId_enabled_idx" ON "workflows" USING btree ("tenantId" bool_ops,"enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "workflow_executions_tenantId_startedAt_idx" ON "workflow_executions" USING btree ("tenantId" timestamp_ops,"startedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "workflow_executions_workflowId_status_idx" ON "workflow_executions" USING btree ("workflowId" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "review_automation_settings_tenantId_key" ON "review_automation_settings" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_tenantId_code_key" ON "discount_codes" USING btree ("tenantId" text_ops,"code" text_ops);--> statement-breakpoint
CREATE INDEX "discount_codes_tenantId_idx" ON "discount_codes" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pricing_rules_tenantId_enabled_idx" ON "pricing_rules" USING btree ("tenantId" bool_ops,"enabled" bool_ops);--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_metricKey_idx" ON "metric_snapshots" USING btree ("tenantId" text_ops,"metricKey" text_ops);--> statement-breakpoint
CREATE INDEX "metric_snapshots_tenantId_periodStart_idx" ON "metric_snapshots" USING btree ("tenantId" timestamptz_ops,"periodStart" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_stripeAccountId_key" ON "stripe_connect_accounts" USING btree ("stripeAccountId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connect_accounts_tenantId_key" ON "stripe_connect_accounts" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "impersonation_sessions_platformAdminId_idx" ON "impersonation_sessions" USING btree ("platformAdminId" uuid_ops) WHERE ("endedAt" IS NULL);--> statement-breakpoint
CREATE INDEX "impersonation_sessions_tenantId_idx" ON "impersonation_sessions" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "saga_log_entityId_idx" ON "saga_log" USING btree ("entityId" uuid_ops);--> statement-breakpoint
CREATE INDEX "saga_log_tenantId_status_idx" ON "saga_log" USING btree ("tenantId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "tax_rules_tenantId_idx" ON "tax_rules" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "webhook_endpoints_tenantId_idx" ON "webhook_endpoints" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "tenant_portals_tenantId_isActive_idx" ON "tenant_portals" USING btree ("tenantId" bool_ops,"isActive" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_portals_tenantId_urlPath_key" ON "tenant_portals" USING btree ("tenantId" text_ops,"urlPath" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "service_add_ons_serviceId_addOnId_key" ON "service_add_ons" USING btree ("serviceId" uuid_ops,"addOnId" uuid_ops);--> statement-breakpoint
CREATE INDEX "booking_waitlist_customerId_idx" ON "booking_waitlist" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "booking_waitlist_tenantId_status_idx" ON "booking_waitlist" USING btree ("tenantId" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries" USING btree ("endpointId" uuid_ops);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_eventId_idx" ON "webhook_deliveries" USING btree ("eventId" text_ops);--> statement-breakpoint
CREATE INDEX "booking_assignments_bookingId_idx" ON "booking_assignments" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "booking_assignments_bookingId_userId_key" ON "booking_assignments" USING btree ("bookingId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "booking_assignments_userId_idx" ON "booking_assignments" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "integration_sync_logs_integrationId_createdAt_idx" ON "integration_sync_logs" USING btree ("integrationId" timestamp_ops,"createdAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_external_events_blocksAvailability_idx" ON "user_external_events" USING btree ("blocksAvailability" bool_ops);--> statement-breakpoint
CREATE INDEX "user_external_events_tenantId_idx" ON "user_external_events" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_external_events_userId_endTime_idx" ON "user_external_events" USING btree ("userId" timestamp_ops,"endTime" timestamp_ops);--> statement-breakpoint
CREATE INDEX "user_external_events_userId_startTime_idx" ON "user_external_events" USING btree ("userId" timestamp_ops,"startTime" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_external_events_userIntegrationId_externalEventId_key" ON "user_external_events" USING btree ("userIntegrationId" text_ops,"externalEventId" text_ops);--> statement-breakpoint
CREATE INDEX "module_settings_category_idx" ON "module_settings" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "module_settings_moduleId_idx" ON "module_settings" USING btree ("moduleId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "module_settings_moduleId_key_key" ON "module_settings" USING btree ("moduleId" text_ops,"key" uuid_ops);--> statement-breakpoint
CREATE INDEX "workflow_actions_workflowId_order_idx" ON "workflow_actions" USING btree ("workflowId" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "resource_assignments_resourceId_idx" ON "resource_assignments" USING btree ("resourceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "resource_assignments_tenantId_moduleSlug_idx" ON "resource_assignments" USING btree ("tenantId" uuid_ops,"moduleSlug" uuid_ops);--> statement-breakpoint
CREATE INDEX "resource_assignments_tenant_user_status_date_idx" ON "resource_assignments" USING btree ("tenantId" uuid_ops,"userId" enum_ops,"status" uuid_ops,"scheduledDate" uuid_ops);--> statement-breakpoint
CREATE INDEX "resource_capacities_tenantId_userId_idx" ON "resource_capacities" USING btree ("tenantId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "resource_capacities_tenant_user_type_from_key" ON "resource_capacities" USING btree ("tenantId" uuid_ops,"userId" uuid_ops,"capacityType" uuid_ops,"effectiveFrom" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_custom_field_defs_tenantId_fieldKey_key" ON "staff_custom_field_definitions" USING btree ("tenantId" text_ops,"fieldKey" text_ops);--> statement-breakpoint
CREATE INDEX "staff_custom_field_defs_tenantId_idx" ON "staff_custom_field_definitions" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_checklist_progress_tenantId_userId_idx" ON "staff_checklist_progress" USING btree ("tenantId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_checklist_templates_tenantId_idx" ON "staff_checklist_templates" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_custom_field_vals_tenant_user_field_key" ON "staff_custom_field_values" USING btree ("tenantId" uuid_ops,"userId" uuid_ops,"fieldDefinitionId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_custom_field_vals_userId_idx" ON "staff_custom_field_values" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_dept_members_departmentId_idx" ON "staff_department_members" USING btree ("departmentId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_dept_members_tenant_user_dept_key" ON "staff_department_members" USING btree ("tenantId" uuid_ops,"userId" uuid_ops,"departmentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_dept_members_userId_idx" ON "staff_department_members" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_profiles_staffStatus_idx" ON "staff_profiles" USING btree ("staffStatus" enum_ops);--> statement-breakpoint
CREATE INDEX "staff_profiles_tenantId_idx" ON "staff_profiles" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_departments_parentId_idx" ON "staff_departments" USING btree ("parentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_departments_tenantId_idx" ON "staff_departments" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_departments_tenantId_slug_key" ON "staff_departments" USING btree ("tenantId" uuid_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "staff_notes_tenantId_userId_idx" ON "staff_notes" USING btree ("tenantId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "staff_pay_rates_tenantId_userId_idx" ON "staff_pay_rates" USING btree ("tenantId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "skill_definitions_tenantId_idx" ON "skill_definitions" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "skill_definitions_tenantId_skillType_idx" ON "skill_definitions" USING btree ("tenantId" uuid_ops,"skillType" enum_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "skill_definitions_tenant_slug_key" ON "skill_definitions" USING btree ("tenantId" uuid_ops,"slug" uuid_ops);--> statement-breakpoint
CREATE INDEX "capacity_type_definitions_tenantId_idx" ON "capacity_type_definitions" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "capacity_type_definitions_tenant_slug_key" ON "capacity_type_definitions" USING btree ("tenantId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "resource_skills_tenantId_skillType_skillId_idx" ON "resource_skills" USING btree ("tenantId" enum_ops,"skillType" uuid_ops,"skillId" enum_ops);--> statement-breakpoint
CREATE INDEX "resource_skills_tenantId_userId_idx" ON "resource_skills" USING btree ("tenantId" uuid_ops,"userId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "resource_skills_tenant_user_type_id_key" ON "resource_skills" USING btree ("tenantId" text_ops,"userId" uuid_ops,"skillType" enum_ops,"skillId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_status" ON "ai_conversations" USING btree ("tenant_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_tenant_user" ON "ai_conversations" USING btree ("tenant_id" uuid_ops,"user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation" ON "ai_messages" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_messages_created" ON "ai_messages" USING btree ("conversation_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_agent_actions_conversation" ON "agent_actions" USING btree ("conversation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_agent_actions_status" ON "agent_actions" USING btree ("tenant_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_agent_actions_tenant_created" ON "agent_actions" USING btree ("tenant_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_corrections_tenant_tool" ON "ai_corrections" USING btree ("tenant_id" text_ops,"tool_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_chunks_source" ON "ai_knowledge_chunks" USING btree ("tenant_id" text_ops,"source_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_knowledge_chunks_tenant" ON "ai_knowledge_chunks" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_mcp_connections_tenant" ON "ai_mcp_connections" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_workflow_suggestions_tenant_status" ON "ai_workflow_suggestions" USING btree ("tenant_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "pipelines_tenantId_idx" ON "pipelines" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_tenantId_isDefault_key" ON "pipelines" USING btree ("tenantId" uuid_ops) WHERE ("isDefault" = true);--> statement-breakpoint
CREATE INDEX "pipeline_stages_pipelineId_idx" ON "pipeline_stages" USING btree ("pipelineId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_pipelineId_position_key" ON "pipeline_stages" USING btree ("pipelineId" int4_ops,"position" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_pipelineId_slug_key" ON "pipeline_stages" USING btree ("pipelineId" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE INDEX "pipeline_stages_tenantId_idx" ON "pipeline_stages" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pipeline_members_customerId_idx" ON "pipeline_members" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_members_pipelineId_customerId_key" ON "pipeline_members" USING btree ("pipelineId" uuid_ops,"customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pipeline_members_pipelineId_stageId_idx" ON "pipeline_members" USING btree ("pipelineId" uuid_ops,"stageId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pipeline_members_tenantId_idx" ON "pipeline_members" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pipeline_stage_history_v2_memberId_idx" ON "pipeline_stage_history_v2" USING btree ("memberId" uuid_ops);--> statement-breakpoint
CREATE INDEX "pipeline_stage_history_v2_tenantId_changedAt_idx" ON "pipeline_stage_history_v2" USING btree ("tenantId" timestamp_ops,"changedAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "outreach_sequences_tenantId_idx" ON "outreach_sequences" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_sequences_tenantId_sector_idx" ON "outreach_sequences" USING btree ("tenantId" text_ops,"sector" text_ops);--> statement-breakpoint
CREATE INDEX "outreach_contacts_assignedUserId_idx" ON "outreach_contacts" USING btree ("assignedUserId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_contacts_customerId_idx" ON "outreach_contacts" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_contacts_sequenceId_idx" ON "outreach_contacts" USING btree ("sequenceId" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_contacts_tenantId_customerId_sequenceId_key" ON "outreach_contacts" USING btree ("tenantId" uuid_ops,"customerId" uuid_ops,"sequenceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_contacts_tenantId_status_nextDueAt_idx" ON "outreach_contacts" USING btree ("tenantId" timestamp_ops,"status" timestamp_ops,"nextDueAt" enum_ops);--> statement-breakpoint
CREATE INDEX "outreach_activities_contactId_idx" ON "outreach_activities" USING btree ("contactId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_activities_tenantId_occurredAt_idx" ON "outreach_activities" USING btree ("tenantId" timestamp_ops,"occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "outreach_activities_tenantId_sequenceId_activityType_occurredAt" ON "outreach_activities" USING btree ("tenantId" timestamp_ops,"sequenceId" timestamp_ops,"activityType" timestamp_ops,"occurredAt" timestamp_ops);--> statement-breakpoint
CREATE INDEX "outreach_templates_tenantId_category_idx" ON "outreach_templates" USING btree ("tenantId" text_ops,"category" text_ops);--> statement-breakpoint
CREATE INDEX "outreach_templates_tenantId_idx" ON "outreach_templates" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "outreach_snippets_tenantId_category_idx" ON "outreach_snippets" USING btree ("tenantId" text_ops,"category" text_ops);--> statement-breakpoint
CREATE INDEX "outreach_snippets_tenantId_idx" ON "outreach_snippets" USING btree ("tenantId" uuid_ops);--> statement-breakpoint
CREATE INDEX "_SlotStaff_B_index" ON "_SlotStaff" USING btree ("B" uuid_ops);
*/