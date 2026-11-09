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

export async function renderOgCard(card: { kicker: string; title: string; meta?: string }): Promise<ImageResponse> {
  const title = clamp(card.title, 60);
  const meta = card.meta ? clamp(card.meta, 60) : '';
  const allText = `${card.kicker}${title}${meta}AI Hot Radar`;
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
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0b1220 0%, #0f1a33 60%, #13254a 100%)',
          color: '#e6edf7',
          fontFamily: fonts.length ? FONT_FAMILY : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#7fb0ff', fontWeight: 700 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: '#3b82f6', display: 'flex' }} />
          {card.kicker}
        </div>
        <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.3, fontWeight: 700, color: '#ffffff' }}>{title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, color: '#9fb0c8' }}>
          <span>{meta}</span>
          <span style={{ color: '#5f7391' }}>aihotradar.com</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
