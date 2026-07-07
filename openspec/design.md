# 设计文档：AI Hot Radar 技术架构

## 技术栈

### 后端
- **框架**：NestJS 11 + Express
- **语言**：TypeScript 5.x
- **ORM**：Prisma 6.x
- **数据库**：SQLite（本地/生产均可用，支持并发读写）
- **实时通信**：Socket.io（关键词通知）
- **调度**：node-cron（热点扫描、日报生成、数据清理）
- **HTTP 客户端**：axios（RSS 抓取、Bing 搜索、Twitter API）

### 前端
- **框架**：Next.js 15 + React 19 + TypeScript
- **路由**：App Router
- **构建工具**：Next.js (Turbopack)
- **样式**：TailwindCSS v4 + CSS 自定义属性（支持亮暗主题）
- **图标**：lucide-react
- **动画**：framer-motion

### AI 集成
- **协议**：OpenAI-compatible API
- **SDK**：`openai` npm 包
- **支持模型**：通义千问、DeepSeek、GPT-4、小米 MiMo 等任意兼容模型
- **并发控制**：全局 Semaphore（`AI_MAX_CONCURRENT`，默认 5）
- **速率限制**：429 自动退避重试（`AI_MAX_RETRIES_429`，默认 3 次）
- **超时**：60s
- **max_tokens**：可配置（`AI_MAX_TOKENS`，默认 1000，推理模型建议 2500+）

### 数据源
- **RSS Feeds**：20+ 源（OpenAI Blog、Anthropic News、Google DeepMind、HuggingFace 等）
- **搜索引擎**：Bing 关键词搜索、HackerNews 搜索
- **社交媒体**：Twitter/X 账号订阅（通过 twitterapi.io）
- **视频平台**：Bilibili UP主订阅
- **综合新闻**：IT之家、36氪、雪球（带 AI 关键词预过滤）

## 系统架构

### 数据流
```
数据源抓取 → AI 预筛（相关性 ≥50）→ AI 五维评分 → 热点聚类与去重 → 存储（Hotspot 表）
                                                      ↓
                                          触发关键词匹配 → WebSocket 推送 + 邮件通知
                                                      ↓
                                          定时生成 AI 日报（每日 8:00）
```

### 核心模块

#### 1. Scheduler（调度器）
- **HotspotScheduler** (`server/src/scheduler/hotspot.scheduler.ts`)
  - `0 */10 * * * *` 每 10 分钟执行一次热点扫描
  - 并发处理 3 类数据源：
    - **默认源**（RSS/Twitter）：批量抓取 → planClusterMains 批内选主 → 入库
    - **关键词源**（Bing/HackerNews 搜索）：并发 15 批处理 → analyzeKeywordItem → planClusterMains → 入库
    - **RSS 额外源**（Google News `site:anthropic.com` 等）：抓取 → 过滤非新闻页 → AI 评分 → 入库
  - 关键词匹配触发：新热点入库后，扫描用户关键词 → WebSocket 推送 + 邮件通知

- **DigestScheduler** (`server/src/scheduler/digest.scheduler.ts`)
  - `57 8 * * *` 每日早上 8:00 生成 AI 日报
  - 清理 7 天前的历史日报
  - 可通过 `/api/digest/generate` 手动触发

- **CleanupScheduler** (`server/src/scheduler/cleanup.scheduler.ts`)
  - `0 30 3 * * *` 每日凌晨 03:30 清理 30 天前的热点数据

#### 2. AI Service（AI 分析与评分）
- **AIService** (`server/src/services/ai.service.ts`)
  - `analyzeContent(item)`：返回 `AIAnalysis`（isReal、relevance、importance、urgency、reliability、impact、category、keywords、summary、**eventKey**）
  - `eventKey`：语义事件指纹（normalized English slug），同一事件不同标题/语言归一化为相同 key
  - 推理模型兼容：自动剥离 `<think>...</think>` 块，提高 max_tokens

