# 关键词监控规范

## 目的

关键词监控模块允许用户订阅自定义关键词，系统自动扩展同义词、判断匹配的热点真伪与相关性，并通过 WebSocket 实时推送 + 可选邮件通知。

## 需求

### 需求：创建关键词订阅

系统 SHALL 允许用户创建关键词订阅，并自动扩展同义词。

#### 场景：创建新关键词

- GIVEN 用户请求 `POST /api/keywords { name: "Claude", userId: "user123" }`
- WHEN 系统处理请求
- THEN 创建 Keyword 记录：
  - `name = "Claude"`
  - `userId = "user123"`
  - `synonyms = []`（初始为空，后续可手动添加）
- AND 返回创建结果（包含 keyword ID）

#### 场景：自动扩展同义词（可选，未完全实现）

- GIVEN 用户创建关键词 "GPT"
- WHEN 系统调用 AI 扩展同义词
- THEN 自动生成 `synonyms = ["GPT-4", "ChatGPT", "OpenAI GPT"]`
- AND 后续匹配时同义词也会触发

### 需求：关键词匹配与通知

系统 SHALL 在新热点入库后，检查所有用户关键词，匹配成功则实时推送。

#### 场景：标题匹配触发推送

- GIVEN 用户订阅关键词 "Anthropic"
- AND 新热点标题为 "Anthropic releases Claude Opus 4"
- WHEN 热点入库后执行关键词匹配
- THEN 系统检测到匹配（标题包含 "Anthropic"）
- AND 通过 WebSocket 推送给该用户：
  ```json
  {
    "type": "keyword_match",
    "keyword": "Anthropic",
    "hotspot": { id, title, url, summary, ... }
  }
  ```
- AND 若用户开启邮件通知，则发送邮件

#### 场景：内容匹配触发推送

- GIVEN 用户订阅关键词 "Claude"
- AND 新热点标题不含 "Claude"，但内容摘要包含 "Claude Opus 4"
- WHEN 执行匹配
- THEN 检测到匹配（内容包含 "Claude"）
- AND 触发 WebSocket 推送 + 可选邮件

#### 场景：同义词匹配触发推送

- GIVEN 用户订阅关键词 "GPT"，同义词包含 "ChatGPT"
- AND 新热点标题为 "ChatGPT gets new features"
- WHEN 执行匹配
- THEN 检测到同义词匹配
- AND 触发推送，通知内容注明匹配的是同义词

#### 场景：低质量热点不推送

- GIVEN 用户订阅关键词 "AI"
- AND 新热点匹配关键词但 `qualityScore = 50`（低于阈值）
- WHEN 执行匹配
- THEN 不触发推送（避免噪音）

#### 场景：非真实新闻不推送

- GIVEN 用户订阅关键词 "OpenAI"
- AND 新热点匹配关键词但 `isReal = false`（谣言）
- WHEN 执行匹配
- THEN 不触发推送（过滤虚假信息）

### 需求：查询关键词匹配的热点

系统 SHALL 提供接口查询某关键词匹配的历史热点列表。

#### 场景：查询关键词热点列表

- GIVEN 用户请求 `GET /api/keywords/{keywordId}/hotspots`
- WHEN 系统查询匹配记录
- THEN 返回该关键词匹配的热点列表：
  - 标题或内容包含关键词/同义词
  - `qualityScore ≥ 60`（与热点雷达阈值一致）
  - 按 `publishedAt desc` 排序
- AND 支持分页（默认 20 条/页）

#### 场景：查询结果包含匹配高亮

- GIVEN 用户查询关键词 "Claude" 的热点
- WHEN 返回结果
- THEN 每条热点 SHOULD 标注匹配位置（前端高亮显示）

### 需求：邮件通知配置

系统 SHALL 允许用户配置关键词的邮件通知规则。

#### 场景：开启邮件通知

- GIVEN 用户编辑关键词配置
- WHEN 设置 `emailNotify = true`
- THEN 后续匹配该关键词时，除 WebSocket 推送外，额外发送邮件

#### 场景：重要热点才发邮件

- GIVEN 用户设置 `emailNotify = true, minImportance = 80`
- AND 新热点匹配关键词但 `importance = 70`
- WHEN 执行通知
- THEN 仅 WebSocket 推送，不发邮件（未达重要度阈值）

#### 场景：邮件内容包含摘要与链接

- GIVEN 触发邮件通知
- WHEN 发送邮件
- THEN 邮件内容 MUST 包含：
  - 匹配的关键词
  - 热点标题
  - AI 摘要（前 200 字）
  - 原文链接
  - 发布时间

### 需求：关键词管理

系统 SHALL 允许用户查看、编辑、删除已订阅的关键词。

#### 场景：查看我的关键词列表

- GIVEN 用户请求 `GET /api/keywords?userId=user123`
- WHEN 系统查询
- THEN 返回该用户的所有关键词：
  ```json
  [
    { id, name: "Claude", synonyms: [], emailNotify: true },
    { id, name: "GPT", synonyms: ["ChatGPT"], emailNotify: false }
  ]
  ```

#### 场景：编辑关键词同义词

- GIVEN 用户请求 `PATCH /api/keywords/{id} { synonyms: ["ChatGPT", "GPT-4"] }`
- WHEN 系统处理
- THEN 更新 `synonyms` 字段
- AND 后续匹配使用新同义词列表

#### 场景：删除关键词

- GIVEN 用户请求 `DELETE /api/keywords/{id}`
- WHEN 系统处理
- THEN 删除该 Keyword 记录
- AND 停止后续匹配与推送

## 约束

### 匹配约束

- 关键词匹配 MUST 不区分大小写（"claude" 匹配 "Claude"）
- 匹配 MUST 检查标题和内容摘要（两个字段任一匹配即可）
- 同义词匹配逻辑 MUST 与主关键词一致

### 通知约束

- WebSocket 推送 MUST 实时（热点入库后立即检查匹配）
- 邮件通知 MUST 可配置开关（默认关闭，避免打扰）
- 单个用户单条热点 MUST 最多匹配 5 个关键词（避免刷屏）

### 质量约束

- 匹配热点的 `qualityScore` MUST ≥ 60（与热点雷达阈值一致）
- 匹配热点的 `isReal` MUST = true（过滤虚假信息）
- 低质量或虚假热点不得触发任何通知

### 性能约束

- 关键词匹配 MUST 在热点入库后 5 秒内完成
- WebSocket 推送延迟 MUST < 1 秒
- 邮件发送不得阻塞热点入库流程（异步发送）

## 验收标准

### 功能验收

- ✅ 创建关键词成功，后续匹配生效
- ✅ 标题/内容包含关键词时触发 WebSocket 推送
- ✅ 同义词匹配也触发推送
- ✅ 低质量（`qualityScore < 60`）或虚假（`isReal=false`）热点不推送
- ✅ 开启邮件通知后，重要热点触发邮件
- ✅ 邮件内容包含关键词/标题/摘要/链接/时间
- ✅ 查询关键词热点列表返回历史匹配记录
- ✅ 编辑同义词后，新匹配使用更新的同义词列表
- ✅ 删除关键词后，停止匹配与推送

### 性能验收

- ✅ 关键词匹配耗时 < 5 秒
- ✅ WebSocket 推送延迟 < 1 秒
- ✅ 邮件异步发送，不阻塞热点入库

### 鲁棒性验收

- ✅ 邮件发送失败不影响 WebSocket 推送
- ✅ 单个关键词匹配失败不影响其他关键词
- ✅ WebSocket 连接断开时，前端自动重连
