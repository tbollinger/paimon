import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatProjectName, formatNumber, formatCurrency } from '../utils/format.js';

export default function ProjectBreakdown({ filters, onProjectSelect }) {
  const { data: projects, loading } = useApi('/api/projects');

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!projects || projects.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No project data yet</div>;
  }

  const chartData = projects.slice(0, 10).map((p) => ({
    name: formatProjectName(p.project),
    fullName: p.project,
    Messages: p.total_messages,
  }));

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16, color: 'var(--text-secondary)' }}>Project Breakdown</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} tickFormatter={formatNumber} />
          <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={11} width={100} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            formatter={(v) => formatNumber(v)}
          />
          <Bar
            dataKey="Messages"
            fill="var(--accent)"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(data) => onProjectSelect(data.fullName)}
          />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
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
