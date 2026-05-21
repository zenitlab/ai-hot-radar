# 🛰️ AI Hot Radar

<p align="center">
  <a href="#-简体中文">简体中文</a> ·
  <a href="#-english">English</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/zhangzhenchang/ai-hot-radar?color=blue">
  <img alt="Stars" src="https://img.shields.io/github/stars/zhangzhenchang/ai-hot-radar?style=flat&logo=github">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/zhangzhenchang/ai-hot-radar?color=orange">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A518-43853d?logo=node.js&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
</p>

---

## 🇨🇳 简体中文

> 一款实时聚合多源 AI 资讯、AI 自动评分精选、生成每日日报的开源工具。

### 一、项目简介

AI Hot Radar 是一个面向 AI 行业从业者的热点雷达。系统持续从 Twitter / X、Bing、HackerNews、IT之家、雪球、Bilibili、Google DeepMind Blog 等 8+ 信息源抓取最新资讯，通过两阶段 AI 评分（便宜模型预筛 + 完整评分）筛掉噪音，把真正值得看的内容沉淀到「精选」「AI 日报」「我的关注」三个视图中。

技术栈：

- **后端**：NestJS 11 + Express + Prisma + SQLite + Socket.io
- **前端**：React 19 + Vite + TailwindCSS + lucide-react
- **AI**：兼容 OpenAI 协议的任意模型（阿里云百炼 / 硅基流动 / DeepSeek / OpenAI 均可）
- **数据源**：RSS、Bing/HackerNews 搜索、twitterapi.io、Bilibili 抓取

### 二、核心功能

#### 1. 热点雷达（多源聚合 + AI 评分）

- 8+ 信息源持续抓取，关键词预过滤跳过非 AI 内容（IT之家 / 36氪 / 财联社等综合源）
- 两阶段评分：便宜模型预筛 → 完整评分，节省 AI 调用成本
- 同事件多源去重，按权威性挑主条（OpenAI Blog 优先于 V2EX 转发）
- 默认按真实发布时间排序，每天凌晨 03:30 自动清理 30 天前数据

#### 2. 精选模式

经 AI 五维评分 + tier 加成 + 阈值过滤后的高质量资讯流，按重要度排序。

#### 3. AI 日报

每天北京时间 00:00 自动生成，包含「今日重点 / 模型情报 / 国内国外动态 / AI 产品 / 社区热议 / 论文趋势」六大板块，可手动重新生成。

#### 4. 我的关注

订阅自定义关键词，AI 自动扩展同义词、判断真伪与相关性。订阅后实时通过 WebSocket 推送，重要热点可触发邮件通知。

#### 5. Agent 接入

把整个系统封装为三种接入方式，让 AI 应用 / RSS 阅读器 / 第三方服务都能消费：

- **Skill**：在 Claude Code、Cursor 等支持 Skills 的工具中 `/install-skill`，AI 助手自动获得「查日报、查精选、按关键词搜索」能力
- **RSS**：精选 / 全量 / 日报三个 RSS Feed，可被 Feedly、Inoreader 等订阅
- **REST API**：5 个无认证 JSON 接口，可直接接入飞书机器人、企业微信、自动化工作流

### 三、快速开始

> 详细的本地运行说明见 [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)。

#### 前置条件

- Node.js ≥ 18（推荐 20 LTS）
- 一个兼容 OpenAI 协议的 AI API Key（阿里云百炼 / 硅基流动 / DeepSeek 任选其一）

#### 1. 克隆并安装

```bash
git clone https://github.com/zhangzhenchang/ai-hot-radar.git
cd ai-hot-radar

cd server && npm install && npx prisma generate && npx prisma db push
cd ../client && npm install
```

#### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，至少填入 AI Key：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-coder-turbo

# 可选
TWITTER_API_KEY=your_twitter_api_key_here
```

#### 3. 启动（两个终端）

```bash
# 终端 1
cd server && npm run dev   # http://localhost:3001

