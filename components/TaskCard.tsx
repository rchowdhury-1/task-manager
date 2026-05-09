'use client';
import { forwardRef } from 'react';
import type { Task, Category } from '@/lib/types';
import { formatTimeShort } from '@/lib/utils/dates';
import { format, parseISO } from 'date-fns';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F59E0B',
  3: '#10B981',
};

const CATEGORY_STYLES: Record<Category, { bg: string; text: string; bgDark: string; textDark: string }> = {
  career:    { bg: 'bg-[#FFF7ED]', text: 'text-[#C2410C]', bgDark: 'dark:bg-[#431407]', textDark: 'dark:text-[#FB923C]' },
  lms:       { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', bgDark: 'dark:bg-[#172554]', textDark: 'dark:text-[#60A5FA]' },
  freelance: { bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]', bgDark: 'dark:bg-[#1E1B4B]', textDark: 'dark:text-[#818CF8]' },
  learning:  { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]', bgDark: 'dark:bg-[#2E1065]', textDark: 'dark:text-[#A78BFA]' },
  uber:      { bg: 'bg-[#F8FAFC]', text: 'text-[#475569]', bgDark: 'dark:bg-[#1E293B]', textDark: 'dark:text-[#94A3B8]' },
  faith:     { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', bgDark: 'dark:bg-[#451A03]', textDark: 'dark:text-[#FBBF24]' },
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
  style?: React.CSSProperties;
}

function formatDay(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'Today';
    return format(d, 'EEE');
  } catch {
    return dateStr;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps & { listeners?: any; attributes?: any }>(
  function TaskCard({ task, onClick, isDragOverlay, style, listeners, attributes }, ref) {
    const isDone = task.status === 'done';
    const catStyle = CATEGORY_STYLES[task.category] ?? CATEGORY_STYLES.career;

    return (
      <div
        ref={ref}
        style={{
          ...style,
          borderLeftColor: PRIORITY_COLORS[task.priority] ?? '#9CA3AF',
          opacity: isDragOverlay ? 0.9 : isDone ? 0.6 : 1,
        }}
        onClick={onClick}
        className={`
          rounded-lg p-3 border-l-2
          bg-surface-raised dark:bg-surface
          border border-border
          cursor-grab active:cursor-grabbing
          transition-shadow
          ${isDragOverlay ? 'shadow-xl ring-2 ring-accent/20' : 'hover:ring-1 hover:ring-accent/30'}
        `}
        {...listeners}
        {...attributes}
      >
        {/* Top row: category badge + priority dot */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span
            className={`
              text-[10px] font-semibold px-1.5 py-0.5 rounded
              ${catStyle.bg} ${catStyle.text} ${catStyle.bgDark} ${catStyle.textDark}
            `}
          >
            {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
          </span>
          <span
            className="w-2 h-2 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
        </div>

        {/* Title */}
        <p
          className={`text-sm font-medium text-primary leading-snug line-clamp-2 ${isDone ? 'line-through' : ''}`}
        >
          {task.title}
        </p>

        {/* Meta row: duration + day */}
        <div className="flex items-center gap-3 mt-2 text-xs text-secondary">
          {task.durationMinutes > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-tertiary">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {task.durationMinutes >= 60
                ? `${Math.floor(task.durationMinutes / 60)}h${task.durationMinutes % 60 > 0 ? ` ${task.durationMinutes % 60}m` : ''}`
                : `${task.durationMinutes}m`
              }
            </span>
          )}
          {task.assignedDay && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-tertiary">
                <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {formatDay(task.assignedDay)}
            </span>
          )}
          {task.scheduledTime && (
            <span>{formatTimeShort(task.scheduledTime)}</span>
          )}
        </div>

        {/* Time logged progress bar for in_progress tasks */}
        {task.status === 'in_progress' && task.timeLoggedMinutes > 0 && (
          <div className="mt-2">
            <div className="h-1 w-full bg-surface rounded-full">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${Math.min((task.timeLoggedMinutes / task.durationMinutes) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px]">
              <span className="text-accent">
                {task.timeLoggedMinutes >= 60
                  ? `${Math.floor(task.timeLoggedMinutes / 60)}h ${task.timeLoggedMinutes % 60}m elapsed`
                  : `${task.timeLoggedMinutes}m elapsed`
                }
              </span>
              {task.assignedDay && (
                <span className="text-accent">{formatDay(task.assignedDay)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
