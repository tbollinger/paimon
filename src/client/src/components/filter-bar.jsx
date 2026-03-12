import React, { useRef } from 'react';
import { useApi } from '../hooks/use-api.js';
import { formatProjectName } from '../utils/format.js';

function DateInput({ value, onChange, placeholder }) {
  const ref = useRef(null);
  return (
    <div
      onClick={() => ref.current?.showPicker?.()}
      style={{ position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
    >
      <div style={{
        background: 'var(--bg-secondary)', color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '3px solid var(--border)', borderRadius: 8,
        padding: '3px 8px', fontSize: 14, fontFamily: 'inherit', fontWeight: 800,
        boxShadow: '2px 2px 0 #000000',
        pointerEvents: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {value || placeholder || 'YYYY-MM-DD'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <input
        ref={ref}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer',
        }}
      />
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DateInput
              value={filters.from}
              onChange={(v) => onFilterChange('from', v)}
            />
            <span style={{
              color: 'var(--text-secondary)',
              background: '#ffffff', border: '3px solid #000000', borderRadius: 8,
              padding: '3px 8px', fontSize: 14, fontWeight: 800,
              boxShadow: '2px 2px 0 #000000',
            }}>to</span>
            <DateInput
              value={filters.to}
              onChange={(v) => onFilterChange('to', v)}
            />
          </div>
        </div>

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
    </div>
  );
}
