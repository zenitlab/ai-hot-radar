import { Menu, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function TopBar({ onMenuClick, theme, onThemeToggle }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />
      <button
        onClick={onThemeToggle}
        className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );
}
