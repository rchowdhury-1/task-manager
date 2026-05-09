import { z } from "zod";

const FOCUS_AREAS = [
  "job_hunt",
  "lms",
  "freelance",
  "learning",
  "rest",
  "flex",
] as const;

export const upsertDayRuleSchema = z.object({
  focus_area: z.enum(FOCUS_AREAS),
  max_focus_hours: z.number().int().min(0).max(24),
});

export type UpsertDayRuleInput = z.infer<typeof upsertDayRuleSchema>;
