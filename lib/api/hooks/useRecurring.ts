'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { RecurringTask } from '@/lib/types';
import type { CreateRecurringInput, UpdateRecurringInput } from '@/lib/validation/recurring';

export function useRecurring() {
  return useQuery({
    queryKey: queryKeys.recurring(),
    queryFn: () => apiFetch<RecurringTask[]>('/recurring'),
  });
}

export function useCreateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringInput) =>
      apiFetch<RecurringTask>('/recurring', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRecurringInput }) =>
      apiFetch<RecurringTask>(`/recurring/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/v1/recurring/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) throw new Error('Delete failed');
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