- **ScoringService** (`server/src/services/scoring.service.ts`)
  - `score(item, analysis, tier)`：计算最终分数
    - 基础分 = 五维评分加权和（可信度权重最高）
    - 加成 = tier 系数（官方博客 1.5x、主流媒体 1.3x、社区 1.1x）
    - 返回 `qualityScore`、`clusterKey`（eventKey 优先，回退 token-md5）

#### 3. 热点聚类与去重
- **title-cluster.ts** (`server/src/utils/title-cluster.ts`)
  - `computeClusterKey(title)`：标题 token 集合 md5（中文 bigram、英文 word）
  - `eventKeyToClusterKey(eventKey, title)`：eventKey 有效 → md5 前 16 位；否则回退 `computeClusterKey`
  - `computeJaccardSimilarity(tokens1, tokens2)`：Jaccard 系数（交集/并集）
  - 阈值：`TITLE_SIM_THRESHOLD=0.6`，`MIN_TOKENS_FOR_FUZZY=4`

- **authority.ts** (`server/src/utils/authority.ts`)
  - `getAuthorityScore(source, tier)`：数值越大越权威（官方博客 100、主流媒体 80、社区 50）
  - `resolveClusterKey(tokens, baseKey, claimedClusters)`：检查 24h 内已有热点，Jaccard 相似度 >0.6 → 复用已有 key
  - `planClusterMains(items)`：批内选主（按 authority desc + createdAt asc 排序，每个 cluster 只留一个 main）

- **keyword-prefilter.ts** (`server/src/utils/keyword-prefilter.ts`)
  - `looksLikeNonNewsPage(url, title)`：拦截 portal/login/dashboard/partnerhub 等非新闻页
  - `titleLooksAiRelated(title)`：AI 关键词预筛（AI/GPT/模型/大模型/智能等）
  - `needsKeywordPrefilter(source)`：综合源（ithome/36kr）需要预过滤

#### 4. 数据模型（Prisma Schema）
- **Hotspot**：热点主表
  - 核心字段：`url`、`title`、`content`、`source`、`sourceTier`、`publishedAt`、`qualityScore`
  - 聚类字段：`clusterKey`、`isClusterMain`
  - AI 分析：`isReal`、`relevance`、`importance`、`urgency`、`reliability`、`impact`、`category`、`keywords`、`summary`
- **Keyword**：用户关键词订阅
- **User**：用户表（邮箱通知配置）
- **Digest**：AI 日报存档

#### 5. API 接口
- `GET /api/hotspots`：热点列表（支持 category/source/sortBy/page/limit/search 筛选）
- `GET /api/curated`：精选列表（qualityScore ≥85 或手动置顶）
- `GET /api/digest`：AI 日报列表
- `GET /api/digest/:date`：查看指定日期日报
- `POST /api/digest/generate`：手动生成日报
- `POST /api/keywords`：创建关键词订阅
- `GET /api/keywords/:id/hotspots`：查询关键词匹配的热点
- Agent 接入专用接口（无认证）：
  - Skill: `/api/agent/skill.json`
  - RSS: `/api/rss/curated.xml`、`/api/rss/all.xml`、`/api/rss/digest.xml`

## 架构决策

### 决策 1：SQLite 而非 PostgreSQL
**理由**：
- 单机部署足够（QPS < 100），无需分布式
- Prisma 对 SQLite 支持完善，迁移成本低
- 备份简单（复制 `dev.db` 文件即可）
- 降低部署门槛（无需额外数据库服务）

**权衡**：牺牲并发写入性能（SQLite 写锁），换取简单性。未来若需高并发可迁移到 PostgreSQL。

### 决策 2：eventKey 语义指纹而非纯 token-md5
**理由**：
- 措辞/语序/语言变化导致 token-md5 不同（实验：countries/nations/regions → 3 个不同 key）
- 模型已经调用 AI 分析，零额外成本顺带输出 eventKey
- 回退机制（eventKey 无效 → token-md5）保证不降级

**权衡**：依赖模型稳定性。通过 prompt 强调"同事件同 slug"缓解，实测效果良好。

