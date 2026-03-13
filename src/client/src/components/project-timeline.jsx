import React, { useMemo, useState } from 'react';
import { useApi } from '../hooks/use-api.js';
import { formatProjectName } from '../utils/format.js';

const ROW_HEIGHT = 22;
const ROW_GAP = 1;

function makeDitherUrl(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const DITHER_BGS = [
  { background: '#ffffff' },
  { background: makeDitherUrl('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#fff"/><circle cx="4" cy="4" r="1" fill="#000"/></svg>') },
  { background: makeDitherUrl('<svg xmlns="http://www.w3.org/2000/svg" width="6" height="6"><rect width="6" height="6" fill="#fff"/><circle cx="1" cy="1" r="1" fill="#000"/><circle cx="4" cy="4" r="1" fill="#000"/></svg>') },
  { background: makeDitherUrl('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#fff"/><circle cx="1" cy="1" r="1" fill="#000"/><circle cx="3" cy="3" r="1" fill="#000"/></svg>') },
  { background: '#000000' },
];

function intensityLevel(value, max) {
  if (!value || max === 0) return 0;
  const ratio = value / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.6) return 3;
  return 4;
}

export default function ProjectTimeline({ filters }) {
  const [tooltip, setTooltip] = useState(null);
  const [granularity, setGranularity] = useState('daily');

  const { data: timeline, loading } = useApi('/api/activity/project-timeline', {
    params: { from: filters.from, to: filters.to, granularity },
  });

  const { projects, allPeriods, maxMessages, gridData } = useMemo(() => {
    if (!timeline || timeline.length === 0) return { projects: [], allPeriods: [], maxMessages: 0, gridData: new Map() };

    const periodSet = new Set();
    let mx = 0;
    const grid = new Map();

    for (const proj of timeline) {
      for (const p of proj.periods) {
        periodSet.add(p.period);
        const key = `${proj.project}|${p.period}`;
        grid.set(key, p.messages);
        if (p.messages > mx) mx = p.messages;
      }
    }

    const periods = [...periodSet].sort();
    const maxPeriods = granularity === 'daily' ? 60 : 26;
    const limitedPeriods = periods.slice(-maxPeriods);
    const sorted = [...timeline]
      .map((p) => ({
        ...p,
        total: p.periods.reduce((s, pd) => s + pd.messages, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    return { projects: sorted, allPeriods: limitedPeriods, maxMessages: mx, gridData: grid };
  }, [timeline, granularity]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;

  if (projects.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Project Activity Timeline</h3>
        <div style={{ color: 'var(--text-secondary)' }}>No project activity data yet</div>
      </div>
    );
  }

  // Show abbreviated period labels (every Nth)
  const labelEvery = granularity === 'daily' ? 7 : 4;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 24, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Project Activity Timeline</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={granularity === 'daily' ? 'active' : ''}
            onClick={() => setGranularity('daily')}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            Daily
          </button>
          <button
            className={granularity === 'weekly' ? 'active' : ''}
            onClick={() => setGranularity('weekly')}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            Weekly
          </button>
          <button
            className={granularity === 'monthly' ? 'active' : ''}
            onClick={() => setGranularity('monthly')}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            Monthly
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', position: 'relative' }}>
        {/* Header row with period labels */}
        <div style={{ display: 'flex', marginBottom: 2 }}>
          <div style={{ flexShrink: 0, width: 200 }} />
          <div style={{ display: 'flex', flex: 1, gap: ROW_GAP }}>
            {allPeriods.map((period, i) => {
              let label = '';
              if (i % labelEvery === 0) {
                if (granularity === 'monthly') {
                  label = period;
                } else if (granularity === 'weekly') {
                  label = period.replace('W0', 'W').slice(2);
                } else {
                  label = period.slice(5); // MM-DD
                }
              }
              return (
                <div
                  key={period}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
        {/* Project rows */}
        {projects.map((proj) => (
          <div key={proj.project} style={{ display: 'flex', alignItems: 'center', marginBottom: ROW_GAP }}>
            <div
              title={proj.project}
              style={{
                flexShrink: 0,
                width: 200,
                paddingRight: 10,
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              {formatProjectName(proj.project)}
            </div>
            <div style={{ display: 'flex', flex: 1, gap: ROW_GAP, height: ROW_HEIGHT }}>
              {allPeriods.map((period) => {
                const key = `${proj.project}|${period}`;
                const val = gridData.get(key) || 0;
                const level = intensityLevel(val, maxMessages);
                return (
                  <div
                    key={period}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      ...DITHER_BGS[level],
                      border: '0.5px solid #000',
                      borderRadius: 2,
                      cursor: val > 0 ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (val === 0) return;
                      const rect = e.target.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        text: `${formatProjectName(proj.project)} | ${period}: ${val} messages`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 30,
            transform: 'translateX(-50%)',
            background: '#ffffff',
            border: '2px solid #000000',
            padding: '3px 8px',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            style={{
              width: 12,
              height: 12,
              ...DITHER_BGS[level],
              border: '0.5px solid #000',
              borderRadius: 2,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
