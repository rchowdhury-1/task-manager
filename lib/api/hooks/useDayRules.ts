'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { DayRule } from '@/lib/types';
import type { UpsertDayRuleInput } from '@/lib/validation/day-rules';

export function useDayRules() {
  return useQuery({
    queryKey: queryKeys.dayRules(),
    queryFn: () => apiFetch<DayRule[]>('/day-rules'),
  });
}

export function useUpdateDayRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ day, ...patch }: UpsertDayRuleInput & { day: number }) =>
      apiFetch<DayRule>(`/day-rules/${day}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ day, focus_area, max_focus_hours }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dayRules() });
      const previous = queryClient.getQueryData<DayRule[]>(queryKeys.dayRules());

      queryClient.setQueryData<DayRule[]>(queryKeys.dayRules(), (old) =>
        old?.map((r) =>
          r.dayOfWeek === day
            ? { ...r, focusArea: focus_area, maxFocusHours: max_focus_hours }
            : r
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dayRules(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dayRules() });
      queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
