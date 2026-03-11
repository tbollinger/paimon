import React from 'react';
import { formatDateTime, formatProjectName, formatNumber } from '../utils/format.js';

export default function SessionDrawer({ session, onClose }) {
  if (!session) return null;

  const prompts = (() => {
    try { return JSON.parse(session.prompts || '[]'); }
    catch { return []; }
  })();

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
      zIndex: 100, overflowY: 'auto', padding: 24,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16 }}>Session Details</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>
          X
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Project</div>
          <div style={{ fontSize: 14 }}>{formatProjectName(session.project)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Started</div>
          <div style={{ fontSize: 14 }}>{formatDateTime(session.started_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Messages</div>
            <div style={{ fontSize: 14 }}>{formatNumber(session.message_count)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Duration</div>
            <div style={{ fontSize: 14 }}>{session.duration_minutes?.toFixed(0) || 0} min</div>
          </div>
        </div>
      </div>

      <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Prompts</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {prompts.map((prompt, i) => (
          <div key={i} style={{
            background: 'var(--bg-primary)', padding: '10px 14px',
            borderRadius: 8, fontSize: 13, lineHeight: 1.5,
            borderLeft: '3px solid var(--accent)',
          }}>
            {prompt}
          </div>
        ))}
        {prompts.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No prompts recorded</div>
        )}
      </div>
    </div>
  );
}
