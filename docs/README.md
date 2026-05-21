# 🛰️ AI Hot Radar

> 一款实时聚合多源 AI 资讯、AI 自动评分精选、生成每日日报的开源工具

## 📋 项目概述

面向 AI 行业从业者的热点雷达，本工具可以：
- 持续监控用户订阅的关键词与全网 AI 信息源
- AI 双阶段评分识别真伪、相关性与重要度
- 同事件多源去重，按权威性挑主条
- 每日自动生成 AI 日报
- 通过 RSS / API / Skill 三种方式对外输出

## 🎯 核心功能

### 1. 热点雷达
- 8+ 数据源持续抓取（RSS、搜索、社交媒体）
- 关键词预过滤跳过非 AI 内容
- 两阶段 AI 评分（便宜模型预筛 + 完整评分）
- 多源去重，按权威性挑主条

### 2. 精选 + AI 日报
- 经 AI 五维评分 + tier 加成 + 阈值过滤的高质量资讯流
- 每天北京时间 00:00 自动生成日报，六大板块覆盖模型 / 产品 / 行业 / 论文

### 3. 我的关注
- 订阅自定义关键词，AI 自动扩展同义词
- WebSocket 实时推送，重要热点触发邮件通知

### 4. Agent 接入
- Skill / RSS / REST API 三种方式
- 让 Claude Code、Cursor、Feedly、企业 IM 都能消费

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + Vite + TailwindCSS | 响应式、深浅色双主题 |
| 后端 | NestJS 11 + Express | 模块化 API 服务 |
| 数据库 | SQLite + Prisma | 轻量存储、ORM |
| AI 服务 | OpenAI 兼容协议 | 支持百炼 / 硅基流动 / DeepSeek 等 |
| 定时任务 | @nestjs/schedule | 定时抓取与日报生成 |
| 实时通信 | Socket.io | 前端实时推送 |
| 邮件 | Nodemailer | 重要热点邮件通知 |

## 📊 数据源

| 来源 | 方式 | 说明 |
|------|------|------|
| 网页搜索 | Bing / HackerNews 爬虫 | 无需 API，控制频率 |
| RSS 订阅 | rss-parser | DeepMind Blog、IT之家、雪球等 |
| Twitter/X | twitterapi.io | 17 个 KOL + 关键词搜索 |
| Bilibili | 自实现抓取 | totalrank 排序 + 质量过滤 |

## 📁 项目结构

```
ai-hot-radar/
├── docs/                    # 文档目录
│   ├── README.md            # 项目说明（本文件）
│   ├── LOCAL_SETUP.md       # 本地运行指南
│   ├── REQUIREMENTS.md      # 需求文档
│   └── API_INTEGRATION.md   # API 接入说明
├── server/                  # 后端服务（NestJS）
│   ├── src/
│   │   ├── agent/           # Agent 接入：RSS / API / Skill
│   │   ├── curated/         # 精选筛选
│   │   ├── digest/          # 日报生成
│   │   ├── entities/        # 关键词聚合
│   │   ├── hotspots/        # 热点抓取与评分
│   │   ├── keywords/        # 关键词管理
│   │   ├── rss-feeds/       # RSS 信源
│   │   ├── scheduler/       # 定时任务
│   │   └── notifications/   # 通知（WebSocket + 邮件）
│   └── prisma/              # Prisma ORM
├── client/                  # 前端应用
│   └── src/
│       ├── components/      # UI 组件（按视图分目录）
│       ├── hooks/           # 自定义 Hooks
│       ├── services/        # API / WebSocket
│       └── utils/
├── skills/hot-monitor/      # Agent Skill 包
└── .gitignore
```

## ⚙️ 配置说明

```env
# 数据库
DATABASE_URL="file:./dev.db"

# AI（兼容 OpenAI 协议的任意提供商）
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-coder-turbo

# Twitter API（可选）
TWITTER_API_KEY=your_twitter_api_key

# 邮件通知（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
NOTIFY_EMAIL=receive@example.com
```

## 🚀 快速开始

```bash
# 1. 安装依赖
cd server && npm install
cd ../client && npm install

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env 填入 API Keys

# 3. 初始化数据库
cd server && npx prisma generate && npx prisma db push

# 4. 启动服务（两个终端）
cd server && npm run dev   # http://localhost:3001
cd client && npm run dev   # http://localhost:5173
```

详细步骤参见 [LOCAL_SETUP.md](LOCAL_SETUP.md)。
