# Agent 接入规范

## 目的

Agent 接入模块将 AI Hot Radar 封装为 Skill、RSS、REST API 三种接入方式，让 AI 应用、RSS 阅读器、第三方服务能方便地消费热点数据与日报内容。

## 需求

### 需求：Skill 接入（MCP/Claude Skills）

系统 SHALL 提供符合 MCP (Model Context Protocol) 规范的 Skill 定义，供 Claude Code、Cursor 等工具安装。

#### 场景：Skill 定义文件可访问

- GIVEN AI 工具请求 `GET /api/agent/skill.json`
- WHEN 系统返回 Skill 定义
- THEN 响应 MUST 符合 MCP Skill 规范：
  ```json
  {
    "name": "ai-hot-radar",
    "version": "1.0.0",
    "description": "查询 AI 行业热点、精选资讯、AI 日报",
    "actions": [
      {
        "name": "get_hotspots",
        "description": "获取最新热点列表",
        "endpoint": "/api/hotspots",
        "method": "GET",
        "parameters": { ... }
      },
      {
        "name": "get_digest",
        "description": "获取指定日期的 AI 日报",
        "endpoint": "/api/digest/:date",
        "method": "GET"
      },
      ...
    ]
  }
  ```
- AND 包含所有可用接口（热点/精选/日报/关键词搜索）

#### 场景：AI 工具调用 Skill 查询今日日报

- GIVEN Claude Code 安装了 ai-hot-radar Skill
- AND 用户询问："今天 AI 行业有什么重要消息？"
- WHEN Claude 调用 `get_digest` action
- THEN 系统返回今日日报 JSON
- AND Claude 解析后用自然语言回答用户

#### 场景：AI 工具调用 Skill 搜索关键词

- GIVEN Cursor 安装了 Skill
- AND 用户询问："有关于 Anthropic 的最新消息吗？"
- WHEN Cursor 调用 `get_hotspots?search=Anthropic`
- THEN 返回包含 "Anthropic" 的热点列表
- AND Cursor 总结最新 3 条给用户

### 需求：RSS Feed 接入

系统 SHALL 提供三种 RSS Feed，供 Feedly、Inoreader 等 RSS 阅读器订阅。

#### 场景：精选 RSS Feed

- GIVEN RSS 阅读器请求 `GET /api/rss/curated.xml`
- WHEN 系统生成 RSS
- THEN 返回符合 RSS 2.0 规范的 XML：
  ```xml
  <rss version="2.0">
    <channel>
      <title>AI Hot Radar - 精选</title>
      <link>https://aihotradar.com</link>
      <description>经 AI 评分的高质量 AI 资讯</description>
      <item>
        <title>Anthropic releases Claude Opus 4</title>
        <link>https://www.anthropic.com/news/...</link>
        <description>AI 摘要内容...</description>
        <pubDate>Thu, 05 Jun 2026 08:00:00 GMT</pubDate>
        <guid>hotspot-uuid-123</guid>
      </item>
      ...
    </channel>
  </rss>
  ```
- AND 包含最新 50 条精选内容（`qualityScore ≥ 85`）
- AND 按发布时间倒序排序

#### 场景：全量 RSS Feed

- GIVEN RSS 阅读器请求 `GET /api/rss/all.xml`
- WHEN 系统生成 RSS
- THEN 返回所有热点（`qualityScore ≥ 60`，`isClusterMain=true`）
- AND 包含最新 100 条
- AND 按发布时间倒序

#### 场景：日报 RSS Feed

- GIVEN RSS 阅读器请求 `GET /api/rss/digest.xml`
- WHEN 系统生成 RSS
- THEN 返回最近 30 天的日报列表：
  ```xml
  <item>
    <title>AI 日报 - 2026-06-05</title>
    <link>https://aihotradar.com/digest/2026-06-05</link>
    <description>
      今日一句话：...
      今日重点：...
    </description>
    <pubDate>Thu, 05 Jun 2026 08:00:00 GMT</pubDate>
    <guid>digest-2026-06-05</guid>
  </item>
  ```

#### 场景：RSS Feed 缓存 15 分钟

- GIVEN RSS 阅读器频繁请求同一 Feed
- WHEN 系统处理请求
- THEN 返回缓存的 XML（15 分钟内复用）
- AND 避免重复查询数据库（减轻负载）

### 需求：REST API 接入

系统 SHALL 提供 5 个无认证 JSON 接口，供飞书机器人、企业微信、自动化工作流等第三方服务接入。

#### 场景：查询热点列表

- GIVEN 飞书机器人请求 `GET /api/hotspots?limit=5&sortBy=importance`
- WHEN 系统处理
- THEN 返回 JSON：
  ```json
  {
    "data": [
      {
        "id": "uuid-123",
        "title": "Anthropic releases Claude Opus 4",
        "url": "https://...",
        "summary": "AI 摘要...",
        "importance": 95,
        "qualityScore": 92,
        "category": "model",
        "keywords": ["Anthropic", "Claude", "模型发布"],
        "publishedAt": "2026-06-05T08:00:00Z"
      },
      ...
    ],
    "total": 150,
    "page": 1,
    "limit": 5
  }
  ```

#### 场景：查询精选列表

- GIVEN 企业微信机器人请求 `GET /api/curated?limit=10`
- WHEN 系统处理
- THEN 返回高质量精选内容（`qualityScore ≥ 85`）
- AND JSON 格式同热点列表

