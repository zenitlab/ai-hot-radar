import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "AI Hot Radar · AI 热点雷达",
  description: "AI Hot Radar — 实时聚合 AI 资讯、AI 评分精选、自动生成日报",
  icons: { icon: { url: "/radar.svg", type: "image/svg+xml" } },
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
