import React, { useState } from 'react';
import TopBar from './components/topbar.jsx';
import BudgetAlert from './components/budget-alert.jsx';
import FilterBar from './components/filter-bar.jsx';
import SummaryCards from './components/summary-cards.jsx';
import UsageChart from './components/usage-chart.jsx';
import ProjectBreakdown from './components/project-breakdown.jsx';
import ModelBreakdown from './components/model-breakdown.jsx';
import SessionDrawer from './components/session-drawer.jsx';

export default function App() {
  const [filters, setFilters] = useState({
    from: null,
    to: null,
    project: null,
    model: null,
    granularity: 'daily',
  });
  const [selectedSession, setSelectedSession] = useState(null);

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
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
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
      {selectedSession && (
        <SessionDrawer session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