# 终端 2
cd client && npm run dev   # http://localhost:5173
```

打开 http://localhost:5173，即可看到主界面。

| 服务          | 地址                             |
| ------------- | -------------------------------- |
| 前端页面      | http://localhost:5173            |
| 后端 API      | http://localhost:3001            |
| Prisma Studio | `cd server && npx prisma studio` |

### 四、项目结构

```
ai-hot-radar/
├── client/              # React 前端
│   └── src/components/
│       ├── curated/     # 精选
│       ├── hotspot/     # 热点雷达
│       ├── digest/      # AI 日报
│       ├── keywords/    # 我的关注
│       ├── agent/       # Agent 接入
│       └── changelog/   # 更新日志
├── server/              # NestJS 后端
│   └── src/
│       ├── agent/       # Agent 接入：RSS / API / Skill
│       ├── curated/     # 精选筛选
│       ├── digest/      # 日报生成
│       ├── entities/    # 关键词聚合
│       ├── hotspots/    # 热点抓取与评分
│       ├── keywords/    # 关键词管理
│       ├── rss-feeds/   # RSS 信源
│       ├── scheduler/   # 定时任务
│       └── notifications/
├── skills/hot-monitor/  # Agent Skill 包
└── docs/                # 项目文档
```

### 五、Agent 接入示例

启动服务后，所有 Agent 接口已可用：

```bash
# 精选 RSS
curl http://localhost:3001/api/agent/rss/curated.xml

# 查询今日 AI 日报
curl http://localhost:3001/api/agent/digest

# 按关键词搜索
curl "http://localhost:3001/api/agent/search?q=Claude&limit=5"

# Skill 描述
curl http://localhost:3001/aihot-skill
```

更多用法见前端「Agent 接入」页。

### 六、License

MIT

<p align="right"><a href="#-ai-hot-radar">⬆ 回到顶部</a></p>

---

## 🇬🇧 English

> A real-time, multi-source AI news radar with AI-driven curation and daily digests.

### 1. Overview

AI Hot Radar is a hotspot tracker built for AI practitioners. It continuously pulls from 8+ sources — Twitter / X, Bing, HackerNews, IT Home, Xueqiu, Bilibili, Google DeepMind Blog and more — then runs a two-stage AI scoring pipeline (cheap pre-filter + full scoring) to drop noise and surface only what's worth reading. Results land in three views: **Curated**, **Daily Digest**, and **My Keywords**.

**Stack**

- **Backend**: NestJS 11 + Express + Prisma + SQLite + Socket.io
- **Frontend**: React 19 + Vite + TailwindCSS + lucide-react
- **AI**: any OpenAI-compatible model (DashScope / SiliconFlow / DeepSeek / OpenAI)
- **Sources**: RSS, Bing / HackerNews scraping, twitterapi.io, Bilibili

### 2. Features

#### 2.1 Hotspot Radar

- 8+ ingestion sources, with keyword pre-filter to drop non-AI items from general feeds (IT Home, 36Kr, etc.)
- Two-stage AI scoring: cheap model pre-filter, full scorer for survivors — saves on AI cost
- Cross-source dedup with authority weighting (OpenAI Blog beats a V2EX repost)
- Sorted by actual publish time, automatic 30-day cleanup at 03:30 daily

#### 2.2 Curated

A high-quality stream filtered by 5-axis AI scoring + source-tier bonus + threshold cut, ranked by importance.

#### 2.3 Daily Digest

Auto-generated at 00:00 Beijing time. Six sections: Top Stories, Model Intel, Domestic, International, AI Products, Community, Papers. Manual regeneration supported.

#### 2.4 My Keywords

Subscribe to custom keywords; AI expands synonyms and judges authenticity / relevance. Updates pushed live via WebSocket; high-importance hits trigger email notifications.

#### 2.5 Agent Integrations

The system exposes itself in three ways for AI apps, RSS readers, and third-party services:

- **Skill** — install on Claude Code, Cursor, or other Skill-aware tools (`/install-skill`); the AI assistant gains "query digest / curated / search by keyword" capabilities
- **RSS** — three feeds (curated / all / digest), ready for Feedly, Inoreader, etc.
- **REST API** — five auth-free JSON endpoints, drop-in for Feishu / WeCom bots and automation pipelines

### 3. Quick Start

> Full setup walkthrough: [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

**Prerequisites**

- Node.js ≥ 18 (20 LTS recommended)
- One OpenAI-compatible API key (DashScope / SiliconFlow / DeepSeek / OpenAI)

**Install**

```bash
git clone https://github.com/zhangzhenchang/ai-hot-radar.git
cd ai-hot-radar

cd server && npm install && npx prisma generate && npx prisma db push
cd ../client && npm install
```

**Configure**

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

**Run (two terminals)**

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

### 4. Project Structure

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

### 5. Agent Endpoints

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

### 6. License

MIT

<p align="right"><a href="#-ai-hot-radar">⬆ Back to top</a></p>