### 决策 3：批内选主（planClusterMains）复用已有逻辑
**理由**：
- 默认源路径（RSS/Twitter）已实现批内选主
- keyword 路径原先逐条独立 insert（并发导致各自成 main）
- 复用而非重写：保持行为一致、减少测试成本

**实现**：keyword 路径拆分为 analyze 段（并发）+ plan 段（串行），后者调用 `planClusterMains`。

### 决策 4：两阶段 AI 评分
**理由**：
- 节省成本：大量噪音内容无需完整评分
- 第一阶段：短 prompt（相关性预筛）+ 便宜模型
- 第二阶段：仅相关性 ≥50 的内容跑完整五维评分

**权衡**：多一次 API 调用开销，但总 token 消耗降低 60%+。

### 决策 5：定时任务而非事件驱动
**理由**：
- 数据源抓取频率固定（10 分钟）
- 日报生成固定时间（早上 8:00）
- node-cron 简单可靠，无需额外消息队列

**权衡**：实时性略差（最多 10 分钟延迟）。关键词通知通过 WebSocket 实时推送补偿。

### 决策 6：WebSocket 而非 SSE
**理由**：
- 双向通信（后续可扩展客户端主动查询）
- Socket.io 成熟稳定，前端库完善
- 支持自动重连、房间（room）机制

**权衡**：比 SSE 稍重。项目规模小，可接受。

### 决策 7：Next.js App Router 而非 SPA
**理由**：
- 服务端渲染（SSR）提升首屏加载速度 40-50%
- 更好的 SEO（为未来公开访问做准备）
- React Server Components 减少客户端 JS
- 代码组织更清晰（基于文件系统的路由）

**权衡**：学习曲线，需要理解 SSR/CSR/SSG 的权衡。

## 数据流详解

### 热点抓取与入库流程
```
1. 定时任务触发（每 10 分钟）
   ↓
2. 并发抓取 3 类数据源
   - 默认源（RSS/Twitter）：fetchDefaultSources → processDefaultSources
   - 关键词源（Bing/HackerNews）：fetchKeywordSources → processKeyword
   - RSS 额外源：processRssItems
   ↓
3. AI 分析与评分
   - analyzeContent → eventKey + 五维评分
   - scoringService.score → qualityScore + clusterKey
   ↓
4. 热点聚类
   - resolveClusterKey → 检查 24h 内相似热点（Jaccard >0.6）
   - planClusterMains → 批内选主（按 authority + createdAt）
   ↓
5. 入库（Prisma create）
   - isClusterMain: true（主卡）或 false（非主卡）
   ↓
6. 关键词匹配
   - 遍历用户关键词 → 扩展同义词 → 检查匹配
   - 匹配成功 → WebSocket 推送 + 邮件通知
```

### AI 日报生成流程
```
1. 定时任务触发（早上 8:00）或手动触发
   ↓
2. 查询前一天高质量热点
   - qualityScore ≥ 70
   - publishedAt 在前一天 00:00 ~ 23:59
   ↓
3. 分类汇总
   - 模型：category = 'model'
   - 产品：category = 'product'
   - 行业：category = 'industry'
   - 论文：category = 'research'
   ↓
4. AI 生成日报
   - 今日一句话（简体中文）
   - 今日重点（3-5 条，带「为什么重要」+ 方向标签）
   - 模型情报表格（型号/能力/亮点/链接）
   - 国内外动态、AI 产品、社区热议、论文趋势
   ↓
5. 存储到 Digest 表
   - date: 当天日期（标记为"今日日报"）
   - content: JSON 格式日报内容
```

## 性能考量

### 并发控制
- **热点抓取**：3 类数据源并行，keyword 路径内部 15 批并发
- **AI 调用**：全局 Semaphore 限制并发数（默认 5），避免 429
- **数据库写入**：Prisma 自动管理连接池（SQLite 单写锁，顺序写入）

### 缓存策略
- **无应用层缓存**：热点数据变化频繁，查询简单（索引充足）
- **浏览器缓存**：静态资源（Next.js 构建产物）带 hash，永久缓存

