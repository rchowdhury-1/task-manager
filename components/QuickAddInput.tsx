'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { parseQuickAdd, type ParsedTask } from '@/lib/parseQuickAdd';
export type { ParsedTask } from '@/lib/parseQuickAdd';
export { parseQuickAdd } from '@/lib/parseQuickAdd';

interface Chip {
  label: string;
  type: 'category' | 'priority' | 'day' | 'time' | 'duration';
}

function getChips(parsed: ParsedTask): Chip[] {
  const chips: Chip[] = [];
  if (parsed.category)       chips.push({ label: `#${parsed.category}`, type: 'category' });
  if (parsed.priority)       chips.push({ label: `P${parsed.priority}`, type: 'priority' });
  if (parsed.assignedDay)    chips.push({ label: parsed.assignedDay, type: 'day' });
  if (parsed.scheduledTime)  chips.push({ label: parsed.scheduledTime, type: 'time' });
  if (parsed.durationMinutes) {
    const h = Math.floor(parsed.durationMinutes / 60);
    const m = parsed.durationMinutes % 60;
    const label = h > 0 && m === 0 ? `${h}h` : m > 0 && h === 0 ? `${m}m` : `${h}h${m}m`;
    chips.push({ label, type: 'duration' });
  }
  return chips;
}

const CHIP_STYLES: Record<Chip['type'], string> = {
  category: 'bg-surface-raised text-secondary border border-border',
  priority: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  day:      'bg-surface-raised text-secondary border border-border',
  time:     'bg-surface-raised text-secondary border border-border',
  duration: 'bg-surface-raised text-secondary border border-border',
};

interface QuickAddInputProps {
  placeholder?: string;
  onSubmit: (parsed: ParsedTask) => void;
}

export function QuickAddInput({
  placeholder = 'Add task… #career !1 today 1h 9am',
  onSubmit,
}: QuickAddInputProps) {
  const [raw, setRaw] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parsed = parseQuickAdd(raw);
  const chips = getChips(parsed);
  const hasContent = raw.trim().length > 0;

  const submit = () => {
    if (!parsed.title && !hasContent) return;
    onSubmit(parsed);
    setRaw('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape') {
      setRaw('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <div className="
        flex flex-col rounded-lg border border-border bg-surface
        focus-within:ring-2 focus-within:ring-accent transition-all duration-150
      ">
        {/* Chips row */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-2">
            {chips.map((chip, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${CHIP_STYLES[chip.type]}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={inputRef}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={1}
            style={{ resize: 'none', maxHeight: '4.5rem' }}
            className="
              flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary
              outline-none leading-snug overflow-y-auto
            "
          />
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            <button
              type="button"
              onClick={() => setShowHelp(h => !h)}
              aria-label="Show syntax help"
              className="text-tertiary hover:text-secondary transition-colors"
            >
              <HelpCircle size={15} />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!hasContent}
              aria-label="Add task"
              className="
                flex items-center justify-center w-7 h-7 rounded-md
                bg-accent text-white hover:bg-accent-hover
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Help tooltip */}
      {showHelp && (
        <div className="
          absolute top-full mt-2 left-0 z-50 w-72 p-3
          bg-surface-raised border border-border rounded-lg shadow-lg
          text-[11px] text-secondary space-y-1
        ">
          <p><span className="font-semibold text-primary">#career</span> — category</p>
          <p><span className="font-semibold text-primary">!1 !2 !3</span> — priority</p>
          <p><span className="font-semibold text-primary">today tomorrow mon…sun</span> — day</p>
          <p><span className="font-semibold text-primary">1h 30m</span> — duration</p>
          <p><span className="font-semibold text-primary">9am 10:30 21:00</span> — time</p>
        </div>
      )}
    </div>
  );
}
