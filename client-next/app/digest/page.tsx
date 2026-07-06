'use client';

import { DigestView } from '@/components/digest/DigestView';

// Disable static optimization to prevent SSR errors
export const dynamic = 'force-dynamic';

export default function DigestPage() {
  return <DigestView />;
}
export const runtime = "edge";
