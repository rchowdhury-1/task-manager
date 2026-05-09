'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDayRules, useUpdateDayRule } from '@/lib/api/hooks';
import { DAY_FOCUS_STYLES } from '@/lib/utils/styles';
import type { DayFocus } from '@/lib/types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FOCUS_OPTIONS: { value: DayFocus; label: string }[] = [
  { value: 'job_hunt', label: 'Job Hunt' },
  { value: 'lms', label: 'LMS Build' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'learning', label: 'Learning' },
  { value: 'rest', label: 'Rest' },
  { value: 'flex', label: 'Flex' },
];

export function DayRulesSection() {
  const { data: dayRules, isLoading } = useDayRules();
  const updateRule = useUpdateDayRule();

  useEffect(() => {
    if (updateRule.isError) toast.error("Couldn't save day rule.");
  }, [updateRule.isError]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-40 bg-surface-raised rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Build map dayOfWeek → rule (1=Mon...0=Sun in JS, but DB stores 1-7 Mon-Sun)
  // Actually check what the DB uses. dayOfWeek is an int — let's map by it.
  const ruleMap = new Map((dayRules ?? []).map(r => [r.dayOfWeek, r]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAY_NAMES.map((name, i) => {
          // dayOfWeek: 1=Mon...7=Sun
          const dow = i + 1;
          const rule = ruleMap.get(dow);
          const focusArea: DayFocus = rule?.focusArea ?? 'flex';
          const maxHours = rule?.maxFocusHours ?? 8;
          const style = DAY_FOCUS_STYLES[focusArea];

          return (
            <div key={dow} className="bg-surface border border-border rounded-xl p-4 space-y-3">
              {/* Focus badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-primary">{name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>

              {/* Focus area dropdown */}
              <div>
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider block mb-1">
                  Focus Area
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => {
                    updateRule.mutate({
                      day: dow,
                      focus_area: e.target.value as DayFocus,
                      max_focus_hours: maxHours,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {FOCUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Max hours slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                    Max Hours
                  </label>
                  <span className="text-xs font-medium text-primary bg-surface-raised rounded px-1.5 py-0.5">
                    {maxHours}h
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={maxHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updateRule.mutate({
                      day: dow,
                      focus_area: focusArea,
                      max_focus_hours: val,
                    });
                  }}
                  className="w-full h-1.5 bg-surface-raised rounded-full appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
