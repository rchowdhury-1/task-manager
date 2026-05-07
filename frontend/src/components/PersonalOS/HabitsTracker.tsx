import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Habit } from '../../types/personalOS';

const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const calcStreak = (completions: string[]): number => {
  if (!completions.length) return 0;
  const sorted = [...completions].sort().reverse();
  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
    if (diff > 1) break;
    streak++;
    current = d;
  }
  return streak;
};

const CAT_LABELS: Record<string, string> = { faith: 'Faith', body: 'Body', growth: 'Growth' };
const CAT_COLORS: Record<string, string> = { faith: '#a855f7', body: '#10b981', growth: '#3b82f6' };
const TIME_LABELS: Record<string, string> = { morning: 'Morning', evening: 'Evening', anytime: 'Anytime' };

function HabitRow({ habit, weekDates }: { habit: Habit; weekDates: string[] }) {
  const { toggleHabit } = usePersonalOS();
  const today = new Date().toISOString().split('T')[0];
  const streak = calcStreak(habit.completions);
  const catColor = CAT_COLORS[habit.category] || '#94a3b8';

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{habit.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {TIME_LABELS[habit.time_of_day]}
          {habit.duration_minutes > 0 && ` · ${habit.duration_minutes}min`}
        </p>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <span className="text-xs font-bold shrink-0" style={{ color: catColor }}>🔥{streak}</span>
      )}

      {/* Weekly dot grid (Mon–Sun) */}
      <div className="flex gap-1">
        {weekDates.map((date) => {
          const completed = habit.completions.includes(date);
          const isToday = date === today;
          return (
            <button
              key={date}
              title={date}
              onClick={() => toggleHabit(habit.id, date)}
              className="w-5 h-5 rounded-full border transition-all"
              style={{
                background: completed ? catColor : 'transparent',
                borderColor: isToday ? catColor : (completed ? catColor : 'var(--border)'),
                boxShadow: isToday ? `0 0 0 1px ${catColor}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategorySection({ category, habits, weekDates }: {
  category: string;
  habits: Habit[];
  weekDates: string[];
}) {
  if (habits.length === 0) return null;
  const color = CAT_COLORS[category] || '#94a3b8';

  return (
    <div className="mb-6">
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3 px-1"
        style={{ color }}
      >
        {CAT_LABELS[category] || category}
      </h3>
      <div className="rounded-xl border px-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {habits.map((h) => <HabitRow key={h.id} habit={h} weekDates={weekDates} />)}
      </div>
    </div>
  );
}

export default function HabitsTracker() {
  const { habits } = usePersonalOS();
  const weekDates = getWeekDates();

  const activeHabits = habits.filter((h) => h.active);
  const grouped = {
    faith: activeHabits.filter((h) => h.category === 'faith'),
    body: activeHabits.filter((h) => h.category === 'body'),
    growth: activeHabits.filter((h) => h.category === 'growth'),
  };

  // Day labels (Mon–Sun) for the header row
  const dayLabels = weekDates.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { weekday: 'narrow' });
  });

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Habits</h2>
        {/* Day labels header */}
        <div className="flex gap-1 mr-0">
          {dayLabels.map((label, i) => (
            <span
              key={i}
              className="w-5 text-center text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <CategorySection category="faith" habits={grouped.faith} weekDates={weekDates} />
      <CategorySection category="body" habits={grouped.body} weekDates={weekDates} />
      <CategorySection category="growth" habits={grouped.growth} weekDates={weekDates} />

      {activeHabits.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No habits configured.</p>
      )}
    </div>
  );
}
