export type SourceTier = 'T1' | 'T1.5' | 'T2';
export type ContentRegion = 'domestic' | 'international';
export type ContentCategory = 'model' | 'product' | 'industry' | 'research' | 'community' | 'tips';

export interface RssFeedConfig {
  name: string;
  url: string;
  /** Source category identifier (used as part of source field: rss_{category}) */
  category: string;
  tier: SourceTier;
  region: ContentRegion;
  /** Pre-known content category; undefined means AI will classify */
  defaultCategory?: ContentCategory;
}

/** Source tier multipliers for quality score calculation */
export const TIER_MULTIPLIER: Record<SourceTier, number> = {
  T1: 1.3,
  'T1.5': 1.1,
  T2: 1.0,
};

/** Minimum quality score to be curated, by tier */
export const CURATED_THRESHOLD: Record<SourceTier, number> = {
  T1: 58,
  'T1.5': 63,
  T2: 68,
};

/**
 * Category-specific keyword groups for search-based sources.
 * Each group targets specific content categories with appropriate keywords and sources.
 * sources: which search APIs to call for this group.
 */
export interface KeywordGroup {
  keywords: string[];
  targetCategory: ContentCategory | null; // null = let AI decide
  region: ContentRegion;
  sources: Array<'bing' | 'hackernews' | 'bilibili' | 'twitter'>;
}

export const KEYWORD_GROUPS: KeywordGroup[] = [
  // ── 国内：大厂动态 ─────────────────────────────
  {
    keywords: ['阿里通义千问', '腾讯混元', '百度文心一言', '字节豆包', '华为盘古'],
    targetCategory: 'model',
    region: 'domestic',
    sources: ['bing', 'bilibili'],
  },
  // ── 国内：国产模型 ─────────────────────────────
  {
    keywords: ['Kimi AI', 'DeepSeek', 'Qwen', 'GLM 智谱', '月之暗面', '阶跃星辰'],
    targetCategory: 'model',
    region: 'domestic',
    sources: ['bing', 'bilibili'],
  },
  // ── 国内：AI创业 & 融资 ────────────────────────
  {
    keywords: ['AI创业融资', 'AI独角兽', '大模型融资', 'AI公司A轮'],
    targetCategory: 'industry',
    region: 'domestic',
    sources: ['bing'],
  },
  // ── 国内：政策 & 监管 ──────────────────────────
  {
    keywords: ['AI备案', 'AI监管政策', '人工智能法规', '生成式AI治理'],
    targetCategory: 'industry',
    region: 'domestic',
    sources: ['bing'],
  },
  // ── 国内：技术趋势 ─────────────────────────────
  {
    keywords: ['MCP协议', 'AI Agent框架', '大模型推理优化', 'RAG技术', '国产AI框架'],
    targetCategory: null,
    region: 'domestic',
    sources: ['bing', 'bilibili'],
  },

  // ── 国际：主要AI公司 ───────────────────────────
  {
    keywords: ['OpenAI GPT', 'Anthropic Claude', 'Google Gemini', 'Meta Llama', 'xAI Grok'],
    targetCategory: 'model',
    region: 'international',
    sources: ['bing', 'hackernews', 'twitter'],
  },
  // ── 国际：AI创业公司 ───────────────────────────
  {
    keywords: ['Perplexity AI', 'Cursor AI', 'Windsurf AI', 'Lovable AI', 'Devin AI', 'Replit AI'],
    targetCategory: 'product',
    region: 'international',
    sources: ['bing', 'hackernews'],
  },
  // ── 国际：海外融资 ─────────────────────────────
  {
    keywords: ['AI startup funding', 'AI series B', 'AI raises million'],
    targetCategory: 'industry',
    region: 'international',
    sources: ['bing'],
  },
  // ── 国际：新趋势 ───────────────────────────────
  {
    keywords: ['AI browser', 'AI agent OS', 'agentic AI', 'AI coding assistant'],
    targetCategory: 'product',
    region: 'international',
    sources: ['bing', 'hackernews'],
  },

  // ── 社区：开发者讨论（关键：discussion/experience/question 类内容）─
  {
    keywords: ['LLM local setup guide', 'fine-tuning LLM tutorial', 'AI agent implementation'],
    targetCategory: 'community',
    region: 'international',
    sources: ['hackernews'],
  },
  {
    keywords: ['大模型教程', 'AI工具使用技巧', 'prompt engineering'],
    targetCategory: 'community',
    region: 'domestic',
    sources: ['bilibili'],
  },

  // ── 模型：Benchmark & API定价 ──────────────────
  {
    keywords: ['LLM benchmark comparison', 'AI model API pricing', 'context window size'],
    targetCategory: 'model',
    region: 'international',
    sources: ['bing', 'hackernews'],
  },

  // ── 论文：最新研究 ─────────────────────────────
  {
    keywords: ['arxiv AI agent', 'arxiv multimodal LLM', 'arxiv reasoning model', 'arxiv RAG'],
    targetCategory: 'research',
    region: 'international',
    sources: ['bing', 'hackernews'],
  },

  // ── 行业：垂直落地 ─────────────────────────────
  {
    keywords: ['AI legal tech', 'AI medical diagnosis', 'AI education', 'AI finance'],
    targetCategory: 'industry',
    region: 'international',
    sources: ['bing'],
  },
  {
    keywords: ['AI医疗', 'AI教育', 'AI法律', 'AI金融风控', '企业AI落地'],
    targetCategory: 'industry',
    region: 'domestic',
    sources: ['bing'],
  },
];

