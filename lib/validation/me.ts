import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().max(120).optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
