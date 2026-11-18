import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '账号与密码',
  robots: { index: false, follow: false },
  alternates: { canonical: '/account' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
