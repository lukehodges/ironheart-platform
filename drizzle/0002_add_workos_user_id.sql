ALTER TABLE "bookings" ADD COLUMN "confirmationTokenHash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workos_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workos_user_id_unique" UNIQUE("workos_user_id");