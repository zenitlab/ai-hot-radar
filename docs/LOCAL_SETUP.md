# 🚀 本地运行指南

本文档手把手教你在本地跑起来 AI Hot Radar 的完整前后端。



## 📦 前置要求

| 工具 | 版本要求 | 检查命令 | 安装方式 |
|------|----------|----------|----------|
| Node.js | ≥ 18 | `node -v` | [官网下载](https://nodejs.org/en) |
| npm | ≥ 9 | `npm -v` | 随 Node.js 一起安装 |
| Git | 任意 | `git --version` | [官网下载](https://git-scm.com/) |

> 💡 推荐使用 Node.js 20 LTS 版本，稳定性最好。



## 第一步：克隆项目

```bash
git clone https://github.com/zenitlab/ai-hot-radar.git
cd ai-hot-radar
```

> 如果 GitHub 访问较慢，可以在 Gitee 上导入仓库后克隆。



## 第二步：获取 API Key

项目需要 **1 个必需的 API Key**，另外 2 个为可选。

### ✅ 必需：AI API Key（兼容 OpenAI 协议）

项目支持任意兼容 OpenAI 协议的 AI 服务，常见选择：

- **阿里云百炼**：[https://bailian.console.aliyun.com/](https://bailian.console.aliyun.com/)，新用户有免费额度
- **硅基流动**：[https://siliconflow.cn/](https://siliconflow.cn/)，开源模型为主，便宜
- **DeepSeek**：[https://platform.deepseek.com/](https://platform.deepseek.com/)
- **OpenAI 官方**：[https://platform.openai.com/](https://platform.openai.com/)

任选一家注册并创建 API Key 即可。配置时需要同时填写 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME` 三项（参考 `.env.example` 的注释）。

### 🔧 可选：Twitter API Key

配置后可以从 Twitter/X 获取国际热点信息，不配置也不影响其他信息源。

1. 打开 [https://twitterapi.io/](https://twitterapi.io/)，注册并登录
2. 进入 [Dashboard](https://twitterapi.io/dashboard)
3. 复制你的 API Key

### 🔧 可选：邮件通知

配置后系统会在发现高重要性热点时自动发送邮件提醒，不配置则只有浏览器实时推送。

需要准备 SMTP 邮箱信息（以 QQ 邮箱为例）：
- SMTP 地址：`smtp.qq.com`
- 端口：`465`
- 账号：你的 QQ 邮箱
- 密码：QQ 邮箱的 **授权码**（不是登录密码，在 QQ 邮箱 → 设置 → 账户 → 生成授权码）



## 第三步：配置环境变量

```bash
# 复制环境变量模板
cp server/.env.example server/.env
```

用任意文本编辑器打开 `server/.env` 文件，填入你的 API Key：

```env
# 数据库（无需修改）
DATABASE_URL="file:./dev.db"

# 服务器配置（无需修改）
PORT=3001
CLIENT_URL=http://localhost:3000

# ✅ 必填：AI 模型（兼容 OpenAI 协议）
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
MODEL_NAME=qwen-coder-turbo

# 🔧 选填：Twitter API（不填则不抓取 Twitter 数据）
TWITTER_API_KEY=你的twitter_api_key

# 🔧 选填：邮件通知（不填则不发送邮件，不影响使用）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=你的授权码
NOTIFY_EMAIL=接收通知的邮箱@example.com
```

> ⚠️ **注意**：`.env` 文件包含敏感信息，已被 `.gitignore` 排除，不会提交到代码仓库。



## 第四步：安装依赖

打开终端，分别安装前后端依赖：

```bash
# 安装后端依赖
cd server
pnpm install

# 安装前端依赖
cd ../client-next
pnpm install
```

> 💡 如果 pnpm install 速度慢，可以先切换为国内镜像：
> ```bash
> pnpm config set registry https://registry.npmmirror.com
> ```



## 第五步：初始化数据库

```bash
cd server
npx prisma generate
npx prisma db push
```

执行成功后，你会看到类似输出：

```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

> 💡 项目使用 SQLite 数据库，不需要额外安装数据库软件，Prisma 会自动在 `server/prisma/` 目录下创建 `dev.db` 文件。



## 第六步：启动项目

需要同时启动后端和前端，**打开两个终端窗口**：

**终端 1 — 启动后端：**

```bash
cd server
pnpm run dev
```

看到以下输出表示后端启动成功：

```
🔥 热点监控服务启动成功!
📡 Server running on http://localhost:3001
🔌 WebSocket ready
⏰ Hotspot check scheduled every 30 minutes
```

**终端 2 — 启动前端：**

```bash
cd client-next
pnpm run dev
```

看到以下输出表示前端启动成功：

```
▲ Next.js 16.x.x (Turbopack)

- Local:   http://localhost:3000
```



## 第七步：访问项目

打开浏览器，访问 **http://localhost:3000** ，你将看到 AI 热点监控工具的界面。

### 快速体验流程

1. 在页面的关键词输入框中输入一个关键词，比如 `Claude Opus 5`，点击添加
2. 系统会自动开始从多个信息源抓取相关内容（也可以点击手动触发搜索）
3. 等待几秒到几十秒，热点信息流中会出现 AI 分析后的热点结果
4. 你可以使用筛选栏按来源、重要性、时间范围过滤结果
5. 也可以切换排序方式（热度、相关性、时间）



## ❓ 常见问题

### Q1：后端启动时报错 `Cannot find module 'xxx'`

**原因**：依赖没有安装完整。

**解决**：重新安装依赖：
```bash
cd server
rm -rf node_modules
pnpm install
npx prisma generate
```

### Q2：前端页面打开后显示空白 / 接口报错

**原因**：前端代理和后端端口不一致。

**解决**：确认 `server/.env` 中的 `PORT` 和 `client-next/next.config.ts` 中 `rewrites` 的 target 端口一致（默认都是 `3001`）。

### Q3：热点搜索没有结果

**可能原因**：
1. AI API Key 未填写或额度不足 → 检查 `.env` 中的 `OPENAI_API_KEY` / `OPENAI_BASE_URL`
2. 关键词太冷门 → 尝试更热门的关键词，如 "AI"、"ChatGPT"
3. 网络问题导致搜索引擎爬虫失败 → 检查终端日志中是否有报错信息

### Q4：Twitter 信息源没有数据

**原因**：未配置 Twitter API Key，这是可选配置。

**解决**：在 `.env` 中填入 `TWITTER_API_KEY`，然后重启后端。不配置也不影响其他信息源（Bing、HackerNews、B 站等）的正常使用。

### Q5：`npx prisma db push` 报错

**原因**：Prisma 版本或 Node.js 版本不兼容。

**解决**：
```bash
# 确认 Node.js 版本 ≥ 18
node -v

# 重新生成 Prisma Client
npx prisma generate
npx prisma db push
```

### Q6：Windows 系统运行终端命令报错

**解决**：建议在 VSCode 中把默认终端改为 Git Bash，或使用 PowerShell。避免使用 CMD，因为部分命令在 CMD 中不兼容。

### Q7：如何查看数据库中的数据？

```bash
cd server
npx prisma studio
```

浏览器会自动打开 Prisma Studio（默认 http://localhost:5555），可以可视化查看和编辑数据库内容。



## 🛑 停止项目

在各终端窗口按 `Ctrl + C` 即可停止前后端服务。

数据库文件（`server/prisma/dev.db`）会保留，下次启动时数据不会丢失。



## 📌 端口汇总

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| 后端 API | 3001 | Express + Socket.io |
| 前端页面 | 3000 | Next.js 开发服务器 |
| Prisma Studio | 5555 | 数据库可视化（可选） |
