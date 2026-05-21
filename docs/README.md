# 🔥 热点监控工具 (Yupi Hot Monitor)

> 一款自动发现热点、智能识别真假内容、实时推送通知的 AI 工具

## 📋 项目概述

作为 AI 编程博主，需要第一时间获取热点信息（如 AI 大模型更新），本工具可以：
- 自动监控指定关键词的热点变化
- 利用 AI 识别假冒内容
- 第一时间发送通知
- 定期收集指定范围内的热点信息

## 🎯 核心功能

### 1. 关键词监控
- 用户输入要监控的关键词
- 当关键词相关内容出现时，利用 AI 识别真假
- 第一时间发送通知

### 2. 热点收集
- 每 30 分钟自动收集指定范围内的热点
- 多数据源聚合，确保信息全面
- AI 分析热点价值和可信度

### 3. 通知系统
- 浏览器实时推送 (WebSocket)
- 邮件通知 (SMTP)

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + Vite + TailwindCSS | 响应式、赛博朋克风格 UI |
| 后端 | Node.js + Express | 轻量级 API 服务 |
| 数据库 | SQLite + Prisma | 轻量存储、ORM |
| AI 服务 | OpenRouter API | 热点验证、内容分析 |
| 定时任务 | node-cron | 定时热点抓取 |
| 实时通信 | Socket.io | 浏览器推送 |
| 邮件 | Nodemailer | 邮件通知 |

## 📊 数据源

| 来源 | 方式 | 说明 |
|------|------|------|
| 网页搜索 | Bing/Google 爬虫 | 无需 API，控制频率 |
| Twitter/X | twitterapi.io | 官方 API 接口 |
| 聚合处理 | 多源去重 + AI 分析 | 确保信息质量 |

## 📁 项目结构

```
ai-hot-radar/
├── docs/                    # 文档目录
│   ├── README.md           # 项目说明
│   ├── REQUIREMENTS.md     # 需求文档
│   └── API.md              # API 文档
├── server/                  # 后端服务
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   │   ├── search/     # 搜索服务
│   │   │   ├── twitter/    # Twitter 服务
│   │   │   ├── ai/         # AI 分析服务
│   │   │   └── notify/     # 通知服务
│   │   ├── jobs/           # 定时任务
│   │   ├── db/             # 数据库
│   │   └── utils/          # 工具函数
│   ├── prisma/             # Prisma ORM
│   └── package.json
├── client/                  # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── services/       # API 调用
│   │   └── styles/         # 样式
│   └── package.json
├── skills/                  # Agent Skills
│   └── SKILL.md            # 技能描述
└── .env.example            # 环境变量模板
```

## ⚙️ 配置说明

```env
# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_key

# Twitter API (twitterapi.io)
TWITTER_API_KEY=your_twitter_api_key

# 邮件通知
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
NOTIFY_EMAIL=receive@example.com

# 监控配置
MONITOR_INTERVAL=1800000  # 30分钟 (毫秒)
```

## 🚀 快速开始

```bash
# 1. 安装依赖
cd server && npm install
cd client && npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入你的 API Keys

# 3. 初始化数据库
cd server && npx prisma migrate dev

# 4. 启动服务
cd server && npm run dev
cd client && npm run dev
```

## 📝 开发日志

- [ ] 项目初始化
- [ ] 后端 API 开发
- [ ] 数据源对接
- [ ] AI 集成 (OpenRouter)
- [ ] 前端页面开发
- [ ] 通知系统开发
- [ ] 测试与验收
- [ ] Agent Skills 封装
