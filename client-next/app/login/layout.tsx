import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
