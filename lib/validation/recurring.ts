import { z } from "zod";

const CATEGORIES = ["career", "lms", "freelance", "learning", "uber", "faith"] as const;
const DOW = z.number().int().min(0).max(6);

export const createRecurringSchema = z.object({
  title: z.string().min(1).max(500),
  category: z.enum(CATEGORIES),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  duration_minutes: z.number().int().min(1).max(1440).default(60),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM")
    .optional(),
  days_of_week: z.array(DOW),
  until_condition: z.string().optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial();

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
