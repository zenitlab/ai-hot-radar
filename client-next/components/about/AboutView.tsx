import { Github, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BackToTop } from "../common/BackToTop";
import { OrganizationSchema, WebSiteSchema } from "../seo/StructuredData";

/**
 * 关于页 — 项目介绍 + 核心能力 + 数据源 + 内容怎么写 + 联系方式 + 版权说明。
 *
 * 微信二维码：client-next/public/wechat-qr.png（约 400×400px）。
 */

const FEATURES = [
  {
    title: "精选",
    desc: "每条资讯经 AI 五维评分，官方一手、专业媒体、社区三级信源门槛不同；同一事件只留最好的一篇。",
    href: "/curated",
  },
  {
    title: "热点榜与事件页",
    desc: "过去 48 小时多家来源同时报道的事件按热度排行；每个事件一页，汇总全部报道，分出已确认、尚未确认和为什么重要。",
    href: "/hot",
  },
  {
    title: "主题",
    desc: "按公司（OpenAI、Anthropic、DeepSeek……）、技术方向（Agent、AI 编程、多模态……）和内容类型看近 30 天动态。",
    href: "/topics",
  },
  {
    title: "AI 日报",
    desc: "每天早上 8 点自动生成：当日总结、重点事件、六大板块和快讯。按重要性排序，一件事只写一次，一周内不重复。",
    href: "/digest",
  },
  {
    title: "我的关注",
    desc: "站长持续追踪的公司、模型和产品，每个都有简介、关系图、近 7 天提及趋势和最新相关资讯。",
    href: "/keywords",
  },
  {
    title: "Agent 接入",
    desc: "可安装的 Skill、RSS 和免认证 JSON 接口，Claude Code 等 AI 助手、RSS 阅读器、企业 IM 机器人都能直接用。",
    href: "/agent",
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

const STACK = [
  { label: "前端", value: "Next.js 16（App Router）、React 19、Tailwind CSS" },
  { label: "后端", value: "NestJS 11、Prisma、SQLite、Socket.io" },
  { label: "AI 模型", value: "兼容 OpenAI 协议的模型服务（百炼、硅基流动、DeepSeek、OpenAI），支持腾讯云开发 CloudBase" },
  { label: "数据采集", value: "RSS；Bing、Hacker News、Bilibili 关键词搜索；正文补抓（遵守 robots.txt）" },
];

const H2 = "mb-3 text-lg font-bold";

export function AboutView() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
      <div className="max-w-[720px]">
        <header className="mb-10">
          <h1 className="mb-3 text-[22px] font-bold">关于 AI 热点雷达</h1>
          <p className="text-[15px] leading-[1.85] text-[var(--text-secondary)]">
            这是我自己用的 AI 资讯聚合工具。每天的 AI 新闻、模型发布、产品更新太多，一个个看公众号、刷 X、订 RSS
            太累。我希望系统帮我做三件事：<strong className="text-[var(--text-primary)]">抓全</strong>、
            <strong className="text-[var(--text-primary)]">筛精</strong>、
            <strong className="text-[var(--text-primary)]">总结</strong>。
          </p>
          <p className="mt-3 text-[15px] leading-[1.85] text-[var(--text-secondary)]">
            于是有了 AI 热点雷达：它每 30 分钟从 70 多个信息源抓取最新资讯，用两阶段 AI
            评分（快速预筛加完整五维评分）筛掉噪音，把多家来源报道的同一件事合成一个事件，最后整理成精选、热点榜、主题和
            AI 日报几个视图。如果它对你也有用，欢迎用起来。
          </p>
        </header>

        <section aria-labelledby="features" className="mb-10">
          <h2 id="features" className={H2}>能做什么</h2>
          <dl className="border-t border-[var(--border-subtle)]">
            {FEATURES.map((f) => (
              <div key={f.title} className="grid gap-x-6 gap-y-1 border-b border-[var(--border-subtle)] py-3.5 sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt>
                  <Link href={f.href} className="text-[15px] font-semibold text-[var(--accent-blue)] hover:underline">
                    {f.title}
                  </Link>
                </dt>
                <dd className="text-sm leading-relaxed text-[var(--text-secondary)]">{f.desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="sources" className="mb-10">
          <h2 id="sources" className={H2}>数据来源</h2>
          <dl className="border-t border-[var(--border-subtle)]">
            {SOURCES.map((g) => (
              <div key={g.group} className="grid gap-x-6 gap-y-1 border-b border-[var(--border-subtle)] py-3.5 sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt className="text-sm font-semibold">{g.group}</dt>
                <dd className="text-sm leading-relaxed text-[var(--text-secondary)]">{g.items.join("、")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-muted)]">
            共 68 个 RSS 信源，外加 Bing、Hacker News、Bilibili 的关键词搜索。信源分官方一手、专业媒体、社区与个人三级，级别越低，进入精选的分数门槛越高。
          </p>
        </section>

        <section aria-labelledby="method" className="mb-10">
          <h2 id="method" className={H2}>内容怎么写</h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--text-secondary)] marker:text-[var(--text-muted)]">
            {METHOD.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="stack" className="mb-10">
          <h2 id="stack" className={H2}>技术栈</h2>
          <dl className="border-t border-[var(--border-subtle)]">
            {STACK.map((r) => (
              <div key={r.label} className="grid gap-x-6 gap-y-1 border-b border-[var(--border-subtle)] py-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                <dt className="text-sm font-semibold">{r.label}</dt>
                <dd className="text-sm text-[var(--text-secondary)]">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="contact" className="mb-10">
          <h2 id="contact" className={H2}>联系作者</h2>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <figure className="shrink-0">
              {/* White backing keeps the QR scannable in dark mode. */}
              <div className="h-40 w-40 rounded-[14px] border border-[var(--card-border)] bg-white p-3">
                <Image src="/wechat-qr.png" alt="作者微信二维码" width={136} height={136} className="h-full w-full object-contain" />
              </div>
              <figcaption className="mt-2 text-[13px] text-[var(--text-muted)]">微信扫码加好友</figcaption>
            </figure>
            <dl className="space-y-3 text-[15px]">
              <div>
                <dt className="text-[13px] text-[var(--text-muted)]">邮箱</dt>
                <dd>
                  <a href="mailto:gundam_zzc@126.com" className="inline-flex items-center gap-1.5 hover:text-[var(--accent-blue)]">
                    <Mail className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                    gundam_zzc@126.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-[var(--text-muted)]">代码仓库</dt>
                <dd>
                  <a
                    href="https://github.com/zenitlab/ai-hot-radar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent-blue)]"
                  >
                    <Github className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
                    github.com/zenitlab/ai-hot-radar
                  </a>
                </dd>
              </div>
              <dd className="pt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                用的时候遇到问题、有想法或建议，欢迎发邮件或加微信。项目开源，也欢迎提 PR。
              </dd>
            </dl>
          </div>
        </section>

        <section aria-labelledby="copyright" className="mb-10">
          <h2 id="copyright" className={H2}>版权与内容说明</h2>
          <div className="space-y-2.5 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            <p>
              AI 热点雷达是 AI 资讯的聚合摘要和阅读索引。每条内容都标明来源并链接原文，原文版权归各来源所有；站内只展示标题、AI
              生成的摘要和推荐理由，不转载全文。
            </p>
            <p>摘要、推荐理由和事件概览由 AI 根据原文生成，可能存在偏差，请以原文为准。</p>
            <p>
              如果你是内容来源方，希望更正、下架或调整展示方式，请发邮件到{" "}
              <a href="mailto:gundam_zzc@126.com" className="text-[var(--accent-blue)] hover:underline">
                gundam_zzc@126.com
              </a>
              ，我会尽快处理。
            </p>
          </div>
        </section>

        <p className="text-[13px] text-[var(--text-muted)]">Made with a lot of coffee.</p>
      </div>

      <BackToTop />
      <OrganizationSchema />
      <WebSiteSchema />
    </div>
  );
}
