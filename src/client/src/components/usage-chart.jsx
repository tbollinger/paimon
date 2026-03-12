import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber } from '../utils/format.js';

const SERIES = [
  { key: 'Messages', pattern: 'ditherDense', stroke: '#000000', dash: '' },
  { key: 'Sessions', pattern: 'ditherMedium', stroke: '#000000', dash: '8 4' },
  { key: 'Tool Calls', pattern: 'ditherSparse', stroke: '#000000', dash: '2 4' },
];

export default function UsageChart({ filters }) {
  const endpoint = `/api/stats/${filters.granularity}`;
  const { data: stats, loading } = useApi(endpoint, {
    params: { from: filters.from, to: filters.to, project: filters.project || 'all' },
  });
  const [hidden, setHidden] = useState({});

  const toggle = (key) => {
    setHidden((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    const sorted = [...stats].sort((a, b) => {
      const aKey = a.date || a.week || a.month;
      const bKey = b.date || b.week || b.month;
      return aKey.localeCompare(bKey);
    });
    const mapped = sorted.map((r) => ({
      label: r.date || r.week || r.month,
      Messages: r.message_count,
      Sessions: r.session_count,
      'Tool Calls': r.tool_call_count,
    }));
    if (mapped.length === 1) {
      mapped.push({ ...mapped[0], label: mapped[0].label + ' ' });
    }
    return mapped;
  }, [stats]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Usage Over Time</h3>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {SERIES.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            className={hidden[s.key] ? '' : 'active'}
            style={{
              opacity: hidden[s.key] ? 0.5 : 1,
              textDecoration: hidden[s.key] ? 'line-through' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            {s.key}
            <svg width="20" height="20" style={{ flexShrink: 0 }}>
              <defs>
                <pattern id={`swatch-${s.pattern}`} patternUnits="userSpaceOnUse" width={s.pattern === 'ditherDense' ? 4 : s.pattern === 'ditherMedium' ? 6 : 8} height={s.pattern === 'ditherDense' ? 4 : s.pattern === 'ditherMedium' ? 6 : 8}>
                  {s.pattern === 'ditherDense' && (<><rect width="4" height="4" fill="#ffffff" /><circle cx="1" cy="1" r="1" fill="#000000" /><circle cx="3" cy="3" r="1" fill="#000000" /></>)}
                  {s.pattern === 'ditherMedium' && (<><rect width="6" height="6" fill="#ffffff" /><circle cx="1" cy="1" r="1" fill="#000000" /><circle cx="4" cy="4" r="1" fill="#000000" /></>)}
                  {s.pattern === 'ditherSparse' && (<><rect width="8" height="8" fill="#ffffff" /><line x1="0" y1="8" x2="8" y2="0" stroke="#000000" strokeWidth="1" /></>)}
                </pattern>
              </defs>
              <rect width="20" height="20" rx="3" fill={`url(#swatch-${s.pattern})`} stroke="#000000" strokeWidth="1.5" />
            </svg>
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData}>
          <defs>
            {/* Dense dither: 3px dots */}
            <pattern id="ditherDense" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill="#ffffff" />
              <circle cx="1" cy="1" r="1" fill="#000000" />
              <circle cx="3" cy="3" r="1" fill="#000000" />
            </pattern>
            {/* Medium dither: 5px dots */}
            <pattern id="ditherMedium" patternUnits="userSpaceOnUse" width="6" height="6">
              <rect width="6" height="6" fill="#ffffff" />
              <circle cx="1" cy="1" r="1" fill="#000000" />
              <circle cx="4" cy="4" r="1" fill="#000000" />
            </pattern>
            {/* Sparse dither: diagonal lines */}
            <pattern id="ditherSparse" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="#ffffff" />
              <line x1="0" y1="8" x2="8" y2="0" stroke="#000000" strokeWidth="1" />
            </pattern>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#cccccc" />
          <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={14} tickLine={false} />
          <YAxis stroke="var(--text-secondary)" fontSize={14} tickLine={false} tickFormatter={formatNumber} />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '2px solid #000000', borderRadius: 0, fontSize: 16 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            formatter={(v) => formatNumber(v)}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.stroke}
              strokeDasharray={s.dash}
              fill={`url(#${s.pattern})`}
              strokeWidth={2.5}
              hide={!!hidden[s.key]}
              animationDuration={500}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
