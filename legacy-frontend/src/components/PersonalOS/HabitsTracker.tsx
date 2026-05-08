import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Habit } from '../../types/personalOS';

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function calcStreak(completions: string[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (completions.includes(dateStr)) streak++;
    else break;
  }
  return streak;
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CATEGORY_STYLES: Record<string, { header: string }> = {
  faith:  { header: 'text-pink-500' },
  body:   { header: 'text-green-500' },
  growth: { header: 'text-purple-500' },
};

function HabitRow({ habit, weekDates, today }: { habit: Habit; weekDates: string[]; today: string }) {
  const { toggleHabit } = usePersonalOS();
  const streak = calcStreak(habit.completions);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-36 shrink-0">
        <p className="text-sm leading-tight truncate" style={{ color: '#111827' }}>{habit.name}</p>
        <p className="text-[10px] mt-0.5 capitalize" style={{ color: '#9CA3AF' }}>{habit.time_of_day}</p>
      </div>

      <div className="flex gap-1.5">
        {weekDates.map((dateStr, i) => {
          const done = habit.completions.includes(dateStr);
          const isToday = dateStr === today;
          return (
            <button
              key={i}
              onClick={() => toggleHabit(habit.id, dateStr)}
              title={dateStr}
              className="w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center text-[10px] font-bold"
              style={{
                background: done ? '#10B981' : '#F9FAFB',
                borderColor: isToday ? '#EF4444' : (done ? '#10B981' : '#E5E7EB'),
                color: done ? '#fff' : 'transparent',
                outline: isToday ? '2px solid #FECACA' : 'none',
                outlineOffset: '1px',
              }}
            >
              {done ? '✓' : ''}
            </button>
          );
        })}
      </div>

      {streak > 0 && (
        <span className="text-xs text-orange-500 shrink-0">🔥 {streak}d</span>
      )}
    </div>
  );
}

function CategorySection({
  label, category, habits, weekDates, today,
}: {
  label: string; category: string; habits: Habit[]; weekDates: string[]; today: string;
}) {
  const filtered = habits.filter(h => h.category === category && h.active);
  if (filtered.length === 0) return null;
  const style = CATEGORY_STYLES[category] ?? { header: 'text-gray-400' };

  return (
    <div className="mb-5">
      <div className={`text-xs uppercase tracking-widest font-semibold mb-2 pb-1 border-b border-gray-100 ${style.header}`}>
        {label}
      </div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-36 shrink-0" />
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="w-5 text-center text-[10px]" style={{ color: '#9CA3AF' }}>{l}</span>
        ))}
      </div>
      {filtered.sort((a, b) => a.sort_order - b.sort_order).map(habit => (
        <HabitRow key={habit.id} habit={habit} weekDates={weekDates} today={today} />
      ))}
    </div>
  );
}

export default function HabitsTracker() {
  const { habits } = usePersonalOS();
  const weekDates = getWeekDates();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4">
      <CategorySection label="Faith" category="faith" habits={habits} weekDates={weekDates} today={today} />
      <CategorySection label="Body" category="body" habits={habits} weekDates={weekDates} today={today} />
      <CategorySection label="Growth" category="growth" habits={habits} weekDates={weekDates} today={today} />
      {habits.filter(h => h.active).length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No habits yet</p>
      )}
    </div>
  );
}
