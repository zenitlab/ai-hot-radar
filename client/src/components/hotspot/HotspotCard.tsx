import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Flame, Zap, TrendingUp, Twitter, Globe,
  Eye, Activity, Clock, Target, MessageCircle, Repeat2, Quote, User,
  Shield, ShieldAlert, ChevronDown, ChevronUp, ThermometerSun, FileText, Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { relativeTime, formatDateTime } from '../../utils/relativeTime';
import { HotspotMedia } from './HotspotMedia';
import type { Hotspot } from '../../types';

/** Compute aggregate heat score (normalised 0-100) */
function calcHeatScore(h: Hotspot): number {
  const likes = h.likeCount ?? 0;
  const retweets = h.retweetCount ?? 0;
  const replies = h.replyCount ?? 0;
  const comments = h.commentCount ?? 0;
  const quotes = h.quoteCount ?? 0;
  const views = h.viewCount ?? 0;
  const raw = likes * 2 + retweets * 3 + replies * 1.5 + comments * 1.5 + quotes * 2 + views / 100;
  if (raw <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(raw + 1) * 25));
}

function getHeatLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '爆', color: 'text-red-400' };
  if (score >= 60) return { label: '热', color: 'text-orange-400' };
  if (score >= 40) return { label: '温', color: 'text-amber-400' };
  if (score >= 20) return { label: '凉', color: 'text-blue-400' };
  return { label: '冷', color: 'text-slate-500' };
}

function getImportanceIcon(importance: string) {
  switch (importance) {
    case 'urgent': return <AlertTriangle className="w-4 h-4" />;
    case 'high': return <Flame className="w-4 h-4" />;
    case 'medium': return <Zap className="w-4 h-4" />;
    default: return <TrendingUp className="w-4 h-4" />;
  }
}

function getSourceIcon(source: string) {
  switch (source) {
    case 'twitter': return <Twitter className="w-4 h-4" />;
    case 'bilibili': return <Eye className="w-4 h-4" />;
    case 'weibo': return <Activity className="w-4 h-4" />;
    case 'sogou': return <Search className="w-4 h-4" />;
    case 'hackernews': return <Zap className="w-4 h-4" />;
    default: return <Globe className="w-4 h-4" />;
  }
}

