# 提案：迁移前端到 Next.js

> **实现现状（2026-07-07）**：已完成 Next.js 15 App Router 迁移与 pnpm 切换，
> 页面与原 Vite 版本保持一致。文中的性能提升数字与 SSR/ISR 分级渲染属于**目标态**，
> 当前落地版本仍为客户端渲染，作为后续渐进优化的基线。

## 问题陈述

当前项目使用 Vite + React SPA 架构，用户希望迁移到 Next.js。需要评估这个迁移的必要性、收益和成本。

## 目标

从第一性原理出发，评估是否应该迁移到 Next.js，以及如何迁移。

## 第一性原理分析

### 当前架构评估

**现状**：
- 前端：Vite + React 19 + TypeScript + TailwindCSS
- 后端：NestJS 11 + Express + Prisma + SQLite
- 部署：Docker + Nginx
- 定位：私有部署工具，供 AI 从业者使用

**优点**：
- Vite 构建速度极快（< 5s）
- 开发体验好（HMR < 200ms）
- 前后端完全分离，职责清晰
- 部署简单（静态文件 + API 服务）

**缺点**：
- 首屏加载慢（需要下载全部 JS 后才能渲染）
- 无 SEO（但当前定位不需要）
- 无服务端渲染

### Next.js 的核心价值主张

Next.js 的第一性原理优势：
1. **服务端渲染（SSR）**：首屏内容在服务器生成，直接返回 HTML
2. **更好的性能**：React Server Components 减少客户端 JS
3. **SEO 友好**：搜索引擎可直接抓取内容
4. **更好的代码分割**：自动按路由分割代码
5. **图片优化**：next/image 自动优化

### 项目需求分析

**是否需要 SSR？**
- 当前：私有部署，用户直接访问，不需要搜索引擎收录
- 未来：可能公开访问（aihotradar.com），需要 SEO

**是否需要更快的首屏？**
- 当前：用户主要是技术人员，可接受 SPA 加载速度
- 但更快的首屏确实能提升用户体验

**是否需要降低客户端 JS？**
- 当前：React 19 + 组件库，bundle 约 300KB gzipped
- RSC 可以减少到 150KB 左右

### 决策：应该迁移

**理由**：
1. **面向未来**：项目有公开访问的潜力，提前做好 SEO 准备
2. **性能提升**：首屏加载可提升 40-50%
3. **技术债务清理**：Next.js 是 React 生态的标准选择，长期维护更容易
4. **开发体验提升**：App Router 提供更好的代码组织

**权衡**：
- 迁移成本：约 3 个工作日
- 学习曲线：团队需要学习 App Router
- 构建复杂度：Next.js 构建比 Vite 慢（但生产构建一次性）

**结论**：收益 > 成本，应该迁移。

## 迁移策略

### 核心原则

1. **保持前后端分离**：不改动后端 NestJS，只升级前端
2. **渐进式迁移**：在新目录并行开发，测试通过后切换
3. **功能对等**：不增加新功能，只做技术升级
4. **可回滚**：保留旧代码作为备份

### 架构设计

```
# 迁移前
client/                    # Vite + React SPA
  src/
    App.tsx               # React Router
    components/           # 组件
    services/api.ts       # API 调用

server/                   # NestJS API
  src/
    hotspots/            # 热点模块
    curated/             # 精选模块
    digest/              # 日报模块

# 迁移后
client/                    # Next.js 14+ App Router
  app/                    # App Router 目录
    layout.tsx            # 根布局
    page.tsx              # 首页（重定向）
    curated/page.tsx      # 精选页
    hotspot/page.tsx      # 热点页
    digest/page.tsx       # 日报页
    keywords/page.tsx     # 关键词页
    agent/page.tsx        # Agent 页
    changelog/page.tsx    # 更新日志
    about/page.tsx        # 关于页
  components/             # 组件（复用现有）
  lib/                    # 工具函数
  services/               # API 服务

server/                   # NestJS API（不变）
```

### 渲染策略

**原则**：根据数据特性选择渲染方式

| 页面 | 渲染方式 | 理由 |
|------|---------|------|
| 精选 | SSR | 需要 SEO，数据更新频率适中 |
| 热点雷达 | CSR | 实时数据，频繁更新 |
| AI 日报 | SSR/SSG | 需要 SEO，每日生成一次 |
| 我的关注 | CSR | 实时推送，个性化内容 |
| Agent 接入 | SSG | 静态内容，不常变化 |
| 更新日志 | SSG | 静态内容 |
| 关于 | SSG | 静态内容 |

### API 代理

