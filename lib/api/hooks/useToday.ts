'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { TodayPayload } from '@/lib/types';

function localDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function useToday(date?: string) {
  const d = date ?? localDate();

  return useQuery({
    queryKey: queryKeys.today(d),
    queryFn: () => apiFetch<TodayPayload>(`/today?date=${d}`),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
