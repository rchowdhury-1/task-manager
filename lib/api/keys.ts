export const queryKeys = {
  me: () => ['me'] as const,
  tasks: () => ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  habits: () => ['habits'] as const,
  completions: (from: string, to: string) =>
    ['habits', 'completions', from, to] as const,
  dayRules: () => ['day-rules'] as const,
  recurring: () => ['recurring'] as const,
  today: (date: string) => ['today', date] as const,
};
