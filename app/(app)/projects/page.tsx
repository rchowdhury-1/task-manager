'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Briefcase, User } from 'lucide-react';
import { useProjects, useCreateProject } from '@/lib/api/hooks';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import type { Project, ProjectStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createProject = useCreateProject();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProject.mutate(
      { name: trimmed },
      {
        onSuccess: () => { setName(''); setOpen(false); },
        onError: () => toast.error("Couldn't create project. Try again."),
      },
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border-strong text-sm text-tertiary hover:text-primary hover:border-border transition-colors"
      >
        <Plus size={15} /> New project
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCreate();
          if (e.key === 'Escape') { setOpen(false); setName(''); }
        }}
        onBlur={() => { if (!name.trim()) setOpen(false); }}
        placeholder="Project name…"
        className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-primary w-64 focus:outline-none focus:border-accent"
      />
      <button
        onClick={handleCreate}
        disabled={createProject.isPending}
        className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
      >
        Add
      </button>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl border border-border bg-surface hover:border-border-strong transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {project.type === 'client' ? (
          <Briefcase size={16} className="text-tertiary shrink-0" />
        ) : (
          <User size={16} className="text-tertiary shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary truncate">{project.name}</p>
          {project.clientName && (
            <p className="text-xs text-tertiary truncate">{project.clientName}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-tertiary whitespace-nowrap shrink-0">
        updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
      </p>
    </Link>
  );
}

export default function ProjectsPage() {
  useEffect(() => { document.title = 'Projects · Personal OS'; }, []);

  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="max-w-[720px] mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-surface-raised rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-surface-raised rounded-xl" />
        ))}
      </div>
    );
  }

  const grouped: Record<ProjectStatus, Project[]> = { active: [], paused: [], done: [], archived: [] };
  for (const p of projects ?? []) grouped[p.status].push(p);

  const hasAny = (projects?.length ?? 0) > 0;

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="max-w-[720px] mx-auto space-y-8"
    >
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Projects</h1>
          <p className="text-sm text-tertiary mt-0.5">
            Client work and personal projects — log progress from the AI command bar with &ldquo;log an update for…&rdquo;, or add one here.
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <NewProjectForm />
      </motion.div>

      {!hasAny && (
        <motion.p variants={fadeInUp} className="text-sm text-tertiary py-8 text-center">
          No projects yet. Try the AI bar: &ldquo;shipped the landing page for glassgardens&rdquo;.
        </motion.p>
      )}

      {(['active', 'paused', 'done', 'archived'] as const).map((status) =>
        grouped[status].length === 0 ? null : (
          <motion.div key={status} variants={fadeInUp} className="space-y-2">
            <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary px-1">
              {STATUS_LABEL[status]} ({grouped[status].length})
            </p>
            <div className="space-y-2">
              {grouped[status].map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </div>
          </motion.div>
        )
      )}
    </motion.div>
  );
}
