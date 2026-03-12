import { Router } from 'express';
import { setConfig, getConfig } from '../db.js';

export function createConfigRouter(db) {
    const router = Router();

    const CONFIG_KEYS = ['refresh_interval', 'retention_days', 'daily_budget_usd', 'monthly_budget_usd'];

    router.get('/', (req, res) => {
        const config = {};
        for (const key of CONFIG_KEYS) {
            config[key] = getConfig(db, key);
        }
        res.json({ success: true, data: config });
    });

    router.put('/', (req, res) => {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            if (CONFIG_KEYS.includes(key)) {
                setConfig(db, key, String(value));
            }
        }
        res.json({ success: true, data: updates });
    });

    router.get('/status', (req, res) => {
        const status = {
            last_collection_at: getConfig(db, 'last_collection_at'),
            last_collection_error: getConfig(db, 'last_collection_error'),
            data_source: getConfig(db, 'data_source') || 'local',
        };
        res.json({ success: true, data: status });
    });

    router.get('/theme', (req, res) => {
        const dithered = (process.env.DITHERED_BACKGROUND || 'true').toLowerCase();
        res.json({ success: true, data: { dithered_background: dithered === 'true' || dithered === '1' } });
    });

    return router;
}
