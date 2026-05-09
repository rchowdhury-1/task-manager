'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { Task } from '@/lib/types';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validation/tasks';

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks(),
    queryFn: () => apiFetch<Task[]>('/tasks'),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task(id!),
    queryFn: () => apiFetch<Task>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) =>
      apiFetch<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks() });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks());

      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        userId: '',
        title: newTask.title,
        description: newTask.description ?? null,
        category: newTask.category,
        status: newTask.status ?? 'backlog',
        priority: newTask.priority ?? 2,
        assignedDay: newTask.assigned_day ?? null,
        scheduledTime: newTask.scheduled_time ?? null,
        durationMinutes: newTask.duration_minutes ?? 60,
        timeLoggedMinutes: 0,
        lastLeftOff: newTask.last_left_off ?? null,
        nextSteps: newTask.next_steps ?? [],
        notes: newTask.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(queryKeys.tasks(), (old) => [
        tempTask,
        ...(old ?? []),
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      apiFetch<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks() });
      await queryClient.cancelQueries({ queryKey: queryKeys.task(id) });

      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks());
      const previousTask = queryClient.getQueryData<Task>(queryKeys.task(id));

      // Map snake_case patch fields to camelCase Task fields
      const camelPatch: Partial<Task> = {};
      if (patch.title !== undefined) camelPatch.title = patch.title;
      if (patch.description !== undefined) camelPatch.description = patch.description ?? null;
      if (patch.category !== undefined) camelPatch.category = patch.category;
      if (patch.status !== undefined) camelPatch.status = patch.status;
      if (patch.priority !== undefined) camelPatch.priority = patch.priority;
      if (patch.assigned_day !== undefined) camelPatch.assignedDay = patch.assigned_day ?? null;
      if (patch.scheduled_time !== undefined) camelPatch.scheduledTime = patch.scheduled_time ?? null;
      if (patch.duration_minutes !== undefined) camelPatch.durationMinutes = patch.duration_minutes;
      if (patch.last_left_off !== undefined) camelPatch.lastLeftOff = patch.last_left_off ?? null;
      if (patch.next_steps !== undefined) camelPatch.nextSteps = patch.next_steps;
      if (patch.notes !== undefined) camelPatch.notes = patch.notes ?? null;

      queryClient.setQueryData<Task[]>(queryKeys.tasks(), (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...camelPatch } : t))
      );

      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.task(id), {
          ...previousTask,
          ...camelPatch,
        });
      }

      return { previousTasks, previousTask };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(), context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.task(id), context.previousTask);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(id) });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/v1/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) throw new Error('Delete failed');
      }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks() });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks());

      queryClient.setQueryData<Task[]>(queryKeys.tasks(), (old) =>
        old?.filter((t) => t.id !== id)
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
