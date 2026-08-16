import { z } from "zod";
import { PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/projects";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(PROJECT_TYPES).default("personal"),
  status: z.enum(PROJECT_STATUSES).default("active"),
  client_name: z.string().max(200).optional(),
  client_rate: z.number().positive().optional(),
  client_currency: z.string().length(3).optional(), // ISO 4217, e.g. 'GBP'
  notes: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