function getSourceLabel(source: string) {
  const labels: Record<string, string> = {
    twitter: 'X',
    bing: 'Bing',
    google: 'Google',
    sogou: '搜狗',
    bilibili: 'Bilibili',
    weibo: '微博热搜',
    hackernews: 'HackerNews',
    duckduckgo: 'DuckDuckGo',
  };
  if (labels[source]) return labels[source];

  // Pretty Chinese / English labels for RSS categories
  const rssLabels: Record<string, string> = {
    openai: 'OpenAI Blog',
    anthropic: 'Anthropic',
    google_ai: 'Google AI Blog',
    deepmind: 'Google DeepMind',
    hugging_face: 'Hugging Face',
    microsoft_ai: 'Microsoft AI',
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
  if (source.startsWith('rss_')) {
    const cat = source.slice(4);
    return rssLabels[cat] || cat.replace(/_/g, ' ');
  }
  // X account-sourced items: "twitter_<username>" → "@username"
  if (source.startsWith('twitter_')) {
    return '@' + source.slice(8);
  }
  return source;
}

interface HotspotCardProps {
  hotspot: Hotspot;
  index?: number;
  /** Pre-expanded reason ids set from parent */
  expandedReasons?: Set<string>;
  expandedContents?: Set<string>;
  onToggleReason?: (id: string) => void;
  onToggleContent?: (id: string) => void;
}

export function HotspotCard({
  hotspot,
  index = 0,
  expandedReasons,
  expandedContents,
  onToggleReason,
  onToggleContent,
}: HotspotCardProps) {
  // Local state fallback when parent doesn't manage expansion
  const [localReasonOpen, setLocalReasonOpen] = useState(false);
  const [localContentOpen, setLocalContentOpen] = useState(false);

  const reasonOpen = expandedReasons ? expandedReasons.has(hotspot.id) : localReasonOpen;
  const contentOpen = expandedContents ? expandedContents.has(hotspot.id) : localContentOpen;

  const toggleReason = () => {
    if (onToggleReason) onToggleReason(hotspot.id);
    else setLocalReasonOpen(v => !v);
  };
  const toggleContent = () => {
    if (onToggleContent) onToggleContent(hotspot.id);
    else setLocalContentOpen(v => !v);
  };

  const heatScore = calcHeatScore(hotspot);
  const heat = getHeatLevel(heatScore);

  return (
    <motion.div
      key={hotspot.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(59,130,246,0.13)] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Row 1: Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center',
              hotspot.importance === 'urgent' && 'bg-red-500/15 text-red-400 border border-red-500/20',
              hotspot.importance === 'high' && 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
              hotspot.importance === 'medium' && 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
              hotspot.importance === 'low' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
            )}>
              {getImportanceIcon(hotspot.importance)}
              <span className="ml-1">{hotspot.importance}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              {getSourceIcon(hotspot.source)}
              {getSourceLabel(hotspot.source)}
            </span>
            {hotspot.keyword && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {hotspot.keyword.text}
              </span>
            )}
            {!hotspot.isReal && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert className="w-3 h-3" />
                可疑
              </span>
            )}
            {hotspot.isReal && hotspot.relevance >= 80 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                可信
              </span>
            )}
            {hotspot.keywordMentioned === true && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Target className="w-3 h-3" />
                直接提及
              </span>
            )}
            {hotspot.keywordMentioned === false && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <Target className="w-3 h-3" />
                间接相关
              </span>
            )}
            <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] font-medium', heat.color)}>
              <ThermometerSun className="w-3 h-3" />
              {heat.label} {heatScore}
            </span>
          </div>

          {/* Title */}
          <a
            href={hotspot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-medium text-[var(--text-primary)] mb-2 line-clamp-2 hover:text-blue-400 transition-colors cursor-pointer"
          >
            {hotspot.title}
          </a>

          {/* AI Summary */}
          {hotspot.summary && (
            <div className="mb-3">
              <span className="text-[10px] text-blue-400/60 font-medium mr-1.5">AI 摘要</span>
              <span className="text-sm text-[var(--text-secondary)]">{hotspot.summary}</span>
            </div>
          )}

          {/* Media (X/Twitter photos & videos) */}
          {hotspot.media && hotspot.media.length > 0 && (
            <HotspotMedia media={hotspot.media} />
          )}

          {/* Author */}
          {hotspot.authorName && (
            <div className="flex items-center gap-2 mb-3">
              {hotspot.authorAvatar ? (
                <img src={hotspot.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-[var(--text-muted)]" />
              )}
              <span className="text-xs text-[var(--text-secondary)]">
                {hotspot.authorName}
                {hotspot.authorUsername && <span className="text-[var(--text-muted)] ml-1">@{hotspot.authorUsername}</span>}
              </span>
              {hotspot.authorVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">✓ 认证</span>
              )}
              {hotspot.authorFollowers != null && hotspot.authorFollowers > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">{hotspot.authorFollowers.toLocaleString()} 粉丝</span>
              )}
            </div>
          )}

          {/* Engagement metrics */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              相关性 {hotspot.relevance}%
            </span>
            {hotspot.likeCount != null && hotspot.likeCount > 0 && (
              <span className="flex items-center gap-1" title="点赞">
                <Zap className="w-3.5 h-3.5" />
                {hotspot.likeCount.toLocaleString()}
              </span>
            )}
            {hotspot.retweetCount != null && hotspot.retweetCount > 0 && (
              <span className="flex items-center gap-1" title="转发">
                <Repeat2 className="w-3.5 h-3.5" />
                {hotspot.retweetCount.toLocaleString()}
              </span>
            )}
            {hotspot.replyCount != null && hotspot.replyCount > 0 && (
              <span className="flex items-center gap-1" title="回复">
                <MessageCircle className="w-3.5 h-3.5" />
                {hotspot.replyCount.toLocaleString()}
              </span>
            )}
            {hotspot.commentCount != null && hotspot.commentCount > 0 && (
              <span className="flex items-center gap-1" title="评论">
                <MessageCircle className="w-3.5 h-3.5" />
                {hotspot.commentCount.toLocaleString()}
              </span>
            )}
            {hotspot.quoteCount != null && hotspot.quoteCount > 0 && (
              <span className="flex items-center gap-1" title="引用">
                <Quote className="w-3.5 h-3.5" />
                {hotspot.quoteCount.toLocaleString()}
              </span>
            )}
            {hotspot.viewCount != null && hotspot.viewCount > 0 && (
              <span className="flex items-center gap-1" title="浏览量">
                <Eye className="w-3.5 h-3.5" />
                {hotspot.viewCount.toLocaleString()}
              </span>
            )}
            {hotspot.danmakuCount != null && hotspot.danmakuCount > 0 && (
              <span className="flex items-center gap-1" title="弹幕">
                💬 {hotspot.danmakuCount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
            {hotspot.publishedAt && (
              <span className="flex items-center gap-1" title={`发布于 ${formatDateTime(hotspot.publishedAt)}`}>
                <Clock className="w-3 h-3" />
                发布 {relativeTime(hotspot.publishedAt)}
              </span>
            )}
            <span className="flex items-center gap-1" title={`抓取于 ${formatDateTime(hotspot.createdAt)}`}>
              <Activity className="w-3 h-3" />
              抓取 {relativeTime(hotspot.createdAt)}
            </span>
          </div>

          {/* AI relevance reason - collapsible */}
          {hotspot.relevanceReason && (
            <div className="mt-2">
              <button
                onClick={toggleReason}
                className="flex items-center gap-1 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
              >
                {reasonOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                AI 分析理由
              </button>
              <AnimatePresence>
                {reasonOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[var(--text-secondary)] mt-1 pl-4 border-l-2 border-blue-500/20">
                      {hotspot.relevanceReason}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Raw content - collapsible */}
          {hotspot.content && hotspot.content !== hotspot.summary && (
            <div className="mt-2">
              <button
                onClick={toggleContent}
                className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {contentOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <FileText className="w-3 h-3" />
                原始内容
              </button>
              <AnimatePresence>
                {contentOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[var(--text-secondary)] mt-1 pl-4 border-l-2 border-[var(--card-border-hover)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {hotspot.content}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
