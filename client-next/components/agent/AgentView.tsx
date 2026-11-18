'use client';
import { useState, useSyncExternalStore } from 'react';
import {
  BookOpen, CalendarDays, Check, Code2, Copy, ExternalLink, Flame, GitBranch, LayoutGrid, Newspaper, Rss, Search, Sparkles,
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
  },
  {
    icon: Flame,
    title: '热点榜',
    desc: '过去 48 小时多家来源同时报道的事件，按热度排序，看得出哪件事正在发酵',
    example: '现在 AI 圈最热的是什么',
  },
  {
    icon: GitBranch,
    title: '事件来龙去脉',
    desc: '一件事的全部报道和事件概览，区分已确认的事实和尚未确认的传闻',
    example: 'OpenAI 新模型的消息，现在确认了哪些',
  },
  {
    icon: LayoutGrid,
    title: '主题动态',
    desc: '按公司（OpenAI、Anthropic、DeepSeek 等）或方向（Agent、AI 编程等）看近 30 天的动态',
    example: 'Anthropic 最近有什么动态',
  },
  {
    icon: Newspaper,
    title: '精选资讯',
    desc: '经质量评分筛出的精选，可以只看最近几天',
    example: '最近 3 天有哪些值得看的 AI 新闻',
  },
  {
    icon: Search,
    title: '关键词搜索',
    desc: '在全部资讯的标题和摘要里搜索关键词',
    example: '搜一下最近关于 MCP 的新闻',
  },
];

const INSTALL_STEPS = [
  'AI 助手读取 skill.md，把它保存为自己的 skill',
  '它发一次请求确认接口可用，告诉你已接入',
  '之后直接用中文提问，它会自己选接口、附上原文链接回答',
];

const TABS: { id: AgentTab; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'skill', label: 'Skill', desc: '装进 Claude Code 等 AI 助手，用中文提问', icon: Sparkles },
  { id: 'rss',   label: 'RSS',   desc: '三个订阅地址，放进任意阅读器', icon: Rss },
  { id: 'api',   label: 'API',   desc: 'JSON 接口，接机器人和自动化流程', icon: Code2 },
];

const NOTES = [
  '免费，不用注册，不需要 Token',
  '日期一律按北京时间',
  '每秒不超过 1 次请求，相同请求 10 分钟内请复用结果',
  '回答里引用内容时请附上原文链接',
];

const MACHINE_DOCS = [
  { path: '/skill.md', desc: '可安装的 Skill' },
  { path: '/llms.txt', desc: '站点和接口说明，给大模型读' },
  { path: '/ai.txt', desc: 'AI 使用与引用约定' },
];

