/**
 * Parse various date string formats commonly seen in search results.
 * Returns a Date if a value can be confidently extracted, otherwise undefined.
 */
export function parseLooseDate(text: string, now: Date = new Date()): Date | undefined {
  if (!text) return undefined;
  const t = text.trim();

  // ISO-like: 2026-04-15, 2026/04/15, 2026.04.15
  const iso = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(+y, +m - 1, +d));
    if (!isNaN(date.getTime())) return date;
  }

  // English: "Apr 15, 2026" / "April 15, 2026"
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const en = t.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/);
  if (en) {
    const m = monthMap[en[1].slice(0, 3).toLowerCase()];
    if (m !== undefined) {
      const date = new Date(Date.UTC(+en[3], m, +en[2]));
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Relative: "5 hours ago" / "2 days ago" / "3 weeks ago" / "1 month ago"
  const rel = t.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
  if (rel) {
    const n = +rel[1];
    const unit = rel[2].toLowerCase();
    const ms: Record<string, number> = {
      minute: 60 * 1000,
      hour: 3600 * 1000,
      day: 86400 * 1000,
      week: 7 * 86400 * 1000,
      month: 30 * 86400 * 1000,
      year: 365 * 86400 * 1000,
    };
    return new Date(now.getTime() - n * ms[unit]);
  }

  // Chinese relative: "5小时前" / "2天前" / "3周前" / "1个月前"
  const cn = t.match(/(\d+)\s*(分钟|小时|天|周|个月|月|年)前/);
  if (cn) {
    const n = +cn[1];
    const unitKey = cn[2];
    const ms: Record<string, number> = {
      '分钟': 60 * 1000,
      '小时': 3600 * 1000,
      '天': 86400 * 1000,
      '周': 7 * 86400 * 1000,
      '个月': 30 * 86400 * 1000,
      '月': 30 * 86400 * 1000,
      '年': 365 * 86400 * 1000,
    };
    return new Date(now.getTime() - n * ms[unitKey]);
  }

  // Chinese absolute: "2026年4月15日" / "4月15日"
  const cnAbs = t.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (cnAbs) {
    const year = cnAbs[1] ? +cnAbs[1] : now.getUTCFullYear();
    const date = new Date(Date.UTC(year, +cnAbs[2] - 1, +cnAbs[3]));
    if (!isNaN(date.getTime())) return date;
  }

  return undefined;
}

/**
 * Scan a longer text (e.g. full Bing snippet, article preview) for ANY date pattern.
 * Returns the OLDEST date found, on the assumption that publish dates show up alongside
 * dates referenced inside the article — the older one is most likely the publish date.
 *
 * Use this for raw search snippets where we want to err on the side of treating
 * articles as "old" if any old date appears.
 */
export function findOldestDateInText(text: string, now: Date = new Date()): Date | undefined {
  if (!text) return undefined;

  const dates: Date[] = [];
  const minYear = 2015;
  const maxYear = now.getUTCFullYear() + 1;

  // ISO-like dates: 2026-04-15, 2026/04/15, 2026.04.15 — global match
  const isoRe = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g;
  for (const m of text.matchAll(isoRe)) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < minYear || y > maxYear || mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (!isNaN(date.getTime())) dates.push(date);
  }

  // English: "Apr 15, 2026" — global match
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const enRe = /([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/g;
  for (const m of text.matchAll(enRe)) {
    const mo = monthMap[m[1].slice(0, 3).toLowerCase()];
    const y = +m[3], d = +m[2];
    if (mo === undefined) continue;
    if (y < minYear || y > maxYear || d < 1 || d > 31) continue;
    const date = new Date(Date.UTC(y, mo, d));
    if (!isNaN(date.getTime())) dates.push(date);
  }

  // Chinese absolute: "2025年7月5日"
  const cnRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  for (const m of text.matchAll(cnRe)) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < minYear || y > maxYear || mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (!isNaN(date.getTime())) dates.push(date);
  }

  // Relative dates — these always indicate the publish date (e.g. "5 days ago")
  const relEn = text.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
  if (relEn) {
    const ms: Record<string, number> = {
      minute: 60_000, hour: 3_600_000, day: 86_400_000,
      week: 7 * 86_400_000, month: 30 * 86_400_000, year: 365 * 86_400_000,
    };
    dates.push(new Date(now.getTime() - +relEn[1] * ms[relEn[2].toLowerCase()]));
  }

  const relCn = text.match(/(\d+)\s*(分钟|小时|天|周|个月|月|年)前/);
  if (relCn) {
    const ms: Record<string, number> = {
      '分钟': 60_000, '小时': 3_600_000, '天': 86_400_000,
      '周': 7 * 86_400_000, '个月': 30 * 86_400_000, '月': 30 * 86_400_000, '年': 365 * 86_400_000,
    };
    dates.push(new Date(now.getTime() - +relCn[1] * ms[relCn[2]]));
  }

  if (dates.length === 0) return undefined;
  // Return the oldest — if any old date appears in the snippet, the article is likely old
  return new Date(Math.min(...dates.map(d => d.getTime())));
}

/**
 * Extract date from URL patterns like /2026/04/15/ or /2026-04-15-.
 * Used as a fallback when the page snippet doesn't carry a date.
 */
export function extractDateFromUrl(url: string): Date | undefined {
  const m = url.match(/(\d{4})[-/_](\d{1,2})[-/_](\d{1,2})/);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const yi = +y;
  const moi = +mo;
  const di = +d;
  // Sanity: AI/web context, year between 2015 and now+1, month/day in range
  if (yi < 2015 || yi > new Date().getUTCFullYear() + 1) return undefined;
  if (moi < 1 || moi > 12 || di < 1 || di > 31) return undefined;
  const date = new Date(Date.UTC(yi, moi - 1, di));
  return isNaN(date.getTime()) ? undefined : date;
}
