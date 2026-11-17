import { NextResponse } from 'next/server';

/**
 * Installable agent skill (SKILL.md format: YAML front matter + instructions).
 *
 * A user pastes "阅读 https://aihotradar.com/skill.md 并按说明安装" into Claude
 * Code or another agent; the agent saves this file as its own skill and from
 * then on answers "今天 AI 圈有什么新闻" from our public API. Idea borrowed
 * from agihunt.info/access. Our API needs no key, so there is no auth flow.
 *
 * Bump SKILL_VERSION whenever an endpoint or field described here changes.
 */
const SKILL_VERSION = '2.0.0';

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

  const content = `---
name: aihotradar
description: 从 AI Hot Radar（${site.replace(/^https?:\/\//, '')}）获取中文 AI 新闻：今日 AI 日报、AI 热点榜（多家来源同时报道的事件）、精选资讯、按公司或方向的主题动态（OpenAI、Anthropic、Google、DeepSeek、Agent、多模态等）和关键词搜索。用户问"今天 AI 圈有什么新闻""AI 日报""最近 AI 热点""某公司最近有什么动态""最新大模型发布"时使用，即使没有提到 AI Hot Radar；用户让你安装或接入 AI Hot Radar 时也用它。
---

# AI Hot Radar 资讯接入 · v${SKILL_VERSION}

AI Hot Radar 是中文 AI 资讯聚合站：每 30 分钟抓取 60 多个官方博客、媒体、社区和论文信源，用 AI 评分筛出精选，把多家来源报道的同一件事聚成事件，每天早上 8 点生成日报。

接口是公开的，**不需要 API key**，返回 JSON。日期一律按北京时间（Asia/Shanghai）。

## 如果你是第一次读到本文件（用户让你"阅读并安装"）

1. 把本文件原样保存为你的 skill。Claude Code：
   \`\`\`bash
   mkdir -p ~/.claude/skills/aihotradar && curl -fsSL ${site}/skill.md -o ~/.claude/skills/aihotradar/SKILL.md
   \`\`\`
   其他 agent 存到你自己的持久 skill 或指令目录。
2. 发一次请求确认能用，例如 \`curl -s "${site}/api/hotspots/trending?limit=3"\`。
3. 告诉用户：已接入，以后直接问"今天的 AI 日报""最近 AI 热点""Anthropic 最近有什么动态"即可。

已经装过就不要重复安装。想更新时重新下载本文件覆盖即可。

## 该用哪个接口

| 用户想知道 | 接口 |
|---|---|
| 今天/某天的 AI 日报 | \`GET /api/agent/digest?date=YYYY-MM-DD\` |
| 现在 AI 圈最热的事 | \`GET /api/hotspots/trending?limit=10\` |
| 某件事的来龙去脉 | \`GET /api/hotspots/story/{clusterKey}\` |
| 某公司、某方向最近的动态 | \`GET /api/topics/{slug}\`（slug 先查 \`GET /api/topics\`） |
| 最近值得看的精选 | \`GET /api/agent/curated?days=1&limit=20\` |
| 搜某个关键词 | \`GET /api/agent/search?q=关键词&limit=20\` |

基址：\`${site}\`

### 日报 \`/api/agent/digest?date=YYYY-MM-DD\`
- 不传 date 是今天。日报每天 08:05 左右生成，早于这个时间今天的可能还是 \`null\`，此时改取昨天。
- 返回 \`{date, data}\`。\`data.summary\` 是当天总结，\`highlights\` 是重点事件，\`domestic\`/\`international\`/\`modelIntel\`/\`products\`/\`community\`/\`papers\` 是各板块（每条带原文链接），\`briefs\` 是快讯。没有这期时返回 \`null\`。
- 网页：\`${site}/digest/YYYY-MM-DD\`

### 热点榜 \`/api/hotspots/trending?limit=10\`
- 过去 48 小时被两家以上独立来源报道的事件，按热度排序，\`limit\` 最大 50。
- 每项：\`titleZh\`/\`title\`、\`overview\`（\`{title, text}\` 事件概览，可能为 null）、\`sourceCount\`/\`outletCount\`（多少来源在报道）、\`trend\`（new/rising）、\`surge\`（6 小时内热度涨一半以上）、\`changePct\`、\`clusterKey\`。
- 网页：\`${site}/hot\`；单个事件 \`${site}/story/{clusterKey}\`

### 事件详情 \`/api/hotspots/story/{clusterKey}\`
- \`items\`：这件事的全部报道，从早到晚，每条有 \`url\`、\`source\`、\`sourceTier\`（T1/T1.5 是官方或一手来源）、\`titleZh\`、\`summary\`。\`duplicateOf\` 非空的是对更早报道的近似转述，一般可以略过。
- \`digest\`：事件概览，\`text\` 是开头一段；\`points\` 分成 \`confirmed\`（已确认）、\`unconfirmed\`（尚未确认，只有单一来源或传闻）、\`why\`（为什么重要）。转述给用户时保留这个区分，不要把 \`unconfirmed\` 说成事实。

### 主题 \`/api/topics\`、\`/api/topics/{slug}?page=1\`
- \`/api/topics\` 列出全部主题（公司、技术方向、内容类型）和 slug，比如 \`openai\`、\`anthropic\`、\`deepseek\`、\`agent\`。
- \`/api/topics/{slug}\` 返回近 30 天这个主题的 \`focus\`（近两周多来源报道的重点事件）和 \`items\`（按时间倒序，每页 20 条）。
- 网页：\`${site}/topics/{slug}\`

### 精选 \`/api/agent/curated?days=1&limit=20&offset=0\`
- 评分达标的资讯，同一事件只留一条，按质量分从高到低。**问"最近""今天"时一定带上 \`days\`**（1 到 30），否则会混进很早的高分内容。\`limit\` 最大 100。
- 每条：\`titleZh\`（中文标题，为空时用 \`title\`）、\`summary\`、\`url\`（原文）、\`source\`、\`qualityScore\`、\`category\`、\`publishedAt\`。

### 搜索 \`/api/agent/search?q=关键词&limit=20\`
- 在标题和摘要里查，空格分隔最多 5 个词，全部命中才返回，按质量分排序。

## 回答用户时

- 先给结论性要点，每条附原文链接（\`url\`）；需要时附本站网页链接。
- 中文标题优先用 \`titleZh\`，为空再用 \`title\`。
- 注明出处"AI Hot Radar · ${site.replace(/^https?:\/\//, '')}"；具体资讯同时注明它的原始来源。
- 摘要和概览由 AI 根据报道生成，涉及数字、价格、日期等关键事实时，建议用户以原文为准。

## 使用守则

- 一次任务通常 1 到 3 个请求就够，不要为了"全面"把所有主题和日期扫一遍。
- 同样的请求 10 分钟内直接用上次的结果，数据每 30 分钟才更新一次。
- 不要定时轮询、并发压测；请求间隔至少 1 秒。
- 遇到 429 或 5xx，等 30 秒最多重试一次，仍失败就如实告诉用户稍后再试。
- 数据可以引用，不允许用于模型训练（见 ${site}/ai.txt）。
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
