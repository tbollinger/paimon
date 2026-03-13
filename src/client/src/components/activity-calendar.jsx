import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useApi } from '../hooks/use-api.js';

const WEEKS = 53;
const ROWS = 7;
const LABEL_WIDTH = 32;
const HEADER_HEIGHT = 14;
const ROW_GAP = 1;
const COL_GAP = 1;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export default function ActivityCalendar({ filters }) {
  const [tooltip, setTooltip] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const { data: calData, loading } = useApi('/api/activity/calendar', {
    params: { from: filters.from || defaultFrom, to: filters.to, project: filters.project },
  });

  const { grid, weekColumns, monthLabels, maxVal, currentStreak, longestStreak, totalDays } = useMemo(() => {
    if (!calData) return { grid: [], weekColumns: [], monthLabels: [], maxVal: 0, currentStreak: 0, longestStreak: 0, totalDays: 0 };

    const dataMap = new Map();
    for (const row of calData) {
      dataMap.set(row.date, row.messages || 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1) - dayOfWeek);

    const cells = [];
    const labels = [];
    const cols = Array.from({ length: WEEKS }, () => []);
    let lastMonth = -1;
    let mxVal = 0;

    const d = new Date(startDate);
    for (let week = 0; week < WEEKS; week++) {
      for (let dow = 0; dow < 7; dow++) {
        const dateStr = d.toISOString().split('T')[0];
        const val = dataMap.get(dateStr) || 0;
        if (val > mxVal) mxVal = val;
        const cell = { week, dow, date: dateStr, value: val, future: d > today };
        cells.push(cell);
        cols[week].push(cell);

        if (dow === 0 && d.getMonth() !== lastMonth) {
          labels.push({ week, month: MONTH_NAMES[d.getMonth()] });
          lastMonth = d.getMonth();
        }

        d.setDate(d.getDate() + 1);
      }
    }

    let curStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const sortedDates = [];
    const checker = new Date(startDate);
    while (checker <= today) {
      sortedDates.push(checker.toISOString().split('T')[0]);
      checker.setDate(checker.getDate() + 1);
    }

    for (const dateStr of sortedDates) {
      if ((dataMap.get(dateStr) || 0) > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      if ((dataMap.get(sortedDates[i]) || 0) > 0) {
        curStreak++;
      } else {
        break;
      }
    }

    const activeDays = [...dataMap.values()].filter((v) => v > 0).length;

    return { grid: cells, weekColumns: cols, monthLabels: labels, maxVal: mxVal, currentStreak: curStreak, longestStreak: maxStreak, totalDays: activeDays };
  }, [calData]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;

  // Compute square cell size from container width
  const availableWidth = containerWidth - LABEL_WIDTH;
  const cellSize = containerWidth > 0 ? Math.max(8, (availableWidth - COL_GAP * (WEEKS - 1)) / WEEKS) : 13;

  return (
    <div ref={containerRef}>
      <h3 style={{ fontSize: 24, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Activity Calendar</h3>
      {grid.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)' }}>No activity data yet</div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            {/* Month labels */}
            <div style={{ display: 'flex', marginBottom: 2 }}>
              <div style={{ flexShrink: 0, width: LABEL_WIDTH }} />
              <div style={{ display: 'flex', flex: 1, gap: COL_GAP }}>
                {Array.from({ length: WEEKS }, (_, w) => {
                  const label = monthLabels.find((ml) => ml.week === w);
                  return (
                    <div
                      key={w}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {label ? label.month : ''}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Day rows */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, dow) => {
              return (
                <div key={dow} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: ROW_GAP, height: '20px' }}>
                  <div style={{
                    flexShrink: 0,
                    width: LABEL_WIDTH,
                    height: 20,
                    lineHeight: `24px`,
                    paddingRight: 5,
                    fontSize: 16,
                    fontWeight: 800,
                    color: 'var(--text-secondary)',
                    textAlign: 'right',
                  }}>
                    {dayLabel}
                  </div>
                  <div style={{ display: 'flex', flex: 1, flexGrow:1, gap: COL_GAP, height: cellSize }}>
                    {weekColumns.map((col, w) => {
                      const cell = col[dow];
                      if (!cell || cell.future) {
                        return <div key={w} style={{ flex: 1, minWidth: 0 }} />;
                      }
                      const level = intensityLevel(cell.value, maxVal);
                      return (
                        <div
                          key={w}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            height: 20,
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
                              text: `${cell.date}: ${cell.value} messages`,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div key={level} style={{ width: 12, height: 12, ...DITHER_BGS[level], border: '0.5px solid #000', borderRadius: 2 }} />
              ))}
              <span>More</span>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>{totalDays} active days</span>
              <span>Current streak: {currentStreak}d</span>
              <span>Longest streak: {longestStreak}d</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
