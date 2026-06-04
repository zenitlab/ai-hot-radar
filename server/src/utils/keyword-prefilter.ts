/**
 * Cheap title/content keyword pre-filter for generic news sources.
 *
 * Used to short-circuit AI scoring on sources that mix AI with unrelated content
 * (IT之家、36氪、中国新闻网、财联社、雪球、InfoQ etc.). Items that don't even
 * mention an AI keyword are dropped without consuming any AI tokens.
 *
 * AI-focused sources (OpenAI Blog, arXiv, The Decoder, etc.) skip this filter
 * entirely since their content is AI by definition.
 */

/**
 * Source categories that produce mixed AI / non-AI content. Items from these
 * sources go through `titleLooksAiRelated` before being scored.
 *
 * Match the `category` field from RSS_FEEDS or short source identifiers.
 */
export const GENERIC_NEWS_SOURCES = new Set<string>([
  'ithome',     // IT之家 — broad tech news
  '36kr',       // 36氪 — business news
  'chinanews',  // 中国新闻网 — general news
  'cls',        // 财联社 — finance
  'xueqiu',     // 雪球 — investment topics
  'infoq',      // InfoQ — broad tech
]);

/**
 * AI-related keywords. Conservative list — broad enough to avoid false negatives,
 * specific enough to actually filter (no generic words like "技术" / "tech").
 *
 * If a title or first paragraph contains ANY of these (case-insensitive substring
 * match), the item passes and gets full AI scoring. Otherwise dropped.
 */
const AI_KEYWORDS: string[] = [
  // Chinese
  '人工智能', '大模型', '大语言模型', 'AI模型', 'AI编程', 'AI助手', 'AI芯片', 'AI产品',
  'AI工具', 'AI Agent', 'AI助理', 'AI 智能', 'AI公司', 'AI创业', 'AI融资',
  '智能体', '生成式', '推理模型', '多模态', '通用人工智能',
  '算力', '英伟达', 'GPU',
  // Generic AI English
  'AI', 'LLM', 'GPT', 'AGI', 'RAG', 'MCP', 'Agent',
  // Major labs / models / products
  'OpenAI', 'Anthropic', 'Claude', 'Gemini', 'Llama', 'Mistral', 'Grok',
  'DeepSeek', 'Qwen', '通义', '文心', '混元', '盘古', '豆包', 'Kimi', 'GLM', '智谱',
  '月之暗面', '阶跃', 'MiniMax',
  'ChatGPT', 'Sora', 'Whisper', 'DALL', 'Midjourney',
  'Cursor', 'Copilot', 'Devin', 'Replit', 'Perplexity', 'Windsurf', 'Lovable',
  'HuggingFace', 'Hugging Face',
  'Transformer', 'Diffusion', 'Embedding', 'fine-tun', 'finetun',
  // Companies actively in AI
  'NVIDIA', 'xAI', 'Microsoft AI', 'Apple Intelligence', 'Meta AI',
];

/** Lowercased version, computed once. */
const AI_KEYWORDS_LOWER = AI_KEYWORDS.map(k => k.toLowerCase());

/**
 * Check if a title (and optionally a content snippet) looks AI-related.
 * Returns true if any keyword matches. Cheap — no AI call.
 */
export function titleLooksAiRelated(title: string, content?: string): boolean {
  const haystack = (title + ' ' + (content || '').slice(0, 200)).toLowerCase();
  for (const kw of AI_KEYWORDS_LOWER) {
    if (haystack.includes(kw)) return true;
  }
  return false;
}

/** Check if a source category needs the cheap pre-filter. */
export function needsKeywordPrefilter(category: string): boolean {
  return GENERIC_NEWS_SOURCES.has(category);
}

/**
 * Non-news page filter: catches login portals, dashboards, welcome pages, etc.
 * that should never appear in a news radar (e.g. partnerhub.anthropic.com/signin).
 *
 * Returns true if the URL or title matches a known non-news pattern — caller
 * should skip the item.
 */
export function looksLikeNonNewsPage(url: string, title: string): boolean {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  // Portal / auth / account management URLs
  const urlBlacklist = [
    '/signin', '/login', '/signup', '/register', '/auth/',
    '/dashboard', '/console', '/portal', '/admin', '/account',
    'partnerhub.', 'hub.', 'app.', 'console.',
  ];
  if (urlBlacklist.some(pat => urlLower.includes(pat))) return true;

  // Welcome / landing page titles (not news)
  const titleBlacklist = [
    'welcome to', '欢迎', 'sign in', 'log in', '登录', '注册',
    'dashboard', 'portal', 'console',
  ];
  if (titleBlacklist.some(pat => titleLower.includes(pat))) return true;

  return false;
}
