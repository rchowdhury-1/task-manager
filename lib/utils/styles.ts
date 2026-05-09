import type { DayFocus } from '@/lib/types';

export const DAY_FOCUS_STYLES: Record<DayFocus, { bg: string; text: string; label: string }> = {
  job_hunt:  { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400',   label: 'Job Hunt' },
  lms:       { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'LMS' },
  freelance: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Freelance' },
  learning:  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Learning' },
  rest:      { bg: 'bg-gray-100 dark:bg-gray-800/30',   text: 'text-gray-600 dark:text-gray-400',   label: 'Rest' },
  flex:      { bg: 'bg-cyan-100 dark:bg-cyan-900/30',   text: 'text-cyan-700 dark:text-cyan-400',   label: 'Flex' },
};
