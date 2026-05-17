import { z } from "zod";

export const createCategorySchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, "Slug must be lowercase alphanumeric with hyphens/underscores"),
  label: z.string().min(1).max(100),
  colour: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
