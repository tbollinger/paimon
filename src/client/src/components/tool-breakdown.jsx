import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber } from '../utils/format.js';

const TOOL_LABELS = {
  Read: 'Read',
  Write: 'Write',
  Edit: 'Edit',
  Bash: 'Bash',
  Grep: 'Grep',
  Glob: 'Glob',
  TodoWrite: 'TodoWrite',
  TodoRead: 'TodoRead',
  WebFetch: 'WebFetch',
  WebSearch: 'WebSearch',
  Agent: 'Agent',
};

function labelTool(name) {
  return TOOL_LABELS[name] || name;
}

export default function ToolBreakdown({ filters }) {
  const { data: tools, loading } = useApi('/api/activity/tool-breakdown', {
    params: { from: filters.from, to: filters.to, project: filters.project },
  });

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!tools || tools.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tool Call Breakdown</h3>
        <div style={{ color: 'var(--text-secondary)' }}>No tool call data yet</div>
      </div>
    );
  }

  const totalCalls = tools.reduce((s, t) => s + t.total_calls, 0);
  const chartData = tools.slice(0, 12).map((t) => ({
    name: labelTool(t.tool_name),
    Calls: t.total_calls,
  }));

  return (
    <div>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tool Call Breakdown</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 50 }}>
          <defs>
            <pattern id="toolBarDither" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="#000000" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="#ffffff" strokeWidth="2" />
            </pattern>
          </defs>
          <XAxis type="number" stroke="var(--text-secondary)" fontSize={13} tickFormatter={formatNumber} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--text-secondary)"
            fontSize={13}
            interval={0}
            width={120}
            tick={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 800 }}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '2px solid #000000', borderRadius: 0, fontSize: 16 }}
            formatter={(v) => formatNumber(v)}
          />
          <Bar
            dataKey="Calls"
            fill="url(#toolBarDither)"
            stroke="#000000"
            strokeWidth={1}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="Calls"
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
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Tool</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Calls</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.tool_name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px' }}>{labelTool(t.tool_name)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatNumber(t.total_calls)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{totalCalls > 0 ? ((t.total_calls / totalCalls) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
