'use client';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export type StatsRange = '7d' | '30d' | '90d';

export interface StatsResponse {
  range: StatsRange;
  summary: {
    tasks_completed: number;
    hours_focused: number;
    habit_completion_rate: number;
    current_streak: number;
  };
  hours_by_category: { category: string; hours: number }[];
  daily_completions: { date: string; count: number }[];
  habit_consistency: {
    habit_id: string;
    name: string;
    section: string;
    total_days: number;
    completed_days: number;
    percentage: number;
  }[];
  activity_heatmap: { date: string; activity: 0 | 1 | 2 | 3 }[];
}

export function useStats(range: StatsRange = '30d') {
  return useQuery({
    queryKey: ['stats', range],
    queryFn: () => apiFetch<StatsResponse>(`/stats?range=${range}`),
    staleTime: 60 * 1000,
  });
}
