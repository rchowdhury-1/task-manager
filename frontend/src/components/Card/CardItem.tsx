import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../../types';
import { format, isPast, parseISO } from 'date-fns';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Urgent' },
  high: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'High' },
  medium: { bg: 'rgba(234,179,8,0.15)', text: '#eab308', label: 'Medium' },
  low: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Low' },
};

interface CardItemProps {
  card: Card;
  onClick: () => void;
}

export default function CardItem({ card, onClick }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = PRIORITY_STYLES[card.priority] || PRIORITY_STYLES.medium;
  const isOverdue = card.due_date && isPast(parseISO(card.due_date));

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      className="group relative rounded-xl border p-3.5 cursor-pointer hover:border-emerald-500/40 transition-all mb-2 touch-none"
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="absolute inset-0 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
      <div className="relative">
        {/* Priority badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: priority.bg, color: priority.text }}
          >
            {priority.label}
          </span>
          {card.due_date && (
            <span
              className="text-xs"
              style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}
            >
              {isOverdue ? '⚠ ' : ''}{format(parseISO(card.due_date), 'MMM d')}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug mb-2.5 pr-2" style={{ color: 'var(--text)' }}>
          {card.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {card.description && (
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          )}
          <div className="ml-auto">
            {card.assignee_name && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: card.assignee_color || 'var(--primary)', color: '#fff' }}
                title={card.assignee_name}
              >
                {card.assignee_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
