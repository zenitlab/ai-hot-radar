# 🛰️ AI Hot Radar

<p align="center">
  <a href="README.md">简体中文</a> ·
  <strong>English</strong>
</p>

<p align="center">
  <a href="https://aihotradar.com"><strong>🌐 Live demo at aihotradar.com</strong></a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/zenitlab/ai-hot-radar?color=blue">
  <img alt="Stars" src="https://img.shields.io/github/stars/zenitlab/ai-hot-radar?style=flat&logo=github">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/zenitlab/ai-hot-radar?color=orange">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A518-43853d?logo=node.js&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
</p>

> A real-time, multi-source AI news radar with AI-driven curation and daily digests.

## 1. Overview

AI Hot Radar is a hotspot tracker built for AI practitioners. Every 10 minutes it pulls from 20+ sources — Twitter / X, Bing, HackerNews, IT Home, Xueqiu, Bilibili, Google DeepMind Blog and more — then runs a two-stage AI scoring pipeline (short pre-filter prompt + full 5-dim scoring) to drop noise and surface only what's worth reading.

**Stack**

- **Backend**: NestJS 11 + Express + Prisma + SQLite + Socket.io
- **Frontend**: React 19 + Vite + TailwindCSS + lucide-react
- **AI**: any OpenAI-compatible model (DashScope / SiliconFlow / DeepSeek / OpenAI)
- **Sources**: RSS, Bing / HackerNews scraping, twitterapi.io, Bilibili

## 2. Features

### 2.1 Hotspot Radar

- 8+ ingestion sources, with keyword pre-filter to drop non-AI items from general feeds (IT Home, 36Kr, etc.)
- Two-stage AI scoring: cheap model pre-filter, full scorer for survivors — saves on AI cost
- Cross-source dedup with authority weighting (OpenAI Blog beats a V2EX repost)
- Sorted by actual publish time, automatic 30-day cleanup at 03:30 daily

### 2.2 Curated

A high-quality stream filtered by 5-axis AI scoring + source-tier bonus + threshold cut, ranked by importance.

### 2.3 Daily Digest

Auto-generated at 08:00 Beijing time every morning. Six sections: Top Stories, Model Intel, Domestic, International, AI Products, Community, Papers. Manual regeneration supported.

### 2.4 My Keywords

Subscribe to custom keywords; AI expands synonyms and judges authenticity / relevance. Updates pushed live via WebSocket; high-importance hits trigger email notifications.

### 2.5 Agent Integrations

The system exposes itself in three ways for AI apps, RSS readers, and third-party services:

- **Skill** — install on Claude Code, Cursor, or other Skill-aware tools (`/install-skill`); the AI assistant gains "query digest / curated / search by keyword" capabilities
- **RSS** — three feeds (curated / all / digest), ready for Feedly, Inoreader, etc.
- **REST API** — five auth-free JSON endpoints, drop-in for Feishu / WeCom bots and automation pipelines

## 3. Quick Start

> Local dev: [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).
> Docker deploy: [docs/DEPLOY.md](docs/DEPLOY.md).

### Prerequisites

- Node.js ≥ 18 (20 LTS recommended)
- One OpenAI-compatible API key (DashScope / SiliconFlow / DeepSeek / OpenAI)

### Install

```bash
git clone https://github.com/zenitlab/ai-hot-radar.git
cd ai-hot-radar

cd server && npm install && npx prisma generate && npx prisma db push
cd ../client && npm install
```

### Configure

```bash
cp server/.env.example server/.env
```

Edit `server/.env`, fill in at least the AI key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-coder-turbo

# optional
TWITTER_API_KEY=your_twitter_api_key_here
```

### Run (two terminals)

```bash
# terminal 1
cd server && npm run dev   # http://localhost:3001

# terminal 2
cd client && npm run dev   # http://localhost:5173
```

Open http://localhost:5173 to use the app.

| Service       | URL                              |
| ------------- | -------------------------------- |
| Frontend      | http://localhost:5173            |
| Backend API   | http://localhost:3001            |
| Prisma Studio | `cd server && npx prisma studio` |

## 4. Project Structure

```
ai-hot-radar/
├── client/              # React frontend
│   └── src/components/
│       ├── curated/
│       ├── hotspot/
│       ├── digest/
│       ├── keywords/
│       ├── agent/
│       └── changelog/
├── server/              # NestJS backend
│   └── src/
│       ├── agent/       # RSS / API / Skill exports
│       ├── curated/
│       ├── digest/
│       ├── entities/
│       ├── hotspots/    # ingestion + scoring
│       ├── keywords/
│       ├── rss-feeds/
│       ├── scheduler/
│       └── notifications/
├── skills/hot-monitor/  # Agent Skill bundle
└── docs/
```

## 5. Agent Endpoints

Once the server is running:

```bash
# Curated RSS
curl http://localhost:3001/api/agent/rss/curated.xml

# Today's digest
curl http://localhost:3001/api/agent/digest

# Keyword search
curl "http://localhost:3001/api/agent/search?q=Claude&limit=5"

# Skill descriptor
curl http://localhost:3001/aihot-skill
```

Full reference is on the in-app **Agent** page.

## 6. License

MIT