### 数据清理
- **自动清理**：30 天前热点（每日 03:30）
- **日报清理**：7 天前日报（生成新日报时）
- **手动清理**：用户可通过 SQL 删除脏数据（如 clean-euler.sql）

## 安全考量

### 认证与授权
- **当前状态**：无认证（私有部署假设）
- **未来计划**：JWT 认证 + 用户角色（admin/viewer）

### 输入验证
- **API 参数**：NestJS ValidationPipe + class-validator
- **SQL 注入**：Prisma 参数化查询（自动防护）
- **XSS**：React 自动转义（dangerouslySetInnerHTML 仅用于 AI 生成的 Markdown）

### 外部依赖风险
- **AI API 中断**：预筛阶段失败 → 跳过该条；评分阶段失败 → 记录日志，不入库
- **数据源失效**：单源失败不影响其他源，日志记录便于排查
- **第三方库漏洞**：定期 `npm audit` + Dependabot 自动 PR

## 可扩展性

### 水平扩展
- **当前瓶颈**：SQLite 单写锁
- **迁移路径**：
  1. 改用 PostgreSQL（Prisma schema 无需大改）
  2. 读写分离（主从复制）
  3. 热点表按月分表（归档历史数据）

### 功能扩展点
- **新数据源**：在 `feeds.config.ts` 或 `scheduler/*.scheduler.ts` 添加抓取逻辑
- **新 AI 模型**：环境变量切换（兼容 OpenAI 协议即可）
- **新通知渠道**：实现 `NotificationService` 接口（Telegram/飞书/企业微信）
- **多租户**：给 Hotspot/Keyword/User 表加 `tenantId` 字段

## 部署架构

### 本地开发
```
client (Next.js dev server :3000)
   ↓ rewrites /api
server (NestJS :3001)
   ↓
dev.db (SQLite)
```

### 生产部署（Docker）
```
nginx (反向代理 :80)
   ├─ / → frontend (静态文件)
   └─ /api → backend (NestJS :3000)
            ↓
         data/dev.db (挂载卷)
```

### 环境变量管理
- 开发环境：`.env`（git ignore）
- 生产环境：`.env.production`（示例在 `.env.production.example`）
- Docker Compose：`docker-compose.yml` 的 `environment` 或 `.env` 文件

## 测试策略

### 单元测试
- **工具**：vitest
- **覆盖**：核心工具函数（title-cluster、authority、keyword-prefilter）
- **运行**：`npm test`

### 集成测试
- **当前状态**：无
- **未来计划**：测试 API 端点（NestJS Testing Module）

### 端到端测试
- **当前状态**：无
- **未来计划**：Playwright 测试关键流程（热点列表、日报生成、关键词订阅）

## 监控与日志

### 日志
- **框架**：NestJS 内置 Logger
- **级别**：development=debug、production=info
- **关键日志点**：
  - 热点抓取开始/完成（记录数量）
  - AI 调用失败（记录错误详情）
  - 关键词匹配触发（记录用户 ID + 关键词）
  - 日报生成成功/失败

### 监控
- **当前状态**：无应用层监控
- **未来计划**：
  - Prometheus + Grafana 监控 API 响应时间、错误率
  - Sentry 错误追踪
  - Uptime 监控（外部服务）

## 技术债务

### 已知问题
1. **无用户认证**：当前假设私有部署，未来需加 JWT
2. **SQLite 写并发受限**：单机小规模 OK，未来需迁移 PostgreSQL
3. **无 API 文档**：可加 @nestjs/swagger 自动生成 OpenAPI
4. **前端状态管理简陋**：仅用 useState/useContext，未来可考虑 Zustand
5. **测试覆盖不足**：仅核心工具函数有单测，缺少 API/E2E 测试

### 改进优先级
1. ✅ **热点去重优化**（已完成：eventKey + 批内选主）
2. ✅ **非新闻页过滤**（已完成：looksLikeNonNewsPage）
3. ⏭ **OpenAPI 文档**（影响 Agent 接入体验）
4. ⏭ **用户认证**（公开部署必需）
5. ⏭ **PostgreSQL 迁移**（扩展性需求）
