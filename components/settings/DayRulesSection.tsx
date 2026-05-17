'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useDayRules, useUpdateDayRule } from '@/lib/api/hooks';
import { DAY_FOCUS_STYLES } from '@/lib/utils/styles';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import type { DayFocus } from '@/lib/types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-16 bg-surface-raised rounded-xl" />
        ))}
      </div>
    );
  }

  const ruleMap = new Map((dayRules ?? []).map(r => [r.dayOfWeek, r]));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] md:text-[22px] font-semibold text-primary">
            Day Rules
          </h2>
          <p className="text-[13px] text-secondary mt-0.5">
            Configure focus areas and daily hour limits.
          </p>
        </div>
      </div>

      <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="space-y-2.5">
        {DAY_NAMES.map((name, i) => {
          const dow = i + 1;
          const rule = ruleMap.get(dow);
          const focusArea: DayFocus = rule?.focusArea ?? 'flex';
          const maxHours = rule?.maxFocusHours ?? 8;
          const style = DAY_FOCUS_STYLES[focusArea];

          return (
            <motion.div
              key={dow}
              variants={fadeInUp}
              className="bg-surface border border-border rounded-xl p-4 md:p-5 grid grid-cols-1 sm:grid-cols-[100px_1fr_1fr_auto] gap-3 sm:gap-5 items-center"
            >
              {/* Day name */}
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[12px] font-medium text-primary w-[44px]">
                  {DAY_SHORT[i]}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>

              {/* Focus area dropdown */}
              <div>
                <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-tertiary block mb-1.5">
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
                  className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {FOCUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Max hours slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[10px] tracking-[0.12em] uppercase text-tertiary">
                    Max Hours
                  </label>
                  <span className="font-mono text-[11px] font-medium text-primary bg-surface-raised rounded-md px-2 py-0.5">
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

              {/* Hours visual (desktop only) */}
              <div className="hidden sm:block w-12">
                <div className="h-1.5 bg-surface-raised rounded-full">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(maxHours / 12) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
