import { z } from "zod";

const nextStepSchema = z.object({
  text: z.string(),
  done: z.boolean(),
});

const CATEGORIES = ["career", "lms", "freelance", "learning", "uber", "faith"] as const;
const STATUSES = ["backlog", "this_week", "in_progress", "done"] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES).default("backlog"),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  assigned_day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM")
    .optional(),
  duration_minutes: z.number().int().min(1).max(1440).default(60),
  time_logged_minutes: z.number().int().min(0).optional(),
  last_left_off: z.string().optional(),
  next_steps: z.array(nextStepSchema).default([]),
  notes: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
