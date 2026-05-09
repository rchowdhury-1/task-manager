'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

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
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['day-rules'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
