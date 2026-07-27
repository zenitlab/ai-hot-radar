# AI Hot Radar - GEO 优化指南

## 什么是 GEO（Generative Engine Optimization）

GEO 是针对 **AI 搜索引擎**（ChatGPT Search、Perplexity、Claude、Gemini）的优化策略，与传统 SEO 的区别：

| 传统 SEO | GEO |
|---------|-----|
| 关键词密度、反向链接 | 语义理解、结构化数据 |
| 排名优化 | 被 AI 引用、摘要的概率 |
| 面向爬虫算法 | 面向大语言模型 |

## 已实施的 GEO 优化

### 1. 结构化数据（Schema.org）

**文件**: `client-next/lib/structured-data.ts`

已添加：
- ✅ Organization Schema（站点身份）
- ✅ WebSite Schema（站内搜索功能声明）
- ✅ Article Schema（日报页面）
- ✅ ItemList Schema（热点列表）
- ✅ FAQ Schema（待应用到 about 页）

**使用方式**：
```typescript
import { generateDigestSchema } from '@/lib/structured-data';

// 在日报页面 head 中插入
const schema = generateDigestSchema('2026-07-27', ['今日重点', '模型情报', '国内动态']);
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
```

### 2. AI 爬虫声明

**文件**: `client-next/public/robots.txt`

明确允许的 AI 爬虫：
- GPTBot（OpenAI）
- Claude-Web（Anthropic）
- PerplexityBot
- CCBot（Common Crawl，多数 AI 训练数据源）
- Google-Extended（Gemini）

### 3. ai.txt 标准文件

**文件**: `client-next/app/ai.txt/route.ts`

访问地址：`https://aihotradar.com/ai.txt`

声明了：
- 站点用途、数据来源
- 爬取策略（允许索引，禁止训练）
- API 接入点（Agent Skill、RSS）
- 更新频率（热点 10 分钟、日报每日 8:00）

### 4. 语义化辅助工具

**文件**: `client-next/lib/semantic-helpers.tsx`

提供：
- `SemanticContext` 组件：增强页面语义 meta 标签
- `generateBreadcrumbSchema`：面包屑导航结构化数据

## 待实施的优化

### 高优先级

1. **日报页面动态 Schema**
   - 文件：`client-next/app/digest/page.tsx`（需改为 SSR 或 SSG）
   - 目标：生成包含当日标题列表的 Article Schema
   - 难点：当前是 'use client'，需要重构为服务端获取数据

2. **热点详情页 Schema**
   - 为每条热点生成独立的 Article Schema
   - 包含发布时间、来源、摘要

3. **FAQ 页面**
   - 在 `/about` 页面添加常见问题
   - 应用 `generateFAQSchema`

### 中优先级

4. **内容质量信号**
   - 在 AI 日报中添加明确的事实陈述：
     - ❌ "今天有很多重要更新"
     - ✅ "OpenAI 于 2026-07-27 发布 GPT-5，上下文窗口提升至 200K"
   - 为每条资讯添加可验证的元数据（时间、来源链接）

5. **引用格式优化**
   - 在页面底部添加"如何引用"指南：
     ```
     AI Hot Radar - [标题], https://aihotradar.com/hotspot#id
     ```
   - 提供 BibTeX / APA 格式

6. **多语言支持**
   - 当前是中文站，考虑增加英文版 `/en/`
   - AI 搜索引擎更倾向引用英文内容

### 低优先级

7. **动态 Sitemap**
   - 当前 sitemap 只包含静态路由
   - 建议：添加最近 30 天的日报页面
   - 文件：`client-next/app/sitemap.ts`

8. **Open Graph 图片优化**
   - 当前：`/og-image.png` 是静态图
   - 建议：为日报页面生成动态 OG 图（包含日期、标题）
   - 工具：Next.js App Router 的 `opengraph-image.tsx`

## 验证工具

### Schema 验证
```bash
# Google Rich Results Test
https://search.google.com/test/rich-results?url=https://aihotradar.com

# Schema.org Validator
https://validator.schema.org/#url=https://aihotradar.com
```

### AI 爬虫测试
```bash
# 检查 robots.txt
curl https://aihotradar.com/robots.txt

# 检查 ai.txt
curl https://aihotradar.com/ai.txt

# 检查 sitemap
curl https://aihotradar.com/sitemap.xml
```

### 结构化数据检查
```bash
# 查看页面中的 JSON-LD
curl -s https://aihotradar.com | grep -o '<script type="application/ld+json">.*</script>'
```

## GEO 内容写作原则

AI 搜索引擎更偏好以下内容特征：

### ✅ 推荐
- 明确的事实陈述（时间、地点、数字）
- 结构化列表（板块、步骤、对比表格）
- 第一手信息源（官方博客、arXiv 原文）
- 可验证的引用（带链接的来源标注）
- 清晰的因果关系（"由于 X，导致 Y"）

### ❌ 避免
- 模糊表述（"最近"、"很多"、"可能"）
- 纯主观评价（"这是最好的模型"）
- 无来源的传言
- 过度 SEO 关键词堆砌
- 纯营销话术

## 监控指标

GEO 效果监控（需要长期跟踪）：

1. **AI 引用率**
   - 在 Perplexity、ChatGPT 搜索中直接询问 "最新 AI 资讯"
   - 统计 aihotradar.com 出现频率

2. **直接流量增长**
   - AI 搜索引擎不会留下 Referrer
   - 关注 Direct 流量中来自新用户的比例

3. **API 调用量**
   - `/api/agent/*` 的访问量（AI Agent 消费）

4. **Schema 覆盖率**
   - Google Search Console → 富媒体结果
   - 检查哪些页面的 Schema 被识别

## 参考资源

- [GEO 研究论文](https://arxiv.org/abs/2311.09735)
- [Schema.org 文档](https://schema.org/)
- [ai.txt 标准草案](https://github.com/ai-txt/ai-txt)
- [Google Search Central - 结构化数据](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

---

**最后更新**: 2026-07-27  
**维护者**: AI Hot Radar Team
