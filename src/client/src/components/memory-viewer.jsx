import React, { useState, useRef } from 'react';
import { useApi } from '../hooks/use-api.js';

const TYPE_LABELS = {
    user: 'User',
    feedback: 'Feedback',
    project: 'Project',
    reference: 'Reference',
    unknown: 'Other',
};

const TYPE_DITHER = {
    user: 'none',
    feedback: 'repeating-linear-gradient(45deg, #000 0px, #000 2px, #fff 2px, #fff 6px)',
    project: 'radial-gradient(circle, #000 1.5px, #fff 1.5px)',
    reference: 'repeating-linear-gradient(0deg, #000 0px, #000 2px, #fff 2px, #fff 4px)',
    unknown: 'repeating-linear-gradient(135deg, #000 0px, #000 1px, #fff 1px, #fff 3px)',
};

const TYPE_BG = {
    user: '#000',
    feedback: undefined,
    project: undefined,
    reference: undefined,
    unknown: undefined,
};

const TYPE_BG_SIZE = {
    project: '6px 6px',
};

const TYPE_ORDER = ['user', 'feedback', 'project', 'reference', 'unknown'];

function CopyPath({ projectDir, file }) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef(null);
    const fullPath = `~/.claude/projects/${projectDir}/memory/${file}`;

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(fullPath);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            onClick={handleCopy}
            title="Copy path to clipboard"
            style={{
                marginTop: 8,
                fontSize: 11,
                color: copied ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
            }}
        >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="5" y="5" width="9" height="9" rx="1" />
                <path d="M5 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v2" />
            </svg>
            {copied ? 'Copied!' : fullPath}
        </div>
    );
}

export default function MemoryViewer() {
    const { data: memories, loading } = useApi('/api/memory');
    const [expandedFilter, setExpandedFilter] = useState('all');
    const [expandedItems, setExpandedItems] = useState(new Set());

    if (loading) return <p style={{ color: 'var(--text-secondary)', padding: 8 }}>Loading memories...</p>;
    if (!memories || memories.length === 0) {
        return <p style={{ color: 'var(--text-secondary)', padding: 8 }}>No memories found.</p>;
    }

    // Group by type
    const byType = {};
    for (const m of memories) {
        const t = m.type || 'unknown';
        if (!byType[t]) byType[t] = [];
        byType[t].push(m);
    }

    const types = TYPE_ORDER.filter((t) => byType[t]);
    const filtered = expandedFilter === 'all' ? memories : (byType[expandedFilter] || []);

    const toggleItem = (key) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <div>
            <h3 style={{ fontSize: 24, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
                Claude Memory
            </h3>

            {/* Type filter buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                    className={expandedFilter === 'all' ? 'active' : ''}
                    onClick={() => setExpandedFilter('all')}
                    style={{ fontSize: 13 }}
                >
                    All ({memories.length})
                </button>
                {types.map((t) => (
                    <button
                        key={t}
                        className={expandedFilter === t ? 'active' : ''}
                        onClick={() => setExpandedFilter(t)}
                        style={{ fontSize: 13, display: 'inline-flex', alignItems: 'stretch', padding: 0, overflow: 'hidden' }}
                    >
                        <span style={{
                            width: 18,
                            backgroundImage: TYPE_DITHER[t],
                            backgroundColor: TYPE_BG[t],
                            backgroundSize: TYPE_BG_SIZE[t],
                            borderRight: '2px solid var(--border)',
                            flexShrink: 0,
                        }} />
                        <span style={{ padding: '6px 14px' }}>
                            {TYPE_LABELS[t] || t} ({byType[t].length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Memory list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((m) => {
                    const key = `${m.project_dir}/${m.file}`;
                    const isOpen = expandedItems.has(key);
                    const projectShort = m.project.split('/').pop() || m.project;

                    return (
                        <div
                            key={key}
                            style={{
                                border: '3px solid var(--border)',
                                borderRadius: 8,
                                background: 'var(--bg-primary)',
                                boxShadow: '3px 3px 0 var(--border)',
                                overflow: 'hidden',
                                display: 'flex',
                            }}
                        >
                            {/* Dithered type stripe */}
                            <div style={{
                                width: 18,
                                flexShrink: 0,
                                backgroundImage: TYPE_DITHER[m.type] || TYPE_DITHER.unknown,
                                backgroundColor: TYPE_BG[m.type],
                                backgroundSize: TYPE_BG_SIZE[m.type],
                                borderRight: '2px solid var(--border)',
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Header row */}
                            <div
                                onClick={() => toggleItem(key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    display: 'inline-block',
                                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.15s',
                                    color: 'var(--text-secondary)',
                                }}>
                                    &#9654;
                                </span>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    color: 'var(--text-primary)',
                                    border: '2px solid var(--border)',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                    flexShrink: 0,
                                }}>
                                    {TYPE_LABELS[m.type] || m.type}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.name}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }} title={m.project}>
                                    {projectShort}
                                </span>
                            </div>

                            {/* Expanded body */}
                            {isOpen && (
                                <div style={{
                                    borderTop: '2px solid var(--border)',
                                    padding: '12px 14px',
                                }}>
                                    {m.description && (
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>
                                            {m.description}
                                        </p>
                                    )}
                                    <div style={{
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontWeight: 400,
                                    }}>
                                        {m.body}
                                    </div>
                                    <CopyPath projectDir={m.project_dir} file={m.file} />
                                </div>
                            )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
