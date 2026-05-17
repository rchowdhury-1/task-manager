CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"colour" text,
	"icon" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "categories_user_slug_unique" UNIQUE("user_id","slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO categories (user_id, slug, label, colour, icon, is_system, sort_order)
SELECT u.id, cat.slug, cat.label, cat.colour, cat.icon, true, cat.sort_order
FROM users u
CROSS JOIN (VALUES
  ('career',    'Career',     'blue',   'briefcase', 0),
  ('lms',       'LMS',        'violet', 'book',      1),
  ('freelance', 'Freelance',  'amber',  'code',      2),
  ('learning',  'Learning',   'green',  'layers',    3),
  ('uber',      'Uber Eats',  'slate',  'truck',     4),
  ('faith',     'Faith',      'rose',   'heart',     5)
) AS cat(slug, label, colour, icon, sort_order)
ON CONFLICT (user_id, slug) DO NOTHING;