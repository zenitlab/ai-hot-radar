import { useState } from 'react';
import { Plug, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

type AgentTab = 'skill' | 'rss' | 'api';

const BASE_URL = window.location.origin;
const RSS_FEEDS = [
  { label: '精选资讯 RSS', url: `${BASE_URL}/api/agent/rss/curated.xml`, desc: '经质量评分筛选的精选内容' },
  { label: '全部资讯 RSS', url: `${BASE_URL}/api/agent/rss/all.xml`, desc: '全部 AI 相关资讯' },
  { label: 'AI 日报 RSS', url: `${BASE_URL}/api/agent/rss/digest.xml`, desc: '每日 AI 行业日报' },
];

const API_DOCS = [
  { method: 'GET', path: '/api/agent/curated', desc: '获取精选资讯 JSON', params: 'limit, offset' },
  { method: 'GET', path: '/api/agent/digest', desc: '获取 AI 日报 JSON', params: 'date (YYYY-MM-DD)' },
  { method: 'GET', path: '/api/agent/search', desc: '关键词搜索资讯', params: 'q, limit' },
  { method: 'GET', path: '/api/agent/stats', desc: '系统统计数据', params: '' },
  { method: 'GET', path: '/aihot-skill', desc: 'Skill 描述 JSON', params: '' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function AgentView() {
  const [activeTab, setActiveTab] = useState<AgentTab>('skill');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Plug className="w-5 h-5 text-blue-400" />
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Agent 接入</h1>
      </div>

      {/* Tab */}
      <div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-lg mb-6 w-fit">
        {(['skill', 'rss', 'api'] as AgentTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm transition-colors',
              activeTab === tab ? 'bg-blue-500 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'skill' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <h2 className="font-semibold text-[var(--text-primary)] mb-2">安装 AIHOT Skill</h2>
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
              <code className="flex-1 text-sm text-blue-400">帮我安装这个 skill：{BASE_URL}/aihot-skill</code>
              <CopyButton text={`帮我安装这个 skill：${BASE_URL}/aihot-skill`} />
            </div>
          </div>
          {[
            { icon: '📅', title: 'AI 日报', desc: '获取今日或指定日期的 AI 行业日报，包含模型、产品、行业、论文等分类。', example: '给我一份今天的 AI 日报' },
            { icon: '📰', title: '精选模式', desc: '获取经质量评分精选的 AI 资讯，按重要度排序。', example: '看看最新的精选 AI 资讯' },
            { icon: '🔍', title: '分类/时间查询', desc: '按内容分类（模型/产品/行业/论文）或时间范围查询资讯。', example: '最近3天有哪些新模型发布' },
            { icon: '🔎', title: '关键词搜索', desc: '在所有资讯中搜索包含特定关键词的内容。', example: 'Claude 最近有什么新动态' },
          ].map(cap => (
            <div key={cap.title} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{cap.icon}</span>
                <h3 className="font-medium text-[var(--text-primary)]">{cap.title}</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">{cap.desc}</p>
              <code className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded">{cap.example}</code>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rss' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] mb-4">适合 RSS 阅读器（Feedly、Inoreader 等）订阅。</p>
          {RSS_FEEDS.map(feed => (
            <div key={feed.url} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-[var(--text-primary)]">{feed.label}</h3>
                <div className="flex items-center gap-1">
                  <CopyButton text={feed.url} />
                  <a href={feed.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{feed.desc}</p>
              <code className="text-xs text-blue-400/80 break-all">{feed.url}</code>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'api' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] mb-4">全部接口无需认证，JSON 格式返回。</p>
          {API_DOCS.map(api => (
            <div key={api.path} className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">{api.method}</span>
                <code className="text-sm text-blue-400">{api.path}</code>
                <CopyButton text={`${BASE_URL}${api.path}`} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">{api.desc}</p>
              {api.params && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">参数：{api.params}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
