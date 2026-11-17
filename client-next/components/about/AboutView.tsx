import {
  Mail,
  Github,
  Heart,
  Sparkles,
  Flame,
  LayoutGrid,
  CalendarDays,
  Bookmark,
  Plug,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackToTop } from "../common/BackToTop";
import { OrganizationSchema, WebSiteSchema } from "../seo/StructuredData";

/**
 * 关于页 — 项目介绍 + 核心能力 + 数据源 + 内容怎么写 + 联系方式 + 版权说明。
 *
 * 微信二维码：把图片放到 client-next/public/wechat-qr.png（建议 ~400×400px）
 * 即可自动展示。如果不存在，会显示占位提示。
 */

const FEATURES = [
  {
    icon: Sparkles,
    title: "精选",
    desc: "每条资讯经 AI 五维评分，官方一手、专业媒体、社区三级信源门槛不同；同一事件只留最好的一篇。",
    href: "/curated",
    accent:
      "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 dark:text-blue-400 dark:bg-blue-500/10",
  },
  {
    icon: Flame,
    title: "热点榜与事件页",
    desc: "过去 48 小时多家来源同时报道的事件按热度排行；每个事件一页，汇总全部报道，分出已确认、尚未确认和为什么重要。",
    href: "/hot",
    accent: "text-red-600 bg-red-500/10 dark:text-red-400",
  },
  {
    icon: LayoutGrid,
    title: "主题",
    desc: "按公司（OpenAI、Anthropic、DeepSeek……）、技术方向（Agent、AI 编程、多模态……）和内容类型看近 30 天动态。",
    href: "/topics",
    accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
  },
  {
    icon: CalendarDays,
    title: "AI 日报",
    desc: "每天早上 8 点自动生成：当日总结、重点事件、六大板块和快讯。按重要性排序，一件事只写一次，一周内不重复。",
    href: "/digest",
    accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  },
  {
    icon: Bookmark,
    title: "我的关注",
    desc: "订阅自定义关键词，AI 自动扩展同义词、判断真伪，命中的重要资讯实时推送。",
    href: "/keywords",
    accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    icon: Plug,
    title: "Agent 接入",
    desc: "可安装的 Skill、RSS 和免认证 JSON 接口，Claude Code 等 AI 助手、RSS 阅读器、企业 IM 机器人都能直接用。",
    href: "/agent",
    accent: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
  },
];

/** Mirrors server/src/rss-feeds/feeds.config.ts (active feeds) plus the keyword-search sources. */
const SOURCES = [
  {
    group: "官方与实验室",
    items: [
      "OpenAI", "Anthropic", "Claude.dev", "Google AI", "Google DeepMind", "Google Research", "Meta AI",
      "Microsoft Research", "Microsoft AI", "NVIDIA", "Apple ML Research", "Mistral AI", "Hugging Face",
      "AWS ML", "Amazon Science", "Ai2", "Sakana AI", "BAIR", "PyTorch", "LangChain", "Together AI",
      "OpenRouter", "Databricks", "Modal", "Meta Engineering", "GitHub",
    ],
  },
  {
    group: "论文与研究",
    items: ["arXiv（cs.AI / CL / LG / CV）", "HuggingFace Daily Papers", "Epoch AI", "MIT News"],
  },
  {
    group: "国际媒体",
    items: [
      "MIT Technology Review", "The Verge", "TechCrunch", "Ars Technica", "VentureBeat", "The Decoder",
      "MarkTechPost", "Synced", "SemiAnalysis", "Platformer", "Newcomer", "ChinaTalk", "Recode China AI",
      "O'Reilly Radar",
    ],
  },
  {
    group: "独立作者",
    items: [
      "Simon Willison", "Import AI", "Latent Space", "Interconnects", "Ahead of AI", "Dwarkesh Patel",
      "Gary Marcus", "a16z", "Where's Your Ed At",
    ],
  },
  {
    group: "中文",
    items: ["IT之家", "36氪", "财联社", "InfoQ", "掘金", "V2EX", "雪球", "中国新闻网"],
  },
  { group: "社区与搜索", items: ["Hacker News", "Bing 新闻", "Bilibili"] },
];

/** How titles, summaries and overviews are written; see server/src/utils/writing-rules.ts. */
const METHOD = [
  "标题、摘要、推荐理由和事件概览由 AI 根据原文写成，选题标准和写作规则由人工制定。",
  "原文只有一句话时，系统会先抓取原文正文再评分和写摘要；写出来的内容会被程序逐条检查，提到原文里没有的名字、年份或说法的，直接丢弃。",
  "事件页把只有单一来源的说法和传闻单独放进「尚未确认」，并写明是谁说的；官方或当事方自己发布的内容标为「一手来源」。",
  "每条内容都标明来源并链接原文，判断以原文为准。",
];

