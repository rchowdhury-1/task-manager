'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit } from '@/lib/api/hooks';
import type { Habit, Section } from '@/lib/types';

const SECTION_ORDER: Section[] = ['faith', 'body', 'growth'];
const SECTION_LABELS: Record<Section, string> = { faith: 'Faith', body: 'Body', growth: 'Growth' };
const SECTION_COLORS: Record<Section, string> = {
  faith: 'bg-amber-500',
  body: 'bg-green-500',
  growth: 'bg-blue-500',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'anytime', label: 'Anytime' },
];

// ─── New Habit Form ─────────────────────────────────────────────────────────

function NewHabitForm({ onClose }: { onClose: () => void }) {
  const createHabit = useCreateHabit();
  const [name, setName] = useState('');
  const [section, setSection] = useState<Section>('growth');
  const [timeOfDay, setTimeOfDay] = useState<string>('anytime');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  const toggleDay = (dow: number) => {
    setDaysOfWeek(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createHabit.mutate(
      {
        name: name.trim(),
        section,
        time_of_day: timeOfDay as 'morning' | 'evening' | 'anytime',
        days_of_week: daysOfWeek,
        active: true,
      },
      {
        onSuccess: () => { toast.success('Habit created'); onClose(); },
        onError: () => toast.error("Couldn't create habit. Try again."),
      },
    );
  };

  // Map display index to JS day-of-week (Mon=1, Tue=2, ...Sat=6, Sun=0)
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name…"
        autoFocus
        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {SECTION_ORDER.map(s => (
            <option key={s} value={s}>{SECTION_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
          className="px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {TIME_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        {displayOrder.map((dow, i) => (
          <button
            key={dow}
            type="button"
            onClick={() => toggleDay(dow)}
            className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
              daysOfWeek.includes(dow)
                ? 'bg-accent text-white'
                : 'bg-surface-raised text-secondary hover:text-primary'
            }`}
          >
            {DAY_LABELS[i]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || createHabit.isPending}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg disabled:opacity-50 hover:bg-accent/90 transition-colors"
        >
          {createHabit.isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Habit Row ──────────────────────────────────────────────────────────────

function HabitRow({ habit }: { habit: Habit }) {
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editSection, setEditSection] = useState<Section>(habit.section);
  const [editTimeOfDay, setEditTimeOfDay] = useState(habit.timeOfDay ?? 'anytime');

  const displayOrder = [1, 2, 3, 4, 5, 6, 0];

  const toggleDay = (dow: number) => {
    const current = habit.daysOfWeek;
    const updated = current.includes(dow)
      ? current.filter(d => d !== dow)
      : [...current, dow];
    updateHabit.mutate({ id: habit.id, patch: { days_of_week: updated } });
  };

  const handleSaveEdit = () => {
    updateHabit.mutate(
      {
        id: habit.id,
        patch: {
          name: editName.trim() || habit.name,
          section: editSection,
          time_of_day: editTimeOfDay as 'morning' | 'evening' | 'anytime',
        },
      },
      {
        onSuccess: () => { toast.success('Habit updated'); setEditing(false); },
        onError: () => toast.error("Couldn't update habit."),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${habit.name}"?`)) return;
    deleteHabit.mutate(
      { id: habit.id },
      {
        onSuccess: () => toast.success('Habit deleted'),
        onError: () => toast.error("Couldn't delete habit."),
      },
    );
  };

  if (editing) {
    return (
      <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          autoFocus
          className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex gap-2">
          <select
            value={editSection}
            onChange={(e) => setEditSection(e.target.value as Section)}
            className="px-2 py-1 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SECTION_ORDER.map(s => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={editTimeOfDay}
            onChange={(e) => setEditTimeOfDay(e.target.value)}
            className="px-2 py-1 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {TIME_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={updateHabit.isPending}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs text-secondary hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3 group">
      {/* Section dot */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SECTION_COLORS[habit.section]}`} />

      {/* Name + time */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{habit.name}</p>
        <p className="text-[10px] text-tertiary capitalize">
          {SECTION_LABELS[habit.section]}
          {habit.timeOfDay ? ` · ${habit.timeOfDay}` : ''}
        </p>
      </div>

      {/* Days of week toggles */}
      <div className="hidden sm:flex items-center gap-1">
        {displayOrder.map((dow, i) => (
          <button
            key={dow}
            onClick={() => toggleDay(dow)}
            className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
              habit.daysOfWeek.includes(dow)
                ? 'bg-accent text-white'
                : 'bg-surface-raised text-tertiary hover:text-secondary'
            }`}
          >
            {DAY_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Edit / Delete */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            setEditName(habit.name);
            setEditSection(habit.section);
            setEditTimeOfDay(habit.timeOfDay ?? 'anytime');
            setEditing(true);
          }}
          className="p-1.5 rounded text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
          aria-label="Edit habit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded text-secondary hover:text-p1 hover:bg-p1/10 transition-colors"
          aria-label="Delete habit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Section ───────────────────────────────────────────────────────────

export function HabitsSection() {
  const { data: habits, isLoading } = useHabits();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 bg-surface-raised rounded-lg" />
        ))}
      </div>
    );
  }

  const allHabits = habits ?? [];

  // Group by section
  const grouped = SECTION_ORDER
    .map(s => ({
      section: s,
      habits: allHabits.filter(h => h.section === s),
    }))
    .filter(g => g.habits.length > 0);

  return (
    <div className="space-y-6">
      {/* Add habit button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          + Add Habit
        </button>
      </div>

      {/* New habit form */}
      {showForm && <NewHabitForm onClose={() => setShowForm(false)} />}

      {/* Grouped habits */}
      {grouped.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-sm text-tertiary">No habits yet</p>
          <p className="text-xs text-tertiary mt-1">Click "+ Add Habit" to create one</p>
        </div>
      )}

      {grouped.map(({ section, habits: sectionHabits }) => (
        <div key={section}>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-widest border-b border-border pb-2 mb-3">
            {SECTION_LABELS[section]}
          </h3>
          <div className="space-y-2">
            {sectionHabits.map(h => (
              <HabitRow key={h.id} habit={h} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
