const API_BASE = '/api';

export interface Keyword {
  id: string;
  text: string;
  category: string | null;
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
  sourceId: string | null;
  isReal: boolean;
  relevance: number;
  relevanceReason: string | null;
  keywordMentioned: boolean | null;
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string | null;
  viewCount: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  commentCount: number | null;
  quoteCount: number | null;
  danmakuCount: number | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorFollowers: number | null;
  authorVerified: boolean | null;
  publishedAt: string | null;
  createdAt: string;
  keyword: { id: string; text: string; category: string | null } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  hotspotId: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  today: number;
  urgent: number;
  bySource: Record<string, number>;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Keywords API
export const keywordsApi = {
  getAll: () => request<Keyword[]>('/keywords'),
  
  getById: (id: string) => request<Keyword>(`/keywords/${id}`),
  
  create: (data: { text: string; category?: string }) => 
    request<Keyword>('/keywords', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: Partial<Keyword>) => 
    request<Keyword>(`/keywords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) => 
    request<void>(`/keywords/${id}`, { method: 'DELETE' }),
  
  toggle: (id: string) => 
    request<Keyword>(`/keywords/${id}/toggle`, { method: 'PATCH' })
};

// Hotspots API
export const hotspotsApi = {
  getAll: (params?: { 
    page?: number; 
    limit?: number; 
    source?: string; 
    importance?: string; 
    keywordId?: string;
    isReal?: string;
    timeRange?: string;
    timeFrom?: string;
    timeTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.append(key, String(value));
      });
    }
    return request<{ data: Hotspot[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/hotspots?${searchParams}`
    );
  },
  
  getStats: () => request<Stats>('/hotspots/stats'),
  
  getById: (id: string) => request<Hotspot>(`/hotspots/${id}`),
  
  search: (query: string, sources?: string[]) => 
    request<{ results: Hotspot[] }>('/hotspots/search', {
      method: 'POST',
      body: JSON.stringify({ query, sources })
    }),
  
  delete: (id: string) => 
    request<void>(`/hotspots/${id}`, { method: 'DELETE' })
};

// Notifications API
const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request<{ data: Notification[]; unreadCount: number; pagination: any }>(
      `/notifications?${searchParams}`
    );
  },
  
  markAsRead: (id: string) => 
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  
  markAllAsRead: () => 
    request<void>('/notifications/read-all', { method: 'PATCH' }),
  
  delete: (id: string) => 
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),
  
  clear: () => 
    request<void>('/notifications', { method: 'DELETE' })
};

// Settings API
const settingsApi = {
  getAll: () => request<Record<string, string>>('/settings'),
  
  update: (settings: Record<string, string>) => 
    request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
};

// Manual trigger
export const triggerHotspotCheck = () =>
  request<{ message: string; isScanning: boolean; lastScanStartedAt?: string; lastScanFinishedAt?: string }>(
    '/check-hotspots',
    { method: 'POST' },
  );

export const getScanStatus = () =>
  request<{
    isScanning: boolean;
    lastScanStartedAt: string | null;
    lastScanFinishedAt: string | null;
    lastScanError: string | null;
  }>('/scan-status');

// Curated
export const curatedApi = {
  getAll: (
    period: 'today' | 'week' = 'today',
    limit = 20,
    offset = 0,
    opts: { category?: string; region?: string; search?: string } = {},
  ) => {
    const params = new URLSearchParams({ period, limit: String(limit), offset: String(offset) });
    if (opts.category) params.set('category', opts.category);
    if (opts.region) params.set('region', opts.region);
    if (opts.search) params.set('search', opts.search);
    return fetch(`/api/curated?${params}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    });
  },
};

// Digest
export const digestApi = {
  getToday: () => fetch('/api/digest/today').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
  // Returns null when the digest doesn't exist yet for a given date (404 is expected).
  getByDate: (date: string) => fetch(`/api/digest/${date}`).then(r => r.ok ? r.json() : null),
  getRecent: () => fetch('/api/digest/recent').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
  generate: (date?: string) =>
    fetch(`/api/digest/generate${date ? `?date=${date}` : ''}`, { method: 'POST' }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),
};

// Chat sessions
const chatApi = {
  createSession: (title?: string) =>
    fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),
  getSessions: () => fetch('/api/chat/sessions').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
  deleteSession: (id: string) =>
    fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),
  getMessages: (sessionId: string) =>
    fetch(`/api/chat/sessions/${sessionId}/messages`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),
};

// Entities (My Follows knowledge cards)
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  createdAt: string;
  publishedAt?: string;
  summary: string | null;
  importance?: 'low' | 'medium' | 'high' | 'urgent';
  qualityScore?: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface EntityRelationItem {
  id: string;
  fromName: string;
  toName: string;
  relation: string;
}

export interface RelatedData {
  type: string;
  summary: string;
  relatedCompanies: string[];
  relatedModels: string[];
  relatedProducts: string[];
  competesWith: string[];
  aliases: string[];
  tags: string[];
}

export interface EntityCardSummary {
  id: string;
  keywordId: string;
  name: string;
  type: string | null;
  summary: string | null;
  relatedData: string | null; // JSON string
  lastRefresh: string;
  createdAt: string;
  keyword: { id: string; text: string; isActive: boolean };
  todayMentions: number;
  latestNews: NewsItem[];
}

export interface EntityCardDetail extends EntityCardSummary {
  trend: TrendPoint[];
  relations: EntityRelationItem[];
}

export interface GraphNode {
  name: string;
  type: string;
  isTracked: boolean;
}

export interface GraphEdge {
  id: string;
  fromName: string;
  toName: string;
  relation: string;
}

export const entitiesApi = {
  getAll: () => request<EntityCardSummary[]>('/entities'),
  getOne: (id: string) => request<EntityCardDetail>(`/entities/${id}`),
  getGraph: () => request<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/entities/graph'),
  refresh: (id: string) =>
    request<EntityCardSummary>(`/entities/${id}/refresh`, { method: 'POST' }),
  getNewsForName: (name: string, limit = 6) =>
    request<NewsItem[]>(`/entities/news?name=${encodeURIComponent(name)}&limit=${limit}`),
};

// Agent
const agentApi = {
  getCurated: (limit = 20) => fetch(`/api/agent/curated?limit=${limit}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
  search: (q: string) => fetch(`/api/agent/search?q=${encodeURIComponent(q)}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
  getStats: () => fetch('/api/agent/stats').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    return r.json();
  }),
};
