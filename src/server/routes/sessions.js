import { Router } from 'express';

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

    return router;
}
