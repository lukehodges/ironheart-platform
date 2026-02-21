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
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_targetTenantUserId_fkey" FOREIGN KEY ("targetTenantUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "impersonation_sessions_platformAdminId_idx" ON "impersonation_sessions" USING btree ("platformAdminId" uuid_ops) WHERE "endedAt" IS NULL;--> statement-breakpoint
CREATE INDEX "impersonation_sessions_tenantId_idx" ON "impersonation_sessions" USING btree ("tenantId" uuid_ops);