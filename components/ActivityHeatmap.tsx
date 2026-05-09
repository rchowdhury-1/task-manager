'use client';
import { useMemo, useState } from 'react';

interface HeatmapDay {
  date: string;
  activity: 0 | 1 | 2 | 3;
}

const CELL_SIZE = 12;
const GAP = 2;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTIVITY_COLORS = [
  'bg-surface-raised',    // 0: none
  'bg-accent/30',         // 1: light
  'bg-accent/60',         // 2: medium
  'bg-accent',            // 3: heavy
];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ActivityHeatmap({ data }: { data: HeatmapDay[] }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Organize into weeks (columns) with 7 days each
  const { weeks, monthLabels } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthLabels: [] };

    // Find the Monday on or before the first date
    const firstDate = new Date(`${data[0].date}T12:00:00`);
    const firstDow = firstDate.getDay(); // 0=Sun
    const mondayOffset = firstDow === 0 ? 6 : firstDow - 1; // days since Monday

    // Pad start to align to Monday
    const padded: (HeatmapDay | null)[] = [];
    for (let i = 0; i < mondayOffset; i++) padded.push(null);
    for (const d of data) padded.push(d);
    // Pad end to complete last week
    while (padded.length % 7 !== 0) padded.push(null);

    const wks: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      wks.push(padded.slice(i, i + 7));
    }

    // Month labels: find first occurrence of each month
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < wks.length; w++) {
      const firstDay = wks[w].find(d => d !== null);
      if (firstDay) {
        const month = new Date(`${firstDay.date}T12:00:00`).getMonth();
        if (month !== lastMonth) {
          labels.push({ label: MONTH_NAMES[month], weekIndex: w });
          lastMonth = month;
        }
      }
    }

    return { weeks: wks, monthLabels: labels };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-tertiary">No activity data yet</p>
      </div>
    );
  }

  const labelWidth = 28;
  const gridWidth = weeks.length * (CELL_SIZE + GAP);
  const gridHeight = 7 * (CELL_SIZE + GAP);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div style={{ minWidth: labelWidth + gridWidth + 16 }} className="relative">
          {/* Month labels */}
          <div className="flex ml-[28px] mb-1" style={{ height: 16 }}>
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="text-[10px] text-tertiary absolute"
                style={{ left: labelWidth + m.weekIndex * (CELL_SIZE + GAP) }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col shrink-0" style={{ width: labelWidth }}>
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="text-[10px] text-tertiary flex items-center"
                  style={{ height: CELL_SIZE + GAP }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`rounded-sm transition-colors ${
                        day ? ACTIVITY_COLORS[day.activity] : 'bg-transparent'
                      }`}
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      onMouseEnter={(e) => {
                        if (!day) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          text: `${formatDate(day.date)} — ${day.activity === 0 ? 'No' : day.activity <= 2 ? `${day.activity}` : '3+'} completions`,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-tertiary">
        <span>Less</span>
        {ACTIVITY_COLORS.map((cls, i) => (
          <div key={i} className={`rounded-sm ${cls}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-[10px] bg-gray-900 text-white rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
