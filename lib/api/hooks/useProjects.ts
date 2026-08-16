'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import { slugify } from '@/lib/utils/slugify';
import type { Project, ProjectUpdate } from '@/lib/types';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validation/projects';
import type { CreateProjectUpdateInput } from '@/lib/validation/projectUpdates';

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => apiFetch<Project[]>('/projects'),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id!),
    queryFn: () => apiFetch<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects() });
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects());

      const tempProject: Project = {
        id: `temp-${Date.now()}`,
        userId: '',
        slug: slugify(newProject.name),
        name: newProject.name,
        type: newProject.type ?? 'personal',
        status: newProject.status ?? 'active',
        clientName: newProject.client_name ?? null,
        clientRate: newProject.client_rate !== undefined ? String(newProject.client_rate) : null,
        clientCurrency: newProject.client_currency ?? null,
        notes: newProject.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Project[]>(queryKeys.projects(), (old) => [
        tempProject,
        ...(old ?? []),
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projects(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateProjectInput }) =>
      apiFetch<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects() });
      await queryClient.cancelQueries({ queryKey: queryKeys.project(id) });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKeys.projects());
      const previousProject = queryClient.getQueryData<Project>(queryKeys.project(id));

      // Map snake_case patch fields to camelCase Project fields
      const camelPatch: Partial<Project> = {};
      if (patch.name !== undefined) camelPatch.name = patch.name;
      if (patch.type !== undefined) camelPatch.type = patch.type;
      if (patch.status !== undefined) camelPatch.status = patch.status;
      if (patch.client_name !== undefined) camelPatch.clientName = patch.client_name ?? null;
      if (patch.client_rate !== undefined) camelPatch.clientRate = String(patch.client_rate);
      if (patch.client_currency !== undefined) camelPatch.clientCurrency = patch.client_currency ?? null;
      if (patch.notes !== undefined) camelPatch.notes = patch.notes ?? null;

      queryClient.setQueryData<Project[]>(queryKeys.projects(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, ...camelPatch } : p))
      );
      if (previousProject) {
        queryClient.setQueryData<Project>(queryKeys.project(id), { ...previousProject, ...camelPatch });
      }

      return { previousProjects, previousProject };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects(), context.previousProjects);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.project(id), context.previousProject);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<void>(`/projects/${id}`, { method: 'DELETE' }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects() });
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects());

      queryClient.setQueryData<Project[]>(queryKeys.projects(), (old) =>
        old?.filter((p) => p.id !== id)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.projects(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

export function useProjectUpdates(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectUpdates(projectId!),
    queryFn: () => apiFetch<ProjectUpdate[]>(`/projects/${projectId}/updates`),
    enabled: !!projectId,
  });
}

export function useCreateProjectUpdate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectUpdateInput) =>
      apiFetch<ProjectUpdate>(`/projects/${projectId}/updates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<ProjectUpdate[]>(queryKeys.projectUpdates(projectId), (old) => [
        created,
        ...(old ?? []),
      ]);
      // Posting an update bumps the parent project's updatedAt server-side —
      // refetch both the single project and the list so "recently touched"
      // ordering stays correct without a manual patch here.
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}
