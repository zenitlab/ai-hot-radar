import {
  AudioLines, BookOpen, Bot, Building2, CircleDollarSign, Clapperboard, Code2, Cpu, GitFork, GraduationCap,
  Hash, Image, MessagesSquare, Package, Rocket, Scale, ScanEye, Server, ShieldCheck, Sigma, Workflow,
  type LucideIcon,
} from 'lucide-react';

import { BRAND_ICONS } from '@/lib/brandIcons';
import { cn } from '@/lib/utils';

/** Icons for direction and type topics; companies use their logo (lib/brandIcons.ts). */
const TOPIC_ICONS: Record<string, LucideIcon> = {
  // 技术方向
  agent: Workflow,
  coding: Code2,
  reasoning: Sigma,
  inference: Server,
  multimodal: ScanEye,
  image: Image,
  video: Clapperboard,
  audio: AudioLines,
  robotics: Bot,
  'open-source': GitFork,
  chips: Cpu,
  safety: ShieldCheck,
  policy: Scale,
  funding: CircleDollarSign,
  // 内容类型
  'model-release': Rocket,
  product: Package,
  research: GraduationCap,
  industry: Building2,
  tutorial: BookOpen,
  community: MessagesSquare,
};

/**
 * A topic's icon in a rounded tile. Server component: logos are inline SVG
 * from a static map, so no client JS or extra requests.
 */
export function TopicIcon({ slug, size = 'md' }: { slug: string; size?: 'sm' | 'md' | 'lg' }) {
  const tile = { sm: 'w-6 h-6 rounded-md', md: 'w-9 h-9 rounded-lg', lg: 'w-11 h-11 rounded-xl' }[size];
  const glyph = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' }[size];
  const brand = BRAND_ICONS[slug];

  if (brand) {
    return (
      <span
        className={cn(tile, 'flex shrink-0 items-center justify-center border border-[var(--card-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]')}
        aria-hidden="true"
      >
        <span className={glyph} dangerouslySetInnerHTML={{ __html: brand }} />
      </span>
    );
  }

  const Icon = TOPIC_ICONS[slug] ?? Hash;
  return (
    <span
      className={cn(tile, 'flex shrink-0 items-center justify-center bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]')}
      aria-hidden="true"
    >
      <Icon className={glyph} />
    </span>
  );
}
