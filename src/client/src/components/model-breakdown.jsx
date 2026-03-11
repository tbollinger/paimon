import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber } from '../utils/format.js';

const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatModelName(model) {
  if (!model) return 'Unknown';
  if (model.includes('opus')) return 'Opus';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  return model;
}

export default function ModelBreakdown({ filters }) {
  const { data: stats, loading } = useApi('/api/stats/daily', {
    params: { from: filters.from, to: filters.to, project: 'all' },
  });

  const chartData = useMemo(() => {
    if (!stats) return [];
    const byModel = new Map();
    for (const row of stats) {
      const model = row.model || 'unknown';
      const existing = byModel.get(model) || 0;
      byModel.set(model, existing + row.message_count);
    }
    return Array.from(byModel.entries())
      .filter(([, count]) => count > 0)
      .map(([model, count]) => ({
        name: formatModelName(model),
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (chartData.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 16, color: 'var(--text-secondary)' }}>Model Breakdown</h3>
        <div style={{ color: 'var(--text-secondary)' }}>No model data available</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16, color: 'var(--text-secondary)' }}>Model Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(v) => formatNumber(v)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
