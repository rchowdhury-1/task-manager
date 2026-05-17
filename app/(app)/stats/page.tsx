'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3 } from 'lucide-react';
import { useStats, type StatsRange } from '@/lib/api/hooks';
import { StatCell } from '@/components/StatCell';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues with recharts
const HoursByCategoryChart = dynamic(
  () => import('@/components/stats/HoursByCategoryChart'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const DailyCompletionsChart = dynamic(
  () => import('@/components/stats/DailyCompletionsChart'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const RANGES: { value: StatsRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

function ChartSkeleton() {
  return <div className="h-[250px] bg-surface-raised rounded-lg animate-pulse" />;
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-[1180px]">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-raised rounded" />
        <div className="h-8 w-32 bg-surface-raised rounded-lg" />
      </div>
      <div className="h-12 w-80 bg-surface-raised rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-surface-raised rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="h-[300px] bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  useEffect(() => { document.title = 'Stats \u00b7 Personal OS'; }, []);

  const [range, setRange] = useState<StatsRange>('30d');
  const { data, isLoading, error, refetch } = useStats(range);

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-accent-muted border border-accent rounded-lg p-4 flex items-center gap-3">
        <span className="text-p1 text-sm flex-1">Error: {(error as Error).message}</span>
        <button onClick={() => refetch()} className="text-sm font-medium text-accent hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const rangeDays = range === '7d' ? 7 : range === '90d' ? 90 : 30;

  return (
    <ErrorBoundary>
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="space-y-7 max-w-[1180px]"
      >
        {/* Date range row */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between flex-wrap gap-3">
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-tertiary">
            Performance &middot; Last {rangeDays} days
          </span>

          <div className="grid grid-cols-3 p-[3px] bg-surface border border-border rounded-lg">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  range === r.value
                    ? 'bg-page border border-border text-primary shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Editorial headline */}
        <motion.div variants={fadeInUp}>
          <h1 className="text-[32px] md:text-[44px] font-semibold leading-[1.02] tracking-display text-primary">
            You completed{' '}
            <span className="font-display italic text-accent">
              {summary.tasks_completed} tasks.
            </span>
          </h1>
        </motion.div>

        {/* Summary stat cells */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCell
            label="Tasks Completed"
            value={summary.tasks_completed}
            accentBorder
          />
          <StatCell
            label="Hours Focused"
            value={`${summary.hours_focused}h`}
            progress={{ value: summary.hours_focused, max: rangeDays * 8 }}
          />
          <StatCell
            label="Habit Consistency"
            value={`${summary.habit_completion_rate}%`}
            progress={{ value: summary.habit_completion_rate, max: 100 }}
          />
          <StatCell
            label="Current Streak"
            value={`${summary.current_streak} days`}
          />
        </motion.div>

        {/* Two-column chart row */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Deep Work Distribution */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary mb-4">
              Deep Work Distribution
            </h3>
            {data.hours_by_category.length > 0 ? (
              <HoursByCategoryChart data={data.hours_by_category} />
            ) : (
              <EmptyChart message="No time logged yet" />
            )}
          </div>

          {/* Focus Areas */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary mb-4">
              Focus Areas
            </h3>
            {data.hours_by_category.length > 0 ? (
              <FocusAreasBreakdown data={data.hours_by_category} />
            ) : (
              <EmptyChart message="No time logged yet" />
            )}
          </div>
        </motion.div>

        {/* AI Insight card */}
        <motion.div
          variants={fadeInUp}
          className="bg-[var(--color-crimson-soft)] border border-[var(--color-crimson-line)] rounded-xl p-5 md:p-6 flex items-start gap-4"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display italic text-[18px] md:text-[22px] text-primary leading-snug">
              Your peak focus window is 9&ndash;11 AM. Consider protecting it.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button className="text-[13px] text-secondary hover:text-primary transition-colors">
                Not now
              </button>
              <button className="px-3 py-1.5 bg-accent text-white rounded-md text-[13px] font-medium hover:bg-accent-hover transition-colors">
                Try it
              </button>
            </div>
          </div>
        </motion.div>

        {/* Daily completions */}
        <motion.div variants={fadeInUp} className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary mb-4">
            Daily Completions
          </h3>
          {data.daily_completions.some(d => d.count > 0) ? (
            <DailyCompletionsChart data={data.daily_completions} />
          ) : (
            <EmptyChart message="No completions yet" />
          )}
        </motion.div>

        {/* Activity heatmap */}
        <motion.div variants={fadeInUp} className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary mb-4">
            Activity History
          </h3>
          <ActivityHeatmap data={data.activity_heatmap} />
        </motion.div>
      </motion.div>
    </ErrorBoundary>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] gap-2">
      <BarChart3 className="w-6 h-6 text-tertiary" />
      <p className="text-sm text-tertiary">{message}</p>
    </div>
  );
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  career:    { bg: 'bg-tag-blue-bg',   text: 'text-tag-blue' },
  lms:       { bg: 'bg-tag-violet-bg', text: 'text-tag-violet' },
  freelance: { bg: 'bg-tag-amber-bg',  text: 'text-tag-amber' },
  learning:  { bg: 'bg-tag-green-bg',  text: 'text-tag-green' },
  uber:      { bg: 'bg-tag-slate-bg',  text: 'text-tag-slate' },
  faith:     { bg: 'bg-tag-rose-bg',   text: 'text-tag-rose' },
};

const LABELS: Record<string, string> = {
  career: 'Career', lms: 'LMS', freelance: 'Freelance',
  learning: 'Learning', uber: 'Uber', faith: 'Faith',
};

function FocusAreasBreakdown({
  data,
}: {
  data: { category: string; hours: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.hours, 0);
  const sorted = [...data].sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="h-4 w-full bg-surface-raised rounded-full flex overflow-hidden">
          {sorted.map(d => {
            const pct = (d.hours / total) * 100;
            if (pct < 1) return null;
            const tone = TAG_COLORS[d.category];
            return (
              <div
                key={d.category}
                className={`h-full ${tone?.bg ?? 'bg-surface-raised'}`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(d => {
          const pct = total > 0 ? Math.round((d.hours / total) * 100) : 0;
          const tone = TAG_COLORS[d.category];
          return (
            <div key={d.category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm shrink-0 ${tone?.bg ?? 'bg-surface-raised'}`} />
              <span className="text-xs text-primary flex-1">{LABELS[d.category] ?? d.category}</span>
              <span className="text-xs font-medium text-secondary">{pct}%</span>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <p className="text-center text-xs text-tertiary">{total}h Total</p>
      )}
    </div>
  );
}
