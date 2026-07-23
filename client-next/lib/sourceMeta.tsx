import { Twitter, Globe, Eye, Activity, Search, Zap, MessageSquare } from 'lucide-react';

/**
 * Source → icon / display-label helpers shared by the hotspot radar, curated
 * view and daily digest so all three read a source string the same way.
 */

/** Icon for a source string. `className` lets callers pick the size. */
export function getSourceIcon(source: string, className = 'w-4 h-4') {
  if (source === 'twitter' || source.startsWith('twitter_')) return <Twitter className={className} />;
  if (source === 'bilibili') return <Eye className={className} />;
  if (source === 'weibo') return <Activity className={className} />;
  if (source === 'sogou') return <Search className={className} />;
  if (source === 'hackernews') return <Zap className={className} />;
  if (source.startsWith('reddit_')) return <MessageSquare className={className} />;
  return <Globe className={className} />;
}

const SOURCE_LABELS: Record<string, string> = {
  twitter: 'X',
  bing: 'Bing',
  google: 'Google',
  sogou: '搜狗',
  bilibili: 'Bilibili',
  weibo: '微博热搜',
  hackernews: 'HackerNews',
  duckduckgo: 'DuckDuckGo',
};

const RSS_LABELS: Record<string, string> = {
  openai: 'OpenAI Blog',
  anthropic: 'Anthropic',
  google_ai: 'Google AI Blog',
  deepmind: 'Google DeepMind',
  hugging_face: 'Hugging Face',
  microsoft_ai: 'Microsoft AI',
  nvidia: 'NVIDIA',
  meta_ai: 'Meta AI',
  hf_papers: 'HuggingFace Daily Papers',
  mit_tech: 'MIT Technology Review',
  the_decoder: 'The Decoder',
  venturebeat: 'VentureBeat',
  techcrunch: 'TechCrunch',
  synced: 'Synced',
  github: 'GitHub Blog',
  infoq: 'InfoQ',
  hacker_news: 'Hacker News Best',
  v2ex: 'V2EX 热帖',
  juejin: '掘金',
  cls: '财联社',
  xueqiu: '雪球热门',
  '36kr': '36氪',
  chinanews: '中国新闻网',
  ithome: 'IT之家',
  arxiv_ai: 'arXiv cs.AI',
  arxiv_lg: 'arXiv cs.LG',
  arxiv_cl: 'arXiv cs.CL',
  arxiv_cv: 'arXiv cs.CV',
  wheresyoured: "Where's Your Ed At",
};

/** subreddit slug → display label */
const REDDIT_LABELS: Record<string, string> = {
  machinelearning:        'r/MachineLearning',
  localllama:             'r/LocalLLaMA',
  openai:                 'r/OpenAI',
  claudeai:               'r/ClaudeAI',
  bard:                   'r/Bard (Gemini)',
  chatgpt:                'r/ChatGPT',
  stablediffusion:        'r/StableDiffusion',
  midjourney:             'r/midjourney',
  artificial:             'r/artificial',
  singularity:            'r/singularity',
  aiassistants:           'r/AIAssistants',
  deeplearning:           'r/deeplearning',
  learnmachinelearning:   'r/learnML',
};

/** Human-readable label for a source string (e.g. `rss_the_decoder` → `The Decoder`). */
export function getSourceLabel(source: string): string {
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source.startsWith('rss_')) {
    const cat = source.slice(4);
    return RSS_LABELS[cat] ?? cat.replace(/_/g, ' ');
  }
  if (source.startsWith('twitter_')) return '@' + source.slice(8);
  if (source.startsWith('reddit_')) {
    const sub = source.slice(7);
    return REDDIT_LABELS[sub] ?? `r/${sub}`;
  }
  return source;
}
