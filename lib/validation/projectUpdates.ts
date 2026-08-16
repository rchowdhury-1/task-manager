import { z } from "zod";

export const createProjectUpdateSchema = z.object({
  body: z.string().min(1).max(5000),
});

export type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;
