import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CuratedView } from './components/curated/CuratedView';
import { DigestView } from './components/digest/DigestView';
import { AgentView } from './components/agent/AgentView';
import { HotspotView } from './components/hotspot/HotspotView';
import { KeywordsView } from './components/keywords/KeywordsView';
import { ChangelogView } from './components/changelog/ChangelogView';
import { AboutView } from './components/about/AboutView';
import { Toast, type ToastData } from './components/common/Toast';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [unreadCount] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const { theme, toggle } = useTheme();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Toast toast={toast} />
      <AppLayout unreadCount={unreadCount} theme={theme} onThemeToggle={toggle}>
        <Routes>
          <Route path="/" element={<Navigate to="/curated" replace />} />
          <Route path="/curated" element={<CuratedView />} />
          <Route path="/hotspot" element={<HotspotView />} />
          <Route path="/digest" element={<DigestView />} />
          <Route path="/agent" element={<AgentView />} />
          <Route path="/keywords" element={<KeywordsView onToast={showToast} />} />
          <Route path="/changelog" element={<ChangelogView />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="*" element={<Navigate to="/curated" replace />} />
        </Routes>
      </AppLayout>
    </>
  );
}
