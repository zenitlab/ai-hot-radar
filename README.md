# 🛰️ AI Hot Radar

<p align="center">
  <strong>简体中文</strong> ·
  <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://aihotradar.com"><strong>🌐 在线体验 aihotradar.com</strong></a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/zenitlab/ai-hot-radar?color=blue">
  <img alt="Stars" src="https://img.shields.io/github/stars/zenitlab/ai-hot-radar?style=flat&logo=github">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/zenitlab/ai-hot-radar?color=orange">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A518-43853d?logo=node.js&logoColor=white">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
</p>

> 一款实时聚合多源 AI 资讯、AI 自动评分精选、生成每日日报的开源工具。

## 一、项目简介

AI Hot Radar 是一个面向 AI 行业从业者的热点雷达。系统白天每 30 分钟、夜间每小时从 Twitter / X、Bing、HackerNews、IT之家、雪球、Bilibili、Google DeepMind Blog 等 20+ 信息源抓取最新资讯，通过两阶段 AI 评分（短 prompt 预筛 + 5 维评分）筛掉噪音，把真正值得看的内容沉淀到「精选」「AI 日报」「我的关注」三个视图中。

技术栈：

- **后端**：NestJS 11 + Express + Prisma + SQLite + Socket.io
- **前端**：Next.js 15 + React 19 + TailwindCSS + lucide-react
- **AI**：兼容 OpenAI 协议的任意模型（阿里云百炼 / 硅基流动 / DeepSeek / OpenAI 均可），也支持腾讯云开发 CloudBase
- **数据源**：68 个 RSS（官方博客、媒体、个人通讯、arXiv、中文资讯）、Bing/HackerNews 搜索、twitterapi.io、Bilibili 抓取。RSS 列表在 `server/src/rss-feeds/feeds.config.ts`，级别决定入选门槛：T1 官方一手（只放纯 AI 的源，不过预筛）、T1.5 优质媒体与工程博客、T2 个人与社区

## 二、核心功能

界面设计规范见根目录 [DESIGN.md](DESIGN.md)：顶部导航、冷灰绿配色、热度色阶，以及刻意不用的做法（渐变、彩色图标、装饰小标签等）。首页改版样稿在 `design/mockups/`（`python3 design/mockups/build.py` 用线上数据重新生成）。

### 1. 热点雷达（多源聚合 + AI 评分）

