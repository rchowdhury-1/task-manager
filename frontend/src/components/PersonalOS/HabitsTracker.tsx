import { usePersonalOS } from '../../contexts/PersonalOSContext';
import { Habit } from '../../types/personalOS';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
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
    if (completions.includes(dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CATEGORY_STYLES: Record<string, { header: string }> = {
  faith:  { header: 'text-[#F472B6]' },
  body:   { header: 'text-[#4ADE80]' },
  growth: { header: 'text-[#C084FC]' },
};

// ─── HabitRow ────────────────────────────────────────────────────────────────

function HabitRow({ habit, weekDates, today }: { habit: Habit; weekDates: string[]; today: string }) {
  const { toggleHabit } = usePersonalOS();
  const streak = calcStreak(habit.completions);

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Name + time */}
      <div className="w-36 shrink-0">
        <p className="text-sm text-[#F5F5F7] leading-tight truncate">{habit.name}</p>
        <p className="text-[10px] text-[#98989F] mt-0.5 capitalize">{habit.time_of_day}</p>
      </div>

      {/* 7 dot buttons */}
      <div className="flex gap-1.5">
        {weekDates.map((dateStr, i) => {
          const done = habit.completions.includes(dateStr);
          const isToday = dateStr === today;
          return (
            <button
              key={i}
              onClick={() => toggleHabit(habit.id, dateStr)}
              title={dateStr}
              className="w-5 h-5 rounded-full border transition-all flex items-center justify-center text-[10px] font-bold"
              style={{
                background: done ? '#1D9E75' : '#3A3A3C',
                borderColor: isToday ? '#60A5FA' : (done ? '#1D9E75' : '#48484A'),
                color: done ? '#fff' : 'transparent',
                outline: isToday ? '1px solid #60A5FA' : 'none',
                outlineOffset: '2px',
              }}
            >
              {done ? '✓' : ''}
            </button>
          );
        })}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <span className="text-xs text-[#FB923C] shrink-0">🔥 {streak}d</span>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  label, category, habits, weekDates, today,
}: {
  label: string;
  category: string;
  habits: Habit[];
  weekDates: string[];
  today: string;
}) {
  const filtered = habits.filter(h => h.category === category && h.active);
  if (filtered.length === 0) return null;
  const style = CATEGORY_STYLES[category] ?? { header: 'text-[#98989F]' };

  return (
    <div className="mb-5">
      <div className={`text-xs uppercase tracking-widest font-semibold mb-2 pb-1 border-b border-[#48484A] ${style.header}`}>
        {label}
      </div>

      {/* Day labels header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-36 shrink-0" />
        {DAY_LETTERS.map((l, i) => (
          <span key={i} className="w-5 text-center text-[10px] text-[#98989F]">{l}</span>
        ))}
      </div>

      {filtered
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(habit => (
          <HabitRow key={habit.id} habit={habit} weekDates={weekDates} today={today} />
        ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

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
        <p className="text-sm text-[#98989F] text-center py-8">No habits yet</p>
      )}
    </div>
  );
}
