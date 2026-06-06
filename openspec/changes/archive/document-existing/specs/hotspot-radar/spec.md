# 热点雷达规范

## 目的

热点雷达模块从多个数据源抓取 AI 行业资讯，通过 AI 评分筛选高质量内容，并进行事件聚类与去重，最终呈现为按重要度/时间排序的热点列表。

## 需求

### 需求：多源数据抓取

系统 SHALL 每 10 分钟从以下数据源抓取最新 AI 资讯：

- RSS Feeds（20+ 源：OpenAI Blog、Anthropic News、Google DeepMind、HuggingFace 等）
- Twitter/X 账号订阅（17+ AI 领域 KOL）
- Bing 关键词搜索（可配置关键词列表）
- HackerNews 搜索（AI 相关话题）
- Bilibili UP 主订阅（AI 领域视频）
- 综合新闻源（IT之家、36氪、雪球，带 AI 关键词预过滤）

#### 场景：RSS Feed 成功抓取

- GIVEN RSS Feed 返回有效 XML
- WHEN 系统执行定时抓取
- THEN 解析所有 `<item>` 节点
- AND 提取 `title`、`link`、`pubDate`、`description`
- AND 标记 `source` 为对应 feed key（如 `rss_openai`）
- AND 标记 `sourceTier` 为该源的权威等级（`official`/`mainstream`/`community`）

#### 场景：RSS Feed 抓取失败

- GIVEN RSS Feed 请求超时或返回 4xx/5xx
- WHEN 系统执行定时抓取
- THEN 记录错误日志（包含 feed URL 和错误信息）
- AND 继续处理其他数据源（不中断整体流程）

#### 场景：综合源需要 AI 关键词预过滤

- GIVEN 数据源为 `ithome` / `36kr` / `cailianshe`
- AND 标题为 "政策解读：经济形势分析"
- WHEN 系统执行关键词预筛（`titleLooksAiRelated`）
- THEN 返回 `false`（不含 AI 关键词）
- AND 该条目被跳过，不进入 AI 评分流程

#### 场景：非新闻页拦截

- GIVEN URL 为 `https://partnerhub.anthropic.com/signin`
- OR 标题包含 "Welcome to" / "Sign in" / "登录" / "欢迎"
- WHEN 系统执行非新闻页检测（`looksLikeNonNewsPage`）
- THEN 返回 `true`
- AND 该条目被拦截，不进入 AI 评分流程

### 需求：AI 两阶段评分

系统 SHALL 对抓取的资讯执行两阶段评分，以节省 AI 调用成本。

#### 场景：第一阶段预筛（相关性检查）

- GIVEN 一条抓取的资讯
- WHEN 系统调用 `analyzeContent` 的预筛模式
- THEN AI 返回 `relevance` 分数（0-100）
- AND 若 `relevance < 50`，则跳过第二阶段，不入库
- AND 若 `relevance ≥ 50`，则进入第二阶段完整评分

#### 场景：第二阶段完整评分

- GIVEN 一条通过预筛的资讯（`relevance ≥ 50`）
- WHEN 系统调用 `analyzeContent` 完整模式
- THEN AI 返回 `AIAnalysis` 对象，包含：
  - `isReal`：true（真实新闻）/ false（谣言/误导信息）
  - `relevance`：0-100（与 AI 行业相关度）
  - `importance`：0-100（业界重要性）
  - `urgency`：0-100（时效性）
  - `reliability`：0-100（来源可信度）
  - `impact`：0-100（影响范围）
  - `category`：model / product / industry / research
  - `keywords`：提取的关键词数组
  - `summary`：AI 生成的中文摘要
  - `eventKey`：语义事件指纹（normalized English slug）
- AND 系统调用 `scoringService.score` 计算最终分数：
  - `qualityScore` = 五维加权和 × `sourceTier` 系数
  - `clusterKey` = `eventKeyToClusterKey(eventKey, title)`

#### 场景：eventKey 有效时使用语义指纹