/** Source tier for keyword-based search sources */
export const SEARCH_SOURCE_TIER: Record<string, SourceTier> = {
  twitter_verified: 'T1.5',
  twitter: 'T2',
  bing: 'T2',
  hackernews: 'T2',
  bilibili: 'T2',
};

/**
 * X (Twitter) accounts to monitor as first-class sources.
 * Each round, we fetch each user's latest tweets directly via twitterapi.io,
 * independent of keyword search. Higher tier = more authoritative.
 *
 * Tier rules:
 *   T1   — Official org accounts (OpenAI, Anthropic, Google AI...)
 *   T1.5 — Founders/CEOs of major labs, top researchers
 *   T2   — Other AI KOLs, developer-focused accounts
 */
export interface XAccountConfig {
  /** Twitter handle without @ */
  username: string;
  /** Display name for logs/UI */
  name: string;
  tier: SourceTier;
  region: ContentRegion;
  defaultCategory?: ContentCategory;
}

export const X_ACCOUNTS: XAccountConfig[] = [
  // ===== T1: Official AI lab / org accounts =====
  { username: 'OpenAI',          name: 'OpenAI',          tier: 'T1', region: 'international', defaultCategory: 'model' },
  { username: 'OpenAIDevs',      name: 'OpenAI Devs',     tier: 'T1', region: 'international', defaultCategory: 'product' },
  { username: 'ChatGPTapp',      name: 'ChatGPT',         tier: 'T1', region: 'international', defaultCategory: 'product' },
  { username: 'AnthropicAI',     name: 'Anthropic',       tier: 'T1', region: 'international', defaultCategory: 'model' },
  { username: 'GoogleDeepMind',  name: 'Google DeepMind', tier: 'T1', region: 'international', defaultCategory: 'model' },
  { username: 'googleaidevs',    name: 'Google AI Devs',  tier: 'T1', region: 'international', defaultCategory: 'product' },
  { username: 'xai',             name: 'xAI',             tier: 'T1', region: 'international', defaultCategory: 'model' },
  { username: 'MistralAI',       name: 'Mistral AI',      tier: 'T1', region: 'international', defaultCategory: 'model' },
  { username: 'midjourney',      name: 'Midjourney',      tier: 'T1', region: 'international', defaultCategory: 'product' },
  // ===== T1: Chinese AI labs =====
  { username: 'alibaba_cloud',   name: '阿里云（通义系）', tier: 'T1', region: 'domestic', defaultCategory: 'model' },
  { username: 'SenseTime_AI',    name: '商汤 SenseTime',  tier: 'T1', region: 'domestic', defaultCategory: 'model' },
  { username: 'MiniMax_AI',      name: 'MiniMax',         tier: 'T1', region: 'domestic', defaultCategory: 'model' },
  { username: 'Kling_ai',        name: '可灵 Kling',      tier: 'T1', region: 'domestic', defaultCategory: 'product' },
  { username: 'PixVerse_',       name: 'PixVerse (爱诗)', tier: 'T1', region: 'domestic', defaultCategory: 'product' },

  // ===== T1.5: Lab founders / leadership / key researchers =====
  { username: 'sama',            name: 'Sam Altman',      tier: 'T1.5', region: 'international', defaultCategory: 'industry' },
  { username: 'DarioAmodei',     name: 'Dario Amodei',    tier: 'T1.5', region: 'international', defaultCategory: 'industry' },
  { username: 'demishassabis',   name: 'Demis Hassabis',  tier: 'T1.5', region: 'international', defaultCategory: 'industry' },
  { username: 'elonmusk',        name: 'Elon Musk',       tier: 'T1.5', region: 'international', defaultCategory: 'industry' },
  { username: 'ylecun',          name: 'Yann LeCun',      tier: 'T1.5', region: 'international', defaultCategory: 'research' },
  { username: 'karpathy',        name: 'Andrej Karpathy', tier: 'T1.5', region: 'international', defaultCategory: 'research' },
  { username: 'AndrewYNg',       name: 'Andrew Ng',       tier: 'T1.5', region: 'international', defaultCategory: 'research' },
  { username: 'nottombrown',     name: 'Tom Brown',       tier: 'T1.5', region: 'international', defaultCategory: 'research' },
  { username: 'Yuchenj_UW',      name: 'Yuchen Jin',      tier: 'T1.5', region: 'international', defaultCategory: 'research' },

  // ===== T2: AI product / tooling accounts =====
  { username: 'cursor_ai',       name: 'Cursor',          tier: 'T2', region: 'international', defaultCategory: 'product' },
  { username: 'cognition_labs',  name: 'Cognition (Devin)', tier: 'T2', region: 'international', defaultCategory: 'product' },
  { username: 'perplexity_ai',   name: 'Perplexity AI',   tier: 'T2', region: 'international', defaultCategory: 'product' },
  { username: 'Replit',          name: 'Replit',          tier: 'T2', region: 'international', defaultCategory: 'product' },
  { username: 'huggingface',     name: 'Hugging Face',    tier: 'T2', region: 'international', defaultCategory: 'community' },
  { username: 'OpenRouter',      name: 'OpenRouter',      tier: 'T2', region: 'international', defaultCategory: 'product' },

  // ===== T2: International AI news curators / educators =====
  { username: 'rasbt',           name: 'Sebastian Raschka', tier: 'T2', region: 'international', defaultCategory: 'tips' },
  { username: 'rohanpaul_ai',    name: 'Rohan Paul',      tier: 'T2', region: 'international', defaultCategory: 'community' },
  { username: 'kimmonismus',     name: 'Chubby (kimmonismus)', tier: 'T2', region: 'international', defaultCategory: 'community' },

  // ===== T2: Chinese AI KOLs =====
  { username: 'vista8',          name: 'vista8',          tier: 'T2', region: 'domestic', defaultCategory: 'community' },
  { username: 'dotey',           name: 'dotey (宝玉)',    tier: 'T2', region: 'domestic', defaultCategory: 'tips' },
  { username: 'op7418',          name: 'op7418',          tier: 'T2', region: 'domestic', defaultCategory: 'community' },
  { username: 'frxiaobei',       name: '小贝 (frxiaobei)', tier: 'T2', region: 'domestic', defaultCategory: 'community' },
  { username: 'berryxia',        name: 'Berry (berryxia)', tier: 'T2', region: 'domestic', defaultCategory: 'community' },
  { username: 'xiaohu',          name: '小互 (xiaohu)',   tier: 'T2', region: 'domestic', defaultCategory: 'community' },
];

