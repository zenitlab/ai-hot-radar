'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Radio,
  Bookmark,
  Star,
  CalendarDays,
  Plug,
  History,
  Info,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  /** Optional accent color for the icon's idle state — keeps the menu lively
   *  even when no item is active. */
  accent?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "内容",
    items: [
      { path: "/curated", label: "精选", icon: <Star className="w-4 h-4" />, accent: "text-amber-400" },
      { path: "/hotspot", label: "热点雷达", icon: <Radio className="w-4 h-4" />, accent: "text-blue-400" },
      { path: "/digest", label: "AI 日报", icon: <CalendarDays className="w-4 h-4" />, accent: "text-emerald-400" },
      { path: "/keywords", label: "我的关注", icon: <Bookmark className="w-4 h-4" />, accent: "text-purple-400" },
    ],
  },
  {
    label: "工具",
    items: [
      { path: "/agent", label: "Agent 接入", icon: <Plug className="w-4 h-4" />, accent: "text-cyan-400" },
      { path: "/changelog", label: "更新日志", icon: <History className="w-4 h-4" />, accent: "text-pink-400" },
      { path: "/about", label: "关于", icon: <Info className="w-4 h-4" />, accent: "text-slate-400" },
    ],
  },
];

interface SidebarProps {
  unreadCount: number;
  onNavigate?: () => void;
}

/**
 * Brand mark — animated radar dish with sweep beam. Pure SVG, scales cleanly
 * to any size. The sweep arc rotates continuously via Tailwind's spin utility
 * with a custom slow duration.
 */
function BrandMark() {
  return (
    <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-amber)] dark:from-blue-500 dark:to-purple-600 shadow-lg shadow-[var(--accent-blue)]/25">
      <svg viewBox="0 0 32 32" className="w-6 h-6">
        {/* concentric range rings */}
        <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeWidth="1" opacity="0.35" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="white" strokeWidth="1" opacity="0.45" />
        <circle cx="16" cy="16" r="4" fill="none" stroke="white" strokeWidth="1" opacity="0.55" />
        {/* crosshair */}
        <line x1="16" y1="3" x2="16" y2="29" stroke="white" strokeWidth="0.6" opacity="0.25" />
        <line x1="3" y1="16" x2="29" y2="16" stroke="white" strokeWidth="0.6" opacity="0.25" />
        {/* rotating sweep */}
        <g style={{ transformOrigin: "16px 16px", animation: "radar-spin 4s linear infinite" }}>
          <path d="M 16 16 L 16 4 A 12 12 0 0 1 26.4 22 Z" fill="white" opacity="0.55" />
        </g>
        {/* center dot */}
        <circle cx="16" cy="16" r="1.6" fill="white" />
      </svg>
      {/* faint pulse ring */}
      <span className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent-blue)]/30 animate-pulse" />
    </span>
  );
}

export function Sidebar({ unreadCount, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  /** Tapping a nav item that points to the current route should reset its
   *  internal state (e.g. AI 日报 should jump back to today). Next.js's
   *  <Link> swallows same-route navigation, so we broadcast a custom event
   *  that views can subscribe to. */
  const handleClick = (path: string) => {
    if (pathname === path) {
      window.dispatchEvent(new CustomEvent('nav:reset', { detail: { path } }));
    }
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Brand area ─────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-wide bg-gradient-to-r from-[var(--accent-blue)] via-[var(--accent-cyan)] to-[var(--accent-amber)] dark:from-blue-400 dark:via-cyan-400 dark:to-purple-400 bg-clip-text text-transparent">
              AI&nbsp;RADAR
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">
              Hot · Curated · Daily
            </span>
          </div>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => handleClick(item.path)}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all w-full text-left",
                      isActive
                        ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] dark:bg-blue-500/10 dark:text-blue-400 font-medium"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                    )}
                  >
                    {/* Active indicator bar */}
                    <span
                      className={cn(
                        "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full transition-all",
                        isActive ? "bg-[var(--accent-blue)] dark:bg-blue-400" : "bg-transparent",
                      )}
                    />
                    <span
                      className={cn(
                        "transition-colors shrink-0",
                        isActive
                          ? "text-[var(--accent-blue)] dark:text-blue-400"
                          : cn(
                              item.accent ?? "text-[var(--text-muted)]",
                              "opacity-70 group-hover:opacity-100",
                            ),
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer: notifications ───────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--border-subtle)]">
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-sm w-full">
          <Bell className="w-4 h-4" />
          <span>通知</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-[var(--accent-blue)] dark:bg-blue-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
