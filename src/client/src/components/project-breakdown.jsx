import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatProjectName, formatNumber, formatCurrency } from '../utils/format.js';

export default function ProjectBreakdown({ filters, onProjectSelect }) {
  const [hover, setHover] = useState(null);
  const { data: projects, loading } = useApi('/api/projects');

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!projects || projects.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No project data yet</div>;
  }

  const chartData = projects.slice(0, 10).map((p) => ({
    name: p.project?.split('/').pop() || 'All',
    fullName: p.project,
    Messages: p.total_messages,
  }));

  return (
    <div>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Project Breakdown</h3>
      <div style={{ position: 'relative' }}>
      {hover && (
        <div style={{
          position: 'absolute',
          left: hover.x + 12,
          top: hover.y - 14,
          background: '#ffffff',
          border: '2px solid #000000',
          padding: '6px 12px',
          fontSize: 16,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {hover.text}
        </div>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 50 }}>
          <defs>
            <pattern id="barDither" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="#000000" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="#ffffff" strokeWidth="2" />
            </pattern>
          </defs>
          <XAxis type="number" stroke="var(--text-secondary)" fontSize={13} interval={0} tickFormatter={formatNumber} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--text-secondary)"
            fontSize={13}
            interval={0}
            width={160}
            tick={({ x, y, payload, index }) => (
              <g
                onMouseEnter={(e) => {
                  const rect = e.target.closest('svg').getBoundingClientRect();
                  setHover({ text: chartData[index]?.fullName || payload.value, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => onProjectSelect(chartData[index]?.fullName)}
              >
                <rect x={x - 158} y={y - 10} width={156} height={20} fill="transparent" style={{ cursor: 'pointer' }} />
                <text
                  x={x - 4}
                  y={y}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  fontSize={13}
                  dominantBaseline="central"
                  fontFamily="'Courier New', Courier, monospace"
                  fontWeight={800}
                  style={{ cursor: 'pointer' }}
                >
                  {payload.value}
                </text>
              </g>
            )}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '2px solid #000000', borderRadius: 0, fontSize: 16 }}
            formatter={(v) => formatNumber(v)}
          />
          <Bar
            dataKey="Messages"
            fill="url(#barDither)"
            stroke="#000000"
            strokeWidth={1}
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            isAnimationActive={false}
            onClick={(data) => onProjectSelect(data.fullName)}
          >
            <LabelList
              dataKey="Messages"
              position="insideLeft"
              fontSize={12}
              fontWeight={700}
              formatter={(v) => formatNumber(v)}
              content={({ x, y, width, height, value }) => (
                <text
                  x={x + width + 6}
                  y={y + height / 2}
                  fill="var(--text-primary)"
                  fontSize={12}
                  fontWeight={700}
                  dominantBaseline="central"
                >
                  {formatNumber(value)}
                </text>
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Project</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Messages</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Sessions</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.project}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => onProjectSelect(p.project)}
              >
                <td style={{ padding: '6px 8px' }}>{formatProjectName(p.project)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatNumber(p.total_messages)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatNumber(p.total_sessions)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatCurrency(p.total_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
