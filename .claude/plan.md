# Next.js 迁移计划

## 目标
将前端从 Vite + React SPA 迁移到 Next.js 14+ App Router，保持后端 NestJS 不变，按照 OpenSpec 流程规范执行。

## 第一性原理分析

### 为什么迁移到 Next.js？
1. **更好的 SEO**：虽然当前项目定位为私有部署工具，但作为资讯聚合平台，未来可能需要公开访问
2. **服务端渲染（SSR）**：首屏加载更快，用户体验提升
3. **API Routes 整合**：可以将部分简单的 API 逻辑移到前端层（可选）
4. **更成熟的生态**：Next.js 是 React 生态的主流选择，社区支持更好
5. **TypeScript + React Server Components**：更好的性能和开发体验

### 技术债务与收益权衡
**收益**：
- 首屏加载速度提升 40-60%
- 更好的代码组织（App Router）
- 内置图片优化（next/image）
- 更好的路由预加载

**成本**：
- 迁移工作量：预计 2-3 天
- 学习曲线：App Router 与传统 React 不同
- 构建复杂度略增

**决策**：收益明显大于成本，值得迁移。

## 架构设计

### 新技术栈
```
前端：Next.js 14+ + TypeScript + Tailwind CSS + App Router
后端：NestJS 11 + Express（保持不变）
数据库：SQLite + Prisma（保持不变）
```

### 目录结构（Next.js App Router）
```
client/
├── app/                      # App Router 目录
│   ├── layout.tsx            # 根布局（主题、全局样式）
│   ├── page.tsx              # 首页（重定向到 /curated）
│   ├── curated/
│   │   └── page.tsx          # 精选页面
│   ├── hotspot/
│   │   └── page.tsx          # 热点雷达
│   ├── digest/
│   │   └── page.tsx          # AI 日报
│   ├── agent/
│   │   └── page.tsx          # Agent 接入
│   ├── keywords/
│   │   └── page.tsx          # 我的关注
│   ├── changelog/
│   │   └── page.tsx          # 更新日志
│   └── about/
│       └── page.tsx          # 关于
├── components/               # 组件（保持现有结构）
├── lib/                      # 工具函数
├── hooks/                    # 自定义 Hooks
├── services/                 # API 服务
├── public/                   # 静态资源
├── styles/                   # 全局样式
├── next.config.ts            # Next.js 配置
├── tailwind.config.ts        # Tailwind 配置
└── tsconfig.json             # TypeScript 配置
```

### API 代理策略
保持前后端分离架构：
- 开发环境：Next.js dev server 代理 `/api` 到 `http://localhost:3001`
- 生产环境：Nginx 反向代理（保持现有 docker-compose 配置）

### 渲染策略
- **客户端渲染（CSR）**：需要实时数据的页面（热点雷达、我的关注）
- **服务端渲染（SSR）**：需要 SEO 的页面（精选、AI 日报）
- **静态生成（SSG）**：不变的页面（关于、更新日志）

## 迁移步骤

### Phase 1: 初始化 Next.js 项目
1. 在项目根目录创建新的 `client-next` 目录
2. 初始化 Next.js 14+ 项目
3. 配置 TypeScript、Tailwind CSS、ESLint
4. 配置 API 代理到后端

### Phase 2: 迁移公共组件和工具
1. 复制 `components/` 下的通用组件（BackToTop、Loader、Toast、EmptyState 等）
2. 复制 `lib/` 工具函数（utils、sourceMeta 等）
3. 复制 `hooks/` 自定义 Hooks（useTheme 等）
4. 复制 `services/` API 服务层

### Phase 3: 迁移页面组件
按依赖顺序迁移：
1. AppLayout（根布局 + TopBar）
2. CuratedView（精选）
3. HotspotView（热点雷达）
4. DigestView（AI 日报）
5. KeywordsView（我的关注）
6. AgentView（Agent 接入）
7. ChangelogView（更新日志）
8. AboutView（关于）

### Phase 4: 样式和主题
1. 迁移 CSS 变量（亮暗主题）
2. 配置 Tailwind CSS v4
3. 测试主题切换功能

### Phase 5: WebSocket 集成
1. 创建 WebSocket Provider（客户端组件）
2. 在根布局中注入 Provider
3. 测试关键词推送功能

### Phase 6: 构建和部署配置
1. 配置 `next.config.ts`（输出模式、环境变量等）
2. 更新 Dockerfile（Next.js standalone 输出）
3. 更新 docker-compose.yml
4. 更新 Nginx 配置

### Phase 7: 文档更新
1. 更新 README.md（技术栈说明）
2. 更新 docs/ 下所有文档
3. 更新 openspec/design.md
4. 更新 client/README.md

### Phase 8: 验证和测试
1. 本地开发环境测试
2. 生产构建测试
3. Docker 部署测试
4. 功能回归测试

### Phase 9: 切换和清理
1. 备份旧 `client/` 为 `client-vite-backup/`
2. 重命名 `client-next/` 为 `client/`
3. 更新根目录 README.md
4. 更新 CHANGELOG

## OpenSpec 工作流

