import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve built frontend in production
app.use(express.static(join(__dirname, 'dist')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`[pAImon] running on http://localhost:${port}`);
});
