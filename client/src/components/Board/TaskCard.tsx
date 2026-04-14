import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { Badge } from '../Shared/Badge';
import { Avatar } from '../Shared/Avatar';
import { formatDueDate, isOverdue, isDueSoon } from '../../utils/helpers';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.due_date);
  const dueSoon = isDueSoon(task.due_date);
  const dueLabel = formatDueDate(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-slate-800 border rounded-xl p-3.5 cursor-pointer
        hover:border-slate-600 hover:bg-slate-750 transition-all duration-150
        select-none touch-none
        ${isSortableDragging || isDragging
          ? 'opacity-50 border-indigo-500 shadow-lg shadow-indigo-500/20 rotate-1'
          : 'border-slate-700/50 hover:shadow-md hover:shadow-black/30'
        }
      `}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {/* Priority + drag handle */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge priority={task.priority} />
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm-2 8a2 2 0 100-4 2 2 0 000 4zm8-14a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <p className="text-slate-100 text-sm font-medium leading-snug mb-3 line-clamp-2">
        {task.title}
      </p>

      {/* Description snippet */}
      {task.description && (
        <p className="text-slate-500 text-xs mb-3 line-clamp-1">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {/* Due date */}
        {dueLabel && (
          <span
            className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
              overdue
                ? 'text-rose-400 bg-rose-400/10'
                : dueSoon
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-500'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dueLabel}
          </span>
        )}

        {/* Assignee */}
        {task.assignee_name && (
          <div className="ml-auto">
            <Avatar
              name={task.assignee_name}
              color={task.assignee_color || '#6366f1'}
              size="xs"
              tooltip
            />
          </div>
        )}
      </div>
    </div>
  );
}
