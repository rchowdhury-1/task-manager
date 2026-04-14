import { Priority } from '../../types';
import { priorityColor } from '../../utils/helpers';

interface BadgeProps {
  priority: Priority;
  className?: string;
}

const labels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function Badge({ priority, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${priorityColor(priority)} ${className}`}
    >
      {labels[priority]}
    </span>
  );
}
