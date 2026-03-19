import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    createDb,
    closeDb,
    upsertDailyStat,
    upsertSession,
    setConfig,
    getConfig,
    deleteOldData,
} from '../db.js';

describe('database layer', () => {
    let db;

    beforeEach(() => {
        db = createDb(':memory:');
    });

    afterEach(() => {
        closeDb(db);
    });

    describe('createDb', () => {
        it('creates all four tables', () => {
            const tables = db
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
                )
                .all()
                .map((r) => r.name);

            expect(tables).toContain('daily_stats');
            expect(tables).toContain('sessions');
            expect(tables).toContain('api_usage');
            expect(tables).toContain('config');
        });

        it('enables WAL journal mode for file-based databases', () => {
            // In-memory databases always report 'memory' for journal_mode,
            // so we test with a temp file to verify WAL is enabled
            const tmpDir = mkdtempSync(join(tmpdir(), 'paimon-test-'));
            const tmpPath = join(tmpDir, 'test.db');
            const fileDb = createDb(tmpPath);
            try {
                const { journal_mode } = fileDb
                    .prepare('PRAGMA journal_mode')
                    .get();
                expect(journal_mode).toBe('wal');
            } finally {
                closeDb(fileDb);
                rmSync(tmpDir, { recursive: true });
            }
        });

        it('enables foreign keys', () => {
            const { foreign_keys } = db
                .prepare('PRAGMA foreign_keys')
                .get();
            expect(foreign_keys).toBe(1);
        });

        it('creates expected indexes', () => {
            const indexes = db
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
                )
                .all()
                .map((r) => r.name);

            expect(indexes).toContain('idx_daily_stats_date');
            expect(indexes).toContain('idx_daily_stats_project');
            expect(indexes).toContain('idx_sessions_project');
            expect(indexes).toContain('idx_sessions_started_at');
        });
    });

    describe('closeDb', () => {
        it('closes an open database', () => {
            const tempDb = createDb(':memory:');
            expect(tempDb.open).toBe(true);
            closeDb(tempDb);
            expect(tempDb.open).toBe(false);
        });

        it('does not throw on null', () => {
            expect(() => closeDb(null)).not.toThrow();
        });

        it('does not throw on already-closed database', () => {
            const tempDb = createDb(':memory:');
            closeDb(tempDb);
            expect(() => closeDb(tempDb)).not.toThrow();
        });
    });

    describe('upsertDailyStat', () => {
        const baseStat = {
            date: '2026-03-11',
            project: 'paimon',
            message_count: 10,
            session_count: 2,
            tool_call_count: 5,
            estimated_cost_usd: 0.25,
            model: 'claude-opus-4-6',
            estimated: 1,
        };

        it('inserts a new daily stat', () => {
            upsertDailyStat(db, baseStat);

            const row = db
                .prepare('SELECT * FROM daily_stats WHERE date = ? AND project = ? AND model = ?')
                .get(baseStat.date, baseStat.project, baseStat.model);

            expect(row.message_count).toBe(10);
            expect(row.session_count).toBe(2);
            expect(row.tool_call_count).toBe(5);
            expect(row.estimated_cost_usd).toBeCloseTo(0.25);
            expect(row.estimated).toBe(1);
        });

        it('updates an existing daily stat on conflict', () => {
            upsertDailyStat(db, baseStat);

            const updated = {
                ...baseStat,
                message_count: 20,
                session_count: 4,
                tool_call_count: 12,
                estimated_cost_usd: 0.50,
                estimated: 0,
            };
            upsertDailyStat(db, updated);

            const rows = db
                .prepare('SELECT * FROM daily_stats WHERE date = ? AND project = ? AND model = ?')
                .all(baseStat.date, baseStat.project, baseStat.model);

            expect(rows).toHaveLength(1);
            expect(rows[0].message_count).toBe(20);
            expect(rows[0].session_count).toBe(4);
            expect(rows[0].tool_call_count).toBe(12);
            expect(rows[0].estimated_cost_usd).toBeCloseTo(0.50);
            expect(rows[0].estimated).toBe(0);
        });

        it('allows different models for the same date and project', () => {
            upsertDailyStat(db, baseStat);
            upsertDailyStat(db, { ...baseStat, model: 'claude-sonnet-4' });

            const rows = db
                .prepare('SELECT * FROM daily_stats WHERE date = ? AND project = ?')
                .all(baseStat.date, baseStat.project);

            expect(rows).toHaveLength(2);
        });
    });

    describe('upsertSession', () => {
        const baseSession = {
            id: 'sess-001',
            project: 'paimon',
            started_at: '2026-03-11T10:00:00Z',
            message_count: 5,
            duration_minutes: 12.5,
            prompts: '["hello","how are you"]',
            session_name: '',
        };

        it('inserts a new session', () => {
            upsertSession(db, baseSession);

            const row = db
                .prepare('SELECT * FROM sessions WHERE id = ?')
                .get(baseSession.id);

            expect(row.project).toBe('paimon');
            expect(row.started_at).toBe('2026-03-11T10:00:00Z');
            expect(row.message_count).toBe(5);
            expect(row.duration_minutes).toBeCloseTo(12.5);
            expect(row.prompts).toBe('["hello","how are you"]');
        });

        it('updates an existing session on conflict', () => {
            upsertSession(db, baseSession);

            const updated = {
                ...baseSession,
                message_count: 15,
                duration_minutes: 30.0,
                prompts: '["hello","how are you","goodbye"]',
            };
            upsertSession(db, updated);

            const rows = db
                .prepare('SELECT * FROM sessions WHERE id = ?')
                .all(baseSession.id);

            expect(rows).toHaveLength(1);
            expect(rows[0].message_count).toBe(15);
            expect(rows[0].duration_minutes).toBeCloseTo(30.0);
            expect(rows[0].prompts).toBe('["hello","how are you","goodbye"]');
        });

        it('preserves project and started_at on update', () => {
            upsertSession(db, baseSession);

            upsertSession(db, {
                ...baseSession,
                project: 'other-project',
                started_at: '2026-03-12T10:00:00Z',
                message_count: 20,
            });

            const row = db
                .prepare('SELECT * FROM sessions WHERE id = ?')
                .get(baseSession.id);

            // project and started_at are NOT in the ON CONFLICT UPDATE clause,
            // so the original values are preserved
            expect(row.project).toBe('paimon');
            expect(row.started_at).toBe('2026-03-11T10:00:00Z');
            expect(row.message_count).toBe(20);
        });
    });

    describe('setConfig / getConfig', () => {
        it('sets and retrieves a config value', () => {
            setConfig(db, 'theme', 'dark');
            expect(getConfig(db, 'theme')).toBe('dark');
        });

        it('returns null for a non-existent key', () => {
            expect(getConfig(db, 'nonexistent')).toBeNull();
        });

        it('updates an existing config value', () => {
            setConfig(db, 'theme', 'dark');
            setConfig(db, 'theme', 'light');
            expect(getConfig(db, 'theme')).toBe('light');
        });

        it('handles multiple config keys independently', () => {
            setConfig(db, 'theme', 'dark');
            setConfig(db, 'budget', '100');

            expect(getConfig(db, 'theme')).toBe('dark');
            expect(getConfig(db, 'budget')).toBe('100');
        });
    });

    describe('deleteOldData', () => {
        it('removes daily_stats older than the cutoff', () => {
            upsertDailyStat(db, {
                date: '2026-01-01',
                project: 'old',
                message_count: 1,
                session_count: 1,
                tool_call_count: 1,
                estimated_cost_usd: 0.01,
                model: 'claude-opus-4-6',
                estimated: 1,
            });
            upsertDailyStat(db, {
                date: '2026-03-11',
                project: 'new',
                message_count: 1,
                session_count: 1,
                tool_call_count: 1,
                estimated_cost_usd: 0.01,
                model: 'claude-opus-4-6',
                estimated: 1,
            });

            deleteOldData(db, '2026-03-01');

            const rows = db.prepare('SELECT * FROM daily_stats').all();
            expect(rows).toHaveLength(1);
            expect(rows[0].project).toBe('new');
        });

        it('removes sessions older than the cutoff', () => {
            upsertSession(db, {
                id: 'old-sess',
                project: 'test',
                started_at: '2026-01-01T00:00:00Z',
                message_count: 1,
                duration_minutes: 1,
                prompts: '[]',
                session_name: '',
            });
            upsertSession(db, {
                id: 'new-sess',
                project: 'test',
                started_at: '2026-03-11T00:00:00Z',
                message_count: 1,
                duration_minutes: 1,
                prompts: '[]',
                session_name: '',
            });

            deleteOldData(db, '2026-03-01');

            const rows = db.prepare('SELECT * FROM sessions').all();
            expect(rows).toHaveLength(1);
            expect(rows[0].id).toBe('new-sess');
        });

        it('removes api_usage older than the cutoff', () => {
            db.prepare(
                'INSERT INTO api_usage (date, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)',
            ).run('2026-01-01', 'claude-opus-4-6', 100, 200, 0.05);

            db.prepare(
                'INSERT INTO api_usage (date, model, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)',
            ).run('2026-03-11', 'claude-opus-4-6', 100, 200, 0.05);

            deleteOldData(db, '2026-03-01');

            const rows = db.prepare('SELECT * FROM api_usage').all();
            expect(rows).toHaveLength(1);
            expect(rows[0].date).toBe('2026-03-11');
        });

        it('does not remove data at or after the cutoff', () => {
            upsertDailyStat(db, {
                date: '2026-03-01',
                project: 'boundary',
                message_count: 1,
                session_count: 1,
                tool_call_count: 1,
                estimated_cost_usd: 0.01,
                model: 'claude-opus-4-6',
                estimated: 1,
            });

            deleteOldData(db, '2026-03-01');

            const rows = db.prepare('SELECT * FROM daily_stats').all();
            expect(rows).toHaveLength(1);
            expect(rows[0].date).toBe('2026-03-01');
        });
    });
});
