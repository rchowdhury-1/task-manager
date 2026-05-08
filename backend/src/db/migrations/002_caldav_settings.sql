-- 002: Per-user CalDAV credentials
-- Safe to run multiple times (all statements are idempotent)

CREATE TABLE IF NOT EXISTS user_settings (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  caldav_url          TEXT NOT NULL DEFAULT 'https://caldav.icloud.com',
  caldav_username     TEXT,
  caldav_password     TEXT,
  caldav_calendar_path TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Column guards for future additions
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS caldav_url TEXT NOT NULL DEFAULT 'https://caldav.icloud.com';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS caldav_username TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS caldav_password TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS caldav_calendar_path TEXT;
