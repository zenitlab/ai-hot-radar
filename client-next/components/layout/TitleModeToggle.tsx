'use client';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

/**
 * 中 / 原: show item titles as the Chinese translation or as the source wrote
 * them. Stored per browser; app/layout.tsx applies it before first paint.
 */
const STORAGE_KEY = 'aihot-title-mode';
const ATTR = 'data-title-mode';
const CHANGE_EVENT = 'aihot-title-mode-change';
type Mode = 'zh' | 'original';

const read = (): Mode => (document.documentElement.getAttribute(ATTR) === 'original' ? 'original' : 'zh');

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function setMode(mode: Mode) {
  document.documentElement.setAttribute(ATTR, mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage blocked: lasts for this page */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function TitleModeToggle() {
  const mode = useSyncExternalStore(subscribe, read, () => 'zh' as Mode);
  const option = (value: Mode, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      title={hint}
      className={cn(
        'h-7 rounded-md px-2 text-[13px] transition-colors',
        mode === value
          ? 'bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] shadow-[0_0_0_1px_var(--border-default)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="标题语言" className="flex items-center gap-0.5 rounded-lg bg-[var(--bg-elevated)] p-0.5">
      {option('zh', '中', '标题显示中文翻译')}
      {option('original', '原', '标题显示信源原文')}
    </div>
  );
}