export const RSS_FEEDS: RssFeedConfig[] = [
  // ===== T1: Official AI blogs =====
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    category: 'openai',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'model',
  },
  {
    name: 'MIT Technology Review AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
    category: 'mit_tech',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'industry',
  },
  // NOTE: Cursor / Replit / Windsurf — 官方都不提供公开 RSS（实测均 404/重定向），
  // 这几家产品发布只能通过 KEYWORD_GROUPS 里的 Bing/HN 搜索 + Twitter 抓取。

  // ===== T1.5: 中文 AI 媒体 (核心信源) =====
  {
    name: 'IT之家 AI',
    url: 'https://www.ithome.com/rss/',
    category: 'ithome',
    tier: 'T1.5',
    region: 'domestic',
    defaultCategory: 'industry',
  },
  // Anthropic 官方博客（通过 Google News RSS 代理 — 国内被墙，VPS/代理可用）
  {
    name: 'Anthropic',
    url: 'https://news.google.com/rss/search?q=site%3Aanthropic.com&hl=en-US&gl=US&ceid=US%3Aen',
    category: 'anthropic',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'model',
  },
  // Hugging Face 官方博客（国内被墙，VPS/代理可用）
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'hugging_face',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'model',
  },
  // Google AI 博客（国内被墙，VPS/代理可用）
  {
    name: 'Google AI Blog',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'google_ai',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'model',
  },
  // Google DeepMind 博客（独立于 Google AI Blog，更技术、更频繁）
  {
    name: 'Google DeepMind Blog',
    url: 'https://blog.google/technology/google-deepmind/rss/',
    category: 'deepmind',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
  // NVIDIA 官方博客 — 一级信源（GPU/CUDA/AI 基础设施）
  {
    name: 'NVIDIA Blog',
    url: 'https://blogs.nvidia.com/feed/',
    category: 'nvidia',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'industry',
  },
  // Meta AI Blog — 一级信源（Llama / FAIR）
  // 注：ai.meta.com 在国内网络下不可访问，使用 Google News RSS 代理（同 Anthropic 处理方式）。
  // 部署到海外 VPS / 有代理时可改为 https://ai.meta.com/blog/rss/
  {
    name: 'Meta AI Blog',
    url: 'https://news.google.com/rss/search?q=site%3Aai.meta.com&hl=en-US&gl=US&ceid=US%3Aen',
    category: 'meta_ai',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'model',
  },
  // HuggingFace Daily Papers — 社区每日精选论文，比 arXiv 噪音少得多
  // 注：HF 官方未提供 RSS，使用 RSSHub 公共实例。如不稳定可自建或换用 Google News
  {
    name: 'HuggingFace Daily Papers',
    url: 'https://rsshub.app/huggingface/daily-papers',
    category: 'hf_papers',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
  // Ed Zitron 的 AI 行业批判博客 — 高质量行业观察
  {
    name: "Where's Your Ed At",
    url: 'https://www.wheresyoured.at/rss/',
    category: 'wheresyoured',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'industry',
  },
  // NOTE: These 3 sources are blocked from mainland China networks.
  // Uncomment if running with a proxy/VPN, otherwise they waste timeout per round.
  // {
  //   name: 'Anthropic',
  //   url: 'https://news.google.com/rss/search?q=site%3Aanthropic.com&hl=en-US&gl=US&ceid=US%3Aen',
  //   category: 'anthropic',
  //   tier: 'T1',
  //   region: 'international',
  //   defaultCategory: 'model',
  // },
  // {
  //   name: 'Hugging Face Blog',
  //   url: 'https://huggingface.co/blog/feed.xml',
  //   category: 'hugging_face',
  //   tier: 'T1',
  //   region: 'international',
  //   defaultCategory: 'model',
  // },
  // {
  //   name: 'Google AI Blog',
  //   url: 'https://blog.google/technology/ai/rss/',
  //   category: 'google_ai',
  //   tier: 'T1',
  //   region: 'international',
  //   defaultCategory: 'model',
  // },

  // ===== T1.5: Quality media & developer blogs =====
  {
    name: 'The Decoder',
    url: 'https://the-decoder.com/feed/',
    category: 'the_decoder',
    tier: 'T1.5',
    region: 'international',
  },
  {
    name: 'VentureBeat',
    url: 'https://venturebeat.com/feed/',
    category: 'venturebeat',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'industry',
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'techcrunch',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'industry',
  },
  {
    name: 'Microsoft AI Blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    category: 'microsoft_ai',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'model',
  },
  {
    name: 'Synced Review',
    url: 'https://syncedreview.com/feed/',
    category: 'synced',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'research',
  },
  {
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    category: 'github',
    tier: 'T1.5',
    region: 'international',
    defaultCategory: 'product',
  },
  {
    name: 'InfoQ',
    url: 'https://plink.anyfeeder.com/infoq/recommend',
    category: 'infoq',
    tier: 'T1.5',
    region: 'domestic',
    defaultCategory: 'industry',
  },

  // ===== T2: Community =====
  {
    name: 'Hacker News Best',
    url: 'https://hnrss.org/best',
    category: 'hacker_news',
    tier: 'T2',
    region: 'international',
    defaultCategory: 'community',
  },
  {
    name: 'V2EX 热帖',
    url: 'https://rsshub.rssforever.com/v2ex/topics/hot',
    category: 'v2ex',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'community',
  },
  {
    name: '掘金',
    url: 'https://juejin.cn/rss',
    category: 'juejin',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'community',
  },

  // ===== T2: Finance / Business =====
  {
    name: '财联社',
    url: 'https://rsshub.rssforever.com/cls/telegraph',
    category: 'cls',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'industry',
  },
  {
    name: '雪球热门话题',
    url: 'https://xueqiu.com/hots/topic/rss',
    category: 'xueqiu',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'industry',
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    category: '36kr',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'industry',
  },

  // ===== T2: Domestic News =====
  {
    name: '中国新闻网',
    url: 'https://www.chinanews.com.cn/rss/importnews.xml',
    category: 'chinanews',
    tier: 'T2',
    region: 'domestic',
    defaultCategory: 'industry',
  },

  // ===== T1: Research — arXiv (export.arxiv.org is publicly accessible) =====
  {
    name: 'arXiv cs.AI',
    url: 'https://export.arxiv.org/rss/cs.AI',
    category: 'arxiv_ai',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
  {
    name: 'arXiv cs.LG',
    url: 'https://export.arxiv.org/rss/cs.LG',
    category: 'arxiv_lg',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
  {
    name: 'arXiv cs.CL',
    url: 'https://export.arxiv.org/rss/cs.CL',
    category: 'arxiv_cl',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
  {
    name: 'arXiv cs.CV',
    url: 'https://export.arxiv.org/rss/cs.CV',
    category: 'arxiv_cv',
    tier: 'T1',
    region: 'international',
    defaultCategory: 'research',
  },
];
