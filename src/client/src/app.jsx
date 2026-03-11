import React, { useState } from 'react';
import TopBar from './components/topbar.jsx';
import BudgetAlert from './components/budget-alert.jsx';
import FilterBar from './components/filter-bar.jsx';
import SummaryCards from './components/summary-cards.jsx';
import UsageChart from './components/usage-chart.jsx';
import ProjectBreakdown from './components/project-breakdown.jsx';
import ModelBreakdown from './components/model-breakdown.jsx';
import SessionDrawer from './components/session-drawer.jsx';
import { useApi } from './hooks/use-api.js';
import { formatDateTime, formatProjectName, formatNumber } from './utils/format.js';

export default function App() {
  const [filters, setFilters] = useState({
    from: null,
    to: null,
    project: null,
    model: null,
    granularity: 'daily',
  });
  const [selectedSession, setSelectedSession] = useState(null);

  const { data: sessionsData } = useApi('/api/sessions', {
    params: { from: filters.from, to: filters.to, project: filters.project, limit: '20' },
  });

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="dashboard">
      <TopBar />
      <BudgetAlert />
      <FilterBar filters={filters} onFilterChange={updateFilter} />
      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <SummaryCards filters={filters} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="card">
          <UsageChart filters={filters} />
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <ProjectBreakdown filters={filters} onProjectSelect={(p) => updateFilter('project', p)} />
        </div>
        <div className="card">
          <ModelBreakdown filters={filters} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Recent Sessions</h3>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Project</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Messages</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {(sessionsData || []).map((s) => (
              <tr
                key={s.id}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedSession(s)}
              >
                <td style={{ padding: '6px 8px' }}>{formatDateTime(s.started_at)}</td>
                <td style={{ padding: '6px 8px' }}>{formatProjectName(s.project)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatNumber(s.message_count)}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{s.duration_minutes?.toFixed(0) || 0}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedSession && (
        <SessionDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
