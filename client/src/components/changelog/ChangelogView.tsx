import { History } from "lucide-react";
import { cn } from "../../lib/utils";
import { BackToTop } from "../common/BackToTop";

/**
 * Changelog entries — most recent first.
 * Update this array each time a meaningful user-facing change ships.
 */
interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  version?: string;
  tag?: "feature" | "fix" | "tweak";
  items: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-07-07",
    version: "v0.8.1",
    tag: "fix",
    items: [
      "校准 Next.js 版本与原 Vite 版本的像素级一致性：逐组件 diff 后修复了 6 处偏差",
      "锁定 lucide-react 到 0.563.x（此前误升到 1.x 导致 Twitter / Github 图标丢失），恢复原生图标",
      "恢复被遗漏的 shadcn/tailwind.css 样式导入；主题切换回归原 useTheme 行为",
      "移除为绕过报错而加的 edge runtime / force-dynamic hack，页面恢复正常静态预渲染",
    ],
  },
  {
    date: "2026-07-06",
    version: "v0.8.0",
    tag: "feature",
    items: [
      "🚀 前端架构重大升级：从 Vite + React SPA 迁移到 Next.js 15 + App Router",
      "📦 包管理器升级：从 npm 迁移到 pnpm，安装速度提升 2-3 倍，节省 30-50% 磁盘空间",
      "🔧 完整的 OpenSpec 文档流程：proposal、design、tasks 三份详细文档",
      "✅ 保持 API、功能与页面视觉完全兼容，所有现有功能正常工作",
      "🌐 基于文件系统的路由，为未来 SSR / SEO 优化打好基础",
    ],
  },
  {
    date: "2026-06-17",
    version: "v0.7.38",
    tag: "fix",
    items: [
      "修复 AI 日报日期偏移的根因 bug：内部日期计算（shiftDate）存在时区错位，把字符串按北京时间午夜解析却又按 UTC 取日期，导致结果整整少一天——17 号日报实际汇总的是 6/15 的数据而非 6/16",
      "这才是 MiniMax M3（发布于 6/15）反复出现在 6/17 日报里的真正原因；改为全程按 UTC 基准做日期加减，已验证跨月/跨年边界正确（6/1→5/31、3/1→2/28）",
    ],
  },
  {
    date: "2026-06-17",
    version: "v0.7.37",
    tag: "fix",
    items: [
      "修复 AI 日报偶尔出现「不属于当天」的条目：大模型有时会无视 prompt 约束、引用不在输入数据里的旧文章 url（如把前一天已被时间窗口正确排除的内容又写进重点）",
      "生成后增加 url 硬校验：highlights / 国内外动态 / 产品 / 社区 / 论文中，凡 url 不在当天源数据集里的条目一律丢弃，不再依赖模型自觉",
    ],
  },
  {
    date: "2026-06-17",
    version: "v0.7.36",
    tag: "fix",
    items: [
      "修复 AI 日报选取数据用「抓取入库时间」而非「真实发布时间」的问题：此前发布于前一天、但当天才抓到的内容（createdAt 落在当日窗口）会混入日报，导致出现日期对不上的条目",
      "日报数据筛选改为基于 publishedAt（无发布时间时回退到 createdAt），口径与精选页面保持一致",
    ],
  },
  {
    date: "2026-06-16",
    version: "v0.7.35",
    tag: "fix",
    items: [
      "优化媒体卡片尺寸：限制图片/视频卡片最大高度（单张 280px、多张 240px），避免媒体内容撑爆信息流",
      "移除固定宽高比约束（aspect-video/aspect-square），改用自适应裁剪（object-cover），卡片比纯文字略大但适度",
      "适用所有来源（X/Twitter、Bilibili 等），点击仍可全屏查看完整媒体",
    ],
  },
  {
    date: "2026-06-12",
    version: "v0.7.34",
    tag: "tweak",
    items: [
      "优化 AI 日报「今日重点」生成逻辑：避免同一主题（如同一模型的多个相关报道）占据多个重点位，优先覆盖不同领域/公司的重大事件，提升日报内容的多样性和信息密度",
    ],
  },
  {
    date: "2026-06-10",
    version: "v0.7.33",
    tag: "fix",
    items: [
      "修复 AI 日报侧边栏显示「暂无日报」：前端 getRecent API 路径错误（/api/digest 应为 /api/digest/recent），导致日期列表数据无法加载",
      "移除热点雷达未使用的 loadSeq 动画状态及相关代码",
    ],
  },
  {
    date: "2026-06-08",
    version: "v0.7.32",
    tag: "fix",
    items: [
      "修复 AI 日报侧边栏日期列表问题：后端 /api/digest/recent 路由从 @Get() 改为 @Get('recent')，避免拦截其他子路径",
      "AI 日报侧边栏改为动态显示最近 3 个自然月，当月只显示到今天（如 6 月 8 日只显示 1-8 号，不显示未来日期 9-30 号）",
      "过去月份只显示有日报的日期（如 5 月只有 20-31 号有日报，则不显示 1-19 号，避免大片「暂无日报」占据空间）",
      "没有任何日报的月份不可展开，标题置灰且不可点击，保持界面简洁",
    ],
  },
  {
    date: "2026-06-07",
    version: "v0.7.31",
    tag: "tweak",
    items: [
      "热点雷达切换 tab/排序/翻页时，恢复逐卡滑入入场动画（opacity + x 轻微错开），移除整体列表淡入过渡，回到最初的交互节奏",
      "前端 Vite 开发服务器配置 host: 0.0.0.0，支持局域网内手机/平板访问本地开发环境进行移动端测试",
      "后端 AI 调用并发恢复到初始配置（关键词批次并发 15，全局并发 5），移除为规避 Cloudflare 403 临时加的限速策略（已通过切换网络节点解决）",
    ],
  },
  {
    date: "2026-06-06",
    version: "v0.7.30",
    tag: "fix",
    items: [
      "修复 AI 调用被 Cloudflare 403 拦截问题：关键词路径并发从 15 降至 5，批次间加 1 秒延迟，全局并发限制从 5 降至 3",
      "降低瞬时请求峰值，避免触发 Cloudflare WAF 速率限制（特别是香港等节点更严格的规则）",
    ],
  },
  {
    date: "2026-06-05",
    version: "v0.7.29",
    tag: "tweak",
    items: [
      "建立项目规范基线：为热点雷达、AI 日报、精选、关键词监控、Agent 接入五大模块补全结构化规范文档（OpenSpec），包含 40+ 核心需求、128+ 验收场景、7 个架构决策记录（ADR）",
      "规范文档采用 Given/When/Then 格式描述系统行为，明确输入输出、边界条件、错误处理，为后续功能开发、AI 辅助编码、团队协作提供权威依据",
      "技术架构文档记录技术栈选型理由（SQLite vs PostgreSQL、eventKey vs token-md5、批内选主复用等）、性能考量、扩展性路径、已知技术债务",
    ],
  },
  {
    date: "2026-06-05",
    version: "v0.7.28",
    tag: "tweak",
    items: [
      "热点雷达列表切换淡入时长从 0.3s 延长至 0.7s，过渡更柔和舒缓，进一步消除手机端闪烁感",
    ],
  },
  {
    date: "2026-06-05",
    version: "v0.7.27",
    tag: "tweak",
    items: [
      "热点雷达切换 tab / 排序 / 翻页时，列表整体加一段柔和淡入过渡：既给出「已刷新」的视觉反馈（即使首条没变也能感知到列表更新了），又不会像之前那样逐卡闪烁",
    ],
  },
  {
    date: "2026-06-05",
    version: "v0.7.26",
    tag: "fix",
    items: [
      "进一步修复热点雷达手机端切换 tab / 排序时「闪两下」：刷新时不再把整列表替换成加载占位（仅首屏显示），切换时保留旧卡片直到新数据到位",
      "卡片淡入动画只在首屏播放一次，之后切换 tab / 筛选即时渲染，慢速手机不再因动画重播而闪烁",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.25",
    tag: "fix",
    items: [
      "修复热点雷达切换 tab / 排序时消息卡「闪两下」：此前切换会先用旧页码发一次请求、再因页码重置发第二次请求（不在第 1 页时必现），列表被加载态替换两次",
      "改为在切换的同一动作里一次性重置到第 1 页（合并为单次渲染、单次请求），切 tab / 切筛选 / 搜索都只刷新一次",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.24",
    tag: "fix",
    items: [
      "修复旧新闻被当成「刚刚」并永远钉在热点雷达顶部：此前若文章正文 / 搜索摘要里出现「未来日期」（如「自 2026年7月1日起生效」），会被误当成发布时间，导致两个月前的旧闻显示「发布 刚刚」且长期置顶",
      "新鲜度过滤加「未来上限」：发布时间晚于当前（留 1 小时时钟偏移）的条目一律视为日期不可信，直接拦截，不再放行也不再参与排序",
      "日期解析器不再产出未来日期：无年份的中文日期（如「7月1日」）若落到未来，按新闻惯例回退到上一年；正文中的未来「生效日期」不再被当作发布时间",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.23",
    tag: "tweak",
    items: [
      "新增历史重复卡合并脚本(server/src/merge-duplicate-hotspots.ts)：修复 v0.7.21 之前同一事件因并发入库各自成 main 的历史脏数据",
      "脚本逻辑：找出同 clusterKey 有多张 main 的 cluster,按权威度选出唯一 main,其余降级(不删除);默认 dry-run 预览,加 --apply 才写库",
      "幂等可重跑,已正确的不动;使用说明见 server/MERGE_DUPLICATES.md",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.22",
    tag: "fix",
    items: [
      "修复 RSS 源抓到非新闻页的问题：此前 Google News 搜 site:anthropic.com 会把 partnerhub 登录页等门户页当成新闻抓进来(如「Welcome to EULER! - Anthropic」实为合作伙伴门户,非产品发布)",
      "新增非新闻页过滤器：URL 含 /signin、/login、partnerhub. 等模式,或标题含 Welcome to / 欢迎 / 登录 等门户特征的项目,RSS 入库前直接拦截",
      "测试覆盖:7 个单元测试锁定过滤规则,确保正常新闻不误杀、门户页不漏网",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.21",
    tag: "fix",
    items: [
      "修复热点雷达「同一新闻多张消息卡」：此前同一事件因标题措辞不同（如 …in 15 countries / nations / regions）被算成不同聚类，各自独立展示",
      "事件聚类升级为语义指纹：在已有的 AI 分析里顺带让模型输出规范化事件标识（eventKey），同一事件无论标题怎么改写、中英文都归为同一类；模型未返回时自动回退到原标题哈希，不增加任何模型调用与 token",
      "修复关键词来源并发入库时各自成为主卡的问题：同一批内改为统一选出唯一主卡（复用默认来源已有的批内选主逻辑）",
      "列表默认只展示每个事件的主卡，重复来源不再刷屏；按具体来源筛选时仍可看到该来源的全部卡片",
    ],
  },
  {
    date: "2026-06-02",
    version: "v0.7.20",
    tag: "tweak",
    items: [
      "AI 日报所有消息卡（今日重点 / 国内外动态 / 社区热议 / 论文）来源前补上来源图标，并统一显示为可读名称（如 rss_the_decoder → The Decoder），与热点雷达一致",
      "模型情报表格「模型」列过长时截断显示省略号，鼠标悬停可看完整名称，不再撑破表格",
      "强化日报生成 prompt：今日一句话强制简体中文（不再直接照抄英文标题），今日重点每条必须给出「为什么重要」与至少 2 个方向标签",
      "抽出共享的来源图标 / 名称模块（sourceMeta），热点雷达、精选、日报三处复用",
    ],
  },
  {
    date: "2026-06-02",
    version: "v0.7.19",
    tag: "fix",
    items: [
      "修复 AI 日报历史月份无法展开：此前点击「5 月」等往月标题没有反应（折叠逻辑只对默认展开的当月生效），现在任意有日报的往月都能点开下拉查看",
      "往月只列出实际生成了日报的日期，不再混入大片「暂无日报」空行；没有任何日报的月份标题置灰、不可展开",
    ],
  },
  {
    date: "2026-06-02",
    version: "v0.7.18",
    tag: "tweak",
    items: [
      "热点去重升级：事件聚类不再只看标题前 30 字，改为按「标题关键词集合」哈希（中文按字符 bigram，英文按词），措辞 / 语序不同的同一事件能归到一类",
      "新增同事件相似度合并：入库前用 Jaccard 相似度与近 24h 已有热点比对，相似度超阈值的不同来源 / 不同标题报道会并入同一聚类，减少「同一件事多张卡」",
      "阈值保守取值（短标题跳过模糊匹配、相似度需严格超过 0.6），优先避免误合并不同事件；纯本地计算，不调用模型、不消耗 token",
    ],
  },
  {
    date: "2026-05-27",
    version: "v0.7.17",
    tag: "fix",
    items: [
      "修复 AI 日报日期错位：早上 8:00 生成的日报现在以当天日期标记（内容仍是前一天的精选总结），与 TLDR 晨报惯例一致；此前会标记为前一天，导致当天打开「今日日报」显示空白",
    ],
  },
  {
    date: "2026-05-27",
    version: "v0.7.16",
    tag: "feature",
    items: [
      "新增本地一键发版脚本 release.sh：buildx 构建 linux/amd64 镜像 → 推送 Docker Hub → 可选 SSH 自动部署，支持 backend / frontend / nocache 模式",
      "Favicon 重新设计为蓝紫渐变方块 + 白色雷达扫描波，与品牌主色调统一（取代 v0.7.8 的珊瑚橙版）",
    ],
  },
  {
    date: "2026-05-24",
    version: "v0.7.15",
    tag: "feature",
    items: [
      "新增 Docker 一键部署：docker-compose.yml + 前后端 Dockerfile + nginx.conf + 自带 SQLite 备份的 update.sh 脚本",
      "新增生产环境模板 server/.env.production.example",
      "新增 docs/DEPLOY.md 部署文档（含反向代理 / Certbot / 故障排查）",
      "在线域名 aihotradar.com 写入 README、关于页、文章",
    ],
  },
  {
    date: "2026-05-24",
    version: "v0.7.14",
    tag: "fix",
    items: [
      "推理类模型（MiMo / R1）兼容增强：处理被截断的 <think> 块、默认 max_tokens 提升至 1500",
      "新增 AI_MAX_TOKENS 环境变量，可按模型 verbosity 灵活调整（推理模型建议 2500-3000）",
      "AI 客户端超时 30s → 60s，匹配推理模型实际响应时间",
    ],
  },
  {
    date: "2026-05-24",
    version: "v0.7.13",
    tag: "fix",
    items: [
      "修复构建时 CSS @import 顺序警告：Fraunces 字体改用 <link> 加载，dev/build 控制台不再刷红",
    ],
  },
  {
    date: "2026-05-24",
    version: "v0.7.12",
    tag: "fix",
    items: [
      "兼容推理类模型（小米 MiMo、DeepSeek R1 等）：解析前剥离 <think>...</think> 思考块，提高 max_tokens 给推理留余地",
      "AI 解析失败率从「几乎全失败」降到「偶发」，关键词扫描重新可用",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.11",
    tag: "tweak",
    items: [
      "GitHub 仓库迁移至 zenitlab/ai-hot-radar，README、关于页、Agent 接入、文档等链接同步更新",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.10",
    tag: "fix",
    items: [
      "AI 调用增加全局并发限制 + 429 退避重试，避免小米 MiMo 等速率较严格的服务连续被拒",
      "新增环境变量 AI_MAX_CONCURRENT / AI_MAX_RETRIES_429，可按提供商灵活调整",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.9",
    tag: "tweak",
    items: [
      "热点雷达卡片精简徽章：移除「可信」「直接提及/间接相关」等与已有信息重复的标签，从 8 个减至 5 个",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.8",
    tag: "tweak",
    items: [
      "AI 日报自动生成时间从北京时间 00:00 调整为早上 8:00（Asia/Shanghai 时区）",
      "Favicon 更新为珊瑚橙 + 米色雷达信号波，与浅色主题一致",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.7",
    tag: "feature",
    items: [
      "新增国内大模型官方 X 账号订阅：DeepSeek、Kimi（月之暗面）、智谱 Zhipu",
      "「关于」页加入作者微信二维码，方便交流",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.6",
    tag: "feature",
    items: [
      "新增「关于」页：项目介绍、核心能力、数据来源、技术栈、联系方式（邮箱 + 微信二维码）",
      "侧栏「工具」分组下新增「关于」入口",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.5",
    tag: "tweak",
    items: [
      "精选页「今日精选」改为当日精选数（不随 tab 筛选变化），与「今日新增」语义对齐",
      "精选卡专属版式：保留来源 / 分类 / 关键词 / 热度 / 质量分 / 互动数，去掉与精选语义重复的重要性徽章和真伪标签",
      "精选卡来源前补图标（Bing → 🌐 / X → 🐦 等），与热点雷达视觉一致",
      "精选卡 AI 摘要加 Sparkles 图标 + 「AI 摘要」标签 + 左侧蓝条引用块，与热点雷达对齐",
      "精选卡底部「时间」与标签 chip 对齐到同一基线",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.4",
    tag: "feature",
    items: [
      "暗色模式重新校准：画布 #050510 → #0d0e12（去紫调），卡片改为实心 #181b22 配阴影，蓝调主色 #3b82f6 → #60a5fa（更柔和）",
      "精选卡恢复完整信息密度：重要性 / 来源 / 分类 / 关键词 / 热度 / 互动数 / 时间，与热点雷达对齐",
      "AI 日报暂无内容时，底部「前一日 / 后一日」分页紧贴视口底部，不再留下大块空白",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.3",
    tag: "feature",
    items: [
      "新增 3 个一级 RSS 信源：NVIDIA Blog、Meta AI Blog、HuggingFace Daily Papers",
      "AI 评分提示词加入加分信号：顶级实验室署名、SOTA Benchmark 命中、新范式声明",
      "前端 RSS 来源标签同步新增信源的展示名称",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.2",
    tag: "feature",
    items: [
      "精选页顶部加入概览统计：今日新增 / 今日精选 / 关注的关键词",
      "我的关注右侧资讯卡片信息更丰富：来源 · 重要性 · 质量分 + 摘要预览",
      "AI 日报底部分页改为单行紧凑布局，避免空数据状态下占据过大面积",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.1",
    tag: "feature",
    items: [
      "AI 日报「前一日 / 后一日」修复时区跨日导致的日期错位",
      "AI 日报底部分页在「今日尚未生成」状态下也保持可用",
      "AI 日报模型情报表格在移动端改为堆叠卡片，避免横向截断",
      "全站空数据状态加入轻量 SVG 插画（雷达 / 星标 / 日历 / 书签 / 搜索）",
      "侧栏 / 底栏点击当前页签可重置视图状态（如 AI 日报跳回今日）",
      "AI 日报详情页支持「返回顶部」浮动按钮",
      "Loading 样式全站统一（PageLoader / SkeletonList / Skeleton / InlineSpinner）",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.0",
    tag: "feature",
    items: [
      "浅色模式参照 Anthropic 官网风格重新设计：暖米色画布、衬线标题、珊瑚橙主色，沉浸式阅读体验",
      "暗色模式卡片对比度提升，多张卡片堆叠时层次更清晰",
      "AI 日报区块图标从 emoji 升级为带配色徽章的 lucide 图标",
      "Skill / RSS / API tab 选中态优化，配色更精致",
      "热点雷达卡片视觉升级：圆角加大、字号加粗、AI 摘要改为左侧引用块",
      "精选卡 / 今日重点卡升级为阅读式版式：来源 meta 在上、大号标题、宽行距摘要、彩色标签 chip",
    ],
  },
  {
    date: "2026-05-21",
    version: "v0.6.0",
    tag: "feature",
    items: [
      "Agent 接入页改版：Skill / RSS / API 三个 tab 重新设计，加入接入说明与示例",
      "网站 favicon 更换为雷达图标，浏览器标签更易识别",
      "AI 日报生成状态在切换页面后仍保持，回到日报页可继续看到「生成中」提示",
      "全站文档与 README 重写，更聚焦产品本身",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.5.0",
    tag: "feature",
    items: [
      "新增「更新日志」页，按时间记录产品迭代",
      "「我的关注」页默认展开第一个关键词，无需多点一次",
      "左侧栏品牌从 AIHOT 改为 AI ✦ RADAR",
      "顶栏精简：去掉与「立即生成日报」重复的按钮",
      "搜索功能并入「热点雷达」搜索栏，左侧导航更干净",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.4.2",
    tag: "tweak",
    items: [
      "Twitter 来源标签统一显示为 X",
      "同事件下，B 站视频排在文字源后面，先看新闻再看视频",
      "B 站抓取按热度排序并加入质量门槛，过滤低粉低播放视频",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.4.1",
    tag: "feature",
    items: [
      "新增 X 账号订阅通道，覆盖 17 位 AI 头部 KOL，重要更新第一时间到达",
      "新增 RSS 信源：Google DeepMind Blog、Where's Your Ed At、IT之家、雪球",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.4.0",
    tag: "feature",
    items: [
      "AI 评分改为两阶段（便宜模型预筛 + 完整评分），节省调用成本",
      "综合资讯源（IT之家、36氪、财联社等）加入关键词预过滤，跳过非 AI 内容",
      "热点雷达列表标签改为按主题分类（模型 / 产品 / 行业 / 论文），不再按来源国别",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.3.0",
    tag: "tweak",
    items: [
      "Bing 搜索结果加入日期解析，旧文章不再被误判为「紧急」",
      "搜索结果新鲜度收紧，只保留 2 天内的内容",
      "AI 评分提示词加入发布时间上下文，旧内容自动降权",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.5",
    tag: "tweak",
    items: [
      "关键词处理改为并行批处理，扫描速度提升约 5 倍",
      "「立即扫描」改为异步触发：接口立即返回，按钮通过 WebSocket 监听完成",
      "新增扫描进度提示：抓取信息源 → 关键词 i/N → 完成",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.0",
    tag: "feature",
    items: [
      "同事件多源去重时按权威性挑主条（OpenAI 官方博客优先于 V2EX 转发）",
      "默认按真实发布时间排序，不再受数据库写入时间影响",
      "每天凌晨 03:30 自动清理 30 天前的数据，控制本地体积",
    ],
  },
  {
    date: "2026-05-17",
    version: "v0.1.0",
    tag: "feature",
    items: [
      "首个版本上线",
      "支持 RSS、搜索引擎、Twitter 多通道抓取",
      "AI 五维评分 + 来源 tier 加成 + 阈值过滤",
      "包含五大核心视图：热点雷达 / 精选 / AI 日报 / 我的关注 / Agent 接入",
    ],
  },
];

const TAG_STYLES: Record<
  NonNullable<ChangelogEntry["tag"]>,
  { label: string; className: string }
> = {
  feature: {
    label: "新功能",
    className: "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border-[var(--accent-blue)]/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/20",
  },
  fix: {
    label: "修复",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  tweak: {
    label: "优化",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
};

export function ChangelogView() {
  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <History className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          更新日志
        </h1>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        AI Hot Radar 的产品迭代记录，按时间顺序倒排
      </p>

      <div className="relative">
        {/* timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-[var(--card-border)]" />

        <ul className="space-y-6">
          {CHANGELOG.map((entry, i) => (
            <li key={i} className="relative pl-8">
              {/* dot */}
              <span className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)] dark:bg-blue-500 ring-4 ring-[var(--bg-base)]" />

              <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {entry.date}
                  </span>
                  {entry.version && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--input-border)]">
                      {entry.version}
                    </span>
                  )}
                  {entry.tag && (
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md border font-medium",
                        TAG_STYLES[entry.tag].className,
                      )}
                    >
                      {TAG_STYLES[entry.tag].label}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {entry.items.map((item, j) => (
                    <li
                      key={j}
                      className="text-sm text-[var(--text-secondary)] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[var(--accent-blue)]/60 dark:before:text-blue-400/60"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <BackToTop />
    </div>
  );
}
