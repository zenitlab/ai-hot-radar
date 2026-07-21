import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

// Self-hosted via next/font: zero layout shift, no render-blocking request.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihotradar.com";

// `new URL()` throws on a malformed NEXT_PUBLIC_SITE_URL (e.g. missing scheme).
// Validate first and fall back to the literal so the call can never throw.
const DEFAULT_SITE_URL = "https://aihotradar.com";
const safeSiteUrl = URL.canParse(siteUrl) ? siteUrl : DEFAULT_SITE_URL;
const metadataBase = new URL(safeSiteUrl);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "AI Hot Radar · AI 热点雷达",
    template: "%s | AI Hot Radar",
  },
  description: "实时聚合 20+ AI 信息源，AI 双阶段评分识别真伪，自动生成每日日报。追踪 OpenAI、Anthropic、Google AI 等官方动态，arXiv 最新论文，Twitter KOL 观点。",
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
  authors: [{ name: "AI Hot Radar Team" }],
  creator: "AI Hot Radar",
  publisher: "AI Hot Radar",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "AI Hot Radar",
    title: "AI Hot Radar · AI 热点雷达",
    description: "实时聚合 20+ AI 信息源，AI 评分精选，自动生成每日日报",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AI Hot Radar - AI 热点雷达",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Hot Radar · AI 热点雷达",
    description: "实时聚合 20+ AI 信息源，AI 评分精选，自动生成每日日报",
    images: [`${siteUrl}/og-image.png`],
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efece4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e12" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={fraunces.variable}>
      <head>
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>
          <AppLayout unreadCount={0}>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
