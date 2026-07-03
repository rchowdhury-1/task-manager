'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit } from '@/lib/api/hooks';
import { fadeInUp, staggerChildren } from '@/lib/animations';
import type { Habit, Section } from '@/lib/types';

const SECTION_ORDER: Section[] = ['faith', 'body', 'growth'];
const SECTION_LABELS: Record<Section, string> = { faith: 'Faith', body: 'Body', growth: 'Growth' };
const SECTION_COLORS: Record<Section, string> = {
  faith: 'bg-tag-rose',
  body: 'bg-tag-green',
  growth: 'bg-tag-blue',
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

  const displayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={'Habit name\u2026'}
        autoFocus
        className="w-full px-3 py-2.5 text-[14px] bg-surface border border-border rounded-lg text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {SECTION_ORDER.map(s => (
            <option key={s} value={s}>{SECTION_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
          className="px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
            className={`w-9 h-9 rounded-lg text-[12px] font-semibold transition-colors ${
              daysOfWeek.includes(dow)
                ? 'bg-accent text-white'
                : 'bg-surface-raised text-secondary hover:text-primary'
            }`}
          >
            {DAY_LABELS[i]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || createHabit.isPending}
          className="px-4 py-2.5 text-[13px] font-medium bg-accent text-white rounded-lg disabled:opacity-50 hover:bg-accent-hover transition-colors"
        >
          {createHabit.isPending ? 'Saving\u2026' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-[13px] text-secondary hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Habit Row ──────────────────────────────────────────────────────────────

function SettingsHabitRow({ habit }: { habit: Habit }) {
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
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex gap-2">
          <select
            value={editSection}
            onChange={(e) => setEditSection(e.target.value as Section)}
            className="px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SECTION_ORDER.map(s => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={editTimeOfDay}
            onChange={(e) => setEditTimeOfDay(e.target.value)}
            className="px-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
            className="px-3.5 py-2 text-[12.5px] font-medium bg-accent text-white rounded-lg disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3.5 py-2 text-[12.5px] text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 group">
      {/* Section dot */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SECTION_COLORS[habit.section]}`} />

      {/* Name + time */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-primary truncate">{habit.name}</p>
        <p className="font-mono text-[10.5px] text-tertiary capitalize">
          {SECTION_LABELS[habit.section]}
          {habit.timeOfDay ? ` \u00b7 ${habit.timeOfDay}` : ''}
        </p>
      </div>

      {/* Days of week toggles */}
      <div className="hidden sm:flex items-center gap-1">
        {displayOrder.map((dow, i) => (
          <button
            key={dow}
            onClick={() => toggleDay(dow)}
            className={`w-7 h-7 rounded-md text-[10px] font-semibold transition-colors ${
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
          className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-raised transition-colors"
          aria-label="Edit habit"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
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
          <div key={i} className="h-16 bg-surface-raised rounded-xl" />
        ))}
      </div>
    );
  }

  const allHabits = habits ?? [];

  const grouped = SECTION_ORDER
    .map(s => ({
      section: s,
      habits: allHabits.filter(h => h.section === s),
    }))
    .filter(g => g.habits.length > 0);

  return (
    <div className="space-y-6">
      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] md:text-[22px] font-semibold text-primary">
            Habits
          </h2>
          <p className="text-[13px] text-secondary mt-0.5">
            Manage your daily habits and routines.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} /> Add Habit
        </button>
      </div>

      {/* New habit form */}
      {showForm && <NewHabitForm onClose={() => setShowForm(false)} />}

      {/* Grouped habits */}
      {grouped.length === 0 && !showForm && (
        <div className="border border-dashed border-border-strong rounded-2xl px-8 py-14 text-center">
          <p className="font-display italic text-[22px] text-secondary leading-snug mb-2">
            No habits yet.
          </p>
          <p className="text-[13px] text-tertiary">
            Click &ldquo;Add Habit&rdquo; to create your first routine.
          </p>
        </div>
      )}

      <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="space-y-6">
        {grouped.map(({ section, habits: sectionHabits }) => (
          <motion.div key={section} variants={fadeInUp}>
            <h3 className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-tertiary pb-2.5 mb-3 border-b border-border">
              {SECTION_LABELS[section]}
            </h3>
            <div className="space-y-2">
              {sectionHabits.map(h => (
                <SettingsHabitRow key={h.id} habit={h} />
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
