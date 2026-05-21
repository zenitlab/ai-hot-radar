import { History } from "lucide-react";
import { cn } from "../../lib/utils";

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
    date: "2026-05-20",
    version: "v0.5.0",
    tag: "feature",
    items: [
      "左侧栏品牌从 AIHOT 改为 AI * RADAR",
      "新增更新日志页",
      "我的关注页默认展开第一个关键词",
      '隐藏顶栏冗余的"生成日报"按钮（与"立即生成日报"重复）',
      '移除左侧"搜索"入口（功能合并到热点雷达搜索栏）',
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.4.2",
    tag: "tweak",
    items: [
      "Twitter 来源标签改为 X（与 x.com 跳转一致）",
      "同事件多卡片中，B 站视频排在文字源后面",
      "B 站抓取按 totalrank 排序 + 质量过滤（粉丝/播放/点赞门槛）",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.4.1",
    tag: "feature",
    items: [
      "新增 X 账号订阅通道（17 个 KOL 直接拉最新推文）",
      "新增 RSS 源：Google DeepMind Blog、Where's Your Ed At、IT之家、雪球",
      "从 AIHOT 反推补齐主流信源",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.4.0",
    tag: "feature",
    items: [
      "AI 评分改为两阶段：便宜模型预筛 + 完整评分",
      "关键词预过滤跳过非 AI 内容（IT之家/36氪/财联社等综合源）",
      "热点雷达列表标签按发布主题分类（不再按来源国别）",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.3.0",
    tag: "tweak",
    items: [
      "Bing 搜索结果增加日期解析，旧文章不再误判 urgent",
      "搜索结果新鲜度过滤收紧（只保留 2 天内）",
      "AI 评分 prompt 加入发布时间上下文，旧内容自动降权",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.5",
    tag: "tweak",
    items: [
      "关键词处理从串行改成并行批处理（5 倍加速）",
      '"立即扫描" 改成异步触发（接口立即返回，按钮通过 WebSocket 监听完成）',
      "新增扫描进度事件：抓取信息源 → 关键词 i/N → 完成",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.0",
    tag: "feature",
    items: [
      "同一事件多源去重时，按权威性挑主条（OpenAI Blog 优于 V2EX 转发）",
      "默认排序按真实发布时间，而非数据库写入时间",
      "每天凌晨 03:30 自动清理 30 天前的数据",
    ],
  },
  {
    date: "2026-05-17",
    version: "v0.1.0",
    tag: "feature",
    items: [
      "初始版本：RSS / 搜索源 / Twitter 多通道抓取",
      "AI 五维评分 + tier 加成 + 阈值过滤",
      "热点雷达 / 精选 / AI 日报 / 我的关注 / Agent 接入",
    ],
  },
];

const TAG_STYLES: Record<
  NonNullable<ChangelogEntry["tag"]>,
  { label: string; className: string }
> = {
  feature: {
    label: "新功能",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
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
      <div className="flex items-center gap-2 mb-2">
        <History className="w-5 h-5 text-blue-400" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          更新日志
        </h1>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        按时间顺序记录产品的更新内容
      </p>

      <div className="relative">
        {/* timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-[var(--card-border)]" />

        <ul className="space-y-6">
          {CHANGELOG.map((entry, i) => (
            <li key={i} className="relative pl-8">
              {/* dot */}
              <span className="absolute left-[3px] top-2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[var(--bg-base)]" />

              <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-5">
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
                      className="text-sm text-[var(--text-secondary)] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-blue-400/60"
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
    </div>
  );
}
