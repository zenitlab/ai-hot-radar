'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, ChevronDown, Menu, Moon, Rss, Sun, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminSignIn } from '../common/AdminSignIn';
import { UpdateStatus } from './UpdateStatus';
import { TitleModeToggle } from './TitleModeToggle';
import { useDismiss } from './useDismiss';

/** Reading: the five content views. */
export const CONTENT_NAV = [
  { href: '/curated', label: '精选' },
  { href: '/hot', label: '热点榜' },
  { href: '/digest', label: '日报' },
  { href: '/topics', label: '主题' },
  { href: '/hotspot', label: '全部动态' },
];

/** About the site; RSS is a dropdown of its own. */
export const SITE_NAV = [
  { href: '/agent', label: 'Agent 接入' },
  { href: '/changelog', label: '更新日志' },
  { href: '/about', label: '关于' },
];

export const RSS_FEEDS = [
  { href: '/api/agent/rss/curated.xml', label: '精选资讯', note: '最新 50 条精选' },
  { href: '/api/agent/rss/all.xml', label: '全部资讯', note: '最新 100 条，不筛选' },
  { href: '/api/agent/rss/digest.xml', label: 'AI 日报', note: '每天早上一期' },
];

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Radar rings with one sweep line in the hottest colour of the heat scale. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="2" opacity=".45" />
      <path d="M16 16 26 7" stroke="var(--heat-4)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.3" fill="currentColor" />
    </svg>
  );
}

function RssMenu({ items }: { items: typeof RSS_FEEDS }) {
  return (
    <ul className="py-1">
      {items.map((f) => (
        <li key={f.href}>
          <a href={f.href} target="_blank" rel="noopener" className="block rounded-lg px-3 py-2 hover:bg-[var(--dropdown-item-hover)]">
            <span className="block text-sm text-[var(--text-primary)]">{f.label}</span>
            <span className="block text-xs text-[var(--text-muted)]">{f.note}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A nav item that opens a small panel below it. */
function Dropdown({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-[15px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        {icon}
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        // Closing on click inside lets links behave like menu items.
        <div
          className="absolute left-0 top-11 z-50 w-56 rounded-xl border border-[var(--card-border)] bg-[var(--dropdown-bg)] p-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface SiteHeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  unreadCount: number;
}

/**
 * Top navigation (DESIGN.md · 导航). Wide screens show both groups; from 1024
 * to 1279px the site group folds into 更多; below 1024px everything moves
 * into the menu panel and the bottom tab bar.
 */
export function SiteHeader({ theme, onThemeToggle, unreadCount }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  /** Same-route click: views listen for this to reset (e.g. 日报 back to today). */
  const onNav = (href: string) => {
    if (pathname === href) window.dispatchEvent(new CustomEvent('nav:reset', { detail: { path: href } }));
    setMenuOpen(false);
  };

  const navLink = (item: { href: string; label: string }) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => onNav(item.href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-9 items-center rounded-lg px-2.5 text-[15px] transition-colors',
          active
            ? 'font-semibold text-[var(--accent-blue)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        )}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-4 sm:px-6 lg:h-[60px]">
        <Link href="/curated" onClick={() => onNav('/curated')} className="mr-4 flex shrink-0 items-center gap-2 text-[17px] font-bold text-[var(--text-primary)]">
          <BrandMark className="h-7 w-7 text-[var(--accent-blue)]" />
          AI 热点雷达
        </Link>

        <nav aria-label="内容" className="hidden items-center gap-0.5 lg:flex">
          {CONTENT_NAV.map(navLink)}
        </nav>

        <span className="mx-2 hidden h-5 w-px bg-[var(--border-default)] xl:block" aria-hidden="true" />

        <nav aria-label="站点" className="hidden items-center gap-0.5 xl:flex">
          {SITE_NAV.map(navLink)}
          <Dropdown label="RSS" icon={<Rss className="h-3.5 w-3.5" aria-hidden="true" />}>
            <RssMenu items={RSS_FEEDS} />
          </Dropdown>
        </nav>

        <div className="hidden lg:block xl:hidden">
          <Dropdown label="更多">
            <ul className="py-1">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => onNav(item.href)} className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--dropdown-item-hover)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-[var(--border-subtle)] px-3 pt-2 text-xs text-[var(--text-muted)]">RSS 订阅</p>
            <RssMenu items={RSS_FEEDS} />
          </Dropdown>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <span className="mr-1">
            <TitleModeToggle />
          </span>
          <Link
            href="/keywords"
            onClick={() => onNav('/keywords')}
            aria-label={unreadCount > 0 ? `我的关注，${unreadCount} 条未读` : '我的关注'}
            title="我的关注"
            className={cn(
              'relative hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] lg:flex',
              isActive(pathname, '/keywords') ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Bookmark className="h-[18px] w-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--heat-5)] px-1 text-center text-[10px] font-bold leading-4 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <UpdateStatus />
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'}
            title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="site-menu" className="max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 pb-6 pt-2 lg:hidden">
          <nav aria-label="全部页面" className="grid grid-cols-2 gap-x-4">
            {[...CONTENT_NAV, { href: '/keywords', label: '我的关注' }, ...SITE_NAV].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onNav(item.href)}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={cn(
                  'border-b border-[var(--border-subtle)] py-3 text-[15px]',
                  isActive(pathname, item.href) ? 'font-semibold text-[var(--accent-blue)]' : 'text-[var(--text-primary)]',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-xs text-[var(--text-muted)]">RSS 订阅</p>
          <RssMenu items={RSS_FEEDS} />
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <AdminSignIn />
          </div>
        </div>
      )}
    </header>
  );
}
