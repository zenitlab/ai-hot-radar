import { ImageResponse } from 'next/og';

/**
 * Shared renderer for dynamic share images (opengraph-image.tsx files).
 *
 * Chinese text: next/og ships no CJK glyphs, and a full CJK font is 10MB+.
 * Instead we ask Google Fonts for a subset containing only the characters on
 * the card (the `text=` parameter), typically a few KB. If that fetch fails
 * the card still renders with the bundled Latin font; CJK glyphs then show as
 * boxes, but the page itself is unaffected.
 *
 * Fonts are cached per text in memory for the life of the server process.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const FONT_FAMILY = 'Noto Sans SC';
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

async function loadSubset(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  const cacheKey = `${weight}:${text}`;
  const hit = fontCache.get(cacheKey);
  if (hit) return hit;
  const p = (async () => {
    try {
      const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${weight}&text=${encodeURIComponent(text)}`;
      const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(5000) })).text();
      const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!src) return null;
      const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  fontCache.set(cacheKey, p);
  // Don't keep failures around forever; the next request can retry.
  p.then((v) => { if (!v) fontCache.delete(cacheKey); });
  if (fontCache.size > 500) fontCache.delete(fontCache.keys().next().value as string);
  return p;
}

/** Trim long titles so they fit in three lines at the chosen size. */
function clamp(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Dark palette from client-next/app/globals.css (DESIGN.md). Share cards are
 * images, so the values are copied here; keep them in step with the tokens.
 */
const C = {
  bg: '#111614',
  text: '#e3e9e6',
  secondary: '#a3b1ac',
  muted: '#71807a',
  accent: '#5fbf9f',
  line: 'rgba(227, 233, 230, 0.12)',
  heat: ['#6c9fc2', '#5fae7c', '#dcb03c', '#e5883c', '#e5543a'],
};

/** Heat-scale colour for a source count, as on the site (lib/heat.ts sourceCountColor). */
export const ogSourceCountColor = (n: number) => C.heat[Math.min(5, Math.max(1, n)) - 1];

/** The site mark, same drawing as public/radar.svg. */
function RadarMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#1f6f5c" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#ffffff" strokeWidth="4" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.55" />
      <path d="M32 32 47 17" stroke="#f29a4a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.5" fill="#ffffff" />
    </svg>
  );
}

export interface OgCard {
  /** Short label for the page type, e.g. 精选 / 热点事件. */
  kicker?: string;
  title: string;
  /** Facts shown under the title, spaced apart (no dot separators). */
  meta?: string[];
  /** One large number on the right, e.g. a source count. */
  stat?: { value: string; label: string; color?: string };
}

export async function renderOgCard(card: OgCard): Promise<ImageResponse> {
  const title = clamp(card.title, 60);
  const meta = (card.meta ?? []).filter(Boolean).map((m) => clamp(m, 30));
  const brand = 'AI 热点雷达';
  const allText = `${brand}${card.kicker ?? ''}${title}${meta.join('')}${card.stat ? card.stat.value + card.stat.label : ''}aihotradar.com`;
  const [regular, bold] = await Promise.all([loadSubset(allText, 400), loadSubset(allText, 700)]);
  const fonts = [
    ...(regular ? [{ name: FONT_FAMILY, data: regular, weight: 400 as const, style: 'normal' as const }] : []),
    ...(bold ? [{ name: FONT_FAMILY, data: bold, weight: 700 as const, style: 'normal' as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          background: C.bg,
          color: C.text,
          fontFamily: fonts.length ? FONT_FAMILY : undefined,
        }}
      >
        {/* Faint radar rings off the right edge: the brand, not decoration for its own sake. */}
        <svg width="560" height="560" viewBox="0 0 560 560" style={{ position: 'absolute', right: -170, top: 35 }}>
          <circle cx="280" cy="280" r="270" fill="none" stroke={C.accent} strokeWidth="2" opacity="0.14" />
          <circle cx="280" cy="280" r="180" fill="none" stroke={C.accent} strokeWidth="2" opacity="0.11" />
          <circle cx="280" cy="280" r="90" fill="none" stroke={C.accent} strokeWidth="2" opacity="0.08" />
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <RadarMark size={56} />
          <span style={{ fontSize: 34, fontWeight: 700 }}>{brand}</span>
          {card.kicker && (
            <span
              style={{
                marginLeft: 8,
                padding: '6px 16px',
                border: `2px solid ${C.line}`,
                borderRadius: 10,
                fontSize: 26,
                color: C.accent,
              }}
            >
              {card.kicker}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 48 }}>
          <div style={{ display: 'flex', maxWidth: card.stat ? 820 : 1000, fontSize: 60, lineHeight: 1.32, fontWeight: 700 }}>{title}</div>
          {card.stat && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
              <span style={{ fontSize: 96, lineHeight: 1, fontWeight: 700, color: card.stat.color ?? C.accent }}>{card.stat.value}</span>
              <span style={{ marginTop: 8, fontSize: 26, color: C.muted }}>{card.stat.label}</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 28,
            borderTop: `2px solid ${C.line}`,
            fontSize: 26,
            color: C.secondary,
          }}
        >
          <div style={{ display: 'flex', gap: 36 }}>
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <span style={{ color: C.muted }}>aihotradar.com</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
