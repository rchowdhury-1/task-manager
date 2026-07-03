'use client';
import type { Category } from '@/lib/types';
import { useCategoryMap } from '@/lib/api/hooks';
import { formatTimeShort, addTime } from '@/lib/utils/dates';

// Chip styling per palette colour (categories.colour column).
const TAG_BY_COLOUR: Record<string, { bg: string; text: string }> = {
  blue:   { bg: 'bg-tag-blue-bg',   text: 'text-tag-blue' },
  violet: { bg: 'bg-tag-violet-bg', text: 'text-tag-violet' },
  amber:  { bg: 'bg-tag-amber-bg',  text: 'text-tag-amber' },
  green:  { bg: 'bg-tag-green-bg',  text: 'text-tag-green' },
  slate:  { bg: 'bg-tag-slate-bg',  text: 'text-tag-slate' },
  rose:   { bg: 'bg-tag-rose-bg',   text: 'text-tag-rose' },
};

interface ScheduleRowProps {
  title: string;
  category: Category;
  scheduledTime?: string | null;
  durationMinutes: number;
  status?: string;
  priority?: number;
  isRecurring?: boolean;
  onClick?: () => void;
}

export function ScheduleRow({
  title,
  category,
  scheduledTime,
  durationMinutes,
  status,
  priority,
  isRecurring,
  onClick,
}: ScheduleRowProps) {
  const categoryMap = useCategoryMap();
  const cat = categoryMap[category];
  const colourKey = cat?.colour && TAG_BY_COLOUR[cat.colour] ? cat.colour : 'slate';
  const tag = { ...TAG_BY_COLOUR[colourKey], label: cat?.label ?? category, key: colourKey };
  const isDone = status === 'done';
  const isInProgress = status === 'in_progress';

  return (
    <div
      role={!isRecurring ? 'button' : undefined}
      tabIndex={!isRecurring ? 0 : undefined}
      onClick={!isRecurring ? onClick : undefined}
      onKeyDown={!isRecurring ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
      } : undefined}
      className={`
        grid grid-cols-[80px_1fr_auto] md:grid-cols-[108px_1fr_auto] gap-3 md:gap-6
        py-4 px-4 md:px-[22px]
        border-l-[3px] rounded-r-lg
        bg-surface border border-border border-l-0
        transition-colors
        ${isRecurring ? 'border-dashed cursor-default' : 'cursor-pointer hover:bg-surface-raised'}
        ${isDone ? 'opacity-50' : ''}
        ${isInProgress ? 'bg-accent-muted/30' : ''}
      `}
      style={{
        borderLeftColor: `var(--color-tag-${tag.key})`,
        borderLeftWidth: '3px',
        borderLeftStyle: isRecurring ? 'dashed' : 'solid',
      }}
    >
      {/* Left: time */}
      <div className="flex flex-col justify-center">
        {scheduledTime ? (
          <>
            <span className="font-mono text-[12px] text-primary">
              {formatTimeShort(scheduledTime)}
            </span>
            <span className="font-mono text-[11px] text-tertiary">
              {formatTimeShort(addTime(scheduledTime, durationMinutes))}
            </span>
          </>
        ) : (
          <span className="font-mono text-[11px] text-tertiary">Unscheduled</span>
        )}
      </div>

      {/* Centre: title + chip */}
      <div className="flex flex-col justify-center gap-1.5 min-w-0">
        <p
          className={`text-[15px] md:text-[16px] font-medium text-primary truncate ${isDone ? 'line-through' : ''}`}
        >
          {title}
        </p>
        <div className="flex items-center gap-2">
          <span className={`${tag.bg} ${tag.text} rounded-md px-2 py-0.5 text-[11px] font-medium`}>
            {tag.label}
          </span>
          {priority === 1 && (
            <span className="text-[11px] font-semibold text-p1">P1</span>
          )}
          {isRecurring && (
            <span className="text-[10px] text-tertiary font-mono uppercase">Recurring</span>
          )}
        </div>
      </div>

      {/* Right: progress or duration */}
      <div className="flex flex-col items-end justify-center">
        <span className="font-mono text-[11px] text-tertiary">
          {durationMinutes >= 60
            ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ''}`
            : `${durationMinutes}m`
          }
        </span>
        {isInProgress && (
          <div className="w-12 h-[3px] bg-surface-raised rounded-full mt-1.5">
            <div className="h-full w-1/2 rounded-full bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
