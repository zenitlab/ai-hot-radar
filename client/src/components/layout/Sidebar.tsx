import { NavLink } from "react-router-dom";
import {
  Bell,
  Radio,
  Bookmark,
  Star,
  CalendarDays,
  Plug,
  Flame,
  History,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/curated", label: "精选", icon: <Star className="w-4 h-4" /> },
  { path: "/hotspot", label: "热点雷达", icon: <Radio className="w-4 h-4" /> },
  {
    path: "/digest",
    label: "AI 日报",
    icon: <CalendarDays className="w-4 h-4" />,
  },
  { path: "/agent", label: "Agent 接入", icon: <Plug className="w-4 h-4" /> },
  {
    path: "/keywords",
    label: "我的关注",
    icon: <Bookmark className="w-4 h-4" />,
  },
  {
    path: "/changelog",
    label: "更新日志",
    icon: <History className="w-4 h-4" />,
  },
];

interface SidebarProps {
  unreadCount: number;
  onNavigate?: () => void;
}

export function Sidebar({ unreadCount, onNavigate }: SidebarProps) {
  return (
    <div className="flex flex-col h-full px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-6">
        <Flame className="w-6 h-6 text-blue-400" />
        <span className="text-lg font-bold text-[var(--text-primary)]">
          AI * RADAR
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left",
                isActive
                  ? "bg-blue-500/15 text-blue-400 font-medium"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-sm">
        <Bell className="w-4 h-4" />
        <span>通知</span>
        {unreadCount > 0 && (
          <span className="ml-auto text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
