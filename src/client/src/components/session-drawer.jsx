import React, { useState, useEffect } from 'react';
import { formatDateTime, formatProjectName, formatNumber } from '../utils/format.js';

const MAX_LINES = 6;
const LINE_HEIGHT = 14 * 1.6; // fontSize * lineHeight
const COLLAPSED_HEIGHT = MAX_LINES * LINE_HEIGHT;

function ExpandableResponse({ text, forceExpanded }) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = forceExpanded || expanded;
  const lineCount = text.split('\n').length;
  const isLong = lineCount > MAX_LINES || text.length > 300;

  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '3px solid var(--border)', borderRadius: 12,
      fontSize: 14, lineHeight: 1.6, boxShadow: '3px 3px 0 var(--border)',
      overflow: 'hidden', position: 'relative',
      display: 'flex',
    }}>
      {/* Dithered stripe: diagonal hatch */}
      <div style={{
        width: 20, flexShrink: 0,
        backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 2px, #fff 2px, #fff 6px)',
        borderRight: '2px solid var(--border)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Claude</span>
      </div>

      <div style={{
        padding: '4px 16px 16px',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 400,
        maxHeight: !isExpanded && isLong ? COLLAPSED_HEIGHT : 'none',
        overflow: 'hidden',
        userSelect: 'text',
      }}>
        {text}
      </div>

      {isLong && !isExpanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            borderTop: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4px 0', cursor: 'pointer',
            background: 'var(--bg-primary)',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>&#9660;</span>
        </div>
      )}

      {isLong && isExpanded && (
        <div
          onClick={() => { setExpanded(false); }}
          style={{
            borderTop: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4px 0', cursor: 'pointer',
            background: 'var(--bg-primary)',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>&#9650;</span>
        </div>
      )}
      </div>
    </div>
  );
}

export default function SessionDrawer({ session, onClose }) {
  if (!session) return null;

  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const sessionId = session.id;
  const isAutoSession = sessionId && sessionId.startsWith('auto-');

  useEffect(() => {
    if (!sessionId || isAutoSession) {
      setConversation(null);
      return;
    }

    setLoading(true);
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}/conversation`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setConversation(json.data);
        } else {
          setConversation(null);
        }
      })
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [sessionId, isAutoSession]);

  // Fall back to stored prompts if no conversation data
  const prompts = (() => {
    try { return JSON.parse(session.prompts || '[]'); }
    catch { return []; }
  })();

  const hasConversation = conversation && conversation.length > 0;

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 200,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '5vh', left: '10vw', right: '10vw', bottom: '5vh',
        background: 'var(--bg-secondary)',
        border: '4px solid var(--border)', borderRadius: 16,
        zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '8px 8px 0 var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '3px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <h3 style={{ fontSize: 20, textTransform: 'uppercase' }}>Session Details</h3>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {formatProjectName(session.project)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {formatDateTime(session.started_at)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {formatNumber(session.message_count)} msgs
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {session.duration_minutes?.toFixed(0) || 0} min
            </span>
            {hasConversation && (
              <button
                onClick={() => setAllExpanded((prev) => !prev)}
                style={{ fontSize: 13, padding: '4px 10px' }}
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>Press Esc to close</span>
            <button onClick={onClose} style={{ fontSize: 18, padding: '4px 12px' }}>
              X
            </button>
          </div>
        </div>

        {/* Conversation body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Loading conversation...</div>
          )}

          {!loading && hasConversation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '100%' }}>
              {conversation.map((turn, i) => (
                turn.role === 'assistant' ? (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '5%', paddingRight: '5%' }}>
                    <div style={{ width: '75%' }}>
                      <ExpandableResponse text={turn.text} index={i} forceExpanded={allExpanded} />
                    </div>
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: '5%', paddingRight: '5%' }}>
                    <div style={{
                      width: '75%',
                      background: '#ffffff',
                      border: '3px solid var(--border)', borderRadius: 12,
                      fontSize: 14, lineHeight: 1.6,
                      fontWeight: 700, boxShadow: '3px 3px 0 var(--border)',
                      display: 'flex', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: 20, flexShrink: 0,
                        background: '#000000',
                        borderRight: '2px solid var(--border)',
                      }} />
                      <div style={{ padding: '10px 16px', flex: 1 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                          {turn.role === 'user' ? 'You' : 'Unknown'}
                        </span>
                        {turn.text}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {!loading && !hasConversation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900, margin: '0 auto' }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {isAutoSession
                  ? 'Conversation data not available for auto-grouped sessions.'
                  : 'Session file not found. Showing stored prompts.'}
              </div>
              {prompts.map((prompt, i) => (
                <div key={i} style={{
                  background: '#ffffff',
                  border: '3px solid var(--border)', borderRadius: 12,
                  fontSize: 14, lineHeight: 1.6,
                  fontWeight: 700, boxShadow: '3px 3px 0 var(--border)',
                  display: 'flex', overflow: 'hidden',
                }}>
                  <div style={{
                    width: 20, flexShrink: 0,
                    background: '#000000',
                    borderRight: '2px solid var(--border)',
                  }} />
                  <div style={{ padding: '10px 16px', flex: 1 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>You</span>
                    {prompt}
                  </div>
                </div>
              ))}
              {prompts.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>No prompts recorded</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
