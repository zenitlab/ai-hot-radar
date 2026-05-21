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
        AI Hot Radar 的产品迭代记录，按时间顺序倒排
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
