export interface Task {
  id: string
  user_id: string
  title: string
  category: 'career' | 'lms' | 'freelance' | 'learning' | 'uber' | 'faith'
  priority: 1 | 2 | 3
  status: 'backlog' | 'this_week' | 'in_progress' | 'done'
  assigned_day: string | null
  day_of_week: number | null
  duration_minutes: number
  time_logged_minutes: number
  scheduled_time: string | null
  notes: string | null
  last_left_off: string | null
  next_steps: { text: string; done: boolean }[]
  cal_event_uid: string | null
  created_at: string
  updated_at: string
  activity_count?: number
  activity_log?: TaskActivity[]
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: 'created' | 'moved' | 'note_added' | 'next_step_added' | 'completed' | 'groq_update'
  payload: Record<string, unknown>
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  category: 'faith' | 'body' | 'growth'
  time_of_day: 'morning' | 'evening' | 'anytime'
  duration_minutes: number
  sort_order: number
  active: boolean
  completions: string[]
  streak_days?: number
}

export interface DayRule {
  id: number
  user_id: string
  day_of_week: number
  focus_area: string
  max_focus_hours: number
  cal_color: string
}

export interface RecurringTask {
  id: string
  user_id: string
  title: string
  category: string
  priority: number
  duration_minutes: number
  scheduled_time: string
  days_of_week: number[]
  until_condition: string | null
  condition_met: boolean
  active: boolean
  created_at: string
}

export interface HabitCompletion {
  habit_id: string
  completed_date: string
}

export type CaldavStatus = 'synced' | 'pending' | 'error' | 'disabled' | 'not_configured'

export interface PersonalOSState {
  tasks: Task[]
  recurringTasks: RecurringTask[]
  dayRules: DayRule[]
  habits: Habit[]
  caldavStatus: CaldavStatus
  activeTaskId: string | null
  loading: boolean
}

// Claude diff types
export interface ClaudeDiff {
  operations: ClaudeOperation[]
  summary: string
  warnings: string[]
}

export type ClaudeOperation =
  | { type: 'move_task'; task_id: string; new_status: Task['status'] }
  | { type: 'update_task'; task_id: string; fields: Partial<Pick<Task, 'priority' | 'assigned_day' | 'last_left_off' | 'notes' | 'time_logged_minutes'>> }
  | { type: 'add_next_step'; task_id: string; text: string }
  | { type: 'complete_next_step'; task_id: string; step_index: number }
  | { type: 'create_task'; title: string; category: Task['category']; priority: Task['priority']; status: Task['status']; assigned_day: string | null; duration_minutes: number; scheduled_time: string | null }
  | { type: 'create_habit'; name: string; category: Habit['category']; time_of_day: Habit['time_of_day']; duration_minutes: number }
  | { type: 'complete_habit'; habit_id: string }
  | { type: 'resolve_recurring'; recurring_id: string; reason: string }
  | { type: 'schedule_warning'; message: string }

// Day rule focus area labels
export const FOCUS_LABELS: Record<string, string> = {
  job_hunt: 'Job Hunt',
  lms: 'LMS Build',
  freelance: 'Freelance',
  learning: 'Learning',
  rest: 'Rest',
  flex: 'Flex',
}

export const FOCUS_COLORS: Record<string, string> = {
  job_hunt: '#3b82f6',
  lms: '#10b981',
  freelance: '#f97316',
  learning: '#8b5cf6',
  rest: '#a855f7',
  flex: '#14b8a6',
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#10b981',
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'P1 Urgent',
  2: 'P2 This Week',
  3: 'P3 Backlog',
}

export const CATEGORY_LABELS: Record<string, string> = {
  career: 'Career',
  lms: 'LMS',
  freelance: 'Freelance',
  learning: 'Learning',
  uber: 'Uber Eats',
  faith: 'Faith',
}

export const CATEGORY_COLORS: Record<string, string> = {
  career: '#3b82f6',
  lms: '#10b981',
  freelance: '#f97316',
  learning: '#8b5cf6',
  uber: '#ec4899',
  faith: '#a855f7',
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
