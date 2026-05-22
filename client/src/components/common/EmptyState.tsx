import { cn } from '../../lib/utils';

/**
 * Reusable empty state with a lightweight SVG illustration.
 * Each variant draws its own minimal scene — no external assets,
 * scales cleanly, picks up theme colors via currentColor.
 */
type Variant = 'radar' | 'star' | 'calendar' | 'bookmark' | 'search';

interface Props {
  variant?: Variant;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  variant = 'radar',
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--card-bg)]/40',
        className,
      )}
    >
      <Illustration variant={variant} />
      <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Illustration({ variant }: { variant: Variant }) {
  const stroke = 'currentColor';

  // Outer halo wraps every variant for visual consistency.
  // The inner scene changes per variant.
  return (
    <div className="relative text-[var(--accent-blue)] dark:text-blue-400 opacity-70">
      <svg width="84" height="84" viewBox="0 0 96 96" fill="none">
        {/* soft gradient halo */}
        <defs>
          <radialGradient id="empty-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#empty-halo)" />

        {variant === 'radar' && (
          <g>
            <circle cx="48" cy="48" r="28" stroke={stroke} strokeOpacity="0.25" strokeWidth="1.2" />
            <circle cx="48" cy="48" r="20" stroke={stroke} strokeOpacity="0.35" strokeWidth="1.2" />
            <circle cx="48" cy="48" r="12" stroke={stroke} strokeOpacity="0.5" strokeWidth="1.2" />
            <line x1="48" y1="20" x2="48" y2="76" stroke={stroke} strokeOpacity="0.18" strokeWidth="1" />
            <line x1="20" y1="48" x2="76" y2="48" stroke={stroke} strokeOpacity="0.18" strokeWidth="1" />
            <path d="M 48 48 L 48 20 A 28 28 0 0 1 73.5 64 Z" fill={stroke} fillOpacity="0.18" />
            <circle cx="48" cy="48" r="2.4" fill={stroke} />
            <circle cx="64" cy="34" r="1.8" fill={stroke} />
            <circle cx="32" cy="60" r="1.4" fill={stroke} />
          </g>
        )}

        {variant === 'star' && (
          <g>
            <path
              d="M48 24l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L48 57.5 35 64l2.5-14.5L27 39.3l14.5-2.1z"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill={stroke}
              fillOpacity="0.18"
            />
          </g>
        )}

        {variant === 'calendar' && (
          <g>
            <rect x="22" y="28" width="52" height="46" rx="6" stroke={stroke} strokeWidth="1.6" fill={stroke} fillOpacity="0.08" />
            <line x1="22" y1="40" x2="74" y2="40" stroke={stroke} strokeWidth="1.6" />
            <line x1="34" y1="22" x2="34" y2="32" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="62" y1="22" x2="62" y2="32" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="35" cy="52" r="1.8" fill={stroke} />
            <circle cx="48" cy="52" r="1.8" fill={stroke} />
            <circle cx="61" cy="52" r="1.8" fill={stroke} />
            <circle cx="35" cy="62" r="1.8" fill={stroke} fillOpacity="0.5" />
            <circle cx="48" cy="62" r="1.8" fill={stroke} fillOpacity="0.5" />
          </g>
        )}

        {variant === 'bookmark' && (
          <g>
            <path
              d="M30 22h36v52l-18-12-18 12z"
              stroke={stroke}
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill={stroke}
              fillOpacity="0.12"
            />
            <line x1="38" y1="36" x2="58" y2="36" stroke={stroke} strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="38" y1="44" x2="52" y2="44" stroke={stroke} strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}

        {variant === 'search' && (
          <g>
            <circle cx="42" cy="42" r="16" stroke={stroke} strokeWidth="2" fill={stroke} fillOpacity="0.08" />
            <line x1="54" y1="54" x2="68" y2="68" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
}
