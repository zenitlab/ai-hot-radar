import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihotradar.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Hot Radar · AI 热点雷达",
    template: "%s | AI Hot Radar",
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/svg+xml' },
    ],
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
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
  icons: {
    icon: { url: "/radar.svg", type: "image/svg+xml" },
    apple: { url: "/radar.svg", type: "image/svg+xml" },
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Fraunces serif (light-mode H1s). Preconnect speeds up the first
            paint by warming the TLS connection before the font request. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <AppLayout unreadCount={0}>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
