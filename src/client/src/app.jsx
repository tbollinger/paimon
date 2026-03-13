import React, { useState, useCallback, useRef, useEffect } from 'react';
import TopBar from './components/topbar.jsx';
import BudgetAlert from './components/budget-alert.jsx';
import FilterBar from './components/filter-bar.jsx';
import SummaryCards from './components/summary-cards.jsx';
import UsageChart from './components/usage-chart.jsx';
import ProjectBreakdown from './components/project-breakdown.jsx';
import ModelBreakdown from './components/model-breakdown.jsx';
import SessionDrawer from './components/session-drawer.jsx';
import ToolBreakdown from './components/tool-breakdown.jsx';
import ActivityHeatmap from './components/activity-heatmap.jsx';
import ActivityCalendar from './components/activity-calendar.jsx';
import ProjectTimeline from './components/project-timeline.jsx';
import { useApi } from './hooks/use-api.js';
import { formatDateTime, formatProjectName, formatNumber } from './utils/format.js';

function CollapsibleSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 16 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          userSelect: 'none',
          marginBottom: open ? 0 : 0,
        }}
      >
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--text-secondary)',
          display: 'inline-block',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          &#9654;
        </span>
        <span style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {title}
        </span>
      </div>
      {open && children}
    </div>
  );
}

function CopyLink({ sessionId, withResume }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const short = sessionId.length > 8 ? `${sessionId.slice(0, 4)}...${sessionId.slice(-4)}` : sessionId;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(withResume ? `claude --resume ${sessionId}` : sessionId);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <svg onClick={handleCopy} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--text-secondary)" strokeWidth="2" style={{ verticalAlign: 'middle', flexShrink: 0, cursor: 'pointer' }}><rect x="5" y="5" width="9" height="9" rx="1" /><path d="M5 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v2" /></svg>
      <span
        onClick={handleCopy}
        title={sessionId}
        style={{
          color: copied ? 'var(--success)' : 'var(--chart-2)',
          cursor: 'pointer',
          userSelect: 'none', textDecoration: copied ? 'none' : 'underline',
          fontWeight: 700, fontFamily: 'monospace',
        }}
      >
        {copied ? 'Copied!' : short}
      </span>
    </span>
  );
}

export default function App() {
  const [filters, setFilters] = useState({
    from: null,
    to: null,
    project: null,
    model: null,
    granularity: 'daily',
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [copyWithResume, setCopyWithResume] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    fetch('/api/config/theme')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && !json.data.dithered_background) {
          document.body.style.backgroundImage = 'none';
        }
      })
      .catch(() => {});
  }, []);

  const { data: sessionsData, refetch: refetchSessions } = useApi('/api/sessions', {
    params: { from: filters.from, to: filters.to, project: filters.project, limit: '20', show_hidden: showHidden ? '1' : '0' },
  });

  const toggleHidden = useCallback(async (sessionId, hidden) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/hidden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (res.ok) refetchSessions();
    } catch {
      // silent fail
    }
  }, [refetchSessions]);

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
      <CollapsibleSection title="Breakdowns">
        <div className="grid grid-2" style={{ marginTop: 8 }}>
          <div className="card">
            <ProjectBreakdown filters={filters} onProjectSelect={(p) => updateFilter('project', p)} />
          </div>
          <div className="card">
            <ModelBreakdown filters={filters} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="card">
            <ToolBreakdown filters={filters} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Activity">
        <div style={{ marginTop: 8 }}>
          <div className="card">
            <ActivityHeatmap filters={filters} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="card">
            <ActivityCalendar filters={filters} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="card">
            <ProjectTimeline filters={filters} />
          </div>
        </div>
      </CollapsibleSection>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 24, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recent Sessions</h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginTop: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                id="copy-resume"
                checked={copyWithResume}
                onChange={(e) => setCopyWithResume(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', margin: 0, marginTop: -1, flexShrink: 0 }}
              />
              <label htmlFor="copy-resume" style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 400, userSelect: 'none' }}>
                Add <code style={{ fontSize: 12 }}>claude --resume</code> to clipboard when copying
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                id="show-hidden"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', margin: 0, marginTop: -1, flexShrink: 0 }}
              />
              <label htmlFor="show-hidden" style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 400, userSelect: 'none' }}>
                Show hidden sessions
              </label>
            </div>
          </div>
        </div>
        <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Project</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Session</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Name</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Messages</th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Duration</th>
              <th style={{ textAlign: 'center', padding: '6px 8px', width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {(sessionsData || []).map((s) => (
              <tr
                key={s.id}
                style={{ borderBottom: '1px solid var(--border)', opacity: s.hidden ? 0.45 : 1 }}
              >
                <td style={{ padding: '6px 8px' }}>{formatDateTime(s.started_at)}</td>
                <td style={{ padding: '6px 8px' }}>{formatProjectName(s.project)}</td>
                <td style={{ padding: '6px 8px', fontWeight: 400 }}>
                  <CopyLink sessionId={s.id} withResume={copyWithResume} />
                </td>
                <td style={{ padding: '6px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                  {s.session_name || (() => { try { const p = JSON.parse(s.prompts || '[]'); return p[0] || ''; } catch { return ''; } })()}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                  <span
                    onClick={() => setSelectedSession(s)}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {formatNumber(s.message_count)}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  </span>
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{s.duration_minutes?.toFixed(0) || 0}m</td>
                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); toggleHidden(s.id, !s.hidden); }}
                    title={s.hidden ? 'Unhide session' : 'Hide session'}
                    style={{ cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', opacity: 0.6, userSelect: 'none' }}
                  >
                    {s.hidden ? '\u25C9' : '\u25CE'}
                  </span>
                </td>
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
