import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber, formatCurrency } from '../utils/format.js';

const PIE_PATTERNS = [
  { id: 'pieSolid', label: 'solid' },
  { id: 'pieHatch', label: 'hatched' },
  { id: 'pieDots', label: 'dotted' },
  { id: 'pieCross', label: 'cross' },
  { id: 'pieVert', label: 'vertical' },
  { id: 'pieHoriz', label: 'horizontal' },
];

function DitherDefs() {
  return (
    <defs>
      <pattern id="pieSolid" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="#000000" />
      </pattern>
      <pattern id="pieHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#ffffff" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#000000" strokeWidth="2" />
      </pattern>
      <pattern id="pieDots" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill="#ffffff" />
        <circle cx="2.5" cy="2.5" r="1.5" fill="#000000" />
      </pattern>
      <pattern id="pieCross" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#ffffff" />
        <line x1="0" y1="3" x2="6" y2="3" stroke="#000000" strokeWidth="1" />
        <line x1="3" y1="0" x2="3" y2="6" stroke="#000000" strokeWidth="1" />
      </pattern>
      <pattern id="pieVert" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#ffffff" />
        <line x1="3" y1="0" x2="3" y2="6" stroke="#000000" strokeWidth="2" />
      </pattern>
      <pattern id="pieHoriz" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="#ffffff" />
        <line x1="0" y1="3" x2="6" y2="3" stroke="#000000" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

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

  const { chartData, tableData } = useMemo(() => {
    if (!stats) return { chartData: [], tableData: [] };
    const byModel = new Map();
    for (const row of stats) {
      const model = row.model || 'unknown';
      const existing = byModel.get(model) || { messages: 0, cost: 0 };
      byModel.set(model, {
        messages: existing.messages + row.message_count,
        cost: existing.cost + row.estimated_cost_usd,
      });
    }
    const entries = Array.from(byModel.entries())
      .filter(([, d]) => d.cost > 0 || d.messages > 0)
      .sort((a, b) => b[1].cost - a[1].cost);

    return {
      chartData: entries.map(([model, d]) => ({
        name: formatModelName(model),
        value: d.cost,
      })),
      tableData: entries.map(([model, d]) => ({
        name: formatModelName(model),
        messages: d.messages,
        cost: d.cost,
      })),
    };
  }, [stats]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (chartData.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Model Breakdown</h3>
        <div style={{ color: 'var(--text-secondary)' }}>No model data available</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Model Breakdown</h3>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <DitherDefs />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            stroke="#000000"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={`url(#${PIE_PATTERNS[index % PIE_PATTERNS.length].id})`} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '2px solid #000000',
              borderRadius: 0,
              fontSize: 16,
            }}
            formatter={(v) => formatCurrency(v)}
          />
          <Legend
            wrapperStyle={{ fontSize: 16 }}
            iconSize={20}
          />
        </PieChart>
      </ResponsiveContainer>
      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px' }}>Model</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Messages</th>
            <th style={{ textAlign: 'right', padding: '6px 8px' }}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.name} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px' }}>{row.name}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatNumber(row.messages)}</td>
              <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatCurrency(row.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
