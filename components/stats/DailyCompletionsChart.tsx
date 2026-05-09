'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Props {
  data: { date: string; count: number }[];
}

export default function DailyCompletionsChart({ data }: Props) {
  // Format dates for x-axis (show every Nth label to avoid crowding)
  const chartData = data.map(d => ({
    date: d.date,
    label: `${d.date.slice(5, 7)}/${d.date.slice(8, 10)}`,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--color-text-secondary, #6b7280)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #6b7280)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(label) => `Date: ${label}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [value, 'Completions']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#DC2626"
          strokeWidth={2}
          dot={{ r: 2, fill: '#DC2626' }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