### 创建 Change
```bash
openspec create "migrate-to-nextjs" --schema spec-driven
```

### 编写文档（按 OpenSpec 规范）
1. **proposal.md**: 迁移提案（为什么、如何、权衡）
2. **design.md**: 技术设计文档（架构、目录结构、渲染策略）
3. **specs/**: 各页面的功能规范
4. **tasks.md**: 具体实施任务清单

### 实施流程
```bash
# 1. 探索阶段
/opsx:explore migrate-to-nextjs

# 2. 继续完善文档
/opsx:continue

# 3. 实施任务
/opsx:apply migrate-to-nextjs

# 4. 归档
/opsx:archive migrate-to-nextjs
```

## 关键决策记录

### 决策 1: 保持前后端分离
**理由**：
- 后端 NestJS 已经成熟稳定，无需改动
- Next.js API Routes 不适合复杂的定时任务、WebSocket、数据库操作
- 保持职责分离，前端专注 UI，后端专注业务逻辑

### 决策 2: 使用 App Router 而非 Pages Router
**理由**：
- App Router 是 Next.js 的未来方向
- React Server Components 更好的性能
- 更简洁的代码组织

### 决策 3: 混合渲染策略
**理由**：
- 不是所有页面都需要 SSR
- 实时数据（热点、关键词）用 CSR 更合适
- 静态页面（关于、更新日志）用 SSG 减少服务器负担

### 决策 4: 保持 Tailwind CSS v4
**理由**：
- 项目已使用 Tailwind v4
- Next.js 完美支持 Tailwind
- 无需改动现有样式

### 决策 5: 渐进式迁移
**理由**：
- 一次性迁移风险高
- 可以在新目录并行开发，测试通过后再切换
- 保留旧代码作为备份

## 风险评估

### 高风险
1. **WebSocket 集成复杂**：需要客户端组件 + Provider 模式
   - 缓解：参考 Next.js 官方 WebSocket 示例
2. **样式兼容性**：CSS 变量、主题切换可能有问题
   - 缓解：先迁移样式，充分测试

### 中风险
1. **构建产物体积**：Next.js 构建产物可能比 Vite 大
   - 缓解：使用 standalone 输出模式，优化 bundle
2. **Docker 镜像大小**：可能需要优化 Dockerfile
   - 缓解：使用多阶段构建，只复制必要文件

### 低风险
1. **学习曲线**：团队需要学习 App Router
   - 缓解：提供培训文档
2. **开发体验**：HMR 速度可能略慢于 Vite
   - 缓解：Next.js 14+ HMR 已经很快，可接受

## 验收标准

### 功能完整性
- ✅ 所有页面正常渲染
- ✅ 所有 API 调用正常
- ✅ WebSocket 实时推送正常
- ✅ 主题切换正常
- ✅ 路由跳转正常
- ✅ 响应式布局正常

### 性能指标
- ✅ 首屏加载时间 < 2s（LCP）
- ✅ 交互响应时间 < 100ms（FID）
- ✅ 累计布局偏移 < 0.1（CLS）
- ✅ 构建产物 gzip 后 < 500KB

### 兼容性
- ✅ Chrome/Edge 最新版
- ✅ Firefox 最新版
- ✅ Safari 最新版
- ✅ 移动端浏览器

### 部署验证
- ✅ 本地开发环境正常运行
- ✅ Docker 构建成功
- ✅ Docker Compose 启动成功
- ✅ 生产环境部署成功

## 回滚计划

如果迁移失败，回滚步骤：
1. 恢复 `client-vite-backup/` 为 `client/`
2. 恢复文档
3. 重新构建部署

预计回滚时间：< 30 分钟

## 时间估算

| 阶段 | 预计时间 | 关键路径 |
|------|---------|---------|
| Phase 1: 初始化 | 2 小时 | 否 |
| Phase 2: 迁移公共组件 | 3 小时 | 是 |
| Phase 3: 迁移页面组件 | 8 小时 | 是 |
| Phase 4: 样式和主题 | 2 小时 | 是 |
| Phase 5: WebSocket 集成 | 3 小时 | 是 |
| Phase 6: 构建和部署 | 3 小时 | 是 |
| Phase 7: 文档更新 | 2 小时 | 否 |
| Phase 8: 验证和测试 | 3 小时 | 是 |
| Phase 9: 切换和清理 | 1 小时 | 否 |
| **总计** | **27 小时** | **约 3 个工作日** |

## 后续优化

迁移完成后可考虑的优化：
1. 使用 React Server Components 优化性能
2. 实现增量静态再生成（ISR）
3. 优化图片加载（next/image）
4. 添加更多缓存策略
5. 实现边缘函数（Edge Runtime）

## 总结

这是一个**收益明显、风险可控**的迁移方案。通过渐进式迁移，可以在不影响现有功能的前提下，逐步完成技术栈升级。

核心原则：
1. **保持前后端分离**：不改动后端，只升级前端
2. **渐进式迁移**：并行开发，测试通过后切换
3. **功能对等**：不增加新功能，只做技术升级
4. **可回滚**：保留旧代码作为备份

准备开始实施。
