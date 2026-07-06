'use client';

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SocketProvider } from "@/providers/SocketProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [unreadCount] = useState(0); // TODO: Connect to actual unread count

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <title>AI Hot Radar - AI 热点雷达</title>
        <meta name="description" content="实时聚合多源 AI 资讯，AI 自动评分精选，生成每日日报" />
        <link rel="icon" href="/radar.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <SocketProvider>
            <AppLayout unreadCount={unreadCount}>
              {children}
            </AppLayout>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
