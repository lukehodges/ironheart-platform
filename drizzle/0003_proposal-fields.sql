ALTER TABLE "proposals" ADD COLUMN "problemStatement" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "requirements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "roiData" jsonb;
