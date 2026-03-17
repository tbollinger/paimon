import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createDb } from './src/server/db.js';
import { startCollector } from './src/server/collector.js';
import { createStatsRouter } from './src/server/routes/stats.js';
import { createProjectsRouter } from './src/server/routes/projects.js';
import { createSessionsRouter } from './src/server/routes/sessions.js';
import { createConfigRouter } from './src/server/routes/config.js';
import { createBudgetRouter } from './src/server/routes/budget.js';
import { createActivityRouter } from './src/server/routes/activity.js';
import { createMemoryRouter } from './src/server/routes/memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Database
const db = createDb(join(__dirname, 'data', 'paimon.db'));

// API routes
app.use('/api/stats', createStatsRouter(db));
app.use('/api/projects', createProjectsRouter(db));
app.use('/api/sessions', createSessionsRouter(db));
app.use('/api/config', createConfigRouter(db));
app.use('/api/budget', createBudgetRouter(db));
app.use('/api/activity', createActivityRouter(db));
app.use('/api/memory', createMemoryRouter());

app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
});

// Serve built frontend
app.use(express.static(join(__dirname, 'dist')));

app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    }
});

// Start collector
startCollector(db);

app.listen(port, () => {
    console.log(`[pAImon] running on http://localhost:${port}`);
});