- 20+ 信息源持续抓取，关键词预过滤跳过非 AI 内容（IT之家 / 36氪 / 财联社等综合源）
- 两阶段评分：便宜模型预筛 → 完整评分，节省 AI 调用成本
- 同事件多源去重，按权威性挑主条（OpenAI Blog 优先于 V2EX 转发）
- 「多源热议」：48 小时内被 2 家以上独立来源报道的事件，按跨源热度排序（每家来源按 24 小时半衰期衰减后相加），标注「新」「上升」
- 事件详情页 `/story/<key>`：同一事件的全部报道按时间线排列，一手来源单独列出，最早的报道标「首报」，标题几乎一样的近似转述折叠到最早那篇下面；多源事件带一段「事件概览」，由 AI 综合全部报道写成，并分出「已确认 / 尚未确认 / 为什么重要」三组要点（每个事件 1 次调用，来源增加后才重写；每条要点单独过防编造检查，尚未确认的必须写明是谁说的）
- 热点榜 `/hot`：过去 48 小时热度前 10 的事件，带 6 小时涨跌（`changePct`）和「爆」（6 小时内热度涨 50% 以上）「新」（首报 6 小时内）「发酵中」标记，前 3 名展开事件概览
- 主题页 `/topics`、`/topics/<slug>`：主题定义在 `server/src/topics/topics.config.ts`（公司按标题匹配，技术方向按标题或标签匹配，内容类型按分类），列出近 30 天精选，不调用 AI。slug 是公开网址，可以新增，不要改名。卡片图标在 `client-next/components/topics/TopicIcon.tsx`：公司主题用 `client-next/lib/brandIcons.ts` 里的品牌标志（取自 MIT 许可的 [@lobehub/icons](https://github.com/lobehub/lobe-icons)），其他主题用 lucide 图标；新增主题时记得补图标，否则显示默认的 #
- 内容详情页 `/items/<id>`：中文标题、AI 导读、推荐理由、同一事件的其他报道
- 补抓原文（`server/src/services/article-fetch.service.ts`）：正文不足 300 字、且通过预筛的内容，先读取原文页面（取前 3000 字）再评分，不增加 AI 调用。遵守 robots.txt，每次最多 4 个并发、10 秒超时，失败就按原有内容评分；会拒绝内网和云厂商元数据地址；Bing 跳转链接会先还原成真实地址；原文只给模型看，不入库、不展示。设 `ARTICLE_FETCH_ENABLED=false` 关闭
- 写作规则（`server/src/utils/writing-rules.ts`）：中文标题必须点出主体、摘要第一句先给答案、只写原文有的事实；模型输出再经代码核对，原文没有的产品名、版本号、年份会被拦下或删除，原文很短时摘要只留一句
- 默认按真实发布时间排序，每天凌晨 03:30 自动清理 30 天前数据

### 2. 精选模式

经 AI 五维评分（按内容类型换权重，压制例行更新、软文、预告），再按来源等级的入选门槛（官方一手 45 / 官方账号 57 / 媒体与个人 68）过滤后的高质量资讯流。

首页 `/curated`：顶部「此刻在发酵的事」是热点榜前 6，条形长度是相对热度、颜色是绝对热度档位；下面是最近 7 天的精选，按北京时间分日、新的在前，每次加载 40 条，所以凌晨也不会空白；每条左侧的色条和「N 家来源」来自 `/api/curated` 返回的 `sourceCount`（同一事件的独立来源数）。右栏是最新一期日报和按公司进入的主题。

### 3. AI 日报

每天北京时间早上 8:00 自动生成，包含「今日重点 / 模型情报 / 国内国外动态 / AI 产品 / 社区热议 / 论文趋势」六大板块和「快讯」，可手动重新生成。

入选和排序按规则完成，不调模型（`server/src/utils/digest-compose.ts`）：
- 一件事只出一条；按重要性排序：AI 评分 + 当天报道的独立来源数（每多一家 +4，最多 +16）+ 官方一手发布（+5）
- 官方发布且当天有 3 家以上来源报道的事件，即使没有进精选也会补进来
- 最近 7 天报过的事件，只有官方又发布了新内容、或累计 4 家以上来源时才再出现，并降低排序（-10）
- 同一来源最多 2 条；前 12 条交给模型写成各板块，之后最多 10 条按原标题列为「快讯」

生成时间：08:05 生成当天这期（定时任务挂在 `DigestService.scheduledDigest` 上，`digestSchedule.test.ts` 会检查它没有挂错方法）。模型调用走 `AiService`，和扫描共用同一个排队与 429 重试。模型失败时先用规则拼一份兜底日报（只收已有中文标题的条目，标记 `fallback: true`），08:35 和 09:35 各自动重试一次。

### 标题中 / 原切换

顶栏右上角的「中 / 原」切换资讯标题显示中文翻译还是信源原文，选择存在读者浏览器里（`aihot-title-mode`），页面加载前由 `app/layout.tsx` 的内联脚本恢复，不闪烁。实现：`components/common/ItemTitle.tsx` 同时输出两种标题，`globals.css` 按 `<html data-title-mode>` 显示其一。不需要额外模型调用。

### 中文翻译补齐

评分时模型会写中文标题和摘要，但少数英文信源的条目会缺。`server/src/hotspots/translate.job.ts` 每小时 20、50 分把最近 72 小时缺中文标题或中文摘要的条目攒起来，一次调用翻译 20 条（`TRANSLATE_PER_RUN`，默认 20，设 0 关闭），结果过同一套防编造检查，不合格就保留原文。产品名、模型名、人名保留原文写法。

### 4. 我的关注

订阅自定义关键词，AI 自动扩展同义词、判断真伪与相关性。订阅后实时通过 WebSocket 推送，重要热点可触发邮件通知。关注列表全站共用一份，访客只能查看，增删由管理员操作（见下方「管理员口令」）。

### 5. Agent 接入

把整个系统封装为三种接入方式，让 AI 应用 / RSS 阅读器 / 第三方服务都能消费：

- **Skill**：对 Claude Code 等 AI 助手说「请阅读 https://aihotradar.com/skill.md 并按其中的说明安装为 skill」，它会把 `/skill.md`（标准 SKILL.md 格式，见 `client-next/app/skill.md/route.ts`）存为自己的 skill，之后能查日报、热点榜、事件详情、主题动态、精选和搜索。旧链接 `/aihot-skill` 308 跳转到 `/skill.md`
- **RSS**：精选 / 全量 / 日报三个 RSS Feed，可被 Feedly、Inoreader 等订阅
- **REST API**：无认证 JSON 接口（日报、热点榜、事件详情、主题、精选 `?days=`、搜索、统计），可直接接入飞书机器人、企业微信、自动化工作流；完整列表见 `client-next/public/llms.txt`

## 三、快速开始

> 详细的本地运行说明见 [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)；
> 服务器 Docker 部署见 [docs/DEPLOY.md](docs/DEPLOY.md)；本地一键发版到 Docker Hub 用 `./release.sh`。

### 前置条件

- Node.js ≥ 18（推荐 20 LTS）
- 一个 AI API Key：兼容 OpenAI 协议的服务（阿里云百炼 / 硅基流动 / DeepSeek 任选其一），或腾讯云开发 CloudBase

### 1. 克隆并安装

```bash
git clone https://github.com/zenitlab/ai-hot-radar.git
cd ai-hot-radar

cd server && pnpm install && npx prisma generate && npx prisma db push
cd ../client-next && pnpm install
```

### 2. 配置环境变量

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

使用腾讯云开发 CloudBase AI（例如只允许 SDK 调用的小程序成长计划）时，改为：

```env
LLM_PROVIDER=cloudbase
CLOUDBASE_ENV=your_cloudbase_env_id
OPENAI_API_KEY=your_cloudbase_api_key
MODEL_NAME=hy3
```

### 3. 启动（两个终端）

```bash
# 终端 1
cd server && pnpm run dev   # http://localhost:3001

# 终端 2
cd client-next && pnpm run dev   # http://localhost:3000
```

打开 http://localhost:3000，即可看到主界面。

| 服务          | 地址                             |
| ------------- | -------------------------------- |
| 前端页面      | http://localhost:3000            |
| 后端 API      | http://localhost:3001            |
| Prisma Studio | `cd server && npx prisma studio` |

## 四、项目结构

```
ai-hot-radar/
├── client-next/         # Next.js 前端（App Router）
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

## 五、Agent 接入示例

启动服务后，所有 Agent 接口已可用：

```bash
# 精选 RSS
curl http://localhost:3001/api/agent/rss/curated.xml

# 查询今日 AI 日报
curl http://localhost:3001/api/agent/digest

# 按关键词搜索
curl "http://localhost:3001/api/agent/search?q=Claude&limit=5"

# 近 1 天精选
curl "http://localhost:3001/api/agent/curated?days=1&limit=5"

# Skill（前端提供）
curl http://localhost:3000/skill.md
```

更多用法见前端「Agent 接入」页。

## 六、生产部署与发版

> 完整说明见 [docs/DEPLOY.md](docs/DEPLOY.md) 与 [docs/DEPLOY-NEXTJS.md](docs/DEPLOY-NEXTJS.md)，这里只列日常发版流程与踩过的坑。

### 架构

```
公网 HTTPS(443)
   └─ 宿主机 nginx（宝塔面板，SSL + 反代）
        ├─ location /      → 127.0.0.1:8080  前端容器（Next.js standalone）
        └─ location /api/  → 127.0.0.1:3001  后端容器（NestJS）
```

前端镜像 `zenitlab/ai-hot-radar-frontend:latest`、后端 `...-backend:latest`，均由本地 `release.sh` 构建后推送到 Docker Hub，服务器 `docker compose pull` 拉取。

### 发版流程（三步，缺一不可）

```bash
# 1. 本地 Mac：构建并推送新镜像到 Docker Hub
./release.sh frontend            # 或 backend / all

# 2. 服务器：拉取新镜像（务必看到 "Downloaded newer image"，
#    显示 "up to date" 说明没拉到新镜像，多半是第 1 步没推成功）
docker compose pull frontend

# 3. 服务器：强制重建容器（漏了 --force-recreate 可能仍跑旧容器）
docker compose up -d --force-recreate frontend
```

> `release.sh` 设置 `SERVER_HOST=user@host` 可在推完镜像后自动 SSH 部署。

### ⚠️ 坑：发版后线上页面不更新

**现象**：镜像已更新、容器已重建，但线上页面 / favicon 仍是旧的，甚至不同页面卡在不同版本。

**根因**：宿主机 nginx 全局 `proxy.conf` 里的 `proxy_cache` 会被站点 `location /` 继承，把前端 **HTML 页面**按 URL 缓存了很久（Next.js 对静态 prerender 页面会下发 `Cache-Control: s-maxage=31536000`，即一年，nginx 照单全收）。容器本身是对的，是缓存挡住了。

**根治**：在站点配置 `location /`（反代到 8080 那段）里关闭 HTML 缓存，已生效：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_cache off;          # 关键：HTML 页面不缓存，每次回源新容器
    # ...其余 proxy_set_header 不变
}
```

`/api/`(3001) 与 `/_next/static/`（带 hash 的静态资源）不受影响，性能无损。改完发版即时生效，无需再手动清缓存。

若临时需要清一次已有缓存：

```bash
sudo rm -rf /www/server/nginx/proxy_cache_dir/*   # 清空缓存目录，按需回源重建
```

### 搜索引擎推送（IndexNow / 百度）

后端每小时 15、45 分把日报和多源事件页推给搜索引擎，只推有变化的页面。在服务器 `.env.production` 配置：

```bash
INDEXNOW_ENABLED=true             # 推给 Bing / ChatGPT 搜索 / Copilot
SITE_URL=https://aihotradar.com   # 与百度后台登记的站点一致，不带 www
BAIDU_PUSH_TOKEN=                 # 搜索资源平台 → 普通收录 → API提交，接口地址里 token= 后面那串；不填则不推百度
```

- 百度新站每天只有约 10 条配额，日报优先推送，`over quota` 后当天停推，第二天自动继续。
- 百度站点验证的 meta 标签和 `client-next/public/baidu_verify_*.html` 不能删，详见根目录 `CLAUDE.md`。
- 站点在 Cloudflare 后面：不要开启 AI Crawl Control 的「Bot Preference Sync / 托管 robots.txt」，否则会在 robots.txt 前插入 `Baiduspider Disallow: /`。

```bash
docker compose logs --since 1h backend | grep -E "Baidu push|IndexNow"
```

### 管理员口令（ADMIN_TOKEN）

站点没有用户账号，所以所有写操作和会消耗模型额度的操作都要求管理员口令：手动扫描（两次之间至少隔 10 分钟）、生成日报、删除资讯、增删关注词、刷新知识卡片、通知已读与删除、系统设置、AI 对话、实时搜索。实现见 `server/src/auth/admin.guard.ts`，前端在 `client-next/lib/admin.ts`。

```bash
# 服务器 .env.production
ADMIN_TOKEN=$(openssl rand -hex 24)   # 不配置时这些操作对所有人关闭
```

点网站顶栏的更新状态（手机在右上角菜单里），选「管理员登录」输入一次即可，浏览器会记住；访客看不到扫描、生成日报、增删关注词这些按钮。新增写接口时记得加 `@UseGuards(AdminGuard)`。

### 排查小抄

```bash
# 直连容器看真实内容（绕过 nginx 缓存）
curl -s http://127.0.0.1:8080/curated | grep -oE 'rel="icon" href="[^"]*"'

# 从公网核对（以 curl 为准，别以自己浏览器为准——浏览器会本地缓存 favicon）
curl -s https://www.aihotradar.com/curated | grep -oE 'rel="icon" href="[^"]*"'
```

## 七、License

MIT
