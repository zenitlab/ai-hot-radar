import {
  Mail,
  Github,
  Heart,
  Sparkles,
  Radio,
  Bookmark,
  Plug,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackToTop } from "../common/BackToTop";
import { OrganizationSchema, WebSiteSchema } from "../seo/StructuredData";

/**
 * 关于页 — 项目介绍 + 核心能力 + 数据源 + 联系方式。
 *
 * 微信二维码：把图片放到 client-next/public/wechat-qr.png（建议 ~400×400px）
 * 即可自动展示。如果不存在，会显示占位提示。
 */

const FEATURES = [
  {
    icon: Radio,
    title: "热点雷达",
    desc: "20+ 信息源持续抓取，AI 双阶段评分识别真伪与重要度，同事件多源去重。",
    accent:
      "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 dark:text-blue-400 dark:bg-blue-500/10",
  },
  {
    icon: Sparkles,
    title: "精选 + AI 日报",
    desc: "经五维评分 + tier 加成筛出的高质量资讯流；每天早上 8:00 自动生成日报，六大板块覆盖。",
    accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  },
  {
    icon: Bookmark,
    title: "我的关注",
    desc: "订阅自定义关键词，AI 自动扩展同义词、判断真伪，重要热点 WebSocket 实时推送。",
    accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    icon: Plug,
    title: "Agent 接入",
    desc: "Skill / RSS / REST API 三种方式，让 Claude Code、Cursor、Feedly、企业 IM 都能消费。",
    accent: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
  },
];

const SOURCES = [
  {
    group: "国际官方",
    items: [
      "OpenAI",
      "Anthropic",
      "Google AI",
      "DeepMind",
      "NVIDIA",
      "Meta AI",
      "Hugging Face",
      "Microsoft AI",
    ],
  },
  {
    group: "学术 / 论文",
    items: ["arXiv (cs.AI / CL / LG / CV)", "HuggingFace Daily Papers"],
  },
  { group: "社交 / KOL", items: ["X / Twitter（17 个 AI KOL）", "Bilibili"] },
  {
    group: "中文媒体",
    items: ["IT之家", "36氪", "财联社", "雪球", "InfoQ", "中国新闻网"],
  },
  { group: "搜索引擎", items: ["Bing", "HackerNews"] },
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
          新闻、模型发布、产品更新太多， 一个个看公众号、刷 X、订 RSS
          太累。我希望系统帮我做三件事：
          <strong className="text-[var(--text-primary)]"> 抓全</strong>、
          <strong className="text-[var(--text-primary)]"> 筛精</strong>、
          <strong className="text-[var(--text-primary)]"> 总结</strong>。
        </p>
        <p className="text-[15px] text-[var(--text-secondary)] leading-[1.8] mt-3">
          于是有了 AI Hot Radar—— 它每 10 分钟从 20+ 信息源抓取最新资讯，通过两阶段 AI
          评分（短 prompt 预筛 + 完整 5 维评分）
          筛掉噪音，最后沉淀到「精选」「热点雷达」「AI 日报」三个视图里。
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
              <div
                key={f.title}
                className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${f.accent}`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {f.title}
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
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
        <p className="text-xs text-[var(--text-muted)] mt-3">
          完整的信源列表与评分规则可以在
          <Link
            href="/agent"
            className="text-[var(--accent-blue)] dark:text-blue-400 hover:underline mx-1"
          >
            Agent 接入
          </Link>
          页查看。
        </p>
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
              Next.js 15 (App Router) · React 19 · TailwindCSS · lucide-react
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
              兼容 OpenAI 协议（百炼 / 硅基流动 / DeepSeek / OpenAI）
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              数据采集
            </div>
            <div className="text-[var(--text-secondary)]">
              RSS · twitterapi.io · Bing/HN 抓取 · Bilibili
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
