import type { Metadata } from 'next';

// Not linked from navigation and never indexed. Access is decided by the
// backend (AdminGuard), not by the URL being unknown.
export const metadata: Metadata = {
  title: '管理后台',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
