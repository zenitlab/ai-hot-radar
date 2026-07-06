# 任务清单：Next.js 迁移

## Phase 1: 项目初始化

- [ ] 创建 client-next 目录
- [ ] 初始化 Next.js 14+ 项目（App Router + TypeScript + Tailwind）
- [ ] 安装依赖：lucide-react, framer-motion, socket.io-client, clsx, tailwind-merge, class-variance-authority
- [ ] 配置 next.config.ts（API 代理、standalone 输出）
- [ ] 配置 tailwind.config.ts（保持与现有配置一致）
- [ ] 配置 tsconfig.json（路径别名 @/*）
- [ ] 创建目录结构（app/, components/, lib/, hooks/, services/, providers/, types/, utils/）

## Phase 2: 迁移公共代码

- [ ] 复制 components/ui/* 到 client-next/components/ui/
- [ ] 复制 components/common/* 到 client-next/components/common/
- [ ] 复制 lib/* 到 client-next/lib/
- [ ] 复制 hooks/* 到 client-next/hooks/
- [ ] 复制 services/api.ts 到 client-next/services/
- [ ] 复制 types/index.ts 到 client-next/types/
- [ ] 复制 utils/relativeTime.ts 到 client-next/utils/
- [ ] 为客户端组件添加 'use client' 指令（BackToTop, Toast, Loader 等）
- [ ] 测试公共组件可正常导入

## Phase 3: 迁移样式系统

- [ ] 创建 app/globals.css，复制 CSS 变量定义
- [ ] 创建 providers/ThemeProvider.tsx
- [ ] 测试主题切换功能

## Phase 4: 创建根布局

- [ ] 创建 app/layout.tsx
- [ ] 集成 ThemeProvider
- [ ] 集成全局样式
- [ ] 集成元数据（title, description）
- [ ] 测试根布局渲染

## Phase 5: 创建 WebSocket Provider

- [ ] 创建 providers/SocketProvider.tsx
- [ ] 实现 Socket.io 客户端连接
- [ ] 在 app/layout.tsx 中集成 SocketProvider
- [ ] 创建 useSocket hook
- [ ] 测试 WebSocket 连接

## Phase 6: 迁移布局组件

- [ ] 复制 components/layout/AppLayout.tsx
- [ ] 复制 components/layout/TopBar.tsx
- [ ] 适配 Next.js Link 组件（替换 React Router）
- [ ] 适配 'use client' 指令
- [ ] 测试布局组件渲染

## Phase 7: 迁移页面组件

### 7.1 首页
- [ ] 创建 app/page.tsx（重定向到 /curated）

### 7.2 精选页（SSR）
- [ ] 创建 app/curated/page.tsx
- [ ] 复制 components/curated/CuratedView.tsx
- [ ] 实现服务端数据获取
- [ ] 配置 ISR（revalidate: 60）
- [ ] 测试 SSR 渲染和数据获取

### 7.3 热点雷达（CSR）
- [ ] 创建 app/hotspot/page.tsx（'use client'）
- [ ] 复制 components/hotspot/HotspotView.tsx
- [ ] 复制相关子组件（HotspotCard, HotspotTabs, FilterSortBar）
- [ ] 测试客户端渲染

### 7.4 AI 日报（SSR）
- [ ] 创建 app/digest/page.tsx
- [ ] 复制 components/digest/DigestView.tsx
- [ ] 实现服务端数据获取
- [ ] 配置 ISR（revalidate: 3600）
- [ ] 测试 SSR 渲染

### 7.5 我的关注（CSR + WebSocket）
- [ ] 创建 app/keywords/page.tsx（'use client'）
- [ ] 复制 components/keywords/KeywordsView.tsx
- [ ] 复制相关子组件（EntityCard, EntityGraph, TrendChart）
- [ ] 集成 useSocket hook
- [ ] 测试 WebSocket 实时推送

### 7.6 Agent 接入（SSG）
- [ ] 创建 app/agent/page.tsx
- [ ] 复制 components/agent/AgentView.tsx
- [ ] 测试静态生成

### 7.7 更新日志（SSG）
- [ ] 创建 app/changelog/page.tsx
- [ ] 复制 components/changelog/ChangelogView.tsx
- [ ] 测试静态生成

### 7.8 关于页（SSG）
- [ ] 创建 app/about/page.tsx
- [ ] 复制 components/about/AboutView.tsx
- [ ] 测试静态生成

## Phase 8: 功能验证

- [ ] 测试所有页面正常渲染
- [ ] 测试所有 API 调用正常（/api/curated, /api/hotspots, /api/digest 等）
- [ ] 测试 WebSocket 实时推送（关键词匹配）
- [ ] 测试主题切换（亮暗模式）
- [ ] 测试路由导航（Next.js Link）
- [ ] 测试响应式布局（移动端、桌面端）
- [ ] 测试 404 页面
- [ ] 测试错误边界

## Phase 9: 性能优化

- [ ] 配置预加载（Link prefetch）
- [ ] 优化图片（如有）
- [ ] 配置 bundle 分析
- [ ] 检查 bundle 大小（gzip < 500KB）
- [ ] 测试首屏加载时间（LCP < 2s）

## Phase 10: 构建和部署配置

### 10.1 Dockerfile
- [ ] 创建 client-next/Dockerfile（多阶段构建）
- [ ] 配置 standalone 输出
- [ ] 测试 Docker 构建

### 10.2 docker-compose.yml
- [ ] 更新 docker-compose.yml（client 服务指向 client-next）
- [ ] 配置环境变量（NEXT_PUBLIC_API_URL）
- [ ] 测试 docker-compose up

### 10.3 Nginx
- [ ] 更新 nginx.conf（保持现有配置，前端端口改为 3000）
- [ ] 测试 Nginx 反向代理

### 10.4 生产构建
- [ ] 测试 npm run build
- [ ] 测试 npm run start
- [ ] 检查构建产物（.next/standalone）

## Phase 11: 文档更新

### 11.1 根目录 README.md
- [ ] 更新技术栈说明（React 19 + Vite → Next.js 14+）
- [ ] 更新 badges（Vite → Next.js）
- [ ] 更新快速开始步骤（保持端口 5173 → 3000）

### 11.2 docs/README.md
- [ ] 更新技术栈表格
- [ ] 更新项目结构说明

### 11.3 docs/LOCAL_SETUP.md
- [ ] 更新前端启动命令（npm run dev）
- [ ] 更新前端访问地址（http://localhost:3000）
- [ ] 更新构建命令

### 11.4 docs/DEPLOY.md
- [ ] 更新 Dockerfile 说明
- [ ] 更新 docker-compose.yml 说明
- [ ] 更新环境变量配置

### 11.5 openspec/design.md
- [ ] 更新前端技术栈部分
- [ ] 更新架构决策（添加 Next.js 相关决策）
- [ ] 更新目录结构说明

### 11.6 client/README.md
- [ ] 重写为 Next.js 项目说明
- [ ] 添加 App Router 使用指南
- [ ] 添加渲染策略说明

### 11.7 README.en.md
- [ ] 同步更新英文版技术栈说明

## Phase 12: 更新 CHANGELOG

- [ ] 在 components/changelog/ChangelogView.tsx 添加新条目
- [ ] 标题：迁移前端到 Next.js 14+
- [ ] 说明：从 Vite + React SPA 迁移到 Next.js App Router，首屏性能提升 40-50%，支持 SSR/SSG/ISR
- [ ] 列出主要变更：
  - 采用 Next.js 14+ App Router
  - 精选和日报页面采用 SSR + ISR
  - 保持 API 和功能完全兼容
  - 优化首屏加载性能

## Phase 13: 代码切换

- [ ] 备份旧代码：mv client client-vite-backup
- [ ] 切换新代码：mv client-next client
- [ ] 测试切换后的本地开发环境
- [ ] 测试切换后的 Docker 构建

## Phase 14: Git 提交

- [ ] git add .
- [ ] git commit -m "feat: migrate frontend to Next.js 14+ with App Router"
- [ ] git push origin main

## Phase 15: 对抗性审查

### 完整性检查
- [ ] 所有页面是否都已迁移？
- [ ] 所有组件是否都已迁移？
- [ ] 所有功能是否都正常工作？
- [ ] 是否有遗漏的文件？

### 一致性检查
- [ ] 技术栈描述是否统一？
- [ ] 文档是否都已更新？
- [ ] 版本号是否一致？
- [ ] 代码风格是否一致？

### 潜在问题检查
- [ ] 是否有性能倒退？
- [ ] 是否有内存泄漏？
- [ ] 是否有未处理的错误？
- [ ] 是否有安全问题？
- [ ] Docker 镜像大小是否合理？

### 兼容性检查
- [ ] Chrome 最新版测试
- [ ] Firefox 最新版测试
- [ ] Safari 最新版测试
- [ ] 移动端浏览器测试
- [ ] 后端 API 兼容性测试

### 文档质量检查
- [ ] README 是否清晰易懂？
- [ ] 技术栈说明是否准确？
- [ ] 部署文档是否完整？
- [ ] CHANGELOG 是否详细？

### 回滚验证
- [ ] 回滚步骤是否明确？
- [ ] 备份是否完整？
- [ ] 回滚时间是否可接受（< 30 分钟）？

## 验收标准

### 功能完整性
- ✅ 所有 8 个页面正常渲染
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
- ✅ Nginx 反向代理正常

### 文档完整性
- ✅ 所有文档已更新
- ✅ CHANGELOG 已更新
- ✅ 技术栈描述一致
- ✅ 部署文档完整

## 时间估算

| Phase | 预计时间 | 实际时间 | 备注 |
|-------|---------|---------|------|
| Phase 1: 项目初始化 | 1h | | |
| Phase 2: 迁移公共代码 | 1h | | |
| Phase 3: 迁移样式系统 | 1h | | |
| Phase 4: 创建根布局 | 0.5h | | |
| Phase 5: 创建 WebSocket Provider | 1h | | |
| Phase 6: 迁移布局组件 | 1h | | |
| Phase 7: 迁移页面组件 | 6h | | 最耗时 |
| Phase 8: 功能验证 | 2h | | |
| Phase 9: 性能优化 | 1h | | |
| Phase 10: 构建和部署配置 | 2h | | |
| Phase 11: 文档更新 | 2h | | |
| Phase 12: 更新 CHANGELOG | 0.5h | | |
| Phase 13: 代码切换 | 0.5h | | |
| Phase 14: Git 提交 | 0.5h | | |
| Phase 15: 对抗性审查 | 2h | | |
| **总计** | **23h** | | 约 3 个工作日 |

## 风险和缓解

### 风险 1: WebSocket 集成失败
- **概率**: 中
- **影响**: 高（我的关注功能不可用）
- **缓解**: 提前测试 Socket.io 在 Next.js 中的使用，参考官方示例

### 风险 2: SSR 页面数据获取失败
- **概率**: 低
- **影响**: 中（降级为 CSR）
- **缓解**: 实现错误边界，降级到客户端渲染

### 风险 3: 样式兼容性问题
- **概率**: 低
- **影响**: 低（样式错乱）
- **缓解**: CSS 变量保持不变，充分测试

### 风险 4: 构建产物过大
- **概率**: 中
- **影响**: 中（部署慢）
- **缓解**: 使用 standalone 输出，优化 bundle

### 风险 5: Docker 构建失败
- **概率**: 低
- **影响**: 高（无法部署）
- **缓解**: 参考 Next.js 官方 Dockerfile 示例

## 完成条件

当所有任务清单项都被勾选（- [x]），并且所有验收标准都通过时，迁移任务完成。

**预期完成时间**: 3-4 个工作日
**关键路径**: Phase 7（迁移页面组件）
