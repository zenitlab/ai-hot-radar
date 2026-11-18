'use client';
import { useState, useSyncExternalStore } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
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
    title: 'AI 日报',
    desc: '今天或指定日期的 AI 日报：当日总结、重点事件和各板块要点，每条带原文链接',
    example: '给我一份今天的 AI 日报',
  },
  {
    title: '热点榜',
    desc: '过去 48 小时多家来源同时报道的事件，按热度排序，看得出哪件事正在发酵',
    example: '现在 AI 圈最热的是什么',
  },
  {
    title: '事件来龙去脉',
    desc: '一件事的全部报道和事件概览，区分已确认的事实和尚未确认的传闻',
    example: 'OpenAI 新模型的消息，现在确认了哪些',
  },
  {
    title: '主题动态',
    desc: '按公司（OpenAI、Anthropic、DeepSeek 等）或方向（Agent、AI 编程等）看近 30 天的动态',
    example: 'Anthropic 最近有什么动态',
  },
  {
    title: '精选资讯',
    desc: '经质量评分筛出的精选，可以只看最近几天',
    example: '最近 3 天有哪些值得看的 AI 新闻',
  },
  {
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

const TABS: { id: AgentTab; label: string; desc: string }[] = [
  { id: 'skill', label: 'Skill', desc: '给 AI 助手' },
  { id: 'rss',   label: 'RSS',   desc: '给阅读器' },
  { id: 'api',   label: 'API',   desc: '给程序和机器人' },
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
    <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
      <div className="max-w-[760px]">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold">Agent 接入</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            AI 日报、热点榜、事件详情、主题动态、精选和搜索都开放给外部使用，有 Skill、RSS、API 三种方式，免费、不用注册。Claude
            Code 等 AI 助手、RSS 阅读器、飞书或企业微信机器人都能直接接。
          </p>
        </header>

        <div role="tablist" aria-label="接入方式" className="mb-6 flex gap-6 border-b border-[var(--border-subtle)]">
          {TABS.map((tab) => {
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
                  '-mb-px flex items-baseline gap-2 border-b-2 pb-2.5 pt-1',
                  active
                    ? 'border-[var(--accent-blue)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                <span className={cn('text-[15px]', active && 'font-semibold')}>{tab.label}</span>
                <span className="hidden text-[13px] text-[var(--text-muted)] sm:inline">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'skill' && (
          <section id="panel-skill" role="tabpanel" aria-labelledby="tab-skill">
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              Skill 是给 AI 助手（比如 Claude Code）看的说明书。装一次之后，它就知道怎么查日报、热点榜、事件和各公司动态，你直接用中文提问，不用记接口。
            </p>

            <h2 className="mb-2 mt-6 text-[15px] font-bold">在 AI 助手里粘贴这一行</h2>
            <div className="flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-2 pl-3 pr-1">
              <p className="min-w-0 break-all py-1 text-sm text-[var(--text-primary)]">{skillLine}</p>
              <CopyButton text={skillLine} />
            </div>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-[var(--text-secondary)] marker:text-[var(--text-muted)]">
              {INSTALL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">手动安装到 Claude Code</summary>
              <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-2 pl-3 pr-1">
                <code className="min-w-0 break-all py-1 text-[13px] text-[var(--text-secondary)]">{manual}</code>
                <CopyButton text={manual} />
              </div>
              <p className="mt-2 text-[13px] text-[var(--text-muted)]">其他 AI 助手把 skill.md 存到它自己的 skill 或指令目录即可。想更新时重新下载覆盖。</p>
            </details>

            <h2 className="mb-1 mt-8 text-[15px] font-bold">装好后能问什么</h2>
            <dl className="border-t border-[var(--border-subtle)]">
              {SKILL_CAPABILITIES.map((cap) => (
                <div key={cap.title} className="grid gap-x-6 gap-y-1 border-b border-[var(--border-subtle)] py-3.5 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <dt className="text-[15px] font-semibold">{cap.title}</dt>
                  <dd>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{cap.desc}</p>
                    <p className="mt-1 text-[13px] text-[var(--text-muted)]">试试问：「{cap.example}」</p>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {activeTab === 'rss' && (
          <section id="panel-rss" role="tabpanel" aria-labelledby="tab-rss">
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              把链接复制到常用的 RSS 阅读器（Feedly、Inoreader、NetNewsWire 等）就能订阅。资讯每 30 分钟更新，日报每天早上 8 点更新。
            </p>
            <ul className="mt-5 border-t border-[var(--border-subtle)]">
              {getRssFeeds(baseUrl).map((feed) => (
                <li key={feed.label} className="border-b border-[var(--border-subtle)] py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[15px] font-semibold">{feed.label}</h2>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-[var(--accent-blue)] hover:underline">
                      打开
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{feed.desc}</p>
                  <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-[var(--bg-elevated)] py-1.5 pl-3 pr-1">
                    <code className="min-w-0 break-all py-1 text-[13px]">{feed.url}</code>
                    <CopyButton text={feed.url} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'api' && (
          <section id="panel-api" role="tabpanel" aria-labelledby="tab-api">
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              全部接口免认证，返回 JSON，可以直接接飞书机器人、企业微信、n8n 等自动化流程。日期按北京时间。请求频率请控制在每秒 1 次以内，相同请求 10 分钟内请复用结果。
            </p>
            <ul className="mt-5 border-t border-[var(--border-subtle)]">
              {API_DOCS.map((api) => (
                <li key={api.path} className="border-b border-[var(--border-subtle)] py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <code className="min-w-0 break-all text-sm">
                      <span className="mr-2 text-[13px] font-semibold text-[var(--text-muted)]">{api.method}</span>
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

            <h2 className="mb-2 mt-8 text-[15px] font-bold">示例</h2>
            <pre className="overflow-x-auto rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
{`curl ${baseUrl}/api/agent/digest
curl "${baseUrl}/api/hotspots/trending?limit=10"
curl ${baseUrl}/api/topics/anthropic
curl "${baseUrl}/api/agent/curated?days=1&limit=10"
curl "${baseUrl}/api/agent/search?q=Claude&limit=10"`}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
