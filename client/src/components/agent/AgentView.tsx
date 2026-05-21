import { useState } from 'react';
import {
  Plug, Copy, Check, ExternalLink, Sparkles, Rss, Code2,
  CalendarDays, Newspaper, LayoutList, Search, Zap, Terminal, BookOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type AgentTab = 'skill' | 'rss' | 'api';

const BASE_URL = window.location.origin;

const RSS_FEEDS = [
  {
    label: '精选资讯 RSS',
    url: `${BASE_URL}/api/agent/rss/curated.xml`,
    desc: '经 AI 五维评分筛选的高质量内容，每条都值得读',
    color: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    label: '全部资讯 RSS',
    url: `${BASE_URL}/api/agent/rss/all.xml`,
    desc: '不做筛选，所有抓取到的 AI 资讯，适合需要全量信息的场景',
    color: 'from-purple-500/20 to-pink-500/10',
  },
  {
    label: 'AI 日报 RSS',
    url: `${BASE_URL}/api/agent/rss/digest.xml`,
    desc: '每日凌晨自动生成的 AI 行业日报，覆盖模型 / 产品 / 行业 / 论文',
    color: 'from-amber-500/20 to-orange-500/10',
  },
];

const API_DOCS = [
  { method: 'GET', path: '/api/agent/curated', desc: '获取精选资讯 JSON 列表', params: 'limit, offset' },
  { method: 'GET', path: '/api/agent/digest',  desc: '获取指定日期的 AI 日报',  params: 'date (YYYY-MM-DD)' },
  { method: 'GET', path: '/api/agent/search',  desc: '按关键词搜索资讯',         params: 'q, limit' },
  { method: 'GET', path: '/api/agent/stats',   desc: '系统统计数据',             params: '—' },
  { method: 'GET', path: '/aihot-skill',       desc: 'Skill 描述 JSON',          params: '—' },
];

const SKILL_CAPABILITIES = [
  {
    icon: CalendarDays,
    title: 'AI 日报',
    desc: '获取今日或指定日期的 AI 行业日报，按模型 / 产品 / 行业 / 论文等板块返回',
    example: '给我一份今天的 AI 日报',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Newspaper,
    title: '精选资讯',
    desc: '获取经质量评分精选的 AI 资讯，按重要度排序',
    example: '看看最新的精选 AI 资讯',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: LayoutList,
    title: '分类查询',
    desc: '按内容分类（模型 / 产品 / 行业 / 论文）或时间范围筛选资讯',
    example: '最近 3 天有哪些新模型发布',
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Search,
    title: '关键词搜索',
    desc: '在所有资讯中搜索包含特定关键词的内容',
    example: 'Claude 最近有什么新动态',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

const TABS: { id: AgentTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'skill', label: 'Skill', icon: Sparkles, desc: 'AI 助手原生集成' },
  { id: 'rss',   label: 'RSS',   icon: Rss,      desc: 'RSS 阅读器订阅' },
  { id: 'api',   label: 'API',   icon: Code2,    desc: 'JSON HTTP 接口' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
      title={copied ? '已复制' : '复制'}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST:   'bg-blue-500/15    text-blue-400    border-blue-500/20',
  PUT:    'bg-amber-500/15   text-amber-400   border-amber-500/20',
  DELETE: 'bg-red-500/15     text-red-400     border-red-500/20',
};

export function AgentView() {
  const [activeTab, setActiveTab] = useState<AgentTab>('skill');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <Plug className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Agent 接入</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          把 AI Hot Radar 的「精选资讯」「AI 日报」「关键词搜索」能力，以 <span className="text-[var(--accent-blue)] dark:text-blue-400 font-medium">Skill</span>、
          <span className="text-[var(--accent-emerald)] dark:text-emerald-400 font-medium"> RSS</span>、
          <span className="text-[var(--accent-amber)] dark:text-purple-400 font-medium"> API</span> 三种方式开放给外部消费 —
          无论是 Claude Code、Cursor、Feedly，还是企业 IM 机器人，都能一键接入。
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--bg-elevated)] rounded-xl mb-6 border border-[var(--border-subtle)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-all',
                active
                  ? 'bg-[var(--accent-blue)] text-white shadow-md shadow-[var(--accent-blue)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]',
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{tab.label}</span>
              </div>
              <span className={cn('text-[10px]', active ? 'text-white/80' : 'text-[var(--text-muted)]')}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Skill ─────────────────────────────────────────── */}
      {activeTab === 'skill' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-blue-500/8 to-purple-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-blue)] dark:text-blue-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">什么是 Skill？</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Skill 是给 AI 助手（如 Claude Code、Cursor）用的「能力包」。安装一次后，
              你的 AI 助手就拥有「查 AI 日报、查精选、按关键词搜索」等能力，自然语言提问即可调用。
            </p>
            <div className="rounded-lg bg-[var(--bg-base)] border border-[var(--card-border)] p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  在 AI 助手中粘贴这一行
                </span>
                <CopyButton text={`帮我安装这个 skill：${BASE_URL}/aihot-skill`} />
              </div>
              <code className="block text-sm text-[var(--accent-blue)] dark:text-blue-400 break-all">
                帮我安装这个 skill：{BASE_URL}/aihot-skill
              </code>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Skill 提供的能力
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKILL_CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--card-border-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('p-1.5 rounded-lg', cap.bg)}>
                        <Icon className={cn('w-4 h-4', cap.accent)} />
                      </span>
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm">{cap.title}</h4>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">{cap.desc}</p>
                    <div className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded px-2 py-1.5">
                      <Terminal className="w-3 h-3 mt-0.5 shrink-0" />
                      <code>{cap.example}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RSS ───────────────────────────────────────────── */}
      {activeTab === 'rss' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-emerald-500/8 to-cyan-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Rss className="w-4 h-4 text-emerald-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">RSS 订阅</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              提供 3 个 RSS Feed，复制链接到你常用的 RSS 阅读器（Feedly、Inoreader、NetNewsWire 等）即可订阅。
              所有 Feed 实时反映本系统的最新内容。
            </p>
          </div>

          <div className="space-y-3">
            {RSS_FEEDS.map((feed) => (
              <div
                key={feed.url}
                className={cn(
                  'p-4 rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br',
                  feed.color,
                  'hover:border-[var(--card-border-hover)] transition-colors',
                )}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Rss className="w-4 h-4 text-[var(--text-muted)]" />
                    {feed.label}
                  </h3>
                  <div className="flex items-center gap-1">
                    <CopyButton text={feed.url} />
                    <a
                      href={feed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      title="在新标签打开"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-2.5 leading-relaxed">{feed.desc}</p>
                <code className="block text-xs text-[var(--accent-blue)] dark:text-blue-400 bg-[var(--bg-base)]/60 rounded px-2 py-1.5 break-all">
                  {feed.url}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── API ───────────────────────────────────────────── */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-purple-500/8 to-pink-500/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">REST API</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              全部接口免认证、JSON 格式返回，可直接对接飞书机器人 / 企业微信 / n8n / 自动化工作流。
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <Zap className="w-3 h-3 text-amber-400" /> 无需 Token
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <BookOpen className="w-3 h-3 text-[var(--accent-blue)] dark:text-blue-400" /> JSON 响应
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <Terminal className="w-3 h-3 text-emerald-400" /> 直接 curl 调用
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {API_DOCS.map((api) => (
              <div
                key={api.path}
                className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--card-border-hover)] transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'text-[11px] font-mono font-bold px-2 py-0.5 rounded border',
                      METHOD_COLORS[api.method] ?? METHOD_COLORS.GET,
                    )}
                  >
                    {api.method}
                  </span>
                  <code className="text-sm text-[var(--accent-blue)] dark:text-blue-400 font-mono">{api.path}</code>
                  <div className="ml-auto">
                    <CopyButton text={`${BASE_URL}${api.path}`} />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">{api.desc}</p>
                {api.params && api.params !== '—' && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                    参数：{api.params}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              示例
            </p>
            <code className="block text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">
{`curl ${BASE_URL}/api/agent/curated?limit=5
curl ${BASE_URL}/api/agent/digest?date=2026-05-21
curl "${BASE_URL}/api/agent/search?q=Claude&limit=10"`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
