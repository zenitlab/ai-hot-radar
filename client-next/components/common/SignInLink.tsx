'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

/** "登录" link that comes back to the current page; renders nothing once signed in. */
export function SignInLink({ className, label = '登录' }: { className?: string; label?: string }) {
  const pathname = usePathname();
  const session = useSession();
  if (session.status !== 'ready' || session.user) return null;
  return (
    <Link
      href={`/login?next=${encodeURIComponent(pathname)}`}
      className={cn('inline-flex items-center gap-1 font-medium text-[var(--accent-blue)] hover:underline', className)}
    >
      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}