**开发环境**：
- Next.js dev server rewrites `/api/*` → `http://localhost:3001/api/*`
- Socket.io 通过 rewrites 代理

**生产环境**：
- 保持现有 Nginx 配置
- Next.js 构建为 standalone 模式
- Nginx 反向代理前后端

### WebSocket 集成

Next.js 中使用 Socket.io：
1. 创建客户端 Provider（`'use client'` 组件）
2. 在根 layout 中注入
3. 保持现有 Socket.io 逻辑不变

## 实施计划

### Phase 1: 初始化（2 小时）
1. 创建 `client-next` 目录
2. 初始化 Next.js 14+ 项目
3. 配置 TypeScript、Tailwind、ESLint
4. 配置 API 代理

### Phase 2: 迁移公共代码（3 小时）
1. 复制 `lib/`、`hooks/`、`utils/`
2. 复制 `services/api.ts`
3. 复制 `components/ui/`
4. 复制 `components/common/`
5. 适配 Next.js 的 `'use client'` 指令

### Phase 3: 迁移页面（8 小时）
1. 创建根 layout（主题、全局样式）
2. 迁移精选页（SSR）
3. 迁移热点雷达（CSR）
4. 迁移 AI 日报（SSR）
5. 迁移我的关注（CSR + WebSocket）
6. 迁移 Agent 接入（SSG）
7. 迁移更新日志（SSG）
8. 迁移关于页（SSG）

### Phase 4: 样式和主题（2 小时）
1. 迁移 CSS 变量
2. 配置 Tailwind CSS v4
3. 测试亮暗主题切换

### Phase 5: WebSocket 集成（3 小时）
1. 创建 SocketProvider
2. 在 layout 中注入
3. 测试实时推送

### Phase 6: 构建和部署（3 小时）
1. 配置 `next.config.ts`（standalone 输出）
2. 更新 Dockerfile
3. 更新 docker-compose.yml
4. 更新 nginx.conf
5. 测试 Docker 构建

### Phase 7: 文档更新（2 小时）
1. 更新 README.md
2. 更新 docs/
3. 更新 openspec/design.md
4. 更新 client/README.md

### Phase 8: 验证和测试（3 小时）
1. 本地开发测试
2. 生产构建测试
3. Docker 部署测试
4. 功能回归测试

### Phase 9: 切换（1 小时）
1. 备份 `client/` → `client-vite-backup/`
2. 重命名 `client-next/` → `client/`
3. 更新 CHANGELOG
4. 提交代码

**总计**：27 小时（约 3-4 个工作日）

## 风险和缓解

### 高风险
1. **WebSocket 集成复杂**
   - 缓解：参考 Next.js 官方 Socket.io 示例
2. **样式兼容性问题**
   - 缓解：先迁移样式系统，充分测试

### 中风险
1. **构建产物变大**
   - 缓解：使用 standalone 输出，优化 bundle
2. **Docker 镜像变大**
   - 缓解：多阶段构建，只复制必要文件

### 低风险
1. **学习曲线**
   - 缓解：提供文档和示例
2. **HMR 稍慢**
   - 缓解：Next.js 14+ HMR 已经很快

## 验收标准

### 功能完整性
- ✅ 所有页面正常渲染
- ✅ 所有 API 调用正常
- ✅ WebSocket 实时推送正常
- ✅ 主题切换正常
- ✅ 路由导航正常
- ✅ 响应式布局正常

### 性能指标
- ✅ 首屏加载（LCP）< 2s
- ✅ 交互响应（FID）< 100ms
- ✅ 累计布局偏移（CLS）< 0.1
- ✅ Bundle 大小 gzip < 500KB

### 兼容性
- ✅ Chrome/Edge 最新版
- ✅ Firefox 最新版
- ✅ Safari 最新版
- ✅ 移动端浏览器

### 部署验证
- ✅ 本地开发环境运行
- ✅ Docker 构建成功
- ✅ Docker Compose 启动成功
- ✅ 生产环境部署成功

## 回滚计划

如果迁移失败：
1. 恢复 `client-vite-backup/` → `client/`
2. 恢复文档
3. 重新构建部署

**回滚时间**：< 30 分钟

## 总结

从第一性原理出发，Next.js 迁移是一个**收益明显、风险可控**的升级方案：

**核心收益**：
- 首屏性能提升 40-50%
- 为未来 SEO 做准备
- 更好的开发体验
- 技术栈现代化

**核心原则**：
- 保持前后端分离
- 渐进式迁移
- 功能对等
- 可回滚

建议：**批准此提案，开始实施**。
