import React from 'react';
import { useApi } from '../hooks/use-api.js';
import { formatProjectName } from '../utils/format.js';

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function getDateRange(days) {
  const to = new Date().toISOString().split('T')[0];
  if (days === 0) return { from: to, to };
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to };
}

export default function FilterBar({ filters, onFilterChange }) {
  const { data: projects } = useApi('/api/projects', { refreshInterval: 60000 });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={filters.from === getDateRange(preset.days).from ? 'active' : ''}
            onClick={() => {
              const range = getDateRange(preset.days);
              onFilterChange('from', range.from);
              onFilterChange('to', range.to);
            }}
          >
            {preset.label}
          </button>
        ))}
        <button
          className={!filters.from ? 'active' : ''}
          onClick={() => { onFilterChange('from', null); onFilterChange('to', null); }}
        >
          All
        </button>
      </div>

      <input
        type="date"
        value={filters.from || ''}
        onChange={(e) => onFilterChange('from', e.target.value || null)}
        style={{ width: 140 }}
      />
      <span style={{ color: 'var(--text-secondary)' }}>to</span>
      <input
        type="date"
        value={filters.to || ''}
        onChange={(e) => onFilterChange('to', e.target.value || null)}
        style={{ width: 140 }}
      />

      <select
        value={filters.project || ''}
        onChange={(e) => onFilterChange('project', e.target.value || null)}
      >
        <option value="">All Projects</option>
        {(projects || []).map((p) => (
          <option key={p.project} value={p.project}>
            {formatProjectName(p.project)}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: 4 }}>
        {['daily', 'weekly', 'monthly'].map((g) => (
          <button
            key={g}
            className={filters.granularity === g ? 'active' : ''}
            onClick={() => onFilterChange('granularity', g)}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
