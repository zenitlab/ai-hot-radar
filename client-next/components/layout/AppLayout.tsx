'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { Bookmark, CalendarDays, Flame, Shapes, Star } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import { SiteHeader, isActive } from './SiteHeader';
import { FollowSync } from '../follows/FollowSync';

interface AppLayoutProps {
  unreadCount: number;
  children: React.ReactNode;
}

/** Phone tab bar: the five places people go most. Everything else is in the header menu. */
const MOBILE_TABS = [
  { path: '/curated', label: '精选', Icon: Star },
  { path: '/hot', label: '热点', Icon: Flame },
  { path: '/digest', label: '日报', Icon: CalendarDays },
  { path: '/topics', label: '主题', Icon: Shapes },
  { path: '/keywords', label: '关注', Icon: Bookmark },
];

/**
 * Page shell: top navigation, a scrolling content area, and on phones a
 * bottom tab bar. See DESIGN.md for the layout rules.
 */
export function AppLayout({ unreadCount, children }: AppLayoutProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Disables Framer Motion animations under prefers-reduced-motion (WCAG 2.3.3). */}
      <MotionConfig reducedMotion="user">
        <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
          <SiteHeader theme={theme} onThemeToggle={toggleTheme} unreadCount={unreadCount} />
          <FollowSync />

          <main className="flex-1 overflow-y-scroll pb-16 lg:pb-0">{children}</main>

          <nav
            aria-label="主要页面"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            {MOBILE_TABS.map(({ path, label, Icon }) => {
              const active = isActive(pathname, path);
              return (
                // A real link, not a button + router.push: it still navigates
                // before hydration or if client JS is stale/broken, and Next
                // prefetches it.
                <Link
                  key={path}
                  href={path}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    // Tapping the current tab resets that view (e.g. 日报 back to today).
                    if (pathname === path) {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('nav:reset', { detail: { path } }));
                    }
                  }}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs',
                    active ? 'font-semibold text-[var(--accent-blue)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