- GIVEN AI 返回 `eventKey = "anthropic-claude-mythos-15-countries"`
- WHEN 系统调用 `eventKeyToClusterKey`
- THEN 返回 `md5("ek:anthropic-claude-mythos-15-countries").slice(0, 16)`
- AND 同一事件的不同标题（如 "15 countries" / "15 nations" / "15 regions"）得到相同 `clusterKey`

#### 场景：eventKey 无效时回退 token-md5

- GIVEN AI 未返回 `eventKey` 或返回空字符串
- WHEN 系统调用 `eventKeyToClusterKey`
- THEN 回退调用 `computeClusterKey(title)`
- AND 基于标题 token 集合计算 md5（中文 bigram、英文 word）

### 需求：热点聚类与去重

系统 SHALL 对同一事件的多源报道进行聚类，并按权威度选出唯一主卡（main）。

#### 场景：批内多条同事件热点选主

- GIVEN 同一批处理的 3 条热点：
  - A: `source=rss_openai`, `clusterKey=abc123`, `authority=100`
  - B: `source=bing`, `clusterKey=abc123`, `authority=50`
  - C: `source=twitter`, `clusterKey=abc123`, `authority=45`
- WHEN 系统调用 `planClusterMains`
- THEN 按 `authority desc, createdAt asc` 排序
- AND A 标记为 `isClusterMain=true`
- AND B、C 标记为 `isClusterMain=false`
- AND 全部 3 条入库（保留多源可追溯）

#### 场景：24 小时内相似热点合并到已有 cluster

- GIVEN 24 小时内已有热点 X：`clusterKey=xyz789`, `title="OpenAI launches GPT-5"`
- AND 新抓取热点 Y：`title="OpenAI releases GPT-5 with breakthrough reasoning"`
- WHEN 系统调用 `resolveClusterKey` 并计算 Jaccard 相似度
- THEN Jaccard 系数 = 0.75（> 阈值 0.6）
- AND Y 复用 X 的 `clusterKey=xyz789`
- AND Y 标记为 `isClusterMain=false`（X 已是 main）

#### 场景：相似度低于阈值，创建新 cluster

- GIVEN 已有热点：`title="Anthropic releases Claude Opus 4"`
- AND 新热点：`title="DeepSeek releases V3 model"`
- WHEN 系统计算 Jaccard 相似度
- THEN Jaccard 系数 = 0.15（< 阈值 0.6）
- AND 新热点生成独立 `clusterKey`
- AND 标记为 `isClusterMain=true`（新 cluster 的 main）

#### 场景：标题过短跳过模糊匹配

- GIVEN 新热点标题仅 3 个 token（< `MIN_TOKENS_FOR_FUZZY=4`）
- WHEN 系统调用 `resolveClusterKey`
- THEN 跳过 Jaccard 相似度计算
- AND 直接使用新生成的 `clusterKey`

### 需求：热点列表查询

系统 SHALL 提供热点列表查询接口，支持筛选、排序、分页。

#### 场景：默认查询（只显示主卡）

- GIVEN 用户请求 `GET /api/hotspots`（无 `source` 参数）
- WHEN 系统查询 Hotspot 表
- THEN 返回 `qualityScore ≥ 60` 且 `isClusterMain=true` 的热点
- AND 按 `sortBy=importance` 或 `sortBy=publishedAt` 排序
- AND 默认返回第 1 页，每页 20 条

#### 场景：按具体来源筛选（显示该源全部卡）

- GIVEN 用户请求 `GET /api/hotspots?source=bing`
- WHEN 系统查询 Hotspot 表
- THEN 返回 `source=bing` 的全部热点（包含 `isClusterMain=false` 的非主卡）
- AND 不应用 `isClusterMain=true` 过滤（保留该源的完整数据）

#### 场景：按分类筛选

- GIVEN 用户请求 `GET /api/hotspots?category=model`
- WHEN 系统查询 Hotspot 表
- THEN 返回 `category=model` 且 `isClusterMain=true` 的热点
- AND 只返回模型相关资讯（排除产品/行业/论文）

#### 场景：搜索关键词

- GIVEN 用户请求 `GET /api/hotspots?search=Claude`
- WHEN 系统查询 Hotspot 表
- THEN 返回 `title LIKE %Claude%` 或 `content LIKE %Claude%` 的热点
- AND 仍应用 `isClusterMain=true` 过滤（除非有 `source` 参数）

