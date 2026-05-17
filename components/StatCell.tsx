interface StatCellProps {
  label: string;
  value: React.ReactNode;
  accentBorder?: boolean;
  progress?: { value: number; max: number };
}

export function StatCell({ label, value, accentBorder, progress }: StatCellProps) {
  const pct = progress && progress.max > 0
    ? Math.min((progress.value / progress.max) * 100, 100)
    : 0;

  return (
    <div
      className={`
        bg-surface border border-border rounded-lg md:rounded-lg
        p-3.5 md:p-[18px_22px] flex flex-col gap-1.5
        ${accentBorder ? 'border-l-[3px] border-l-accent' : ''}
      `}
    >
      <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-secondary">
        {label}
      </span>
      <div className="text-[22px] md:text-[26px] font-semibold text-primary leading-tight">
        {value}
      </div>
      {progress && (
        <div className="h-[3px] w-full bg-surface-raised rounded-full mt-1">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
