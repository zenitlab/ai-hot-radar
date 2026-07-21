'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { m, AnimatePresence, LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import { X, Star, Radio, Bookmark, CalendarDays } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useTheme } from '@/providers/ThemeProvider';

interface AppLayoutProps {
  unreadCount: number;
  children: React.ReactNode;
}

const MOBILE_NAV = [
  { path: '/curated',  label: '精选', Icon: Star },
  { path: '/hotspot',  label: '热点', Icon: Radio },
  { path: '/keywords', label: '关注', Icon: Bookmark },
  { path: '/digest',   label: '日报', Icon: CalendarDays },
];

export function AppLayout({ unreadCount, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <LazyMotion features={domAnimation} strict>
    {/* MotionConfig automatically disables all Framer Motion animations when
        the user has "prefers-reduced-motion: reduce" set in their OS (WCAG 2.3.3). */}
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <Sidebar unreadCount={unreadCount} />
      </aside>

      {/* Mobile Sidebar Drawer with smooth slide animation */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop with fade */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer with slide */}
            <m.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative flex flex-col w-60 h-full bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] shadow-2xl"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
              <Sidebar unreadCount={unreadCount} onNavigate={() => setSidebarOpen(false)} />
            </m.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} theme={theme} onThemeToggle={toggleTheme} />

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {MOBILE_NAV.map(({ path, label, Icon }) => {
            const active = pathname === path;
            const handleTap = () => {
              if (active) {
                // Tapping the current tab — reset internal view state.
                window.dispatchEvent(new CustomEvent('nav:reset', { detail: { path } }));
              } else {
                router.push(path);
              }
            };
            return (
              <button
                key={path}
                onClick={handleTap}
                className={`flex flex-col items-center justify-center flex-1 py-2 text-xs gap-1 transition-colors ${
                  active ? 'text-[var(--accent-blue)] dark:text-blue-400' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <main className="flex-1 overflow-y-scroll pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
    </MotionConfig>
    </LazyMotion>
  );
}
