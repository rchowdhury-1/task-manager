'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Briefcase, User, Trash2 } from 'lucide-react';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useProjectUpdates,
  useCreateProjectUpdate,
} from '@/lib/api/hooks';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import type { ProjectStatus } from '@/lib/types';

const STATUSES: ProjectStatus[] = ['active', 'paused', 'done', 'archived'];

function AddUpdateBox({ projectId }: { projectId: string }) {
  const [body, setBody] = useState('');
  const createUpdate = useCreateProjectUpdate(projectId);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    createUpdate.mutate(
      { body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: () => toast.error("Couldn't log the update. Try again."),
      },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="What happened? (⌘+Enter to log)"
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-primary placeholder:text-tertiary focus:outline-none"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={submit}
          disabled={!body.trim() || createUpdate.isPending}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-50"
        >
          Log update
        </button>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: updates, isLoading: updatesLoading } = useProjectUpdates(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  useEffect(() => {
    if (project) document.title = `${project.name} · Personal OS`;
  }, [project]);

  if (projectLoading) {
    return (
      <div className="max-w-[640px] mx-auto animate-pulse space-y-4">
        <div className="h-8 w-52 bg-surface-raised rounded" />
        <div className="h-24 bg-surface-raised rounded-xl" />
        {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-surface-raised rounded-xl" />)}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-[640px] mx-auto text-center py-16">
        <p className="text-sm text-tertiary">Project not found.</p>
      </div>
    );
  }

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject.mutate(
      { id: project.id, patch: { status } },
      { onError: () => toast.error("Couldn't update status. Try again.") },
    );
  };

  const handleDelete = () => {
    deleteProject.mutate(
      { id: project.id },
      {
        onSuccess: () => { toast.success('Project deleted'); router.push('/projects'); },
        onError: () => toast.error("Couldn't delete project. Try again."),
      },
    );
  };

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="max-w-[640px] mx-auto space-y-6"
    >
      <motion.div variants={fadeInUp}>
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-1 text-xs text-tertiary hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft size={13} /> All projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {project.type === 'client' ? (
              <Briefcase size={18} className="text-tertiary shrink-0" />
            ) : (
              <User size={18} className="text-tertiary shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-primary truncate">{project.name}</h1>
              {project.clientName && (
                <p className="text-sm text-tertiary truncate">{project.clientName}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleDelete}
            title="Delete project"
            className="p-1.5 rounded-lg text-tertiary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-xs text-primary focus:outline-none focus:border-accent capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <p className="text-xs text-tertiary">
            updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <AddUpdateBox projectId={project.id} />
      </motion.div>

      <motion.div variants={fadeInUp} className="space-y-3">
        <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary px-1">
          Timeline
        </p>

        {updatesLoading && (
          <div className="space-y-2 animate-pulse">
            {[0, 1].map((i) => <div key={i} className="h-14 bg-surface-raised rounded-xl" />)}
          </div>
        )}

        {!updatesLoading && (updates?.length ?? 0) === 0 && (
          <p className="text-sm text-tertiary py-6 text-center">
            No updates yet — log the first one above.
          </p>
        )}

        {updates?.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-surface p-3.5">
            <p className="text-sm text-primary whitespace-pre-wrap">{u.body}</p>
            <p className="text-xs text-tertiary mt-2">
              {format(new Date(u.createdAt), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
