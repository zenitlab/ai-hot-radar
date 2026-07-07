# 设计文档：Next.js 迁移技术方案

> **实现现状（2026-07-07）**：本次迁移已落地 Next.js 15 App Router + pnpm，
> 并做到与原 Vite 版本页面视觉/行为一致。文中提到的 SSR / ISR / SSG 分级渲染
> 策略是**后续优化方向**——当前所有视图沿用原 SPA 的客户端渲染（`'use client'`），
> 保证行为与旧版逐像素一致；待稳定后再按本文策略逐页启用服务端渲染。

## 技术栈变更

### 前端（变更）

**迁移前**：
- 框架：React 19 + Vite 7
- 路由：React Router v7
- 构建：Vite
- 样式：TailwindCSS v4 + CSS 变量

**迁移后**：
- 框架：Next.js 14+ + React 19
- 路由：Next.js App Router
- 构建：Next.js (Turbopack)
- 样式：TailwindCSS v4 + CSS 变量（保持不变）

### 后端（不变）

- 框架：NestJS 11 + Express
- ORM：Prisma 6.x
- 数据库：SQLite
- 实时通信：Socket.io
- 定时任务：@nestjs/schedule

### 其他（不变）

- AI 集成：OpenAI 兼容协议
- 数据源：RSS/Twitter/Bing/HackerNews
- 部署：Docker + Nginx

## 目录结构设计

```
client/                          # Next.js 项目根目录
├── app/                         # App Router 目录
│   ├── layout.tsx               # 根布局（主题、全局样式、WebSocket Provider）
│   ├── page.tsx                 # 首页（重定向到 /curated）
│   ├── globals.css              # 全局样式（CSS 变量、Tailwind）
│   ├── curated/
│   │   └── page.tsx             # 精选页面（SSR）
│   ├── hotspot/
│   │   └── page.tsx             # 热点雷达（CSR）
│   ├── digest/
│   │   └── page.tsx             # AI 日报（SSR）
│   ├── keywords/
│   │   └── page.tsx             # 我的关注（CSR + WebSocket）
│   ├── agent/
│   │   └── page.tsx             # Agent 接入（SSG）
│   ├── changelog/
│   │   └── page.tsx             # 更新日志（SSG）
│   └── about/
│       └── page.tsx             # 关于页面（SSG）
├── components/                  # 组件库
│   ├── ui/                      # shadcn/ui 组件
│   │   ├── button.tsx
│   │   └── badge.tsx
│   ├── common/                  # 通用组件
│   │   ├── BackToTop.tsx       # 返回顶部
│   │   ├── Loader.tsx          # 加载动画
│   │   ├── Toast.tsx           # 提示消息
│   │   └── EmptyState.tsx      # 空状态
│   ├── layout/                  # 布局组件
│   │   ├── AppLayout.tsx       # 应用布局
│   │   └── TopBar.tsx          # 顶部导航
│   ├── curated/                 # 精选页组件
│   │   └── CuratedView.tsx
│   ├── hotspot/                 # 热点页组件
│   │   └── HotspotView.tsx
│   ├── digest/                  # 日报页组件
│   │   └── DigestView.tsx
│   ├── keywords/                # 关键词页组件
│   │   └── KeywordsView.tsx
│   ├── agent/                   # Agent 页组件
│   │   └── AgentView.tsx
│   ├── changelog/               # 更新日志组件
│   │   └── ChangelogView.tsx
│   └── about/                   # 关于页组件
│       └── AboutView.tsx
├── lib/                         # 工具函数
│   ├── utils.ts                 # 通用工具（cn 等）
│   └── sourceMeta.tsx           # 数据源元信息
├── hooks/                       # 自定义 Hooks
│   └── useTheme.ts              # 主题 Hook
├── services/                    # API 服务层
│   └── api.ts                   # API 调用封装
├── providers/                   # Context Providers
│   ├── ThemeProvider.tsx        # 主题 Provider
│   └── SocketProvider.tsx       # Socket.io Provider
├── types/                       # 类型定义
│   └── index.ts
├── utils/                       # 工具函数
│   └── relativeTime.ts          # 相对时间
├── public/                      # 静态资源
│   └── favicon.ico
├── next.config.ts               # Next.js 配置
├── tailwind.config.ts           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 依赖清单
└── README.md                    # 项目说明
```