const CARD = 'rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)]';

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
      className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      aria-label={copied ? '已复制' : `复制 ${text}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[var(--accent-blue)]" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? '已复制' : '复制'}
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

  const skillLine = `请阅读 ${baseUrl}/skill.md 并按其中的说明安装为 skill`;
  const manual = `mkdir -p ~/.claude/skills/aihotradar && curl -fsSL ${baseUrl}/skill.md -o ~/.claude/skills/aihotradar/SKILL.md`;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:pt-8">
      <div className="min-w-0">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold sm:text-[26px]">Agent 接入</h1>
          <p className="mt-2 max-w-[720px] text-[15px] leading-relaxed text-[var(--text-secondary)]">
            AI 日报、热点榜、事件详情、主题动态、精选和搜索都开放给外部使用，有 Skill、RSS、API 三种方式。Claude
            Code 等 AI 助手、RSS 阅读器、飞书或企业微信机器人都能直接接。
          </p>
        </header>

        <div role="tablist" aria-label="接入方式" className="mb-8 grid gap-3 sm:grid-cols-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-[14px] border p-4 text-left',
                  active
                    ? 'border-[var(--accent-blue)] bg-[var(--card-bg)] shadow-[inset_0_0_0_1px_var(--accent-blue)]'
                    : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)]',
                )}
              >
                <span className={cn('flex items-center gap-2 text-base font-semibold', active && 'text-[var(--accent-blue)]')}>
                  <Icon className="h-[18px] w-[18px] text-[var(--accent-blue)]" aria-hidden="true" />
                  {tab.label}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-[var(--text-secondary)]">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'skill' && (
          <section id="panel-skill" role="tabpanel" aria-labelledby="tab-skill" className="space-y-8">
            <div className={`${CARD} p-4 sm:p-6`}>
              <h2 className="text-[17px] font-bold">一句话安装</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                Skill 是给 AI 助手看的说明书。装一次之后，它就知道怎么查日报、热点榜、事件和各公司动态，你直接用中文提问，不用记接口。
              </p>
              <div className="mt-4 flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-2 pl-3 pr-1">
                <p className="min-w-0 break-all py-1 text-[15px]">{skillLine}</p>
                <CopyButton text={skillLine} />
              </div>
              <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                {INSTALL_STEPS.map((step, i) => (
                  <li key={step} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    <span className="mb-1 block text-xl font-extrabold tabular-nums text-[var(--accent-blue)]" style={{ fontStretch: '80%' }}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <details className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm">
                <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">手动安装到 Claude Code</summary>
                <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-2 pl-3 pr-1">
                  <code className="min-w-0 break-all py-1 text-[13px] text-[var(--text-secondary)]">{manual}</code>
                  <CopyButton text={manual} />
                </div>
                <p className="mt-2 text-[13px] text-[var(--text-muted)]">其他 AI 助手把 skill.md 存到它自己的 skill 或指令目录即可。想更新时重新下载覆盖。</p>
              </details>
            </div>

            <div>
              <h2 className="mb-3 text-[17px] font-bold">装好后能问什么</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {SKILL_CAPABILITIES.map((cap) => {
                  const Icon = cap.icon;
                  return (
                    <div key={cap.title} className={`${CARD} p-4`}>
                      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                        <Icon className="h-[18px] w-[18px] text-[var(--accent-blue)]" aria-hidden="true" />
                        {cap.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{cap.desc}</p>
                      <p className="mt-2.5 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[13px] text-[var(--text-primary)]">「{cap.example}」</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'rss' && (
          <section id="panel-rss" role="tabpanel" aria-labelledby="tab-rss">
            <p className="mb-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              把链接复制到常用的 RSS 阅读器（Feedly、Inoreader、NetNewsWire 等）就能订阅。资讯白天每 30 分钟更新，日报每天早上 8 点更新。
            </p>
            <div className="space-y-3">
              {getRssFeeds(baseUrl).map((feed) => (
                <div key={feed.label} className={`${CARD} p-4 sm:p-5`}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                      <Rss className="h-4 w-4 text-[var(--accent-blue)]" aria-hidden="true" />
                      {feed.label}
                    </h2>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-[var(--accent-blue)] hover:underline">
                      打开
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{feed.desc}</p>
                  <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-1.5 pl-3 pr-1">
                    <code className="min-w-0 break-all py-1 text-[13px]">{feed.url}</code>
                    <CopyButton text={feed.url} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'api' && (
          <section id="panel-api" role="tabpanel" aria-labelledby="tab-api" className="space-y-8">
            <div>
              <p className="mb-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                返回 JSON，可以直接接飞书机器人、企业微信、n8n 等自动化流程。
              </p>
              <ul className={`${CARD} divide-y divide-[var(--border-subtle)] px-4 sm:px-5`}>
                {API_DOCS.map((api) => (
                  <li key={api.path} className="py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="flex min-w-0 items-center gap-2 break-all text-sm">
                        <span className="shrink-0 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs font-bold text-[var(--accent-blue)]">{api.method}</span>
                        <span className="font-semibold">{api.path}</span>
                      </code>
                      <CopyButton text={`${baseUrl}${api.path}`} />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{api.desc}</p>
                    {api.params && api.params !== '—' && (
                      <p className="mt-1 text-[13px] text-[var(--text-muted)]">参数：{api.params}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-[17px] font-bold">示例</h2>
              <pre className="overflow-x-auto rounded-[14px] bg-[var(--bg-elevated)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
{`curl ${baseUrl}/api/agent/digest
curl "${baseUrl}/api/hotspots/trending?limit=10"
curl ${baseUrl}/api/topics/anthropic
curl "${baseUrl}/api/agent/curated?days=1&limit=10"
curl "${baseUrl}/api/agent/search?q=Claude&limit=10"`}
              </pre>
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="接入须知">
        <section className={`${CARD} p-4`}>
          <h2 className="mb-2 text-[15px] font-bold">接入须知</h2>
          <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {NOTES.map((n) => (
              <li key={n} className="flex gap-2">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--accent-blue)]" aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
        </section>
        <section className={`${CARD} p-4`}>
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold">
            <BookOpen className="h-4 w-4 text-[var(--accent-blue)]" aria-hidden="true" />
            给 AI 读的说明
          </h2>
          <ul>
            {MACHINE_DOCS.map((d) => (
              <li key={d.path}>
                <a href={d.path} target="_blank" rel="noopener" className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-hover)]">
                  <code className="text-sm font-semibold text-[var(--accent-blue)]">{d.path}</code>
                  <span className="text-right text-[13px] text-[var(--text-muted)]">{d.desc}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
