# Hotspot Analysis Guide

Framework for evaluating search results. Apply this analysis to each result after collecting data from search scripts.

## Analysis Output Schema

For each result, produce:

```json
{
  "isReal": true,
  "relevance": 85,
  "relevanceReason": "Directly announces a new model release from OpenAI",
  "keywordMentioned": true,
  "importance": "high",
  "summary": "OpenAI 发布 GPT-5，支持多模态推理和 100 万 token 上下文"
}
```

## 1. Authenticity Assessment (`isReal`)

Determine if the content is genuine news vs. clickbait/rumor/spam.

**Mark as REAL (`true`) when:**
- Content from verified accounts or reputable sources (official blogs, major tech outlets)
- Specific details included (dates, version numbers, benchmarks, quotes from named individuals)
- Multiple credible sources corroborate the same information
- Content links to primary sources (press releases, research papers, GitHub repos)

**Mark as FAKE (`false`) when:**
- Sensationalist title with no substantive content ("You won't believe what AI can do now!")
- Unverified claims without sources ("Rumor has it that...")
- SEO spam / content farm patterns (keyword stuffing, generic content)
- Contradicts well-known facts without credible evidence
- Duplicated content across many low-quality sites
- AI-generated fluff with no original information

**Edge cases — lean toward `true` with lower relevance:**
- Opinion pieces from credible authors → real, but adjust importance
- Speculative analysis with clearly stated assumptions → real
- Satire/parody → false

## 2. Relevance Scoring (`relevance`: 0-100)

How closely the content relates to the user's monitoring keyword/interest area.

| Score Range | Meaning | Example (keyword: "GPT-5") |
|-------------|---------|---------------------------|
| 90-100 | Direct, primary topic | "OpenAI officially releases GPT-5" |
| 70-89 | Strongly related | "GPT-5 benchmark comparisons with Claude 4" |
| 50-69 | Moderately related | "AI model landscape update mentioning GPT-5 briefly" |
| 30-49 | Tangentially related | "OpenAI business strategy article" |
| 0-29 | Barely/not related | "General tech industry overview" |

**Scoring factors:**
- Keyword appears in title → +20 points
- Keyword appears in content body → +15 points
- Content is primarily ABOUT the keyword topic → +30 points
- Content from authoritative source in the domain → +10 points
- Content is recent (< 24h) → +5 points
- Content has high engagement → +5 points

**`keywordMentioned`**: Set to `true` if the exact keyword (or a very close variant) appears literally in the title or content. Set to `false` if the content is related but doesn't explicitly mention the keyword.

**`relevanceReason`**: One sentence explaining why this relevance score was assigned. Be specific.

## 3. Importance Level (`importance`)

How significant this development is for the user.

### Urgent
- Major product launches or releases (new AI model, major version update)
- Breaking news with immediate industry impact
- Security vulnerabilities or critical bugs in widely-used tools
- Regulatory announcements affecting the field

### High
- Significant feature updates or improvements
- Notable research papers or breakthroughs
- Major partnerships or acquisitions
- Trending topics with rapidly growing engagement

### Medium
- Regular updates or minor version releases
- Industry analysis and opinion pieces from notable figures
- Conference talks and announcements
- Interesting but not groundbreaking developments

### Low
- Routine content (tutorials, how-to articles)
- Old news resurfacing
- Minor community discussions
- Low-engagement content from non-authoritative sources

## 4. Summary Generation (`summary`)

- Write in Chinese (简体中文)
- Maximum 50 characters
- Capture the core new information
- Include specific details (numbers, names, dates) when available
- Do NOT include opinions or analysis — just facts

**Good**: "OpenAI 发布 GPT-5，推理能力提升 3 倍，支持 100 万 token"
**Bad**: "一篇关于AI的有趣文章" (too vague)
**Bad**: "这是一个非常重要的AI突破，将改变整个行业" (opinion, not fact)

## Filtering Rules

After analysis, apply these filtering thresholds:

1. **Discard** if `isReal === false`
2. **Discard** if `relevance < 40`
3. **Discard** if `keywordMentioned === false AND relevance < 60`
4. **Keep** everything else, sorted by importance then relevance

## Engagement-Based Heat Score

When engagement data is available, calculate a composite heat score (0-100):

```
rawScore = likes × 10 + retweets × 5 + log10(max(views, 1)) × 2
heatScore = min(100, rawScore / maxRawScore × 100)
```

Heat tiers:
| Score | Tier | Label |
|-------|------|-------|
| 80-100 | Explosive | 🔥 爆 |
| 60-79 | Hot | 🌡️ 热 |
| 40-59 | Warm | ☀️ 温 |
| 20-39 | Cool | 🌤️ 凉 |
| 0-19 | Cold | ❄️ 冷 |
