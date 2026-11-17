'use client';
import { useState, useSyncExternalStore } from 'react';
import {
  Plug, Copy, Check, ExternalLink, Sparkles, Rss, Code2,
  CalendarDays, Newspaper, Search, Zap, Terminal, BookOpen, Flame, GitBranch, LayoutGrid, ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type AgentTab = 'skill' | 'rss' | 'api';

/** Build RSS feed list from the runtime origin (set after mount for SSR safety). */
const getRssFeeds = (baseUrl: string) => [
  {
    label: '精选资讯 RSS',
    url: `${baseUrl}/api/agent/rss/curated.xml`,
    desc: '经 AI 五维评分筛选的最新 50 条精选，同一事件只留一条',
  },
  {
    label: '全部资讯 RSS',
    url: `${baseUrl}/api/agent/rss/all.xml`,
    desc: '不做筛选，最新抓取到的 100 条 AI 资讯，适合需要全量信息的场景',
  },
  {
    label: 'AI 日报 RSS',
    url: `${baseUrl}/api/agent/rss/digest.xml`,
    desc: '每天早上 8 点生成的 AI 日报：当日总结、重点事件、六大板块与快讯，保留最近 7 期',
  },
];

const API_DOCS = [
  { method: 'GET', path: '/api/agent/digest',  desc: '指定日期的 AI 日报：总结、重点事件、六大板块与快讯', params: 'date (YYYY-MM-DD，默认今天)' },
  { method: 'GET', path: '/api/hotspots/trending', desc: '热点榜：过去 48 小时多家来源同时报道的事件，按热度排序，含涨跌与事件概览', params: 'limit (≤50)' },
  { method: 'GET', path: '/api/hotspots/story/{clusterKey}', desc: '事件详情：全部报道时间线，以及「已确认 / 尚未确认 / 为什么重要」要点', params: '—' },
  { method: 'GET', path: '/api/topics', desc: '全部主题及 slug：公司与模型、技术方向、内容类型', params: '—' },
  { method: 'GET', path: '/api/topics/{slug}', desc: '某个主题近 30 天的焦点事件与精选列表', params: 'page' },
  { method: 'GET', path: '/api/agent/curated', desc: '精选资讯，按质量分降序；问「最近」时带上 days', params: 'limit (≤100), offset, days (1–30)' },
  { method: 'GET', path: '/api/agent/search',  desc: '在标题和摘要里按关键词搜索', params: 'q, limit' },
  { method: 'GET', path: '/api/agent/stats',   desc: '资讯总量、当日新增、信源数量', params: '—' },
  { method: 'GET', path: '/skill.md',          desc: '可安装的 Skill（SKILL.md，Markdown）', params: '—' },
];

const SKILL_CAPABILITIES = [
  {
    icon: CalendarDays,
    title: 'AI 日报',
    desc: '今天或指定日期的 AI 日报：当日总结、重点事件和各板块要点，每条带原文链接',
    example: '给我一份今天的 AI 日报',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Flame,
    title: '热点榜',
    desc: '过去 48 小时多家来源同时报道的事件，按热度排序，看得出哪件事正在发酵',
    example: '现在 AI 圈最热的是什么',
    accent: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    icon: GitBranch,
    title: '事件来龙去脉',
    desc: '一件事的全部报道和事件概览，区分已确认的事实和尚未确认的传闻',
    example: 'OpenAI 新模型的消息，现在确认了哪些',
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: LayoutGrid,
    title: '主题动态',
    desc: '按公司（OpenAI、Anthropic、DeepSeek 等）或方向（Agent、AI 编程等）看近 30 天的动态',
    example: 'Anthropic 最近有什么动态',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Newspaper,
    title: '精选资讯',
    desc: '经质量评分筛出的精选，可以只看最近几天',
    example: '最近 3 天有哪些值得看的 AI 新闻',
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Search,
    title: '关键词搜索',
    desc: '在全部资讯的标题和摘要里搜索关键词',
    example: '搜一下最近关于 MCP 的新闻',
    accent: 'text-sky-400',
    bg: 'bg-sky-500/10',
  },
];

const INSTALL_STEPS = [
  'AI 助手读取 skill.md，把它保存为自己的 skill',
  '它发一次请求确认接口可用，告诉你已接入',
  '之后直接用中文提问，它会自己选接口、附上原文链接回答',
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
      type="button"
      onClick={copy}
      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
      title={copied ? '已复制' : '复制'}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/**
 * Read the runtime origin (window.location.origin) as external mutable state.
 *
 * window.location isn't available during SSR, and it's an external mutable
 * source — so we use useSyncExternalStore rather than a bare lazy useState
 * initializer. getServerSnapshot returns '' so the SSR markup AND the first
 * client (hydration) render both produce '', keeping hydration consistent;
 * React then resolves the real origin during the hydration commit — before the
 * browser paints — instead of after first paint like the old empty-deps
 * useEffect did. That removes the visible flash while staying SSR-safe.
 *
 * The origin never changes for the lifetime of the page, so subscribe is a
 * no-op (nothing to notify).
 */
const subscribeOrigin = () => () => {};
const getOriginSnapshot = () => window.location.origin;
const getOriginServerSnapshot = () => '';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST:   'bg-blue-500/15    text-blue-400    border-blue-500/20',
  PUT:    'bg-amber-500/15   text-amber-400   border-amber-500/20',
  DELETE: 'bg-red-500/15     text-red-400     border-red-500/20',
};

export function AgentView() {
  const [activeTab, setActiveTab] = useState<AgentTab>('skill');
  // Runtime origin — read via useSyncExternalStore so SSR and the first client
  // render agree (both ''), then resolved to window.location.origin in the
  // hydration commit (before paint), avoiding both hydration mismatch and the
  // post-paint flash a setState-in-useEffect would cause.
  const baseUrl = useSyncExternalStore(
    subscribeOrigin,
    getOriginSnapshot,
    getOriginServerSnapshot,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <Plug className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Agent 接入</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          把 AI Hot Radar 的 AI 日报、热点榜、事件详情、主题动态、精选和搜索，以 <span className="text-[var(--accent-blue)] dark:text-blue-400 font-medium">Skill</span>、
          <span className="text-[var(--accent-emerald)] dark:text-emerald-400 font-medium"> RSS</span>、
          <span className="text-[var(--accent-amber)] dark:text-purple-400 font-medium"> API</span> 三种方式开放给外部消费 —
          全部免费、无需注册。Claude Code 等 AI 助手、RSS 阅读器、飞书或企业微信机器人都能直接用。
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
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-all',
                active
                  ? 'bg-[var(--accent-blue)]/25 text-[var(--accent-blue)] dark:bg-blue-500/30 dark:text-blue-200 border border-[var(--accent-blue)]/40 dark:border-blue-500/40 font-medium shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]',
              )}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="font-semibold text-sm">{tab.label}</span>
              </div>
              <span className={cn('text-[10px]', active ? 'opacity-80' : 'text-[var(--text-muted)]')}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Skill ─────────────────────────────────────────── */}
      {activeTab === 'skill' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] dark:bg-blue-500/15 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="font-semibold text-[var(--text-primary)]">什么是 Skill？</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Skill 是给 AI 助手（如 Claude Code）用的说明书。安装一次后，你的 AI 助手就知道怎么查
              AI 日报、热点榜、事件详情和各公司动态，直接用中文提问即可，不用记接口。
            </p>
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--card-border)] p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  在 AI 助手中粘贴这一行
                </span>
                <CopyButton text={`请阅读 ${baseUrl}/skill.md 并按其中的说明安装为 skill`} />
              </div>
              <code className="block text-sm text-[var(--accent-blue)] dark:text-blue-400 break-all">
                请阅读 {baseUrl}/skill.md 并按其中的说明安装为 skill
              </code>
            </div>
            <ol className="mt-4 space-y-1.5 text-sm text-[var(--text-secondary)]">
              {INSTALL_STEPS.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/10 text-[11px] font-semibold text-[var(--accent-blue)] dark:text-blue-400">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">手动安装（Claude Code）</summary>
              <div className="mt-2 flex items-start justify-between gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--bg-elevated)] p-3">
                <code className="text-xs text-[var(--text-secondary)] font-mono break-all">
                  mkdir -p ~/.claude/skills/aihotradar && curl -fsSL {baseUrl}/skill.md -o ~/.claude/skills/aihotradar/SKILL.md
                </code>
                <CopyButton text={`mkdir -p ~/.claude/skills/aihotradar && curl -fsSL ${baseUrl}/skill.md -o ~/.claude/skills/aihotradar/SKILL.md`} />
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">其他 AI 助手把 skill.md 存到它自己的 skill 或指令目录即可。想更新时重新下载覆盖。</p>
            </details>
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
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Rss className="w-4 h-4" />
              </span>
              <h2 className="font-semibold text-[var(--text-primary)]">RSS 订阅</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              提供 3 个 RSS Feed，复制链接到你常用的 RSS 阅读器（Feedly、Inoreader、NetNewsWire 等）即可订阅。
              资讯每 30 分钟更新，日报每天早上 8 点更新。
            </p>
          </div>

          <div className="space-y-3">
            {getRssFeeds(baseUrl).map((feed) => (
              <div
                key={feed.url}
                className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] transition-colors"
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
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Code2 className="w-4 h-4" />
              </span>
              <h2 className="font-semibold text-[var(--text-primary)]">REST API</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              全部接口免认证、JSON 格式返回，可直接对接飞书机器人 / 企业微信 / n8n / 自动化工作流。日期按北京时间。
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
              <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <ShieldCheck className="w-3 h-3 text-violet-400" /> 每秒不超过 1 次，相同请求 10 分钟内请复用
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {API_DOCS.map((api) => (
              <div
                key={api.path}
                className="p-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] transition-colors"
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
                    <CopyButton text={`${baseUrl}${api.path}`} />
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

          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              示例
            </p>
            <code className="block text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">
{`curl ${baseUrl}/api/agent/digest
curl "${baseUrl}/api/hotspots/trending?limit=10"
curl ${baseUrl}/api/topics/anthropic
curl "${baseUrl}/api/agent/curated?days=1&limit=10"
curl "${baseUrl}/api/agent/search?q=Claude&limit=10"`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
