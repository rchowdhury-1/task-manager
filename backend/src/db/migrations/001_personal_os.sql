-- Personal OS migration 001
-- Run inside initSchema() — all CREATE TABLE IF NOT EXISTS, safe to re-run

-- Day rules: which workstream owns each day
CREATE TABLE IF NOT EXISTS day_rules (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  focus_area VARCHAR(50) NOT NULL,
  max_focus_hours DECIMAL(4,1) DEFAULT 8,
  cal_color VARCHAR(20) DEFAULT 'blue',
  UNIQUE(user_id, day_of_week)
);

-- Tasks (extends / replaces cards concept for Personal OS)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority SMALLINT DEFAULT 2 CHECK (priority IN (1,2,3)),
  status VARCHAR(30) DEFAULT 'backlog',
  assigned_day DATE,
  day_of_week SMALLINT,
  duration_minutes INT DEFAULT 60,
  time_logged_minutes INT DEFAULT 0,
  scheduled_time TIME,
  notes TEXT,
  last_left_off TEXT,
  next_steps JSONB DEFAULT '[]',
  cal_event_uid VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_status   ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_day      ON tasks(user_id, assigned_day);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);

-- Recurring task rules
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority SMALLINT DEFAULT 2,
  duration_minutes INT DEFAULT 120,
  scheduled_time TIME NOT NULL,
  days_of_week SMALLINT[] DEFAULT '{0,1,2,3,4,5,6}',
  until_condition VARCHAR(100),
  condition_met BOOLEAN DEFAULT FALSE,
  condition_met_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits definition
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL,
  time_of_day VARCHAR(20),
  duration_minutes INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Habit completions
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(habit_id, completed_date)
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CalDAV sync log
CREATE TABLE IF NOT EXISTS caldav_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  operation VARCHAR(20) NOT NULL,
  event_uid VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
