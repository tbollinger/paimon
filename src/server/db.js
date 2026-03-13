import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export function createDb(dbPath) {
    if (dbPath !== ':memory:') {
        mkdirSync(dirname(dbPath), { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT NOT NULL,
      project TEXT NOT NULL DEFAULT 'all',
      message_count INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      tool_call_count INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      model TEXT DEFAULT '',
      estimated INTEGER DEFAULT 1,
      PRIMARY KEY (date, project, model)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      started_at TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      duration_minutes REAL DEFAULT 0,
      prompts TEXT DEFAULT '[]',
      session_name TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      raw_response TEXT DEFAULT '{}',
      PRIMARY KEY (date, model)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tool_call_types (
      date TEXT NOT NULL,
      project TEXT NOT NULL DEFAULT 'all',
      tool_name TEXT NOT NULL,
      call_count INTEGER DEFAULT 0,
      PRIMARY KEY (date, project, tool_name)
    );

    CREATE TABLE IF NOT EXISTS hourly_activity (
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      project TEXT NOT NULL DEFAULT 'all',
      message_count INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      PRIMARY KEY (date, hour, project)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_project ON daily_stats(project);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_tool_call_types_date ON tool_call_types(date);
    CREATE INDEX IF NOT EXISTS idx_hourly_activity_date ON hourly_activity(date);
  `);

    // Migration: add session_name column if missing (existing databases)
    const cols = db.prepare("PRAGMA table_info(sessions)").all();
    if (!cols.some((c) => c.name === 'session_name')) {
        db.exec("ALTER TABLE sessions ADD COLUMN session_name TEXT DEFAULT ''");
    }

    // Migration: add hidden column if missing (existing databases)
    if (!cols.some((c) => c.name === 'hidden')) {
        db.exec("ALTER TABLE sessions ADD COLUMN hidden INTEGER DEFAULT 0");
    }

    return db;
}

export function closeDb(db) {
    if (db && db.open) {
        db.close();
    }
}

export function upsertDailyStat(db, stat) {
    const stmt = db.prepare(`
    INSERT INTO daily_stats (date, project, message_count, session_count, tool_call_count, estimated_cost_usd, model, estimated)
    VALUES (@date, @project, @message_count, @session_count, @tool_call_count, @estimated_cost_usd, @model, @estimated)
    ON CONFLICT(date, project, model) DO UPDATE SET
      message_count = @message_count,
      session_count = @session_count,
      tool_call_count = @tool_call_count,
      estimated_cost_usd = @estimated_cost_usd,
      estimated = @estimated
  `);
    stmt.run(stat);
}

export function upsertSession(db, session) {
    const stmt = db.prepare(`
    INSERT INTO sessions (id, project, started_at, message_count, duration_minutes, prompts, session_name)
    VALUES (@id, @project, @started_at, @message_count, @duration_minutes, @prompts, @session_name)
    ON CONFLICT(id) DO UPDATE SET
      message_count = @message_count,
      duration_minutes = @duration_minutes,
      prompts = @prompts,
      session_name = @session_name
  `);
    stmt.run(session);
}

export function setSessionHidden(db, id, hidden) {
    const result = db.prepare('UPDATE sessions SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, id);
    return result.changes > 0;
}

export function upsertToolCallType(db, row) {
    const stmt = db.prepare(`
    INSERT INTO tool_call_types (date, project, tool_name, call_count)
    VALUES (@date, @project, @tool_name, @call_count)
    ON CONFLICT(date, project, tool_name) DO UPDATE SET
      call_count = @call_count
  `);
    stmt.run(row);
}

export function upsertHourlyActivity(db, row) {
    const stmt = db.prepare(`
    INSERT INTO hourly_activity (date, hour, project, message_count, session_count)
    VALUES (@date, @hour, @project, @message_count, @session_count)
    ON CONFLICT(date, hour, project) DO UPDATE SET
      message_count = @message_count,
      session_count = @session_count
  `);
    stmt.run(row);
}

export function setConfig(db, key, value) {
    db.prepare(
        'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    ).run(key, value, value);
}

export function getConfig(db, key) {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : null;
}

export function deleteOldData(db, cutoffDate) {
    db.prepare('DELETE FROM daily_stats WHERE date < ?').run(cutoffDate);
    db.prepare('DELETE FROM sessions WHERE started_at < ?').run(cutoffDate);
    db.prepare('DELETE FROM api_usage WHERE date < ?').run(cutoffDate);
    db.prepare('DELETE FROM tool_call_types WHERE date < ?').run(cutoffDate);
    db.prepare('DELETE FROM hourly_activity WHERE date < ?').run(cutoffDate);
}
