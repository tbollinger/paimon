import { Router } from 'express';

export function createProjectsRouter(db) {
    const router = Router();

    router.get('/', (req, res) => {
        const rows = db.prepare(`
      SELECT
        project,
        SUM(message_count) as total_messages,
        SUM(session_count) as total_sessions,
        SUM(tool_call_count) as total_tool_calls,
        SUM(estimated_cost_usd) as total_cost,
        MIN(date) as first_seen,
        MAX(date) as last_seen
      FROM daily_stats
      WHERE project != 'all'
      GROUP BY project
      ORDER BY total_messages DESC
    `).all();
        res.json({ success: true, data: rows, meta: { total: rows.length } });
    });

    router.get('/:name/stats', (req, res) => {
        const project = decodeURIComponent(req.params.name);
        const { from, to } = req.query;
        let sql = 'SELECT * FROM daily_stats WHERE project = ?';
        const params = [project];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }

        sql += ' ORDER BY date DESC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows, meta: { total: rows.length } });
    });

    return router;
}
