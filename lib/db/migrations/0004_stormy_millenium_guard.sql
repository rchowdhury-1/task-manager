ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
UPDATE users SET timezone = 'Europe/London' WHERE timezone = 'UTC';