'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { HotspotTab } from '../../types';

const TABS: { value: HotspotTab; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'domestic', label: '国内' },
  { value: 'international', label: '国外' },
  { value: 'community', label: '社区' },
  { value: 'model', label: '模型' },
  { value: 'product', label: '产品' },
  { value: 'industry', label: '行业' },
  { value: 'research', label: '论文' },
];

interface HotspotTabsProps {
  activeTab: HotspotTab;
  onChange: (tab: HotspotTab) => void;
}

export function HotspotTabs({ activeTab, onChange }: HotspotTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check if the strip is actually overflowing on the right.
  // Only show the right-edge hint when the user has more tabs to reach.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      // 1px tolerance for sub-pixel rounding
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide touch-pan-x pr-8"
      >
        {TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.value
                ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border border-[var(--tab-active-border)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Right-edge fade + chevron — only when there's more to scroll on the right */}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 bg-linear-to-l from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent" />
          <button
            type="button"
            onClick={handleScrollRight}
            aria-label="向右滚动查看更多"
            className="absolute top-1/2 -translate-y-1/2 right-0 z-10 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--card-bg)] border border-[var(--card-border-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 shadow-sm transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
