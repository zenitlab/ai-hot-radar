import { Globe, Eye, Activity, Search, Zap } from 'lucide-react';

/**
 * Source → icon / display-label helpers shared by the hotspot radar, curated
 * view and daily digest so all three read a source string the same way.
 */

/** Icon for a source string. `className` lets callers pick the size. */
export function getSourceIcon(source: string, className = 'w-4 h-4') {
  if (source === 'twitter' || source.startsWith('twitter_')) return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;
  if (source === 'bilibili') return <Eye className={className} />;
  if (source === 'weibo') return <Activity className={className} />;
  if (source === 'sogou') return <Search className={className} />;
  if (source === 'hackernews') return <Zap className={className} />;
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

/** Human-readable label for a source string (e.g. `rss_the_decoder` → `The Decoder`). */
export function getSourceLabel(source: string): string {
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source.startsWith('rss_')) {
    const cat = source.slice(4);
    return RSS_LABELS[cat] ?? cat.replace(/_/g, ' ');
  }
  if (source.startsWith('twitter_')) return '@' + source.slice(8);
  return source;
}
