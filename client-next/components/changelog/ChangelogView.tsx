"use client";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { BackToTop } from "../common/BackToTop";

/**
 * Changelog entries — most recent first.
 *
 * Written for readers, not developers: say what they can now see or do
 * (新信源、新页面、改版、修好了什么), not how it was built. Internal work with
 * no visible effect (refactors, deploy scripts, concurrency tuning) gets no
 * entry. No emoji.
 */
interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  version: string; // required: part of the list key, since several releases can share a date
  tag?: "feature" | "fix" | "tweak";
  /** One line a reader cares about: what they can now see or do. */
  title: string;
  items: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-18",
    version: "v0.22.0",
    tag: "feature",
    title: "可以注册账号了",
    items: [
      "用邮箱和密码注册登录，关注的主题存进账号，换手机、换电脑登录都在；注册前在这台设备上关注的主题会一起带进账号",
      "右上角的账号菜单里可以修改密码、退出登录",
      "不想注册也照样能关注，关注只存在当前浏览器",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.21.0",
    tag: "feature",
    title: "关注你在意的公司和方向",
    items: [
      "主题页每个主题都有「关注」按钮，OpenAI、Anthropic、DeepSeek 这类公司和 Agent、AI 编程这类方向都能关注",
      "「我的关注」新增「我关注的主题」：把关注的主题的最新资讯合在一起按时间排好，每条标出属于哪个主题",
      "不用注册登录，关注记在当前浏览器里；原来的关注对象移到「站长追踪」",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.20.0",
    tag: "tweak",
    title: "资讯页和「我的关注」改版",
    items: [
      "打开一条资讯，左边是导读和阅读原文，右边是同一件事的其他报道、收录它的日报和同类精选；多家报道过的会直接标出「N 家来源报道」",
      "我的关注：左边选公司或产品，右边看它的简介、关系图、近 7 天被提到的次数和最新资讯；点关系图里的名字，资讯会换成和它相关的",
      "关于、Agent 接入和更新日志重新排版，更新日志可以按类型筛选、按月份跳转",
      "资讯的来源名前面加上各家网站的图标，比如 Bing、IT之家、TechCrunch，一眼认出是谁发的",
      "我的关注里每个对象显示得更全：相关产品、标签和最新两条资讯；站长登录入口放在页面上，登录后可以添加、更新和删除关注",
      "换了新的网站图标，和页面左上角的雷达标志一致；转发链接时的预览卡片也换成新配色，事件和资讯卡片上直接显示有几家来源报道",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.19.1",
    tag: "feature",
    title: "标题可以切换看原文",
    items: [
      "顶栏右上角新增「中 / 原」：英文资讯默认显示中文标题，切到「原」就能看到信源自己的原标题，方便对照；选择会记住",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.19.0",
    tag: "fix",
    title: "日报每天准时出，英文资讯补上中文",
    items: [
      "修复日报没有每天早上自动更新的问题，现在 8:05 准时发布；万一生成失败，8:35 和 9:35 会自动再试",
      "少了中文标题或中文摘要的英文资讯，半小时内会补上翻译，产品名和人名保留原文",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.18.2",
    tag: "tweak",
    title: "日报更好读",
    items: [
      "今日重点改成编号列表，每条下面写清为什么重要、还有哪些来源报道",
      "快讯挪到今日重点后面，一打开就能看到当天发生了什么",
      "宽屏时右侧有「本期目录」，点一下跳到对应板块",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.18.1",
    tag: "tweak",
    title: "日报、全部动态换新版式",
    items: [
      "日报、全部动态和主题详情换成和首页一致的新版式",
      "重要程度改用「紧急 / 重要 / 一般 / 较低」，颜色和热度一致，一眼能看出轻重",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.18.0",
    tag: "feature",
    title: "新首页",
    items: [
      "首页顶部新增「此刻在发酵的事」，用热度色条显示正在被多家报道的事件",
      "精选按天分组显示最近 7 天，可以一直往下加载，凌晨打开也不会是空白页",
      "右栏放最新一期日报，以及按公司看动态的入口",
      "热点榜和事件页用同一套热度颜色，事件时间线标出首报和官方来源",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.17.0",
    tag: "feature",
    title: "全站改版：顶部导航和新配色",
    items: [
      "左侧栏换成顶部导航，所有页面都能从顶栏进入；手机上用底部 5 个标签",
      "顶栏显示「几分钟前更新」和下次更新的大概时间，点一下就能刷新",
      "新配色：冷灰绿底配松石绿，浅色和深色都换了，第一次打开跟随系统设置",
      "英文和数字换了更清楚的字体，时间和数字上下对齐",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.16.2",
    tag: "fix",
    title: "站点更安全",
    items: [
      "删除资讯、修改设置、触发扫描和生成日报改为只有站长能操作，此前任何人都能调用",
      "访客页面不再出现这些按钮，避免误点",
    ],
  },
  {
    date: "2026-11-18",
    version: "v0.16.1",
    tag: "tweak",
    title: "主题加上公司标志",
    items: [
      "主题页每张卡片配上图标：OpenAI、Anthropic、Google、DeepSeek、阿里、字节、Kimi、智谱等用各家的标志，技术方向和内容类型也有对应图标",
      "Agent 接入和关于页的介绍更新，写清现在能做什么、有哪些信息源",
    ],
  },
  {
    date: "2026-11-17",
    version: "v0.16.0",
    tag: "feature",
    title: "事件页分清事实和传闻",
    items: [
      "事件概览分成「已确认」「尚未确认」「为什么重要」三组：官方说的或多家一致的算已确认，只有一家说的和传闻放进尚未确认，并写明是谁说的",
      "事件时间线标出「首报」，几乎一样的转载折叠起来，不再刷屏",
      "可以把本站装进 Claude Code 等 AI 助手：发一句话给它就能装好，之后直接问「今天 AI 圈有什么新闻」",
    ],
  },
  {
    date: "2026-11-17",
    version: "v0.15.0",
    tag: "feature",
    title: "新增 30 个信息源",
    items: [
      "官方博客：NVIDIA、PyTorch、Together AI、LangChain、OpenRouter、Microsoft Research、Apple ML Research、Ai2、Sakana AI、Claude.dev 等",
      "分析与工程博客：SemiAnalysis、Epoch AI、ChinaTalk、Platformer、Databricks、Modal、MIT News 等",
      "独立作者：Interconnects、Ahead of AI、Dwarkesh Patel、Gary Marcus、a16z 等",
    ],
  },
  {
    date: "2026-11-17",
    version: "v0.14.0",
    tag: "feature",
    title: "新增热点榜和主题",
    items: [
      "热点榜：过去 48 小时 AI 圈讨论最多的 10 件事，显示热度、来源数和涨跌，标出「爆」「新」「发酵中」",
      "主题：按公司（OpenAI、Anthropic、DeepSeek、通义千问等）、技术方向（Agent、AI 编程、多模态等）和内容类型看近 30 天的动态",
      "关于页写明版权说明：原文版权归各来源，来源方可以发邮件要求更正或下架",
    ],
  },
  {
    date: "2026-11-17",
    version: "v0.13.0",
    tag: "feature",
    title: "日报不漏重要的事",
    items: [
      "日报新增「快讯」：重点之外再列最多 10 条一句话快讯",
      "排序不只看评分，也看有多少家在报道、有没有官方发布；官方发布且多家报道的事一定会进日报",
      "最近 7 天报过的事不再重复出现，除非有了新进展",
      "每条重点下面列出还有哪些来源报道，可以点进事件时间线",
    ],
  },
  {
    date: "2026-11-17",
    version: "v0.12.0",
    tag: "feature",
    title: "摘要更具体，新增 9 个信息源",
    items: [
      "信息源只给了标题或一两句话时（约六成），会先读原文再写摘要和打分，摘要能写出具体事实",
      "新增 Google Research、AWS、Mistral AI、Berkeley AI Research、The Verge、Ars Technica、Simon Willison、Import AI、Latent Space",
      "读原文时遵守对方网站的抓取规则，原文只用来写摘要，不在站内转载",
    ],
  },
  {
    date: "2026-11-16",
    version: "v0.11.0",
    tag: "feature",
    title: "英文资讯有了中文标题",
    items: [
      "英文资讯自动配上中文标题，资讯页同时保留原标题方便对照",
      "多家报道的事件新增「事件概览」，一两段话说清谁做了什么、目前结论是什么",
      "摘要第一句直接说结论，不再用「本文介绍了」开头；原文里没有的产品名、版本号和说法不会写进摘要",
    ],
  },
  {
    date: "2026-11-16",
    version: "v0.10.1",
    tag: "tweak",
    title: "在百度更容易搜到",
    items: [
      "新发布的日报和事件页会主动提交给百度，搜索「AI 日报」等词时更容易找到本站",
    ],
  },
  {
    date: "2026-11-09",
    version: "v0.10.0",
    tag: "feature",
    title: "资讯详情页、多源热议和推荐理由",
    items: [
      "每条资讯有了自己的页面：先看导读、推荐理由和同一件事的其他报道，再决定要不要读原文",
      "每条精选附一句推荐理由，说明能从中了解什么",
      "新增「多源热议」：48 小时内被 2 家以上来源报道的事件按热度排序，点进去看全部报道的时间线",
      "转发资讯或事件链接时，会显示带标题和来源数的预览图",
      "评分更准：例行小更新、营销软文和只有预告的内容会被压分；日报里一件事只出现一次",
    ],
  },
  {
    date: "2026-11-06",
    version: "v0.9.3",
    tag: "tweak",
    title: "更新频率调整",
    items: [
      "白天改为每 30 分钟更新一次，夜间每小时一次",
    ],
  },
  {
    date: "2026-08-07",
    version: "v0.9.1",
    tag: "fix",
    title: "实时推送恢复",
    items: [
      "修复新资讯不能实时推送到页面的问题",
      "打开没有日报的日期时，正常显示「这天没有日报」，不再报错",
    ],
  },
  {
    date: "2026-07-31",
    version: "v0.9.0",
    tag: "tweak",
    title: "日报日期列表更干净",
    items: [
      "日报侧栏只列出真正有日报的日期，不再铺满一整月的「暂无日报」",
      "AI 搜索引擎能更准确地识别每条资讯的标题、来源和发布时间，引用本站时会注明出处",
    ],
  },
  {
    date: "2026-07-30",
    version: "v0.8.9",
    tag: "feature",
    title: "每期日报有了独立网址",
    items: [
      "每天的日报有自己的网址（如 /digest/2026-07-30），可以直接分享某一期",
      "精选、热点和日报打开就能看到内容，不用等页面加载完；搜索引擎和 AI 也能读到全部内容",
      "页面里可以自动发现 RSS 订阅地址",
    ],
  },
  {
    date: "2026-07-27",
    version: "v0.8.8",
    tag: "feature",
    title: "在 AI 搜索里能找到本站",
    items: [
      "豆包、秘塔、百度 AI、ChatGPT Search、Perplexity 等 AI 搜索可以抓取和引用本站内容",
    ],
  },
  {
    date: "2026-07-23",
    version: "v0.8.7",
    tag: "feature",
    title: "新增 Reddit",
    items: [
      "接入 13 个 AI 相关的 Reddit 版块（r/MachineLearning、r/LocalLLaMA、r/OpenAI、r/ClaudeAI 等），可以按版块筛选",
    ],
  },
  {
    date: "2026-07-21",
    version: "v0.8.6",
    tag: "fix",
    title: "细节修复",
    items: [
      "修复展开和收起时页面抖动，图片改为按需加载",
      "按钮和表单补齐读屏软件能读出的说明，系统开了「减少动态效果」时页面会跟着减少动画",
    ],
  },
  {
    date: "2026-07-10",
    version: "v0.8.4",
    tag: "fix",
    title: "夜间也会更新",
    items: [
      "修复深夜 23:50 之后整晚不更新的问题，现在夜间每小时更新一次",
      "手机浏览器顶部和底部的颜色跟随浅色、深色主题",
    ],
  },
  {
    date: "2026-07-08",
    version: "v0.8.3",
    tag: "tweak",
    title: "日报晚 5 分钟出，内容更全",
    items: [
      "日报改到 8:05 生成，先把 8 点这一轮的新资讯收进来，不漏掉凌晨的消息",
    ],
  },
  {
    date: "2026-07-07",
    version: "v0.8.2",
    tag: "feature",
    title: "在搜索引擎里更容易找到",
    items: [
      "每个页面都有准确的标题和简介，分享到社交平台时显示预览卡片",
    ],
  },
  {
    date: "2026-06-17",
    version: "v0.7.38",
    tag: "fix",
    title: "日报日期修正",
    items: [
      "修复日报汇总的是前天而不是昨天的内容，之前会出现几天前的旧闻反复上日报",
      "日报只收录当天发布的资讯，不再混入前一天的内容",
    ],
  },
  {
    date: "2026-06-16",
    version: "v0.7.35",
    tag: "tweak",
    title: "图片和视频不再撑满屏幕",
    items: [
      "资讯里的图片和视频限制了高度，信息流更紧凑，点击仍可全屏查看",
    ],
  },
  {
    date: "2026-06-12",
    version: "v0.7.34",
    tag: "tweak",
    title: "日报重点更多样",
    items: [
      "今日重点不再被同一件事的多篇报道占满，优先覆盖不同公司和领域",
    ],
  },
  {
    date: "2026-06-08",
    version: "v0.7.32",
    tag: "fix",
    title: "日报日期列表修复",
    items: [
      "修复日报侧栏显示「暂无日报」的问题；侧栏只显示最近 3 个月，不再列出未来的日期",
    ],
  },
  {
    date: "2026-06-05",
    version: "v0.7.26",
    tag: "fix",
    title: "切换标签不再闪",
    items: [
      "热点雷达切换标签、排序和翻页时，列表不再闪两下，旧内容会保留到新内容加载好",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.24",
    tag: "fix",
    title: "旧新闻不再置顶",
    items: [
      "修复两个月前的旧闻显示「刚刚」并一直排在最上面的问题",
      "过滤掉合作伙伴门户、登录页这类不是新闻的页面",
    ],
  },
  {
    date: "2026-06-04",
    version: "v0.7.21",
    tag: "fix",
    title: "同一件事只显示一张卡",
    items: [
      "同一事件的不同报道（包括中英文、标题写法不同的）会合并成一张卡，不再刷屏；按具体来源筛选时仍能看到全部报道",
    ],
  },
  {
    date: "2026-06-02",
    version: "v0.7.20",
    tag: "tweak",
    title: "日报显示来源",
    items: [
      "日报里每条内容前面显示来源图标和名称",
      "今日一句话总结一律用中文，每条重点写明为什么重要",
    ],
  },
  {
    date: "2026-06-02",
    version: "v0.7.19",
    tag: "fix",
    title: "往期日报可以展开",
    items: [
      "修复点击往月日报没有反应的问题",
    ],
  },
  {
    date: "2026-05-27",
    version: "v0.7.17",
    tag: "fix",
    title: "今天的日报标今天的日期",
    items: [
      "早上发布的日报标为当天日期，打开「今日日报」不再是空白",
    ],
  },
  {
    date: "2026-05-27",
    version: "v0.7.16",
    tag: "tweak",
    title: "新的网站图标",
    items: [
      "网站图标换成蓝紫色雷达",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.9",
    tag: "tweak",
    title: "资讯卡片更简洁",
    items: [
      "热点卡片去掉和其他信息重复的标签，从 8 个减到 5 个",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.8",
    tag: "tweak",
    title: "日报改为早上 8 点发布",
    items: [
      "日报从半夜 12 点改到早上 8 点发布，起床就能看",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.7",
    tag: "feature",
    title: "新增国内大模型官方账号",
    items: [
      "订阅 DeepSeek、Kimi、智谱的官方 X 账号",
      "关于页加上作者微信二维码",
    ],
  },
  {
    date: "2026-05-23",
    version: "v0.7.6",
    tag: "feature",
    title: "新增关于页",
    items: [
      "介绍这个站能做什么、内容从哪里来，以及怎么联系作者",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.3",
    tag: "feature",
    title: "新增 3 个信息源",
    items: [
      "NVIDIA Blog、Meta AI Blog、HuggingFace 每日论文",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.1",
    tag: "tweak",
    title: "日报体验改进",
    items: [
      "日报的「前一日 / 后一日」日期修正，手机上模型情报表格不再被截断",
      "再点一次当前页面的标签可以回到初始状态，比如日报跳回今天",
    ],
  },
  {
    date: "2026-05-22",
    version: "v0.7.0",
    tag: "feature",
    title: "新的浅色模式",
    items: [
      "浅色模式重新设计，暖米色背景，阅读更舒服；深色模式卡片层次更清楚",
    ],
  },
  {
    date: "2026-05-21",
    version: "v0.6.0",
    tag: "feature",
    title: "Agent 接入页改版",
    items: [
      "Skill、RSS、API 三种接入方式重新整理，附上说明和示例",
      "网站换上雷达图标，浏览器标签更好认",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.5.0",
    tag: "feature",
    title: "新增更新日志",
    items: [
      "新增这个页面，记录每次上线了什么",
      "搜索并入热点雷达的搜索栏",
    ],
  },
  {
    date: "2026-05-20",
    version: "v0.4.1",
    tag: "feature",
    title: "新增 X 账号和 4 个信息源",
    items: [
      "订阅 17 位 AI 领域头部人物的 X 账号",
      "新增 Google DeepMind Blog、Where's Your Ed At、IT之家、雪球",
      "同一件事里，B 站视频排在文字报道后面；低质量视频会被过滤",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.4.0",
    tag: "tweak",
    title: "按主题分类",
    items: [
      "热点按模型、产品、行业、论文分类浏览",
      "综合新闻源里和 AI 无关的内容会被跳过",
    ],
  },
  {
    date: "2026-05-19",
    version: "v0.3.0",
    tag: "fix",
    title: "旧文章不再标成紧急",
    items: [
      "搜索结果只保留 2 天内的内容，旧文章不会再被标成「紧急」",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.5",
    tag: "tweak",
    title: "扫描更快，能看到进度",
    items: [
      "扫描速度提升约 5 倍，扫描时显示进度",
    ],
  },
  {
    date: "2026-05-18",
    version: "v0.2.0",
    tag: "feature",
    title: "同一件事优先显示官方来源",
    items: [
      "同一件事有多家报道时，优先显示官方或权威来源",
      "按真实发布时间排序",
    ],
  },
  {
    date: "2026-05-17",
    version: "v0.1.0",
    tag: "feature",
    title: "AI 热点雷达上线",
    items: [
      "从 RSS、搜索引擎和 X 抓取 AI 资讯，AI 评分筛出值得看的内容",
      "热点雷达、精选、AI 日报、我的关注、Agent 接入五个页面",
    ],
  },
];

type Tag = NonNullable<ChangelogEntry["tag"]>;

const TAGS: { tag: Tag; label: string; color: string }[] = [
  { tag: "feature", label: "新功能", color: "var(--accent-blue)" },
  { tag: "tweak", label: "优化", color: "var(--accent-amber)" },
  { tag: "fix", label: "修复", color: "var(--accent-red)" },
];
const TAG = Object.fromEntries(TAGS.map((t) => [t.tag, t])) as Record<Tag, (typeof TAGS)[number]>;

const WEEK = "日一二三四五六";
function dayLabel(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return { date: `${y} 年 ${m} 月 ${day} 日`, weekday: `周${WEEK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]}` };
}

/** Consecutive entries sharing a date (the list is newest first). */
function groupByDate(entries: ChangelogEntry[]) {
  const groups: { date: string; entries: ChangelogEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last?.date === e.date) last.entries.push(e);
    else groups.push({ date: e.date, entries: [e] });
  }
  return groups;
}

const MONTHS = (() => {
  const m = new Map<string, { count: number; firstDate: string }>();
  for (const e of CHANGELOG) {
    const key = e.date.slice(0, 7);
    const cur = m.get(key);
    if (cur) cur.count++;
    else m.set(key, { count: 1, firstDate: e.date });
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v }));
})();

const RAIL_CARD = "rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-4";

export function ChangelogView() {
  const [filter, setFilter] = useState<Tag | "all">("all");
  const shown = filter === "all" ? CHANGELOG : CHANGELOG.filter((e) => e.tag === filter);
  const groups = groupByDate(shown);
  const count = (t: Tag) => CHANGELOG.filter((e) => e.tag === t).length;

  const jumpTo = (date: string) => {
    setFilter("all");
    // Wait for the unfiltered list to render before scrolling.
    requestAnimationFrame(() => document.getElementById(`d-${date}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:pt-8">
      <div className="min-w-0">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold">更新日志</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">新功能、优化和修复都记在这里，最新的在最上面。</p>
        </header>

        {/* Type filter for narrow screens; the rail has the same control on wide ones. */}
        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {[{ tag: "all" as const, label: "全部" }, ...TAGS].map((t) => (
            <button
              key={t.tag}
              type="button"
              aria-pressed={filter === t.tag}
              onClick={() => setFilter(t.tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px]",
                filter === t.tag
                  ? "border-[var(--accent-blue)] font-semibold text-[var(--accent-blue)]"
                  : "border-[var(--card-border)] text-[var(--text-secondary)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {groups.map((g) => {
            const { date, weekday } = dayLabel(g.date);
            return (
              <section
                key={g.date}
                id={`d-${g.date}`}
                aria-label={`${date} ${weekday}`}
                className="scroll-mt-6 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 sm:px-6"
              >
                <h2 className="flex items-baseline gap-2.5 border-b border-[var(--border-subtle)] py-4">
                  <time dateTime={g.date} className="text-lg font-bold tabular-nums sm:text-xl">{date}</time>
                  <span className="text-sm text-[var(--text-muted)]">{weekday}</span>
                </h2>
                {g.entries.map((entry) => {
                  const tag = entry.tag ? TAG[entry.tag] : null;
                  return (
                    <article
                      key={entry.version}
                      className="grid gap-x-6 gap-y-2 border-b border-[var(--border-subtle)] py-4 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)]"
                    >
                      <div className="flex items-baseline gap-3 sm:block">
                        <p className="text-[15px] font-bold tabular-nums">{entry.version}</p>
                        {tag && (
                          <p className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] sm:mt-1">
                            <i className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} aria-hidden="true" />
                            {tag.label}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold leading-snug">{entry.title}</h3>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-[var(--text-secondary)] marker:text-[var(--text-muted)]">
                          {entry.items.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>

      <aside className="hidden space-y-4 lg:block lg:sticky lg:top-6 lg:self-start" aria-label="筛选与跳转">
        <section className={RAIL_CARD}>
          <h2 className="mb-2 text-[15px] font-bold">按类型看</h2>
          <ul>
            {[{ tag: "all" as const, label: "全部", color: "var(--text-muted)", n: CHANGELOG.length }, ...TAGS.map((t) => ({ ...t, n: count(t.tag) }))].map((t) => (
              <li key={t.tag}>
                <button
                  type="button"
                  aria-pressed={filter === t.tag}
                  onClick={() => setFilter(t.tag)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
                    filter === t.tag ? "bg-[var(--bg-elevated)] font-semibold" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                  )}
                >
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                  {t.label}
                  <span className="ml-auto tabular-nums text-[var(--text-muted)]">{t.n}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={RAIL_CARD}>
          <h2 className="mb-2 text-[15px] font-bold">按月份</h2>
          <ul>
            {MONTHS.map((m) => {
              const [y, mo] = m.key.split("-").map(Number);
              return (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => jumpTo(m.firstDate)}
                    className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    {y} 年 {mo} 月
                    <span className="ml-auto tabular-nums text-[var(--text-muted)]">{m.count} 次更新</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={RAIL_CARD}>
          <h2 className="mb-1 text-[15px] font-bold">有想法或遇到问题</h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            想要的功能、用着不顺的地方，欢迎发邮件到{" "}
            <a href="mailto:gundam_zzc@126.com" className="text-[var(--accent-blue)] hover:underline">gundam_zzc@126.com</a>
            ，或在 GitHub 提 issue。
          </p>
        </section>
      </aside>

      <BackToTop />
    </div>
  );
}
