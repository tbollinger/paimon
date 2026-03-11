import { Router } from 'express';

export function createStatsRouter(db) {
    const router = Router();

    router.get('/daily', (req, res) => {
        const { from, to, project, model } = req.query;
        let sql = 'SELECT * FROM daily_stats WHERE 1=1';
        const params = [];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }
        if (project) { sql += ' AND project = ?'; params.push(project); }
        if (model) { sql += ' AND model = ?'; params.push(model); }

        sql += ' ORDER BY date DESC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows, meta: { total: rows.length } });
    });

    router.get('/weekly', (req, res) => {
        const { from, to, project } = req.query;
        let sql = `
      SELECT
        strftime('%Y-W%W', date) as week,
        SUM(message_count) as message_count,
        SUM(session_count) as session_count,
        SUM(tool_call_count) as tool_call_count,
        SUM(estimated_cost_usd) as estimated_cost_usd,
        MIN(estimated) as estimated
      FROM daily_stats
      WHERE 1=1
    `;
        const params = [];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }
        if (project) { sql += ' AND project = ?'; params.push(project); }

        sql += ' GROUP BY week ORDER BY week DESC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows, meta: { total: rows.length } });
    });

    router.get('/monthly', (req, res) => {
        const { from, to, project } = req.query;
        let sql = `
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(message_count) as message_count,
        SUM(session_count) as session_count,
        SUM(tool_call_count) as tool_call_count,
        SUM(estimated_cost_usd) as estimated_cost_usd,
        MIN(estimated) as estimated
      FROM daily_stats
      WHERE 1=1
    `;
        const params = [];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }
        if (project) { sql += ' AND project = ?'; params.push(project); }

        sql += ' GROUP BY month ORDER BY month DESC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows, meta: { total: rows.length } });
    });

    return router;
}
