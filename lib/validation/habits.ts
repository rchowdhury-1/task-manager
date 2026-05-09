import { z } from "zod";

const SECTIONS = ["faith", "body", "growth"] as const;
const TIMES_OF_DAY = ["morning", "evening", "anytime"] as const;
const DOW = z.number().int().min(0).max(6);

export const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  section: z.enum(SECTIONS),
  time_of_day: z.enum(TIMES_OF_DAY).optional(),
  days_of_week: z.array(DOW).default([0, 1, 2, 3, 4, 5, 6]),
  active: z.boolean().default(true),
});

export const updateHabitSchema = createHabitSchema.partial();

export const completeHabitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
