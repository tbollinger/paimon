import React, { useState } from 'react';
import { useApi } from '../hooks/use-api.js';

const COLS = 24;
const ROW_HEIGHT = 32;
const ROW_GAP = 1;
const COL_GAP = 1;
const LABEL_WIDTH = 40;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

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
  if (ratio < 0.1) return 1;
  if (ratio < 0.3) return 2;
  if (ratio < 0.6) return 3;
  return 4;
}

export default function ActivityHeatmap({ filters }) {
  const [tooltip, setTooltip] = useState(null);
  const { data: heatmap, loading } = useApi('/api/activity/heatmap', {
    params: { from: filters.from, to: filters.to, project: filters.project },
  });

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!heatmap || heatmap.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activity by Time of Day</h3>
        <div style={{ color: 'var(--text-secondary)' }}>No activity data yet</div>
      </div>
    );
  }

  const maxMessages = Math.max(...heatmap.map((c) => c.messages), 1);

  return (
    <div>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activity by Time of Day</h3>
      <div style={{ position: 'relative' }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', marginBottom: 2 }}>
          <div style={{ flexShrink: 0, width: LABEL_WIDTH }} />
          <div style={{ display: 'flex', flex: 1, gap: COL_GAP }}>
            {Array.from({ length: COLS }, (_, h) => (
              <div
                key={h}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                {HOUR_LABELS.includes(h) ? h : ''}
              </div>
            ))}
          </div>
        </div>
        {/* Day rows */}
        {DAY_LABELS.map((dayLabel, dayIndex) => (
          <div key={dayLabel} style={{ display: 'flex', alignItems: 'center', marginBottom: ROW_GAP }}>
            <div style={{
              flexShrink: 0,
              width: LABEL_WIDTH,
              paddingRight: 6,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--text-secondary)',
              textAlign: 'right',
            }}>
              {dayLabel}
            </div>
            <div style={{ display: 'flex', flex: 1, gap: COL_GAP, height: ROW_HEIGHT }}>
              {Array.from({ length: COLS }, (_, hourIndex) => {
                const cell = heatmap.find((c) => c.day === dayIndex && c.hour === hourIndex) || { messages: 0, sessions: 0 };
                const level = intensityLevel(cell.messages, maxMessages);
                return (
                  <div
                    key={hourIndex}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      ...DITHER_BGS[level],
                      border: '0.5px solid #000',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        text: `${dayLabel} ${hourIndex}:00 - ${cell.messages} msgs, ${cell.sessions} sessions`,
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
            top: tooltip.y - 32,
            transform: 'translateX(-50%)',
            background: '#ffffff',
            border: '2px solid #000000',
            padding: '4px 10px',
            fontSize: 13,
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
          <div key={level} style={{ width: 14, height: 14, ...DITHER_BGS[level], border: '0.5px solid #000', borderRadius: 2 }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