#### 场景：查询今日日报

- GIVEN 自动化工作流请求 `GET /api/digest`（无 date 参数）
- WHEN 系统处理
- THEN 返回今日日报 JSON：
  ```json
  {
    "date": "2026-06-05",
    "content": {
      "headline": "今日一句话...",
      "highlights": [
        {
          "title": "...",
          "summary": "...",
          "why_important": "...",
          "tags": ["多模态", "推理能力"],
          "url": "..."
        }
      ],
      "models": [ ... ],
      "domestic": [ ... ],
      "international": [ ... ],
      "products": [ ... ],
      "community": [ ... ],
      "papers": [ ... ]
    }
  }
  ```

#### 场景：查询指定日期日报

- GIVEN 第三方服务请求 `GET /api/digest/2026-06-01`
- WHEN 系统处理
- THEN 返回 2026-06-01 的日报
- AND 若该日期无日报，返回 404

#### 场景：搜索关键词相关热点

- GIVEN Slack 机器人请求 `GET /api/hotspots?search=Claude&limit=3`
- WHEN 系统处理
- THEN 返回标题或内容包含 "Claude" 的最新 3 条热点

### 需求：Agent 接入页说明文档

系统 SHALL 在前端提供 Agent 接入页，展示 Skill/RSS/API 三种接入方式的使用说明与示例。

#### 场景：Skill tab 显示安装方法

- GIVEN 用户访问 `/agent` 页面并切换到 Skill tab
- WHEN 页面渲染
- THEN 显示：
  - Skill 定义文件 URL（`/api/agent/skill.json`）
  - 在 Claude Code 中的安装命令（`/install-skill https://aihotradar.com/api/agent/skill.json`）
  - 使用示例（如何让 AI 查询日报、搜索热点）

#### 场景：RSS tab 显示订阅链接

- GIVEN 用户切换到 RSS tab
- WHEN 页面渲染
- THEN 显示三个 Feed 链接（可复制）：
  - 精选 Feed：`https://aihotradar.com/api/rss/curated.xml`
  - 全量 Feed：`https://aihotradar.com/api/rss/all.xml`
  - 日报 Feed：`https://aihotradar.com/api/rss/digest.xml`
- AND 说明如何在 Feedly/Inoreader 中添加订阅

#### 场景：API tab 显示接口文档

- GIVEN 用户切换到 API tab
- WHEN 页面渲染
- THEN 显示 5 个接口的：
  - 接口路径（如 `GET /api/hotspots`）
  - 查询参数说明（limit/page/sortBy/category/source/search）
  - 响应示例（JSON 格式）
  - curl 命令示例（可复制）

## 约束

### Skill 约束

- Skill 定义 MUST 符合 MCP 规范（Claude Code/Cursor 等工具可识别）
- Skill 接口 MUST 无认证（简化接入，假设私有部署）
- Skill 响应 MUST 为 JSON（不支持 XML 等其他格式）

### RSS 约束

- RSS Feed MUST 符合 RSS 2.0 规范（兼容主流 RSS 阅读器）
- Feed 内容 MUST 包含 `<title>`、`<link>`、`<description>`、`<pubDate>`、`<guid>` 必需字段
- Feed MUST 缓存 15 分钟（避免频繁查询数据库）
- Feed 条目数 MUST 限制在 100 条以内（避免 XML 过大）

### API 约束

- API MUST 无认证（当前版本，未来可加 API Key）
- API MUST 返回 JSON（Content-Type: application/json）
- API 错误 MUST 返回统一格式：`{ success: false, message: "错误信息" }`
- API MUST 支持 CORS（允许前端跨域调用）

### 性能约束

- Skill/API 接口响应时间 MUST < 500ms
- RSS Feed 生成时间 MUST < 1 秒（含缓存逻辑）
- 单 IP 请求频率 SHOULD 限制在 60 次/分钟（可选，防滥用）

## 验收标准

### 功能验收

- ✅ `/api/agent/skill.json` 返回符合 MCP 规范的 Skill 定义
- ✅ Claude Code 安装 Skill 后能成功查询日报与热点
- ✅ `/api/rss/curated.xml` 返回符合 RSS 2.0 规范的 XML
- ✅ Feedly 能成功订阅并显示精选内容
- ✅ `/api/hotspots` 返回 JSON 格式热点列表
- ✅ `/api/curated` 返回精选列表
- ✅ `/api/digest` 返回今日日报
- ✅ `/api/digest/:date` 返回指定日期日报
- ✅ Agent 接入页显示 Skill/RSS/API 三种接入方式的说明与示例

### 兼容性验收

- ✅ Claude Code 能识别并安装 Skill
- ✅ Cursor 能识别并安装 Skill
- ✅ Feedly 能订阅 RSS Feed 并正常显示
- ✅ Inoreader 能订阅 RSS Feed
- ✅ 飞书/企业微信机器人能调用 API 接口

### 性能验收

- ✅ Skill/API 接口响应 < 500ms
- ✅ RSS Feed 生成 < 1 秒
- ✅ RSS Feed 缓存 15 分钟内复用

### 文档验收

- ✅ Agent 接入页说明清晰，用户能快速上手
- ✅ API 接口参数说明完整（支持的参数/类型/默认值）
- ✅ 提供 curl 示例，可直接复制运行
