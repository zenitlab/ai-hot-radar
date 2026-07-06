import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SocketProvider } from "@/providers/SocketProvider";

export const metadata: Metadata = {
  title: "AI Hot Radar - AI 热点雷达",
  description: "实时聚合多源 AI 资讯，AI 自动评分精选，生成每日日报",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
