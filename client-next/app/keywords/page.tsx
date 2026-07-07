'use client';

import { useState } from 'react';
import { KeywordsView } from '@/components/keywords/KeywordsView';
import { Toast, type ToastData } from '@/components/common/Toast';

export default function KeywordsPage() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Toast toast={toast} />
      <KeywordsView onToast={showToast} />
    </>
  );
}
