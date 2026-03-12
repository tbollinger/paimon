import { Router } from 'express';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const rawHome = process.env.CLAUDE_HOME || join(process.env.HOME, '.claude');
const CLAUDE_HOME = rawHome.startsWith('~') ? join(process.env.HOME, rawHome.slice(1)) : rawHome;

function findSessionFile(sessionId) {
    const projectsDir = join(CLAUDE_HOME, 'projects');
    if (!existsSync(projectsDir)) return null;

    for (const dir of readdirSync(projectsDir)) {
        const filePath = join(projectsDir, dir, `${sessionId}.jsonl`);
        if (existsSync(filePath)) return filePath;
    }
    return null;
}

function parseConversation(filePath) {
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    const turns = [];

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);
            const type = entry.type || (entry.message && entry.message.role);

            if (type === 'user') {
                const msg = entry.message || {};
                const content = msg.content;
                let text = '';
                if (typeof content === 'string') {
                    text = content;
                } else if (Array.isArray(content)) {
                    const textBlocks = content
                        .filter((b) => typeof b === 'object' && b.type === 'text')
                        .map((b) => b.text || '');
                    text = textBlocks.join('\n');
                }
                if (text.trim()) {
                    turns.push({ role: 'user', text: text.trim(), timestamp: entry.timestamp });
                }
            } else if (type === 'assistant') {
                const msg = entry.message || {};
                const contentBlocks = msg.content || [];
                const textBlocks = Array.isArray(contentBlocks)
                    ? contentBlocks
                        .filter((b) => typeof b === 'object' && b.type === 'text')
                        .map((b) => b.text || '')
                    : [];
                const text = textBlocks.join('\n');
                if (text.trim()) {
                    turns.push({ role: 'assistant', text: text.trim(), timestamp: entry.timestamp });
                }
            }
        } catch {
            // skip malformed lines
        }
    }

    return turns;
}

export function createSessionsRouter(db) {
    const router = Router();

    router.get('/', (req, res) => {
        const { from, to, project, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        let countSql = 'SELECT COUNT(*) as total FROM sessions WHERE 1=1';
        let sql = 'SELECT * FROM sessions WHERE 1=1';
        const params = [];

        if (from) { sql += ' AND started_at >= ?'; countSql += ' AND started_at >= ?'; params.push(from); }
        if (to) { sql += ' AND started_at <= ?'; countSql += ' AND started_at <= ?'; params.push(to); }
        if (project) { sql += ' AND project = ?'; countSql += ' AND project = ?'; params.push(project); }

        const total = db.prepare(countSql).get(...params).total;

        sql += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';

        const rows = db.prepare(sql).all(...params, limitNum, offset);
        res.json({
            success: true,
            data: rows,
            meta: { total, page: pageNum, limit: limitNum },
        });
    });

    router.get('/:id', (req, res) => {
        const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
        if (!row) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        res.json({ success: true, data: row });
    });

    router.get('/:id/conversation', (req, res) => {
        const sessionId = req.params.id;
        const filePath = findSessionFile(sessionId);

        if (!filePath) {
            return res.json({ success: true, data: [] });
        }

        try {
            const turns = parseConversation(filePath);
            res.json({ success: true, data: turns });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to parse session file' });
        }
    });

    return router;
}
