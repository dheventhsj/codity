'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ThroughputChartProps {
  data: Array<{ timestamp: string; count: number; avgDuration?: number }>;
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
        <XAxis dataKey="time" stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#throughputGrad)"
          name="Jobs"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
