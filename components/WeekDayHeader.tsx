import { dayNameShort, dayNumber, isToday } from '@/lib/utils/dates';
import { DAY_FOCUS_STYLES } from '@/lib/utils/styles';
import type { DayFocus } from '@/lib/types';

interface WeekDayHeaderProps {
  dateISO: string;
  focusArea?: DayFocus;
  hoursUsed: number;
  hoursCap: number;
}

export function WeekDayHeader({ dateISO, focusArea, hoursUsed, hoursCap }: WeekDayHeaderProps) {
  const today = isToday(dateISO);
  const pct = hoursCap > 0 ? Math.min((hoursUsed / hoursCap) * 100, 100) : 0;
  const barColor = pct >= 100 ? 'bg-p1' : pct >= 75 ? 'bg-p2' : 'bg-accent';
  const focusStyle = focusArea ? DAY_FOCUS_STYLES[focusArea] : null;

  return (
    <div className="text-center space-y-1 pb-2">
      <p className="text-[10px] font-semibold text-secondary tracking-widest">
        {dayNameShort(dateISO)}
      </p>
      <p className={`text-xl font-medium ${today ? 'text-accent' : 'text-primary'}`}>
        {dayNumber(dateISO)}
      </p>
      {focusStyle && focusArea !== 'flex' && (
        <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full ${focusStyle.bg} ${focusStyle.text}`}>
          {focusStyle.label}
        </span>
      )}
      <div className="px-1">
        <div className="flex items-center justify-center gap-1 text-[9px] text-tertiary">
          <span>{hoursUsed.toFixed(1)}h</span>
          <span>/</span>
          <span>{hoursCap}h</span>
        </div>
        <div className="h-1 w-full bg-surface-raised rounded-full mt-0.5">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
