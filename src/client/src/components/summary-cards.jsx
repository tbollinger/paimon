import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/use-api.js';
import { formatNumber, formatCurrency, percentChange } from '../utils/format.js';

function SummaryCard({ title, value, sparkData, changePercent }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {sparkData && sparkData.length > 1 && (
          <ResponsiveContainer width="60%" height={30}>
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {changePercent != null && (
          <span style={{
            fontSize: 12,
            color: changePercent >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function SummaryCards({ filters }) {
  const { data: stats } = useApi('/api/stats/daily', {
    params: { from: filters.from, to: filters.to, project: filters.project || 'all' },
  });

  const summary = useMemo(() => {
    if (!stats || stats.length === 0) {
      return {
        messages: 0, sessions: 0, toolCalls: 0, cost: 0,
        msgSpark: [], sessSpark: [], toolSpark: [], costSpark: [],
        msgChange: null, sessChange: null, toolChange: null, costChange: null,
      };
    }

    const sorted = [...stats].sort((a, b) => a.date.localeCompare(b.date));
    const messages = sorted.reduce((s, r) => s + r.message_count, 0);
    const sessions = sorted.reduce((s, r) => s + r.session_count, 0);
    const toolCalls = sorted.reduce((s, r) => s + r.tool_call_count, 0);
    const cost = sorted.reduce((s, r) => s + r.estimated_cost_usd, 0);

    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);

    const prevMsg = firstHalf.reduce((s, r) => s + r.message_count, 0);
    const currMsg = secondHalf.reduce((s, r) => s + r.message_count, 0);

    return {
      messages, sessions, toolCalls, cost,
      msgSpark: sorted.map((r) => ({ v: r.message_count })),
      sessSpark: sorted.map((r) => ({ v: r.session_count })),
      toolSpark: sorted.map((r) => ({ v: r.tool_call_count })),
      costSpark: sorted.map((r) => ({ v: r.estimated_cost_usd })),
      msgChange: percentChange(currMsg, prevMsg),
      sessChange: percentChange(
        secondHalf.reduce((s, r) => s + r.session_count, 0),
        firstHalf.reduce((s, r) => s + r.session_count, 0),
      ),
      toolChange: percentChange(
        secondHalf.reduce((s, r) => s + r.tool_call_count, 0),
        firstHalf.reduce((s, r) => s + r.tool_call_count, 0),
      ),
      costChange: percentChange(
        secondHalf.reduce((s, r) => s + r.estimated_cost_usd, 0),
        firstHalf.reduce((s, r) => s + r.estimated_cost_usd, 0),
      ),
    };
  }, [stats]);

  return (
    <>
      <SummaryCard title="Total Messages" value={formatNumber(summary.messages)} sparkData={summary.msgSpark} changePercent={summary.msgChange} />
      <SummaryCard title="Total Sessions" value={formatNumber(summary.sessions)} sparkData={summary.sessSpark} changePercent={summary.sessChange} />
      <SummaryCard title="Tool Calls" value={formatNumber(summary.toolCalls)} sparkData={summary.toolSpark} changePercent={summary.toolChange} />
      <SummaryCard title="Est. Cost" value={formatCurrency(summary.cost)} sparkData={summary.costSpark} changePercent={summary.costChange} />
    </>
  );
}
