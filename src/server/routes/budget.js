import { Router } from 'express';
import { getConfig, setConfig } from '../db.js';

export function createBudgetRouter(db) {
    const router = Router();

    router.get('/', (req, res) => {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = today.slice(0, 7) + '-01';

        const dailySpend = db.prepare(
            'SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM daily_stats WHERE date = ? AND project = ?',
        ).get(today, 'all');

        const monthlySpend = db.prepare(
            'SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM daily_stats WHERE date >= ? AND project = ?',
        ).get(monthStart, 'all');

        const dailyBudget = parseFloat(getConfig(db, 'daily_budget_usd') || '0');
        const monthlyBudget = parseFloat(getConfig(db, 'monthly_budget_usd') || '0');

        res.json({
            success: true,
            data: {
                daily: {
                    spent: dailySpend.total,
                    budget: dailyBudget,
                    percent: dailyBudget > 0 ? (dailySpend.total / dailyBudget) * 100 : 0,
                },
                monthly: {
                    spent: monthlySpend.total,
                    budget: monthlyBudget,
                    percent: monthlyBudget > 0 ? (monthlySpend.total / monthlyBudget) * 100 : 0,
                },
            },
        });
    });

    router.put('/thresholds', (req, res) => {
        const { daily_budget_usd, monthly_budget_usd } = req.body;
        if (daily_budget_usd !== undefined) setConfig(db, 'daily_budget_usd', String(daily_budget_usd));
        if (monthly_budget_usd !== undefined) setConfig(db, 'monthly_budget_usd', String(monthly_budget_usd));
        res.json({ success: true, data: { daily_budget_usd, monthly_budget_usd } });
    });

    return router;
}
