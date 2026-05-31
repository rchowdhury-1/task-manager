'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { TodayPayload } from '@/lib/types';

/** Get today's date in the user's local timezone (YYYY-MM-DD) */
function localDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