export function AboutView() {
  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-3">
          关于 AI Hot Radar
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] leading-[1.8]">
          这是我自己用的 AI 资讯聚合工具。每天的 AI
          新闻、模型发布、产品更新太多，一个个看公众号、刷 X、订 RSS
          太累。我希望系统帮我做三件事：
          <strong className="text-[var(--text-primary)]"> 抓全</strong>、
          <strong className="text-[var(--text-primary)]"> 筛精</strong>、
          <strong className="text-[var(--text-primary)]"> 总结</strong>。
        </p>
        <p className="text-[15px] text-[var(--text-secondary)] leading-[1.8] mt-3">
          于是有了 AI Hot Radar：它每 30 分钟从 70 多个信息源抓取最新资讯，用两阶段 AI
          评分（快速预筛 + 完整五维评分）筛掉噪音，把多家来源报道的同一件事合成一个事件，
          最后整理成「精选」「热点榜」「主题」「AI 日报」几个视图。
          如果它对你也有用，欢迎用起来。
        </p>
      </header>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          核心能力
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.title}
                href={f.href}
                className="group p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${f.accent}`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)]">
                    {f.title}
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          数据来源
        </h2>
        <div className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          {SOURCES.map((g) => (
            <div
              key={g.group}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-4"
            >
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider sm:w-24 shrink-0">
                {g.group}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((s) => (
                  <span
                    key={s}
                    className="text-[12px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
          共 68 个 RSS 信源，外加 Bing、Hacker News、Bilibili 的关键词搜索。信源分官方一手、专业媒体、社区与个人三级，级别越低，进入精选的分数门槛越高。
        </p>
      </section>

      {/* ── Method ──────────────────────────────────────────── */}
      <section aria-labelledby="method" className="mb-10">
        <h2 id="method" className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          内容怎么写
        </h2>
        <ul className="space-y-2.5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-[14px] leading-relaxed text-[var(--text-secondary)] list-disc pl-9 marker:text-[var(--text-muted)]">
          {METHOD.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      {/* ── Stack ───────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          技术栈
        </h2>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              前端
            </div>
            <div className="text-[var(--text-secondary)]">
              Next.js 16 (App Router) · React 19 · TailwindCSS · lucide-react
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              后端
            </div>
            <div className="text-[var(--text-secondary)]">
              NestJS 11 · Prisma · SQLite · Socket.io
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              AI 模型
            </div>
            <div className="text-[var(--text-secondary)]">
              兼容 OpenAI 协议（百炼 / 硅基流动 / DeepSeek / OpenAI），支持腾讯云开发 CloudBase
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              数据采集
            </div>
            <div className="text-[var(--text-secondary)]">
              RSS · Bing / Hacker News / Bilibili 关键词搜索 · 正文补抓（遵守 robots.txt）
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          联系作者
        </h2>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* WeChat QR */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-44 h-44 rounded-2xl bg-white p-4 shadow-sm border border-[var(--card-border)]">
                <Image
                  src="/wechat-qr.png"
                  alt="作者微信二维码"
                  width={144}
                  height={144}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                    const fallback = e.currentTarget.parentElement
                      ?.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                微信扫码加好友
              </span>
            </div>

            {/* Fallback when QR is missing */}
            <div className="hidden w-44 h-44 rounded-2xl border-2 border-dashed border-[var(--card-border-hover)] flex-col items-center justify-center text-center px-3 text-xs text-[var(--text-muted)]">
              请把二维码放到
              <code className="text-[10px] font-mono mt-1 break-all">
                client-next/public/wechat-qr.png
              </code>
            </div>

            {/* Text contact */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  邮箱
                </div>
                <a
                  href="mailto:gundam_zzc@126.com"
                  className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  gundam_zzc@126.com
                </a>
              </div>
              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                  代码仓库
                </div>
                <a
                  href="https://github.com/zenitlab/ai-hot-radar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-primary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  github.com/zenitlab/ai-hot-radar
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed pt-1">
                如果你在使用过程中遇到问题、有想法或建议，欢迎邮件 / 微信找我。
                项目开源，PR 也欢迎。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Copyright ───────────────────────────────────────── */}
      <section aria-labelledby="copyright" className="mb-10">
        <h2 id="copyright" className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-4">
          版权与内容说明
        </h2>
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] space-y-2.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          <p>
            AI Hot Radar 是 AI 资讯的聚合摘要和阅读索引。每条内容都标明来源并链接原文，原文版权归各来源所有；站内只展示标题、AI
            生成的摘要和推荐理由，不转载全文。
          </p>
          <p>
            摘要、推荐理由和事件概览由 AI 根据原文生成，可能存在偏差，请以原文为准。
          </p>
          <p>
            如果你是内容来源方，希望更正、下架或调整展示方式，请发邮件到{' '}
            <a href="mailto:gundam_zzc@126.com" className="text-[var(--accent-blue)] hover:underline">gundam_zzc@126.com</a>
            ，我会尽快处理。
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="text-center text-xs text-[var(--text-muted)] py-6 flex items-center justify-center gap-1.5">
        Made with <Heart className="w-3 h-3 text-red-500 dark:text-red-400" />{" "}
        and a lot of coffee
      </footer>

      <BackToTop />
      <OrganizationSchema />
      <WebSiteSchema />
    </div>
  );
}
