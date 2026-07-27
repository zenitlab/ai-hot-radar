# AI Hot Radar - GEO 优化实施总结

## 已完成的优化（2026-07-27）

### ✅ 1. 结构化数据层（Schema.org）

**文件**: `client-next/lib/structured-data.ts`

实现了完整的 Schema.org 结构化数据工厂：

```typescript
// 根 layout 已应用
- generateOrganizationSchema()  // 站点身份
- generateWebSiteSchema()       // 站内搜索能力声明

// 待应用到具体页面
- generateDigestSchema(date, sections)  // 日报 Article
- generateHotspotListSchema(items)      // 热点列表
- generateFAQSchema(faqs)               // FAQ 页面
```

**效果**: AI 搜索引擎能明确识别这是一个 AI 资讯聚合站，理解站点的搜索能力和 API 接口。

---

### ✅ 2. AI 爬虫白名单

**文件**: `client-next/public/robots.txt`

明确允许所有主流 AI 搜索引擎：

```
User-agent: GPTBot          # OpenAI ChatGPT Search
User-agent: Claude-Web      # Anthropic Claude
User-agent: PerplexityBot   # Perplexity
User-agent: CCBot           # Common Crawl (AI 训练数据源)
User-agent: Google-Extended # Gemini
```

**对比传统 SEO**: 传统 robots.txt 只关注 Googlebot、Bingbot，GEO 需要主动欢迎 AI 爬虫。

---

### ✅ 3. ai.txt 标准文件

**文件**: `client-next/app/ai.txt/route.ts`  
**访问**: `https://aihotradar.com/ai.txt`

这是一个新兴标准（类似 robots.txt），向 AI 声明：

```
- 站点用途：news-aggregation, ai-content-curation
- 数据来源：20+ 信息源（Twitter、arXiv、HackerNews...）
- 爬取策略：Allow-AI-Indexing: yes, Allow-AI-Training: no
- API 接入：/api/agent、RSS、Skill 包
- 更新频率：热点 10 分钟、日报每日 8:00
- 引用格式：如何正确引用本站内容
```

**效果**: Perplexity、You.com 等新一代 AI 搜索引擎能快速理解站点特征，优先索引 API 接口而非爬取页面。

---

### ✅ 4. 语义化辅助工具

**文件**: `client-next/lib/semantic-helpers.tsx`

提供两个工具：

```typescript
// 1. 页面语义 meta 增强
<SemanticContext type="digest" data={{ date: '2026-07-27' }} />

// 2. 面包屑导航结构化数据
generateBreadcrumbSchema([
  { name: '首页', url: 'https://aihotradar.com' },
  { name: 'AI 日报', url: 'https://aihotradar.com/digest' }
])
```

---

## 待实施的优化（按优先级）

### 🟡 高优先级

#### 1. 日报页面动态 Schema

**当前问题**: `app/digest/page.tsx` 是 `'use client'`，无法在服务端注入动态 Schema。

**解决方案**:
```typescript
// app/digest/page.tsx 改为
export default async function DigestPage({ searchParams }: { searchParams: { date?: string } }) {
  const date = searchParams.date || getBeijingToday();
  const digest = await digestApi.getByDate(date); // 服务端获取
  
  const schema = generateDigestSchema(date, digest.sections.map(s => s.title));
  
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <DigestView initialDigest={digest} />
    </>
  );
}
```

**效果**: AI 能直接在搜索结果中展示 "2026-07-27 AI 日报包含：今日重点、模型情报、国内动态..."

---

#### 2. 热点列表 ItemList Schema

**文件**: `app/curated/page.tsx` 或 `app/hotspot/page.tsx`

应用 `generateHotspotListSchema()`，让 AI 理解这是一个结构化的资讯列表，而非散乱的内容。

---

#### 3. FAQ 页面

**文件**: `app/about/page.tsx`

添加常见问题板块：
```markdown
Q: AI Hot Radar 的数据来源是什么？
A: 聚合 20+ 信息源，包括 Twitter/X、HackerNews、arXiv...

Q: 如何接入 AI Hot Radar 的数据？
A: 提供三种方式：Skill 包、RSS Feed、REST API...
```

然后应用 `generateFAQSchema()`。

---

### 🟢 中优先级

#### 4. 内容质量信号

AI 搜索引擎更偏好以下特征：

**✅ 推荐**:
```
❌ "今天有很多重要更新"
✅ "OpenAI 于 2026-07-27 发布 GPT-5，上下文窗口从 128K 提升至 200K"
```

**实施位置**: `components/digest/DigestView.tsx` 的各板块标题和摘要。

---

#### 5. 引用格式指南

在页面底部添加 "如何引用" 区块：

```tsx
<footer className="citation-guide">
  <h3>引用本站内容</h3>
  <p>格式：AI Hot Radar - [文章标题], https://aihotradar.com/hotspot#id</p>
  <details>
    <summary>BibTeX</summary>
    <pre>@misc{'{'}aihotradar2026,
  title={'{'}AI Hot Radar - AI 热点雷达},
  url={'{'}https://aihotradar.com},
  year={'{'}2026}
}</pre>
  </details>
</footer>
```