### 需求：权威度计算

系统 SHALL 根据数据源和 tier 计算权威度分数，用于聚类选主。

#### 场景：官方博客最高权威

- GIVEN `source=rss_openai`, `sourceTier=official`
- WHEN 系统调用 `getAuthorityScore`
- THEN 返回 `100`

#### 场景：主流媒体次之

- GIVEN `source=rss_the_verge`, `sourceTier=mainstream`
- WHEN 系统调用 `getAuthorityScore`
- THEN 返回 `80`

#### 场景：社区来源最低

- GIVEN `source=bing`, `sourceTier=community`
- WHEN 系统调用 `getAuthorityScore`
- THEN 返回 `50`

#### 场景：未知来源默认社区级别

- GIVEN `source=unknown_feed`, `sourceTier=null`
- WHEN 系统调用 `getAuthorityScore`
- THEN 返回 `50`（默认社区权威度）

### 需求：数据清理

系统 SHALL 每日自动清理 30 天前的历史热点数据，控制数据库体积。

#### 场景：定时清理历史数据

- GIVEN 当前日期为 2026-06-05
- AND Hotspot 表中有 `publishedAt=2026-05-01` 的记录（35 天前）
- WHEN 系统执行每日 03:30 的清理任务
- THEN 删除 `publishedAt < 2026-05-06` 的所有热点
- AND 记录清理日志（删除数量）

#### 场景：保留 30 天内数据

- GIVEN 当前日期为 2026-06-05
- AND Hotspot 表中有 `publishedAt=2026-05-10` 的记录（26 天前）
- WHEN 系统执行清理任务
- THEN 该记录不被删除（在 30 天窗口内）

## 约束

### 性能约束

- 每次热点扫描 MUST 在 5 分钟内完成（留 5 分钟缓冲，下次扫描前完成）
- AI 并发调用 MUST 受全局 Semaphore 限制（默认 5，可配置 `AI_MAX_CONCURRENT`）
- 单次抓取失败不得影响其他数据源（错误隔离）

### 数据质量约束

- 入库热点的 `qualityScore` MUST ≥ 60（低于阈值的直接丢弃）
- `url` MUST 唯一（同 URL 的后续抓取跳过）
- `publishedAt` 不得早于 7 天前（过期内容不入库）

### 聚类约束

- Jaccard 相似度阈值 MUST = 0.6（可调整，但需确保不误合并）
- 相似度计算仅在 24 小时内已有热点中进行（窗口限制，避免全表扫描）
- `MIN_TOKENS_FOR_FUZZY` MUST ≥ 4（短标题跳过模糊匹配，避免误判）

### AI 调用约束

- 超时 MUST = 60s（含推理模型的长响应）
- 429 速率限制 MUST 自动退避重试（最多 3 次，指数退避）
- 推理模型输出 MUST 剥离 `<think>...</think>` 块后再解析 JSON

## 验收标准

### 功能验收

- ✅ 部署后首次扫描能成功抓取至少 10 条热点
- ✅ 同一新闻的不同标题（如 15 countries / nations / regions）被聚类为同一 `clusterKey`
- ✅ `/api/hotspots` 默认不返回重复卡（只显示 `isClusterMain=true`）
- ✅ `/api/hotspots?source=bing` 能看到该源的全部卡（包含非主卡）
- ✅ 非新闻页（如 partnerhub.anthropic.com/signin）被拦截，不入库
- ✅ 30 天前数据每日清理，数据库体积稳定

### 性能验收

- ✅ 单次热点扫描耗时 < 5 分钟（10 分钟间隔有余量）
- ✅ AI 并发数受限，不触发 429 错误（或自动重试成功）
- ✅ 前端列表查询响应时间 < 500ms（20 条/页）

### 鲁棒性验收

- ✅ 单个 RSS Feed 失败不影响其他源抓取
- ✅ AI 调用超时/失败时记录日志，不中断流程
- ✅ eventKey 无效时自动回退 token-md5，聚类功能不降级
