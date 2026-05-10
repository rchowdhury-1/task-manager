'use client';
import { useState, useEffect } from 'react';
import { useStats, type StatsRange } from '@/lib/api/hooks';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BarChart3 } from 'lucide-react';
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
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-raised rounded" />
        <div className="h-8 w-32 bg-surface-raised rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-surface-raised rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-[300px] bg-surface-raised rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-1">
      <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
      {subtitle && <p className="text-xs text-tertiary">{subtitle}</p>}
    </div>
  );
}

export default function StatsPage() {
  useEffect(() => { document.title = 'Stats · Personal OS'; }, []);

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
  const dailyAvg = rangeDays > 0 ? Math.round((summary.hours_focused / rangeDays) * 10) / 10 : 0;

  return (
    <ErrorBoundary>
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Performance Stats</h1>
          <p className="text-sm text-secondary mt-0.5">Last {rangeDays} Days</p>
        </div>

        <div className="flex bg-surface-raised rounded-lg p-0.5">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                range === r.value
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tasks Completed" value={String(summary.tasks_completed)} />
        <StatCard
          label="Hours Focused"
          value={`${summary.hours_focused}`}
          subtitle={`${dailyAvg}h daily avg`}
        />
        <StatCard label="Habit Consistency" value={`${summary.habit_completion_rate}%`} />
        <StatCard label="Current Streak" value={`${summary.current_streak} Days`} />
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hours by category (bar) */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Deep Work Distribution</h3>
          {data.hours_by_category.length > 0 ? (
            <HoursByCategoryChart data={data.hours_by_category} />
          ) : (
            <EmptyChart message="No time logged yet" />
          )}
        </div>

        {/* Focus areas breakdown */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Focus Areas</h3>
          {data.hours_by_category.length > 0 ? (
            <FocusAreasBreakdown data={data.hours_by_category} />
          ) : (
            <EmptyChart message="No time logged yet" />
          )}
        </div>

        {/* Daily completions (line) */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Daily Completions</h3>
          {data.daily_completions.some(d => d.count > 0) ? (
            <DailyCompletionsChart data={data.daily_completions} />
          ) : (
            <EmptyChart message="No completions yet" />
          )}
        </div>

        {/* Habit consistency */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">Habit Consistency</h3>
          {data.habit_consistency.length > 0 ? (
            <HabitConsistencyBars data={data.habit_consistency} />
          ) : (
            <EmptyChart message="No habits tracked yet" />
          )}
        </div>
      </div>

      {/* Activity heatmap (full width) */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">Activity History</h3>
        <ActivityHeatmap data={data.activity_heatmap} />
      </div>
    </div>
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

function HabitConsistencyBars({
  data,
}: {
  data: { name: string; percentage: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-2.5 max-h-[250px] overflow-y-auto">
      {sorted.map((h, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary truncate">{h.name}</span>
            <span className="text-xs font-medium text-secondary ml-2">{h.percentage}%</span>
          </div>
          <div className="h-2 w-full bg-surface-raised rounded-full">
            <div
              className={`h-full rounded-full transition-all ${
                h.percentage >= 80 ? 'bg-green-500' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(h.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusAreasBreakdown({
  data,
}: {
  data: { category: string; hours: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.hours, 0);
  const sorted = [...data].sort((a, b) => b.hours - a.hours);

  const COLORS: Record<string, string> = {
    career: 'bg-[#C2410C]',
    lms: 'bg-[#1D4ED8]',
    freelance: 'bg-[#4338CA]',
    learning: 'bg-[#7C3AED]',
    uber: 'bg-[#475569]',
    faith: 'bg-[#92400E]',
  };

  const LABELS: Record<string, string> = {
    career: 'Career', lms: 'LMS', freelance: 'Freelance',
    learning: 'Learning', uber: 'Uber', faith: 'Faith',
  };

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="h-4 w-full bg-surface-raised rounded-full flex overflow-hidden">
          {sorted.map(d => {
            const pct = (d.hours / total) * 100;
            if (pct < 1) return null;
            return (
              <div
                key={d.category}
                className={`h-full ${COLORS[d.category] ?? 'bg-gray-400'}`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(d => {
          const pct = total > 0 ? Math.round((d.hours / total) * 100) : 0;
          return (
            <div key={d.category} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm shrink-0 ${COLORS[d.category] ?? 'bg-gray-400'}`} />
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