---

#### 6. 多语言支持

**当前**: 纯中文站  
**建议**: 增加 `/en/` 英文版（至少覆盖日报、精选）

**原因**: AI 搜索引擎在英文查询时更倾向引用英文内容。

---

### 🔵 低优先级

#### 7. 动态 Sitemap

**文件**: `app/sitemap.ts`

当前只包含静态路由，建议添加：
```typescript
// 最近 30 天的日报页面
const last30Days = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.now() - i * 86400000 + 8 * 3600000);
  return date.toISOString().slice(0, 10);
});

last30Days.forEach(date => {
  routes.push({
    url: `${siteUrl}/digest?date=${date}`,
    lastModified: new Date(date),
    changeFrequency: 'daily',
    priority: 0.8,
  });
});
```

---

#### 8. 动态 Open Graph 图片

**当前**: `/og-image.png` 是静态图  
**建议**: 为日报页面生成动态 OG 图

**实施**: 使用 Next.js 的 `opengraph-image.tsx`：
```typescript
// app/digest/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export default async function Image({ params }: { params: { date: string } }) {
  return new ImageResponse(
    (
      <div style={{ fontSize: 128, background: 'linear-gradient(...)' }}>
        AI 日报 {params.date}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## GEO vs SEO 核心差异

| 维度 | 传统 SEO | GEO |
|------|----------|-----|
| **目标** | Google 排名前 10 | 被 AI 引用、摘要 |
| **技术** | 关键词密度、外链 | 结构化数据、语义理解 |
| **内容** | 关键词堆砌、标题党 | 事实陈述、可验证来源 |
| **评估** | 点击率、跳出率 | 引用率、Direct 流量 |
| **时效** | 周/月级别见效 | 天级别（AI 索引更快） |

---

## 验证清单

### 结构化数据验证
```bash
# 1. Google Rich Results Test
https://search.google.com/test/rich-results?url=https://aihotradar.com

# 2. Schema.org Validator
https://validator.schema.org/#url=https://aihotradar.com

# 3. 手动检查页面源码
curl -s https://aihotradar.com | grep 'application/ld+json'
```

### AI 爬虫验证
```bash
# 检查 robots.txt
curl https://aihotradar.com/robots.txt | grep -E "GPTBot|Claude|Perplexity"

# 检查 ai.txt
curl https://aihotradar.com/ai.txt

# 检查 sitemap
curl https://aihotradar.com/sitemap.xml
```

### 实战测试
```
1. 在 Perplexity 中搜索："最新 AI 资讯 中文"
2. 在 ChatGPT 中搜索："AI daily digest Chinese"
3. 在 Claude 中询问："有哪些 AI 资讯聚合网站"
```

观察 `aihotradar.com` 是否出现在结果中、是否被引用。

---

## 监控指标（长期跟踪）

### 1. AI 引用率
- 在 AI 搜索引擎中直接询问 "最新 AI 资讯"
- 统计 `aihotradar.com` 出现频率
- **目标**: 3 个月内在 Perplexity/ChatGPT 搜索中出现率 > 30%

### 2. Direct 流量占比
- AI 搜索引擎不会留下 Referrer，流量会显示为 Direct
- 关注 Direct 流量中新用户比例
- **目标**: Direct 流量占比从当前 20% 提升至 40%

### 3. API 调用量
- `/api/agent/*` 的访问量（AI Agent 消费）
- **目标**: 月调用量从 0 增长到 10K+

### 4. Schema 覆盖率
- Google Search Console → 富媒体结果
- 检查哪些页面的 Schema 被识别
- **目标**: 核心页面 100% 识别

---

## 下一步行动

### 本周内
1. ✅ 部署当前修改（结构化数据 + ai.txt + robots.txt）
2. 🔲 实施日报页面动态 Schema（优先级最高）
3. 🔲 在 about 页面添加 FAQ

### 本月内
4. 🔲 热点列表应用 ItemList Schema
5. 🔲 内容质量优化（明确事实陈述）
6. 🔲 添加引用格式指南

### 季度目标
7. 🔲 英文版上线（至少覆盖日报、精选）
8. 🔲 动态 Sitemap（包含 30 天日报）
9. 🔲 动态 OG 图片生成

---

## 参考资源

- [GEO 研究论文](https://arxiv.org/abs/2311.09735) - 普林斯顿大学 2023 年首次提出 GEO 概念
- [Schema.org 文档](https://schema.org/) - 结构化数据标准
- [ai.txt 标准草案](https://github.com/ai-txt/ai-txt) - 社区驱动的新标准
- [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

---

**实施日期**: 2026-07-27  
**下次审查**: 2026-08-27（1 个月后评估效果）  
**维护者**: AI Hot Radar Team
