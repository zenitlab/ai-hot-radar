# 提案：为 AI Hot Radar 现有功能补全规范文档

## Why

AI Hot Radar 项目已运行数月，完成了热点雷达、AI 日报、精选、关键词监控、Agent 接入等核心功能。当前代码库处于持续迭代状态，但缺少结构化的规范文档（specs/），导致：

1. **新功能开发风险高** — AI 助手不清楚哪些行为是既定约束，容易误改核心逻辑
2. **缺少行为契约** — 聚类/去重/评分等关键算法的输入输出、边界条件未明确定义
3. **架构决策未记录** — 为什么用 eventKey 而非纯 token-md5、为什么批内选主、技术选型理由散落在 commit/对话中

本次补文档旨在**从现有代码反推规范基线**，建立项目的权威规范库（openspec/specs/），为后续功能开发、重构、团队协作提供标准依据。

## What Changes

本次变更从现有代码库反推生成以下规范文档，所有规范描述的是**已实现功能**（非新功能开发）：

### ADDED Specs

- `hotspot-radar/spec.md` — 热点雷达核心功能规范（多源抓取/AI 评分/聚类去重/权威度计算）
- `ai-digest/spec.md` — AI 日报功能规范（自动生成/手动生成/内容结构/清理策略）
- `curated/spec.md` — 精选功能规范（自动筛选/手动置顶/专属版式）
- `keyword-watch/spec.md` — 关键词监控规范（匹配/推送/邮件通知）
- `agent-integration/spec.md` — Agent 接入规范（Skill/RSS/API）

### ADDED Design

- `design.md` — 技术架构文档（技术栈/ADR/数据流/性能/安全/扩展性/已知技术债务）

### 范围

### 包含
- **热点雷达核心功能规范**
  - 数据源抓取（RSS/关键词搜索/X 账号订阅）
  - 热点聚类与去重（eventKey/clusterKey/Jaccard 相似度）
  - AI 五维评分（相关性/重要性/时效性/可信度/影响力）
  - 权威度计算与批内选主
  - 非新闻页过滤（portal/login 页拦截）
- **AI 日报功能规范**
  - 每日精选内容汇总
  - 模型情报表格
  - 社区热议/论文推荐
  - 早上 8:00 自动生成机制
- **精选功能规范**
  - 高质量内容筛选（qualityScore >= 85）
  - 置顶与手动标记
- **关键词监控规范**
  - 用户自定义关键词追踪
  - 邮件通知触发条件
- **Agent 接入规范**
  - Skill 接口定义
  - RSS 订阅接口
  - REST API 接口
- **技术架构文档**
  - 技术栈（NestJS/TypeScript/React/Prisma/SQLite）
  - 数据模型（Hotspot/Keyword/Digest/User）
  - 定时任务机制（cron 调度）
  - LLM 集成（OpenAI-compatible API）

### 不包含
- 未来功能计划（Telegram 通知、多租户、自定义数据源等）
- 部署运维文档（已有 docs/DEPLOY.md）
- API 详细文档（可后续通过 OpenAPI/Swagger 生成）

## 方案

采用 **Brownfield（存量项目）逆向建档** 流程：

1. **读取现有代码库** — 分析 `server/src/`、`client/src/`、`prisma/schema.prisma`、已有文档（README/CLAUDE.md/docs/）
2. **生成结构化规范** — 按领域（domain）拆分 spec.md，采用 Given/When/Then 格式描述行为
3. **记录架构决策** — 提取关键技术选型理由（如 eventKey 语义指纹、批内选主复用逻辑）
4. **标记已完成任务** — 生成 tasks.md 清单，全部任务标记为 ✅（文档化现状，非开发计划）
5. **同步到规范基线** — 审阅无误后，通过 `openspec sync` 合并到 `openspec/specs/`

## 影响评估

### 正面影响
- **AI 开发更安全** — 明确"不可动"的核心逻辑边界，避免误改已有功能
- **新功能开发提速** — 规范作为上下文，AI 可生成符合现有模式的代码
- **技术债务可见** — 规范与代码不一致处（如过时注释）会暴露，便于后续清理
- **团队协作基础** — 新成员通过规范快速理解系统行为

### 风险
- **首次生成可能有偏差** — AI 反推的规范需人工审阅（尤其边界条件、异常处理）
- **维护成本** — 后续代码修改需同步更新规范（通过 OpenSpec 工作流可降低成本）

### 缓解措施
- 分阶段审阅：先看核心功能（聚类/评分），再看辅助功能（邮件通知）
- 优先文档化"已稳定"的功能，实验性功能暂不纳入规范

## 下一步

1. ✅ 创建变更（当前步骤）
2. ⏭ 生成规范文档（`openspec ff document-existing` 或让 AI 逐个生成 proposal → specs → design → tasks）
3. ⏭ 人工审阅与修订
4. ⏭ 同步到规范基线（`openspec sync document-existing`）
5. ⏭ 归档变更（`openspec archive document-existing`）
