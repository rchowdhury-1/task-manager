import type { Habit, Section } from '@/lib/types';
import { haptic } from '@/lib/haptics';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const SECTION_LABELS: Record<Section, string> = {
  faith: 'FAITH',
  body: 'BODY',
  growth: 'GROWTH',
};

// ─── Desktop Habit Row ─────────────────────────────────────────────────────

interface HabitRowProps {
  habit: Habit;
  week: string[];
  todayStr: string;
  completionsMap: Set<string>;
  onToggle: (habitId: string, date: string, done: boolean) => void;
}

export function HabitRowDesktop({
  habit,
  week,
  todayStr,
  completionsMap,
  onToggle,
}: HabitRowProps) {
  const todayDone = completionsMap.has(`${habit.id}:${todayStr}`);

  // Calculate streak ending at today
  let streak = 0;
  for (let i = week.indexOf(todayStr); i >= 0; i--) {
    if (completionsMap.has(`${habit.id}:${week[i]}`)) streak++;
    else break;
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Icon box */}
      <div className="w-7 h-7 rounded-[8px] bg-accent-muted flex items-center justify-center shrink-0">
        <span className="text-accent text-[13px]">
          {habit.section === 'faith' ? '🤲' : habit.section === 'body' ? '💪' : '📖'}
        </span>
      </div>

      {/* Name + section */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-primary truncate">{habit.name}</p>
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-tertiary">
          {SECTION_LABELS[habit.section]}
        </p>
      </div>

      {/* 7-day dot strip */}
      <div className="flex items-center gap-[3px]">
        {week.map((day, i) => {
          const done = completionsMap.has(`${habit.id}:${day}`);
          const isToday = day === todayStr;
          return (
            <div
              key={day}
              title={`${DAY_LABELS[i]} ${day}`}
              className={`
                w-3.5 h-3.5 rounded-[3px]
                ${done ? 'bg-accent' : 'bg-surface-raised'}
                ${isToday ? 'ring-1 ring-accent ring-offset-1 ring-offset-page' : ''}
              `}
            />
          );
        })}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <span className="font-mono text-[11px] text-secondary whitespace-nowrap">
          {streak}d
        </span>
      )}

      {/* Toggle */}
      <button
        onClick={() => { haptic(todayDone ? 'light' : 'success'); onToggle(habit.id, todayStr, todayDone); }}
        aria-label={todayDone ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
        className={`
          w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors
          ${todayDone
            ? 'bg-accent text-white'
            : 'border-2 border-border hover:border-accent'
          }
        `}
      >
        {todayDone && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── Mobile Habit Cell ─────────────────────────────────────────────────────

interface HabitCellProps {
  habit: Habit;
  todayStr: string;
  done: boolean;
  onToggle: (habitId: string, date: string, done: boolean) => void;
}

export function HabitCellMobile({ habit, todayStr, done, onToggle }: HabitCellProps) {
  return (
    <button
      onClick={() => { haptic(done ? 'light' : 'success'); onToggle(habit.id, todayStr, done); }}
      className={`
        flex items-center justify-between p-2.5 px-3 rounded-[10px] border transition-colors
        ${done
          ? 'bg-accent/10 border-accent'
          : 'bg-surface border-border'
        }
      `}
    >
      <span className="text-[13.5px] font-medium text-primary truncate">{habit.name}</span>
      <div className={`
        w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ml-2
        ${done ? 'bg-accent text-white' : 'border-2 border-border'}
      `}>
        {done && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Streak Callout ────────────────────────────────────────────────────────

export function StreakCallout({ streak }: { streak: number }) {
  if (streak < 3) return null;

  return (
    <div className="bg-crimson-soft/10 border border-crimson-line rounded-xl p-4 flex items-start gap-3">
      <span className="text-lg">🔥</span>
      <div>
        <p className="text-sm font-medium text-primary">
          {streak}-day streak!
        </p>
        <p className="text-[13px] font-display italic text-secondary mt-0.5">
          Consistency compounds. Keep showing up.
        </p>
      </div>
    </div>
  );
}
