'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

interface AIResponse {
  summary: string;
  operations_executed: number;
  warnings: string[];
  tokens_used: number;
  duration_ms: number;
}

export function useAICommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) =>
      apiFetch<AIResponse>('/ai', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.habits() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dayRules() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recurring() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      // 'today' has no no-arg registry entry (today(date) is parameterized) —
      // the bare prefix below is the correct way to invalidate every dated
      // variant at once, so it stays a literal rather than a registry call.
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
