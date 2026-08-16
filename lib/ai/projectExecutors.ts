import { eq, and, ilike, desc } from 'drizzle-orm';
import { z } from 'zod';
import { projects, projectUpdates } from '@/lib/db/schema';
import type { DB } from '@/lib/db';
import { PROJECT_TYPES, PROJECT_STATUSES } from '@/lib/projects';
import { slugify } from '@/lib/utils/slugify';
import type { ExecutorFn, ToolResult } from './executors';

// ─── Schemas (lightweight, AI-facing) ───────────────────────────────────────

const createProjectArgs = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(PROJECT_TYPES).default('personal'),
  status: z.enum(PROJECT_STATUSES).default('active'),
  client_name: z.string().max(200).optional(),
  client_rate: z.number().positive().optional(),
  client_currency: z.string().length(3).optional(),
  notes: z.string().optional(),
});

const logProjectUpdateArgs = z.object({
  project: z.string().min(1),
  update: z.string().min(1).max(5000),
});

const updateProjectStatusArgs = z.object({
  project: z.string().min(1),
  status: z.enum(PROJECT_STATUSES),
});

// ─── Project resolution ─────────────────────────────────────────────────────

type ResolvedProject = { id: string; slug: string; name: string };

/**
 * Resolves free text ("glassgardens", "Glass Gardens") to a project row:
 * exact slug match, then case-insensitive name match. Auto-creates a new
 * personal project with that name if neither matches — deliberately
 * frictionless, mirroring how the user captures notes in their Obsidian
 * vault (file first, organize later). A stray auto-created project is cheap
 * and mergeable; asking for confirmation here would defeat the point of a
 * single-prompt update.
 */
async function resolveOrCreateProject(
  userId: string,
  db: DB,
  projectRef: string,
): Promise<ResolvedProject> {
  const slugRef = slugify(projectRef);

  const [bySlug] = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.slug, slugRef)))
    .limit(1);
  if (bySlug) return bySlug;

  const [byName] = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(and(eq(projects.userId, userId), ilike(projects.name, projectRef)))
    .limit(1);
  if (byName) return byName;

  const [created] = await db
    .insert(projects)
    .values({ userId, slug: slugRef, name: projectRef, type: 'personal', status: 'active' })
    .returning({ id: projects.id, slug: projects.slug, name: projects.name });
  return created;
}

/**
 * Same lookup as resolveOrCreateProject, but errors instead of creating —
 * used by tools where auto-creating an empty project doesn't make sense
 * (you can't pause/archive something that was never logged).
 */
async function resolveExistingProject(
  userId: string,
  db: DB,
  projectRef: string,
): Promise<ResolvedProject | { error: string }> {
  const slugRef = slugify(projectRef);

  const [bySlug] = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.slug, slugRef)))
    .limit(1);
  if (bySlug) return bySlug;

  const [byName] = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(and(eq(projects.userId, userId), ilike(projects.name, projectRef)))
    .limit(1);
  if (byName) return byName;

  return { error: `No project matching "${projectRef}". Use list_projects to see existing projects, or create_project to make a new one.` };
}

// ─── Executor implementations ───────────────────────────────────────────────

async function createProject(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = createProjectArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [project] = await db.insert(projects).values({
    userId,
    slug: slugify(d.name),
    name: d.name,
    type: d.type,
    status: d.status,
    clientName: d.client_name,
    clientRate: d.client_rate !== undefined ? String(d.client_rate) : undefined,
    clientCurrency: d.client_currency,
    notes: d.notes,
  }).returning();

  return { ok: true, data: { id: project.id, slug: project.slug, name: project.name } };
}

async function logProjectUpdate(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = logProjectUpdateArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const project = await resolveOrCreateProject(userId, db, parsed.data.project);

  const [update] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(projectUpdates)
      .values({ projectId: project.id, userId, body: parsed.data.update })
      .returning();
    await tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, project.id));
    return [inserted];
  });

  return {
    ok: true,
    data: { project: project.name, project_slug: project.slug, update_id: update.id },
  };
}

async function updateProjectStatus(userId: string, args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const parsed = updateProjectStatusArgs.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const resolved = await resolveExistingProject(userId, db, parsed.data.project);
  if ('error' in resolved) return { ok: false, error: resolved.error };

  const [updated] = await db
    .update(projects)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(projects.id, resolved.id), eq(projects.userId, userId)))
    .returning({ id: projects.id, name: projects.name, status: projects.status });

  if (!updated) return { ok: false, error: `Project ${resolved.name} not found` };
  return { ok: true, data: updated };
}

async function listProjects(userId: string, _args: Record<string, unknown>, db: DB): Promise<ToolResult> {
  const rows = await db
    .select({ slug: projects.slug, name: projects.name, status: projects.status, type: projects.type })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

  return { ok: true, data: rows };
}

// ─── Export map ─────────────────────────────────────────────────────────────

export const projectExecutors: Record<string, ExecutorFn> = {
  create_project: createProject,
  log_project_update: logProjectUpdate,
  update_project_status: updateProjectStatus,
  list_projects: listProjects,
};
