import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber } from '../utils/format.js';

export default function UsageChart({ filters }) {
  const endpoint = `/api/stats/${filters.granularity}`;
  const { data: stats, loading } = useApi(endpoint, {
    params: { from: filters.from, to: filters.to, project: filters.project || 'all' },
  });

  const chartData = useMemo(() => {
    if (!stats) return [];
    const sorted = [...stats].sort((a, b) => {
      const aKey = a.date || a.week || a.month;
      const bKey = b.date || b.week || b.month;
      return aKey.localeCompare(bKey);
    });
    return sorted.map((r) => ({
      label: r.date || r.week || r.month,
      Messages: r.message_count,
      Sessions: r.session_count,
      'Tool Calls': r.tool_call_count,
    }));
  }, [stats]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16, color: 'var(--text-secondary)' }}>Usage Over Time</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="toolGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={formatNumber} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            formatter={(v) => formatNumber(v)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Messages" stroke="#6366f1" fill="url(#msgGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="Sessions" stroke="#22c55e" fill="url(#sessGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="Tool Calls" stroke="#eab308" fill="url(#toolGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
