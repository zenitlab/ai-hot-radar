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
