// Hotspot source type — keyword-based or rss_xxx
export type HotspotSource =
  | 'twitter' | 'bing' | 'google' | 'sogou' | 'bilibili' | 'weibo' | 'hackernews'
  | `rss_${string}`;

export type Importance = 'low' | 'medium' | 'high' | 'urgent';
export type HotspotCategory = 'model' | 'product' | 'industry' | 'research' | 'community' | 'tips';
export type HotspotRegion = 'domestic' | 'international';
export type HotspotTab = 'all' | HotspotCategory | 'domestic' | 'international';

export interface MediaItem {
  type: 'photo' | 'video' | 'gif';
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
}

export interface Keyword {
  id: string;
  text: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { hotspots: number };
}

export interface Hotspot {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sourceId?: string;
  isReal: boolean;
  relevance: number;
  relevanceReason?: string;
  keywordMentioned?: boolean;
  importance: Importance;
  summary?: string;
  /** 中文标题：点出主体；没有时回退到 title（见 lib/utils 的 displayTitle） */
  titleZh?: string | null;
  /** 推荐理由：读者能据此了解或做什么 */
  recommendReason?: string | null;
  // New scoring fields
  category?: HotspotCategory;
  region?: HotspotRegion;
  sourceTier?: string;
  qualityScore?: number;
  isCurated?: boolean;
  tags?: string; // JSON array string
  clusterKey?: string;
  isClusterMain?: boolean;
  // Engagement
  viewCount?: number;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  commentCount?: number;
  quoteCount?: number;
  danmakuCount?: number;
  favoritesCount?: number;
  // Author
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorFollowers?: number;
  authorVerified?: boolean;
  // Bilibili
  biliCategory?: string;
  biliTags?: string;
  // Media (X/Twitter photos & videos, parsed from JSON by API)
  media?: MediaItem[] | null;
  // Timestamps
  publishedAt?: string;
  createdAt: string;
  keyword?: { id: string; text: string; category?: string };
}

export interface Stats {
  total: number;
  today: number;
  urgent: number;
  bySource: Record<string, number>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  hotspotId?: string;
  createdAt: string;
}

// Chat types
export interface ChatSession {
  id: string;
  title?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// Digest types
export interface DigestHighlight {
  title: string;
  summary: string;
  whyImportant: string;
  affects: string[];
  source: string;
  url: string;
  /** Present when other sources covered the same event. */
  event?: { key: string; otherSources: string[] };
}

/** 快讯: one-line entries after the main digest. */
export interface DigestBrief {
  title: string;
  source: string;
  url: string;
  /** Event page key when 2+ sources covered it. */
  storyKey?: string;
}

export interface DigestSimpleItem {
  title: string;
  summary: string;
  source: string;
  url: string;
}

export interface DigestModelItem {
  model: string;
  change: string;
  detail: string;
  impact: string;
}

export interface DigestPaperItem {
  title: string;
  summary: string;
  impact: string;
  source: string;
  url: string;
}

export interface DigestData {
  summary: string;
  highlights: DigestHighlight[];
  domestic: DigestSimpleItem[];
  international: DigestSimpleItem[];
  modelIntel: DigestModelItem[];
  products: DigestSimpleItem[];
  community: DigestSimpleItem[];
  papers: DigestPaperItem[];
  /** Absent on digests made before v0.13.0. */
  briefs?: DigestBrief[];
  generatedAt?: string;
  itemCount?: number;
}

export interface DailyDigest {
  date: string;
  data: DigestData;
  createdAt?: string;
}

// Navigation
export type SidebarView =
  | 'curated' | 'chat' | 'digest' | 'agent'
  | 'hotspot' | 'keywords' | 'search';
