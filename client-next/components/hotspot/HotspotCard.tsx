'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Flame, Zap, TrendingUp,
  Eye, Activity, Clock, Target, MessageCircle, Repeat2, Quote, User,
  ShieldAlert, ChevronDown, ChevronUp, ThermometerSun, FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getSourceIcon, getSourceLabel } from '../../lib/sourceMeta';
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

interface HotspotCardProps {
  hotspot: Hotspot;
  index?: number;
  /** Pre-expanded reason ids set from parent */
  expandedReasons?: Set<string>;
  expandedContents?: Set<string>;
  onToggleReason?: (id: string) => void;
  onToggleContent?: (id: string) => void;
  /** Skip the mount fade-in (used on list refreshes so the list doesn't re-flash) */
  disableEntrance?: boolean;
}

export function HotspotCard({
  hotspot,
  index = 0,
  expandedReasons,
  expandedContents,
  onToggleReason,
  onToggleContent,
  disableEntrance = false,
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
      initial={disableEntrance ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: disableEntrance ? 0 : index * 0.03 }}
      className="group p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Row 1: Meta badges — kept lean.
              Removed: 可信 chip (the importance badge + 关键词 chip already
              encode trust), 直接提及/间接相关 chip (the presence of a 关键词
              chip already implies relevance — having a separate "this is
              relevant to your keyword" badge on a card matched by that
              keyword was redundant).
              Kept: importance · source · keyword · 可疑 (only when suspicious,
              acts as a warning) · heat. */}
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
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                {hotspot.keyword.text}
              </span>
            )}
            {!hotspot.isReal && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20" title="AI 评分认为可疑">
                <ShieldAlert className="w-3 h-3" />
                可疑
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
            className="block font-semibold text-[15px] text-[var(--text-primary)] mb-2 line-clamp-2 hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors cursor-pointer leading-snug"
          >
            {hotspot.title}
          </a>

          {/* AI Summary — quote-style block with leading bar makes it
              clearly distinct from the title and original content */}
          {hotspot.summary && (
            <div className="mb-3 pl-3 border-l-2 border-[var(--accent-blue)]/40 dark:border-blue-400/40">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3 h-3 text-[var(--accent-blue)] dark:text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-blue)]/80 dark:text-blue-400/70">
                  AI 摘要
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{hotspot.summary}</p>
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] dark:bg-blue-500/15 dark:text-blue-400">✓ 认证</span>
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

          {/* AI relevance reason — only present for keyword-matched cards.
              Each card self-decides; the page-level "expand all" was removed. */}
          {hotspot.relevanceReason && (
            <div className="mt-2">
              <button
                onClick={toggleReason}
                className="flex items-center gap-1 text-[11px] text-[var(--accent-blue)]/70 dark:text-blue-400/70 hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors"
              >
                {reasonOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                关键词关联分析
              </button>
              <AnimatePresence>
                {reasonOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[var(--text-secondary)] mt-1 pl-4 border-l-2 border-[var(--accent-blue)]/20 dark:border-blue-500/20">
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
