import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, closeDb, getConfig } from '../db.js';
import {
    parseStatsCache,
    parseHistory,
    groupIntoSessions,
    runCollection,
} from '../collector.js';

describe('collector', () => {
    describe('parseStatsCache', () => {
        it('parses daily activity entries into dailyStats', () => {
            const data = {
                dailyActivity: [
                    { date: '2026-03-10', messageCount: 15, sessionCount: 3, toolCallCount: 8 },
                    { date: '2026-03-11', messageCount: 20, sessionCount: 5, toolCallCount: 12 },
                ],
            };

            const { dailyStats } = parseStatsCache(data);

            expect(dailyStats).toHaveLength(2);
            expect(dailyStats[0]).toEqual({
                date: '2026-03-10',
                project: 'all',
                message_count: 15,
                session_count: 3,
                tool_call_count: 8,
            });
            expect(dailyStats[1]).toEqual({
                date: '2026-03-11',
                project: 'all',
                message_count: 20,
                session_count: 5,
                tool_call_count: 12,
            });
        });

        it('defaults missing counts to zero', () => {
            const data = {
                dailyActivity: [{ date: '2026-03-10' }],
            };

            const { dailyStats } = parseStatsCache(data);

            expect(dailyStats[0].message_count).toBe(0);
            expect(dailyStats[0].session_count).toBe(0);
            expect(dailyStats[0].tool_call_count).toBe(0);
        });

        it('extracts model token data per day', () => {
            const data = {
                dailyModelTokens: [
                    {
                        date: '2026-03-10',
                        tokensByModel: {
                            'claude-sonnet-4': { input: 5000, output: 15000 },
                            'claude-opus-4-6': { input: 2000, output: 8000 },
                        },
                    },
                    {
                        date: '2026-03-11',
                        tokensByModel: {
                            'claude-sonnet-4': { input: 3000, output: 9000 },
                        },
                    },
                ],
            };

            const { modelTokensByDay } = parseStatsCache(data);

            expect(Object.keys(modelTokensByDay)).toHaveLength(2);
            expect(modelTokensByDay['2026-03-10']).toEqual({
                'claude-sonnet-4': { input: 5000, output: 15000 },
                'claude-opus-4-6': { input: 2000, output: 8000 },
            });
            expect(modelTokensByDay['2026-03-11']).toEqual({
                'claude-sonnet-4': { input: 3000, output: 9000 },
            });
        });

        it('returns empty structures for missing fields', () => {
            const { dailyStats, modelTokensByDay, modelUsage } = parseStatsCache({});

            expect(dailyStats).toEqual([]);
            expect(modelTokensByDay).toEqual({});
            expect(modelUsage).toEqual({});
        });

        it('preserves modelUsage from input data', () => {
            const data = {
                modelUsage: { 'claude-sonnet-4': { totalMessages: 100 } },
            };

            const { modelUsage } = parseStatsCache(data);

            expect(modelUsage).toEqual({ 'claude-sonnet-4': { totalMessages: 100 } });
        });

        it('handles empty dailyModelTokens entries with no tokensByModel', () => {
            const data = {
                dailyModelTokens: [{ date: '2026-03-10' }],
            };

            const { modelTokensByDay } = parseStatsCache(data);

            expect(modelTokensByDay['2026-03-10']).toEqual({});
        });
    });

    describe('parseHistory', () => {
        it('parses valid jsonl lines into entries', () => {
            const lines = [
                JSON.stringify({
                    display: 'hello world',
                    timestamp: 1710100000000,
                    project: '/home/user/myproject',
                    sessionId: 'sess-001',
                }),
                JSON.stringify({
                    display: 'second message',
                    timestamp: 1710100060000,
                    project: '/home/user/myproject',
                    sessionId: 'sess-001',
                }),
            ];

            const entries = parseHistory(lines);

            expect(entries).toHaveLength(2);
            expect(entries[0]).toEqual({
                display: 'hello world',
                timestamp: 1710100000000,
                project: '/home/user/myproject',
                sessionId: 'sess-001',
            });
        });

        it('skips empty lines', () => {
            const lines = [
                JSON.stringify({ display: 'msg', timestamp: 1000, project: 'p' }),
                '',
                '   ',
                JSON.stringify({ display: 'msg2', timestamp: 2000, project: 'p' }),
            ];

            const entries = parseHistory(lines);

            expect(entries).toHaveLength(2);
        });

        it('skips malformed json lines', () => {
            const lines = [
                JSON.stringify({ display: 'valid', timestamp: 1000, project: 'p' }),
                'this is not json {{{',
                '{ incomplete json',
                JSON.stringify({ display: 'also valid', timestamp: 2000, project: 'p' }),
            ];

            const entries = parseHistory(lines);

            expect(entries).toHaveLength(2);
            expect(entries[0].display).toBe('valid');
            expect(entries[1].display).toBe('also valid');
        });

        it('defaults missing fields appropriately', () => {
            const lines = [
                JSON.stringify({ timestamp: 1000 }),
            ];

            const entries = parseHistory(lines);

            expect(entries).toHaveLength(1);
            expect(entries[0].display).toBe('');
            expect(entries[0].project).toBe('unknown');
            expect(entries[0].sessionId).toBeNull();
        });

        it('returns empty array for empty input', () => {
            expect(parseHistory([])).toEqual([]);
        });
    });

    describe('groupIntoSessions', () => {
        it('groups entries by sessionId', () => {
            const entries = [
                { display: 'msg1', timestamp: 1000, project: 'proj-a', sessionId: 'sess-1' },
                { display: 'msg2', timestamp: 2000, project: 'proj-a', sessionId: 'sess-1' },
                { display: 'msg3', timestamp: 3000, project: 'proj-b', sessionId: 'sess-2' },
            ];

            const sessions = groupIntoSessions(entries);
            const sess1 = sessions.find((s) => s.id === 'sess-1');
            const sess2 = sessions.find((s) => s.id === 'sess-2');

            expect(sess1).toBeDefined();
            expect(sess1.message_count).toBe(2);
            expect(sess1.project).toBe('proj-a');
            expect(sess1.duration_minutes).toBeCloseTo((2000 - 1000) / 60000);

            expect(sess2).toBeDefined();
            expect(sess2.message_count).toBe(1);
            expect(sess2.project).toBe('proj-b');
        });

        it('sorts messages within a session by timestamp', () => {
            const entries = [
                { display: 'second', timestamp: 5000, project: 'proj', sessionId: 's1' },
                { display: 'first', timestamp: 1000, project: 'proj', sessionId: 's1' },
                { display: 'third', timestamp: 9000, project: 'proj', sessionId: 's1' },
            ];

            const sessions = groupIntoSessions(entries);
            const prompts = JSON.parse(sessions[0].prompts);

            expect(prompts).toEqual(['first', 'second', 'third']);
            expect(sessions[0].started_at).toBe(new Date(1000).toISOString());
            expect(sessions[0].duration_minutes).toBeCloseTo((9000 - 1000) / 60000);
        });

        it('groups entries without sessionId by project and 30-min gap', () => {
            const baseTime = 1710100000000;
            const entries = [
                { display: 'msg1', timestamp: baseTime, project: 'proj-a', sessionId: null },
                { display: 'msg2', timestamp: baseTime + 60000, project: 'proj-a', sessionId: null },
                // > 30-minute gap from msg2 - should start a new session
                { display: 'msg3', timestamp: baseTime + 60000 + 30 * 60000 + 1, project: 'proj-a', sessionId: null },
            ];

            const sessions = groupIntoSessions(entries);

            expect(sessions).toHaveLength(2);
            expect(sessions[0].message_count).toBe(2);
            expect(sessions[1].message_count).toBe(1);
        });

        it('splits into new session when project changes (no sessionId)', () => {
            const baseTime = 1710100000000;
            const entries = [
                { display: 'msg1', timestamp: baseTime, project: 'proj-a', sessionId: null },
                { display: 'msg2', timestamp: baseTime + 1000, project: 'proj-b', sessionId: null },
            ];

            const sessions = groupIntoSessions(entries);

            expect(sessions).toHaveLength(2);
            expect(sessions[0].project).toBe('proj-a');
            expect(sessions[1].project).toBe('proj-b');
        });

        it('generates auto-id for sessions without sessionId', () => {
            const entries = [
                { display: 'msg1', timestamp: 1710100000000, project: 'my/project', sessionId: null },
            ];

            const sessions = groupIntoSessions(entries);

            expect(sessions[0].id).toBe('auto-1710100000000-my-project');
        });

        it('handles empty input', () => {
            const sessions = groupIntoSessions([]);

            expect(sessions).toEqual([]);
        });

        it('handles mixed entries with and without sessionId', () => {
            const baseTime = 1710100000000;
            const entries = [
                { display: 'with-id', timestamp: baseTime, project: 'proj', sessionId: 'sess-1' },
                { display: 'no-id', timestamp: baseTime + 1000, project: 'proj', sessionId: null },
            ];

            const sessions = groupIntoSessions(entries);

            expect(sessions).toHaveLength(2);
            const withId = sessions.find((s) => s.id === 'sess-1');
            const withoutId = sessions.find((s) => s.id !== 'sess-1');

            expect(withId).toBeDefined();
            expect(withoutId).toBeDefined();
            expect(withId.message_count).toBe(1);
            expect(withoutId.message_count).toBe(1);
        });

        it('keeps entries within 30 minutes in the same auto-session', () => {
            const baseTime = 1710100000000;
            const entries = [
                { display: 'msg1', timestamp: baseTime, project: 'proj', sessionId: null },
                { display: 'msg2', timestamp: baseTime + 29 * 60000, project: 'proj', sessionId: null },
            ];

            const sessions = groupIntoSessions(entries);

            expect(sessions).toHaveLength(1);
            expect(sessions[0].message_count).toBe(2);
        });

        it('stores prompts as json array of display strings', () => {
            const entries = [
                { display: 'hello', timestamp: 1000, project: 'proj', sessionId: 's1' },
                { display: 'world', timestamp: 2000, project: 'proj', sessionId: 's1' },
            ];

            const sessions = groupIntoSessions(entries);
            const prompts = JSON.parse(sessions[0].prompts);

            expect(prompts).toEqual(['hello', 'world']);
        });
    });

    describe('runCollection', () => {
        let db;

        beforeEach(() => {
            db = createDb(':memory:');
        });

        afterEach(() => {
            closeDb(db);
        });

        it('enriches history-derived daily stats with stats-cache tool counts and model tokens', () => {
            // History is the source of truth for message counts
            const historyLines = [
                JSON.stringify({ display: 'msg1', timestamp: 1773100800000, project: '/proj', sessionId: 's1' }),
                JSON.stringify({ display: 'msg2', timestamp: 1773100860000, project: '/proj', sessionId: 's1' }),
                JSON.stringify({ display: 'msg3', timestamp: 1773100920000, project: '/proj', sessionId: 's1' }),
            ]; // 3 messages on 2026-03-10

            const statsData = {
                dailyActivity: [
                    { date: '2026-03-10', messageCount: 50, sessionCount: 2, toolCallCount: 15 },
                ],
                dailyModelTokens: [
                    { date: '2026-03-10', tokensByModel: { 'claude-sonnet-4': 5000 } },
                ],
                modelUsage: {
                    'claude-sonnet-4': {
                        inputTokens: 1000, outputTokens: 5000,
                        cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
                    },
                },
            };

            runCollection(db, { statsData, historyLines, apiKey: null });

            const rows = db.prepare('SELECT * FROM daily_stats WHERE project = ?').all('all');

            expect(rows).toHaveLength(1);
            expect(rows[0].date).toBe('2026-03-10');
            expect(rows[0].model).toBe('claude-sonnet-4');
            // Message count comes from history (3), NOT stats-cache (50)
            expect(rows[0].message_count).toBe(3);
            // Tool call count is enriched from stats-cache
            expect(rows[0].tool_call_count).toBe(15);
            expect(rows[0].estimated).toBe(1);
            expect(rows[0].estimated_cost_usd).toBeGreaterThan(0);
        });

        it('creates multiple model rows when multiple models used on a day', () => {
            const historyLines = [
                JSON.stringify({ display: 'msg', timestamp: 1773100800000, project: '/proj', sessionId: 's1' }),
            ];
            const statsData = {
                dailyActivity: [
                    { date: '2026-03-10', messageCount: 10, sessionCount: 2, toolCallCount: 5 },
                ],
                dailyModelTokens: [
                    {
                        date: '2026-03-10',
                        tokensByModel: { 'claude-sonnet-4': 3000, 'claude-opus-4-6': 2000 },
                    },
                ],
                modelUsage: {
                    'claude-sonnet-4': { inputTokens: 1000, outputTokens: 3000, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
                    'claude-opus-4-6': { inputTokens: 500, outputTokens: 2000, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
                },
            };

            runCollection(db, { statsData, historyLines, apiKey: null });

            const rows = db.prepare('SELECT * FROM daily_stats WHERE project = ?').all('all');

            expect(rows).toHaveLength(2);
            const models = rows.map((r) => r.model).sort();
            expect(models).toEqual(['claude-opus-4-6', 'claude-sonnet-4']);
        });

        it('falls back to empty model when no token data available', () => {
            const historyLines = [
                JSON.stringify({ display: 'msg', timestamp: 1773100800000, project: '/proj', sessionId: 's1' }),
            ];
            const statsData = {
                dailyActivity: [
                    { date: '2026-03-10', messageCount: 5, sessionCount: 1, toolCallCount: 2 },
                ],
            };

            runCollection(db, { statsData, historyLines, apiKey: null });

            const rows = db.prepare('SELECT * FROM daily_stats WHERE project = ?').all('all');

            expect(rows).toHaveLength(1);
            expect(rows[0].model).toBe('');
        });

        it('writes parsed history data as sessions', () => {
            const historyLines = [
                JSON.stringify({
                    display: 'first message',
                    timestamp: 1710100000000,
                    project: '/home/user/proj',
                    sessionId: 'sess-abc',
                }),
                JSON.stringify({
                    display: 'second message',
                    timestamp: 1710100060000,
                    project: '/home/user/proj',
                    sessionId: 'sess-abc',
                }),
            ];

            runCollection(db, { statsData: {}, historyLines, apiKey: null });

            const sessions = db.prepare('SELECT * FROM sessions').all();

            expect(sessions).toHaveLength(1);
            expect(sessions[0].id).toBe('sess-abc');
            expect(sessions[0].project).toBe('/home/user/proj');
            expect(sessions[0].message_count).toBe(2);
        });

        it('writes per-project daily stats from history entries', () => {
            const ts = new Date('2026-03-10T12:00:00Z').getTime();
            const historyLines = [
                JSON.stringify({ display: 'msg1', timestamp: ts, project: 'proj-a' }),
                JSON.stringify({ display: 'msg2', timestamp: ts + 1000, project: 'proj-a' }),
                JSON.stringify({ display: 'msg3', timestamp: ts + 2000, project: 'proj-b' }),
            ];

            runCollection(db, { statsData: {}, historyLines, apiKey: null });

            const projA = db
                .prepare('SELECT * FROM daily_stats WHERE project = ?')
                .all('proj-a');
            const projB = db
                .prepare('SELECT * FROM daily_stats WHERE project = ?')
                .all('proj-b');

            expect(projA).toHaveLength(1);
            expect(projA[0].message_count).toBe(2);
            expect(projB).toHaveLength(1);
            expect(projB[0].message_count).toBe(1);
        });

        it('sets last_collection_at config after collection', () => {
            runCollection(db, { statsData: {}, historyLines: [], apiKey: null });

            const lastCollection = getConfig(db, 'last_collection_at');

            expect(lastCollection).toBeTruthy();
            expect(() => new Date(lastCollection)).not.toThrow();
        });

        it('sets data_source to local when no api key', () => {
            runCollection(db, { statsData: {}, historyLines: [], apiKey: null });

            expect(getConfig(db, 'data_source')).toBe('local');
        });

        it('sets data_source to api when api key is provided', () => {
            runCollection(db, { statsData: {}, historyLines: [], apiKey: 'sk-ant-xxx' });

            expect(getConfig(db, 'data_source')).toBe('api');
        });

        it('handles combined stats and history data', () => {
            const statsData = {
                dailyActivity: [
                    { date: '2026-03-10', messageCount: 10, sessionCount: 2, toolCallCount: 5 },
                ],
            };
            const historyLines = [
                JSON.stringify({
                    display: 'msg',
                    timestamp: new Date('2026-03-10T10:00:00Z').getTime(),
                    project: 'myproject',
                    sessionId: 'sess-1',
                }),
            ];

            runCollection(db, { statsData, historyLines, apiKey: null });

            const allStats = db.prepare('SELECT * FROM daily_stats WHERE project = ?').all('all');
            const projectStats = db.prepare('SELECT * FROM daily_stats WHERE project = ?').all('myproject');
            const sessions = db.prepare('SELECT * FROM sessions').all();

            expect(allStats.length).toBeGreaterThanOrEqual(1);
            expect(projectStats).toHaveLength(1);
            expect(sessions).toHaveLength(1);
        });
    });
});
