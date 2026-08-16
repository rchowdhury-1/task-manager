import { z } from "zod";
import { PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/projects";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(PROJECT_TYPES).default("personal"),
  status: z.enum(PROJECT_STATUSES).default("active"),
  clientName: z.string().max(200).optional(),
  clientRate: z.number().positive().optional(),
  clientCurrency: z.string().length(3).optional(), // ISO 4217, e.g. 'GBP'
  notes: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
