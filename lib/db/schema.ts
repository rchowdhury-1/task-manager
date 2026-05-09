import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  numeric,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ─── tasks ────────────────────────────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull().default("career"),
    // category values: career | lms | freelance | learning | uber | faith
    status: varchar("status", { length: 50 }).notNull().default("backlog"),
    // status values: backlog | this_week | in_progress | done
    priority: integer("priority").notNull().default(2), // 1 | 2 | 3
    assignedDay: date("assigned_day"),
    scheduledTime: time("scheduled_time"),
    durationMinutes: integer("duration_minutes").default(60),
    timeLoggedMinutes: integer("time_logged_minutes").default(0),
    lastLeftOff: text("last_left_off"),
    nextSteps: jsonb("next_steps").default(sql`'[]'::jsonb`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    userStatusIdx: index("tasks_user_status_idx").on(t.userId, t.status),
    userDayIdx: index("tasks_user_day_idx").on(t.userId, t.assignedDay),
    userCategoryIdx: index("tasks_user_category_idx").on(t.userId, t.category),
  })
);

// ─── habits ──────────────────────────────────────────────────────────────────

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    section: varchar("section", { length: 50 }).notNull(), // faith | body | growth
    timeOfDay: varchar("time_of_day", { length: 50 }), // morning | evening | anytime
    daysOfWeek: integer("days_of_week")
      .array()
      .default(sql`'{0,1,2,3,4,5,6}'::integer[]`),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    userActiveIdx: index("habits_user_active_idx").on(t.userId, t.active),
  })
);

// ─── habit_completions ───────────────────────────────────────────────────────

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (t) => ({
    uniqueHabitDate: unique("habit_completions_habit_date_unique").on(t.habitId, t.date),
    userDateIdx: index("habit_completions_user_date_idx").on(t.userId, t.date),
  })
);

// ─── day_rules ────────────────────────────────────────────────────────────────

export const dayRules = pgTable(
  "day_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sun … 6=Sat
    focusArea: varchar("focus_area", { length: 50 }).notNull().default("flex"),
    maxFocusHours: integer("max_focus_hours").default(8),
  },
  (t) => ({
    uniqueUserDay: unique("day_rules_user_day_unique").on(t.userId, t.dayOfWeek),
  })
);

// ─── recurring_tasks ─────────────────────────────────────────────────────────

export const recurringTasks = pgTable("recurring_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  priority: integer("priority").default(2),
  durationMinutes: integer("duration_minutes").default(60),
  scheduledTime: time("scheduled_time"),
  daysOfWeek: integer("days_of_week")
    .array()
    .default(sql`'{0,1,2,3,4,5,6}'::integer[]`),
  active: boolean("active").default(true),
  untilCondition: varchar("until_condition", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ─── ai_calls ────────────────────────────────────────────────────────────────

export const aiCalls = pgTable("ai_calls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});
