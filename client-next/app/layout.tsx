import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateOrganizationSchema, generateWebSiteSchema, safeJsonLd } from "@/lib/structured-data";

// Self-hosted via next/font: zero layout shift, no render-blocking request.
// Latin letters and digits only; Chinese falls through to system fonts (DESIGN.md).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// Runs before first paint: the saved choice, else the system setting. Without
// it a light-mode visitor would see the dark :root palette flash on load.
// Also restores the 中 / 原 title choice (components/layout/TitleModeToggle.tsx).
const THEME_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem('aihot-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.setAttribute('data-theme',t);if(localStorage.getItem('aihot-title-mode')==='original')d.setAttribute('data-title-mode','original')}catch(e){}})()`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihotradar.com";

// `new URL()` throws on a malformed NEXT_PUBLIC_SITE_URL (e.g. missing scheme).
// Validate first and fall back to the literal so the call can never throw.
const DEFAULT_SITE_URL = "https://aihotradar.com";
const safeSiteUrl = URL.canParse(siteUrl) ? siteUrl : DEFAULT_SITE_URL;
const metadataBase = new URL(safeSiteUrl);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "AI 热点雷达：AI 新闻资讯与今日 AI 热点",
    template: "%s | AI 热点雷达",
  },
  description: "每 30 分钟聚合 70 多个 AI 信息源，AI 评分筛出精选，按多家来源同时报道排出热点，每天早上生成 AI 日报。追踪 OpenAI、Anthropic、Google、DeepSeek 等公司动态与最新论文。",
  keywords: [
    "AI 资讯",
    "AI 热点",
    "AI 日报",
    "人工智能新闻",
    "OpenAI",
    "Claude",
    "GPT",
    "LLM",
    "大语言模型",
    "机器学习",
    "深度学习",
    "AI 聚合",
  ],
  applicationName: "AI 热点雷达",
  authors: [{ name: "AI 热点雷达" }],
  creator: "AI 热点雷达",
  publisher: "AI 热点雷达",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "AI 热点雷达",
    title: "AI 热点雷达（AI Hot Radar）",
    description: "聚合 70 多个 AI 信息源：AI 评分精选、热点榜与每日 AI 日报",
    // Share image comes from app/opengraph-image.tsx (file-based, inherited by
    // every route); the old public/og-image.png was a 1×1 placeholder.
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 热点雷达（AI Hot Radar）",
    description: "聚合 70 多个 AI 信息源：AI 评分精选、热点榜与每日 AI 日报",
    creator: "@aihotradar",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // icons 由 Next.js 从 app/icon.png 与 app/apple-icon.png 自动生成，无需手动声明
  manifest: "/site.webmanifest",
  alternates: {
    canonical: siteUrl,
  },
  // 百度搜索资源平台站点验证。验证通过后也不要删除，否则会失去验证状态。
  verification: {
    other: { "baidu-site-verification": "codeva-scasn4IZS3" },
  },
};

/**
 * RSS feeds, rendered as literal <link> tags rather than via
 * `metadata.alternates.types`.
 *
 * Metadata objects are merged **shallowly** across segments, so any nested
 * field is replaced wholesale by the last segment that defines it. Every page
 * layout here sets `alternates.canonical`, which would drop the feed list
 * declared at the root. Emitting the tags directly keeps them on every page.
 */
const RSS_FEEDS = [
  { url: `${siteUrl}/api/agent/rss/curated.xml`, title: "AI 热点雷达 · 精选资讯" },
  { url: `${siteUrl}/api/agent/rss/all.xml`, title: "AI 热点雷达 · 全部资讯" },
  { url: `${siteUrl}/api/agent/rss/digest.xml`, title: "AI 热点雷达 · AI 日报" },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171d1b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgSchema = generateOrganizationSchema();
  const siteSchema = generateWebSiteSchema();

  return (
    <html lang="zh-CN" suppressHydrationWarning className={archivo.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* GEO: RSS 是生态支持最广的机器可读格式，便于聚合器与 AI 工具发现数据 */}
        {RSS_FEEDS.map((feed) => (
          <link
            key={feed.url}
            rel="alternate"
            type="application/rss+xml"
            title={feed.title}
            href={feed.url}
          />
        ))}
        {/* GEO: 结构化数据帮助 AI 搜索引擎理解站点身份与功能 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(siteSchema) }}
        />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>
          <AppLayout unreadCount={0}>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
