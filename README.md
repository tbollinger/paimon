# pAImon

A self-updating dashboard for monitoring your Claude Code usage, costs, and session history.

pAImon reads your local Claude Code data files (`~/.claude/`), ingests them into a SQLite database, and serves a black-and-white dithered dashboard that updates every 5 minutes.

## What It Reads

pAImon reads from your local Claude Code config directory (default `~/.claude/`):

| File | What It Contains |
|------|-----------------|
| `~/.claude/stats-cache.json` | Aggregated daily activity, model token counts, and session metrics |
| `~/.claude/history.jsonl` | Per-message history with timestamps, projects, and session IDs |
| `~/.claude/projects/*/[sessionId].jsonl` | Full conversation transcripts (user prompts + Claude responses) |

Nothing is sent anywhere. All data stays local in a SQLite database at `data/paimon.db`.

## Features

- **Usage charts** - Messages, sessions, and tool calls over time (daily/weekly/monthly)
- **Project breakdown** - Per-project message counts, session counts, and estimated costs
- **Model breakdown** - Cost and usage split across Opus, Sonnet, Haiku with dithered pie chart
- **Session browser** - Recent sessions table with copyable session IDs (`claude --resume`)
- **Conversation viewer** - Full chat-style modal showing your prompts and Claude's responses
- **Budget alerts** - Visual warnings when daily or monthly spend exceeds thresholds
- **Cost estimation** - Calculates approximate costs from token counts and model pricing
- **Auto-refresh** - Background collector ingests new data every 5 minutes

## Quick Start

Requires **Node.js 18+**.

```bash
git clone <repo-url> paimon
cd paimon
npm install
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For development with hot reload:

```bash
npm run dev
```

This starts both the API server (port 3000) and Vite dev server (port 5173) concurrently.

## Configuration

Copy the example and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `REFRESH_INTERVAL` | `5` | Minutes between data collection cycles |
| `RETENTION_DAYS` | `90` | How many days of data to keep |
| `CLAUDE_HOME` | `~/.claude` | Path to your Claude Code config directory |
| `ANTHROPIC_API_KEY` | _(none)_ | Optional: enables real cost data from the Anthropic API |
| `DAILY_BUDGET_USD` | _(none)_ | Optional: daily spend limit for budget alerts |
| `MONTHLY_BUDGET_USD` | _(none)_ | Optional: monthly spend limit for budget alerts |

All settings have sensible defaults. pAImon works out of the box if `~/.claude` exists.

## How It Works

1. **Collector** runs on startup and every `REFRESH_INTERVAL` minutes
2. Reads `stats-cache.json` for aggregate metrics and `history.jsonl` for detailed message history
3. Groups messages into sessions (by explicit session ID, or by 30-minute gap threshold)
4. Calculates estimated costs from model token counts and pricing tiers
5. Upserts everything into SQLite with WAL mode for safe concurrent reads
6. Frontend fetches from the API and renders charts with Recharts

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/stats/daily` | Daily stats (filterable by date range, project, model) |
| `GET /api/stats/weekly` | Weekly aggregation |
| `GET /api/stats/monthly` | Monthly aggregation |
| `GET /api/projects` | All projects with totals |
| `GET /api/projects/:name/stats` | Per-project daily stats |
| `GET /api/sessions` | Paginated session list |
| `GET /api/sessions/:id` | Single session details |
| `GET /api/sessions/:id/conversation` | Full conversation turns from JSONL |
| `GET /api/config` | Current configuration |
| `PUT /api/config` | Update configuration |
| `GET /api/config/status` | Collection status and health |
| `GET /api/budget` | Current spend vs. budget thresholds |
| `PUT /api/budget/thresholds` | Set budget limits |

All endpoints return `{ success: boolean, data: ... }`.

## Tech Stack

- **Backend** - Node.js, Express 5, better-sqlite3
- **Frontend** - React 19, Recharts 3, Vite 7
- **Database** - SQLite with WAL journaling
- **Testing** - Vitest, React Testing Library

## Running Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
```

## License

MIT - See [LICENSE](LICENSE) for details.
