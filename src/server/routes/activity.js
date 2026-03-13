import { Router } from 'express';

export function createActivityRouter(db) {
    const router = Router();

    router.get('/tool-breakdown', (req, res) => {
        const { from, to, project } = req.query;
        let sql = `
      SELECT tool_name, SUM(call_count) as total_calls
      FROM tool_call_types WHERE 1=1`;
        const params = [];

        if (project) {
            sql += ' AND project = ?';
            params.push(project);
        } else {
            sql += " AND project = 'all'";
        }
        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }

        sql += ' GROUP BY tool_name ORDER BY total_calls DESC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows });
    });

    router.get('/heatmap', (req, res) => {
        const { from, to, project } = req.query;
        let sql = 'SELECT date, hour, SUM(message_count) as messages, SUM(session_count) as sessions FROM hourly_activity WHERE 1=1';
        const params = [];

        if (project) {
            sql += ' AND project = ?';
            params.push(project);
        } else {
            sql += " AND project = 'all'";
        }
        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }

        sql += ' GROUP BY date, hour';

        const rows = db.prepare(sql).all(...params);

        // Pivot into 7x24 grid (day 0=Sun ... 6=Sat)
        const grid = Array.from({ length: 7 }, (_, day) =>
            Array.from({ length: 24 }, (__, hour) => ({
                day, hour, messages: 0, sessions: 0,
            })),
        );

        for (const row of rows) {
            const dayOfWeek = new Date(row.date + 'T00:00:00').getDay();
            grid[dayOfWeek][row.hour].messages += row.messages;
            grid[dayOfWeek][row.hour].sessions += row.sessions;
        }

        const flat = grid.flat();
        res.json({ success: true, data: flat });
    });

    router.get('/calendar', (req, res) => {
        const { from, to, project } = req.query;
        const targetProject = project || 'all';

        let sql = `
      SELECT date, SUM(message_count) as messages, SUM(session_count) as sessions,
             SUM(tool_call_count) as tool_calls
      FROM daily_stats WHERE project = ?`;
        const params = [targetProject];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }

        sql += ' GROUP BY date ORDER BY date ASC';

        const rows = db.prepare(sql).all(...params);
        res.json({ success: true, data: rows });
    });

    router.get('/project-timeline', (req, res) => {
        const { from, to, granularity = 'daily' } = req.query;

        let periodExpr;
        if (granularity === 'monthly') {
            periodExpr = "strftime('%Y-%m', date)";
        } else if (granularity === 'weekly') {
            periodExpr = "strftime('%Y-W%W', date)";
        } else {
            periodExpr = 'date';
        }

        let sql = `
      SELECT project, ${periodExpr} as period,
             SUM(message_count) as messages, SUM(session_count) as sessions
      FROM daily_stats WHERE project != 'all'`;
        const params = [];

        if (from) { sql += ' AND date >= ?'; params.push(from); }
        if (to) { sql += ' AND date <= ?'; params.push(to); }

        sql += ' GROUP BY project, period ORDER BY project, period';

        const rows = db.prepare(sql).all(...params);

        // Group by project
        const byProject = {};
        for (const row of rows) {
            if (!byProject[row.project]) {
                byProject[row.project] = [];
            }
            byProject[row.project].push({
                period: row.period,
                messages: row.messages,
                sessions: row.sessions,
            });
        }

        const data = Object.entries(byProject).map(([project, periods]) => ({
            project,
            periods,
        }));

        res.json({ success: true, data });
    });

    return router;
}
