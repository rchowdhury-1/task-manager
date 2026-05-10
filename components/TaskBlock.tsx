import { KeyboardEvent } from 'react';

type Category = 'career' | 'lms' | 'freelance' | 'learning' | 'uber' | 'faith';
type Status = 'backlog' | 'this_week' | 'in_progress' | 'done';

interface TaskBlockProps {
  title: string;
  category: Category;
  priority: 1 | 2 | 3;
  durationMinutes: number;
  scheduledTime?: string;
  status: Status;
  onClick?: () => void;
  pixelsPerMinute?: number;
  isRecurring?: boolean;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F59E0B',
  3: '#10B981',
};

const STATUS_COLORS: Record<Status, string> = {
  backlog: '#9CA3AF',
  this_week: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
};

const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  this_week: 'This week',
  in_progress: 'In progress',
  done: 'Done',
};

const CATEGORY_STYLES: Record<Category, { bg: string; text: string; bgDark: string; textDark: string }> = {
  career:    { bg: 'bg-[#FFF7ED]', text: 'text-[#C2410C]', bgDark: 'dark:bg-[#431407]', textDark: 'dark:text-[#FB923C]' },
  lms:       { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', bgDark: 'dark:bg-[#172554]', textDark: 'dark:text-[#60A5FA]' },
  freelance: { bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]', bgDark: 'dark:bg-[#1E1B4B]', textDark: 'dark:text-[#818CF8]' },
  learning:  { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]', bgDark: 'dark:bg-[#2E1065]', textDark: 'dark:text-[#A78BFA]' },
  uber:      { bg: 'bg-[#F8FAFC]', text: 'text-[#475569]', bgDark: 'dark:bg-[#1E293B]', textDark: 'dark:text-[#94A3B8]' },
  faith:     { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', bgDark: 'dark:bg-[#451A03]', textDark: 'dark:text-[#FBBF24]' },
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TaskBlock({
  title,
  category,
  priority,
  durationMinutes,
  scheduledTime,
  status,
  onClick,
  pixelsPerMinute = 1.2,
  isRecurring = false,
}: TaskBlockProps) {
  const height = Math.max(40, durationMinutes * pixelsPerMinute);
  const isDone = status === 'done';
  const catStyle = CATEGORY_STYLES[category];

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role={isRecurring ? undefined : 'button'}
      tabIndex={isRecurring ? undefined : 0}
      onClick={isRecurring ? undefined : onClick}
      onKeyDown={isRecurring ? undefined : handleKey}
      aria-label={`Task: ${title}, ${STATUS_LABELS[status]}`}
      style={{
        height: `${height}px`,
        borderLeftColor: PRIORITY_COLORS[priority],
        opacity: isDone ? 0.6 : 1,
      }}
      className={`
        group relative flex flex-col p-2 rounded-lg
        bg-surface border border-border border-l-4
        ${isRecurring ? 'border-l-dashed cursor-default' : 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 active:ring-2 active:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'}
        select-none overflow-hidden
        transition-all duration-150
      `}
    >
      {/* Drag handle */}
      <div
        aria-hidden
        className="
          absolute left-0 top-0 bottom-0 w-1
          flex flex-col items-center justify-center gap-0.5
          opacity-0 group-hover:opacity-60
          transition-opacity duration-150
        "
      >
        {[0, 1, 2].map(i => (
          <span key={i} className="w-0.5 h-3 rounded-full bg-tertiary" />
        ))}
      </div>

      {/* Header row: title + category badge */}
      <div className="flex items-start gap-1 min-w-0">
        <p
          className="flex-1 text-sm font-medium text-primary leading-snug truncate"
          style={{ textDecoration: isDone ? 'line-through' : 'none' }}
        >
          {title}
        </p>
        <span
          className={`
            shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded
            ${catStyle.bg} ${catStyle.text} ${catStyle.bgDark} ${catStyle.textDark}
          `}
        >
          {category}
        </span>
      </div>

      {/* Footer row: time + duration + status dot */}
      {height >= 56 && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          {scheduledTime && (
            <span className="text-[11px] text-secondary">{scheduledTime}</span>
          )}
          <span className="text-[11px] text-secondary">{formatDuration(durationMinutes)}</span>
          <div className="ml-auto flex items-center gap-1">
            <span
              aria-label={STATUS_LABELS[status]}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
