'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { Habit, HabitCompletion } from '@/lib/types';
import type { CreateHabitInput, UpdateHabitInput } from '@/lib/validation/habits';

export function useHabits() {
  return useQuery({
    queryKey: queryKeys.habits(),
    queryFn: () => apiFetch<Habit[]>('/habits'),
  });
}

export function useCompletions(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.completions(from, to),
    queryFn: () =>
      apiFetch<HabitCompletion[]>(`/habits/completions?from=${from}&to=${to}`),
    enabled: !!from && !!to,
  });
}

export function useCompleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      apiFetch<{ completed: boolean; date: string }>(
        `/habits/${habitId}/complete`,
        { method: 'POST', body: JSON.stringify({ date }) }
      ),
    onMutate: async ({ habitId, date }) => {
      // Optimistically add the completion to any matching completions query
      const queriesData = queryClient.getQueriesData<HabitCompletion[]>({
        queryKey: ['habits', 'completions'],
      });

      const snapshots: { key: readonly unknown[]; data: HabitCompletion[] }[] = [];
      for (const [key, data] of queriesData) {
        if (data) {
          snapshots.push({ key, data });
          queryClient.setQueryData(key, [
            ...data,
            { habit_id: habitId, date },
          ]);
        }
      }

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', 'completions'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useUncompleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      apiFetch<{ completed: boolean; date: string }>(
        `/habits/${habitId}/complete`,
        { method: 'DELETE', body: JSON.stringify({ date }) }
      ),
    onMutate: async ({ habitId, date }) => {
      const queriesData = queryClient.getQueriesData<HabitCompletion[]>({
        queryKey: ['habits', 'completions'],
      });

      const snapshots: { key: readonly unknown[]; data: HabitCompletion[] }[] = [];
      for (const [key, data] of queriesData) {
        if (data) {
          snapshots.push({ key, data });
          queryClient.setQueryData(
            key,
            data.filter(
              (c) => !(c.habit_id === habitId && c.date === date)
            )
          );
        }
      }

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', 'completions'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHabitInput) =>
      apiFetch<Habit>('/habits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateHabitInput }) =>
      apiFetch<Habit>(`/habits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() });
      queryClient.invalidateQueries({ queryKey: ['habits', 'completions'] });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/v1/habits/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) throw new Error('Delete failed');
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() });
      queryClient.invalidateQueries({ queryKey: ['habits', 'completions'] });
    },
  });
}
