// src/server/collector.js
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { deleteOldData, setConfig, upsertDailyStat, upsertSession } from './db.js';
import { estimateCost } from './estimator.js';

const CLAUDE_HOME = process.env.CLAUDE_HOME || join(process.env.HOME, '.claude');
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

export function parseStatsCache(data) {
    const dailyStats = (data.dailyActivity || []).map((entry) => ({
        date: entry.date,
        project: 'all',
        message_count: entry.messageCount || 0,
        session_count: entry.sessionCount || 0,
        tool_call_count: entry.toolCallCount || 0,
    }));

    const modelTokensByDay = {};
    for (const entry of data.dailyModelTokens || []) {
        modelTokensByDay[entry.date] = entry.tokensByModel || {};
    }

    return { dailyStats, modelTokensByDay, modelUsage: data.modelUsage || {} };
}

export function parseHistory(lines) {
    const entries = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            entries.push({
                display: entry.display || '',
                timestamp: entry.timestamp,
                project: entry.project || 'unknown',
                sessionId: entry.sessionId || null,
            });
        } catch {
            // skip malformed lines
        }
    }
    return entries;
}

export function groupIntoSessions(entries) {
    const bySessionId = new Map();
    const noSessionEntries = [];

    for (const entry of entries) {
        if (entry.sessionId) {
            if (!bySessionId.has(entry.sessionId)) {
                bySessionId.set(entry.sessionId, []);
            }
            bySessionId.get(entry.sessionId).push(entry);
        } else {
            noSessionEntries.push(entry);
        }
    }

    const sessions = [];

    // Process entries with explicit session IDs
    for (const [sessionId, msgs] of bySessionId) {
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        const first = msgs[0];
        const last = msgs[msgs.length - 1];
        sessions.push({
            id: sessionId,
            project: first.project,
            started_at: new Date(first.timestamp).toISOString(),
            message_count: msgs.length,
            duration_minutes: (last.timestamp - first.timestamp) / 60000,
            prompts: JSON.stringify(msgs.map((m) => m.display)),
        });
    }

    // Group entries without session IDs by project + 30-min gap
    noSessionEntries.sort((a, b) => a.timestamp - b.timestamp);
    let currentGroup = [];

    for (const entry of noSessionEntries) {
        if (
            currentGroup.length > 0 &&
            (entry.project !== currentGroup[currentGroup.length - 1].project ||
                entry.timestamp - currentGroup[currentGroup.length - 1].timestamp > SESSION_GAP_MS)
        ) {
            sessions.push(buildSessionFromGroup(currentGroup));
            currentGroup = [];
        }
        currentGroup.push(entry);
    }

    if (currentGroup.length > 0) {
        sessions.push(buildSessionFromGroup(currentGroup));
    }

    return sessions;
}

function buildSessionFromGroup(group) {
    const first = group[0];
    const last = group[group.length - 1];
    return {
        id: `auto-${first.timestamp}-${first.project.replace(/\//g, '-')}`,
        project: first.project,
        started_at: new Date(first.timestamp).toISOString(),
        message_count: group.length,
        duration_minutes: (last.timestamp - first.timestamp) / 60000,
        prompts: JSON.stringify(group.map((m) => m.display)),
    };
}

function buildProjectDailyStats(entries) {
    const byDayProject = new Map();

    for (const entry of entries) {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        const key = `${date}|${entry.project}`;
        if (!byDayProject.has(key)) {
            byDayProject.set(key, { date, project: entry.project, message_count: 0 });
        }
        byDayProject.get(key).message_count++;
    }

    return Array.from(byDayProject.values());
}

export function runCollection(db, { statsData, historyLines, apiKey }) {
    const { dailyStats, modelTokensByDay } = parseStatsCache(statsData);
    const historyEntries = parseHistory(historyLines);
    const sessions = groupIntoSessions(historyEntries);
    const projectDailyStats = buildProjectDailyStats(historyEntries);

    // Upsert daily stats from stats-cache (aggregated "all" project)
    for (const stat of dailyStats) {
        const dayTokens = modelTokensByDay[stat.date] || {};
        const models = Object.keys(dayTokens);

        if (models.length > 0) {
            for (const model of models) {
                upsertDailyStat(db, {
                    ...stat,
                    model,
                    estimated_cost_usd: estimateCost({
                        model,
                        message_count: stat.message_count,
                    }),
                    estimated: 1,
                });
            }
        } else {
            upsertDailyStat(db, {
                ...stat,
                model: '',
                estimated_cost_usd: estimateCost({
                    model: 'claude-sonnet-4-5-20250929',
                    message_count: stat.message_count,
                }),
                estimated: 1,
            });
        }
    }

    // Upsert per-project daily stats from history
    for (const stat of projectDailyStats) {
        upsertDailyStat(db, {
            date: stat.date,
            project: stat.project,
            message_count: stat.message_count,
            session_count: 0,
            tool_call_count: 0,
            estimated_cost_usd: estimateCost({
                model: 'claude-sonnet-4-5-20250929',
                message_count: stat.message_count,
            }),
            model: '',
            estimated: 1,
        });
    }

    // Upsert sessions
    for (const session of sessions) {
        upsertSession(db, session);
    }

    setConfig(db, 'last_collection_at', new Date().toISOString());
    setConfig(db, 'data_source', apiKey ? 'api' : 'local');
}

export function readStatsFile() {
    const path = join(CLAUDE_HOME, 'stats-cache.json');
    if (!existsSync(path)) return { dailyActivity: [], dailyModelTokens: [], modelUsage: {} };
    return JSON.parse(readFileSync(path, 'utf-8'));
}

export function readHistoryFile() {
    const path = join(CLAUDE_HOME, 'history.jsonl');
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf-8').split('\n');
}

export function startCollector(db) {
    const intervalMinutes = parseInt(process.env.REFRESH_INTERVAL || '5', 10);
    const retentionDays = parseInt(process.env.RETENTION_DAYS || '90', 10);

    function collect() {
        try {
            const statsData = readStatsFile();
            const historyLines = readHistoryFile();
            const apiKey = process.env.ANTHROPIC_API_KEY || null;

            runCollection(db, { statsData, historyLines, apiKey });

            // Retention cleanup
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - retentionDays);
            deleteOldData(db, cutoff.toISOString().split('T')[0]);

            console.log(`[pAImon] collection complete at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[pAImon] collection error:', error.message);
            setConfig(db, 'last_collection_error', error.message);
        }
    }

    // Initial backfill
    collect();

    // Schedule recurring
    const intervalMs = intervalMinutes * 60 * 1000;
    return setInterval(collect, intervalMs);
}