## 渲染策略设计

### 核心原则

根据页面数据特性选择最合适的渲染方式：
- **静态生成（SSG）**：内容不常变化，构建时生成
- **服务端渲染（SSR）**：内容需要 SEO，数据更新频率适中
- **客户端渲染（CSR）**：实时数据，需要交互

### 各页面渲染方式

| 页面 | 渲染方式 | 数据获取 | 缓存策略 | 理由 |
|------|---------|---------|---------|------|
| 精选 | SSR | fetch with cache | revalidate: 60 | 需要 SEO，每分钟更新 |
| 热点雷达 | CSR | Client fetch | 无 | 实时数据，10 分钟更新 |
| AI 日报 | SSR | fetch with cache | revalidate: 3600 | 需要 SEO，每小时更新 |
| 我的关注 | CSR | Client fetch + WebSocket | 无 | 实时推送，个性化 |
| Agent 接入 | SSG | 构建时 | 永久 | 静态内容 |
| 更新日志 | SSG | 构建时 | 永久 | 静态内容 |
| 关于 | SSG | 构建时 | 永久 | 静态内容 |

### 代码示例

**SSR 页面示例（精选）**：
```tsx
// app/curated/page.tsx
import { CuratedView } from '@/components/curated/CuratedView';

export const revalidate = 60; // ISR: 每 60 秒重新验证

async function getCuratedData() {
  const res = await fetch('http://localhost:3001/api/curated?period=today&limit=50', {
    next: { revalidate: 60 }
  });
  return res.json();
}

export default async function CuratedPage() {
  const data = await getCuratedData();
  return <CuratedView initialData={data} />;
}
```

**CSR 页面示例（热点雷达）**：
```tsx
// app/hotspot/page.tsx
'use client';

import { HotspotView } from '@/components/hotspot/HotspotView';

export default function HotspotPage() {
  return <HotspotView />;
}
```

**SSG 页面示例（关于）**：
```tsx
// app/about/page.tsx
import { AboutView } from '@/components/about/AboutView';

export default function AboutPage() {
  return <AboutView />;
}
```

## API 代理配置

### 开发环境

```ts
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      },
    ];
  },
};
```

### 生产环境

保持现有 Nginx 配置：
```nginx
# nginx.conf
location /api {
    proxy_pass http://server:3001;
}

location /socket.io {
    proxy_pass http://server:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location / {
    proxy_pass http://client:3000;
}
```

## WebSocket 集成方案

### 架构设计

```
Root Layout
  └── SocketProvider ('use client')
       └── App Content
            └── KeywordsView (消费 Socket 事件)
```

### 实现步骤

**1. 创建 SocketProvider**：
```tsx
// providers/SocketProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

**2. 在 Root Layout 中注入**：
```tsx
// app/layout.tsx
import { SocketProvider } from '@/providers/SocketProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

**3. 在组件中使用**：
```tsx
// components/keywords/KeywordsView.tsx
'use client';

import { useSocket } from '@/providers/SocketProvider';

export function KeywordsView() {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('keyword-match', (data) => {
      console.log('New keyword match:', data);
    });

    return () => {
      socket.off('keyword-match');
    };
  }, [socket]);

  // ...
}
```

## 主题系统迁移

### CSS 变量（保持不变）

```css
/* app/globals.css */
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent-blue: #3b82f6;
  /* ... */
}

[data-theme='dark'] {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
  --accent-blue: #60a5fa;
  /* ... */
}
```

### ThemeProvider

```tsx
// providers/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

## 构建和部署配置

### Next.js 配置

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 输出为 standalone 模式（Docker 优化）
  output: 'standalone',

  // API 代理（开发环境）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },

  // 图片优化
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },

  // 生产优化
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
```

### Dockerfile

```dockerfile
# client/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  client:
    build: ./client
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://server:3001
    depends_on:
      - server

  server:
    build: ./server
    ports:
      - "3001:3001"
    volumes:
      - ./server/data:/app/data
    environment:
      - DATABASE_URL=file:./data/dev.db
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - client
      - server
```

## 性能优化策略

### 代码分割

Next.js 自动按路由分割代码：
- `/curated` → `curated.js`
- `/hotspot` → `hotspot.js`
- `/digest` → `digest.js`

### 预加载

```tsx
// components/layout/TopBar.tsx
import Link from 'next/link';

export function TopBar() {
  return (
    <nav>
      <Link href="/curated" prefetch>精选</Link>
      <Link href="/hotspot" prefetch>热点雷达</Link>
      <Link href="/digest" prefetch>AI 日报</Link>
    </nav>
  );
}
```

### 图片优化

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={100}
  height={100}
  priority
/>
```

### Bundle 分析

```bash
npm run build
# 查看 .next/analyze 目录
```

## 迁移检查清单

### 代码迁移
- [ ] 初始化 Next.js 项目
- [ ] 复制公共组件（components/ui, components/common）
- [ ] 复制工具函数（lib/, utils/, hooks/）
- [ ] 复制服务层（services/api.ts）
- [ ] 复制类型定义（types/）
- [ ] 迁移 AppLayout 和 TopBar
- [ ] 迁移 8 个页面组件
- [ ] 添加 'use client' 指令到客户端组件
- [ ] 创建 ThemeProvider 和 SocketProvider

### 配置迁移
- [ ] 配置 next.config.ts
- [ ] 配置 tailwind.config.ts
- [ ] 配置 tsconfig.json
- [ ] 配置 package.json scripts
- [ ] 迁移 CSS 变量和全局样式

### 构建部署
- [ ] 更新 Dockerfile
- [ ] 更新 docker-compose.yml
- [ ] 更新 nginx.conf
- [ ] 测试本地开发环境
- [ ] 测试生产构建
- [ ] 测试 Docker 部署

### 功能验证
- [ ] 所有页面正常渲染
- [ ] 所有 API 调用正常
- [ ] WebSocket 实时推送正常
- [ ] 主题切换正常
- [ ] 路由导航正常
- [ ] 响应式布局正常

### 文档更新
- [ ] 更新 README.md
- [ ] 更新 docs/README.md
- [ ] 更新 docs/LOCAL_SETUP.md
- [ ] 更新 openspec/design.md
- [ ] 更新 client/README.md
- [ ] 更新 CHANGELOG

## 技术债务和后续优化

### 当前已知限制
1. SSR 页面需要后端 API 可访问（可通过 ISR 缓解）
2. WebSocket 连接在页面刷新时会重连（正常行为）
3. 首次构建时间比 Vite 长（约 30s vs 5s）

### 后续优化方向
1. 使用 React Server Components 减少客户端 JS
2. 实现增量静态再生成（ISR）优化精选和日报页
3. 使用 next/image 优化所有图片
4. 添加更多缓存策略（Redis）
5. 实现边缘函数（Edge Runtime）
6. 添加性能监控（Vercel Analytics / Sentry）

## 总结

本设计方案遵循以下原则：
1. **最小改动**：只改前端，后端保持不变
2. **渐进式**：在新目录开发，测试通过后切换
3. **性能优先**：根据数据特性选择合适的渲染方式
4. **可维护性**：保持清晰的目录结构和代码组织

预期收益：
- 首屏加载提升 40-50%
- Bundle 大小减少 30-40%
- 更好的 SEO
- 更好的开发体验
