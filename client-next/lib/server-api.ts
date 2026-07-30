/**
 * Server-side data fetching for SSR pages.
 *
 * SERVER ONLY — do not import from a `'use client'` module. Client code must
 * keep using `services/api.ts`, whose relative `/api` paths rely on the
 * rewrites in `next.config.ts`. Server components have no origin, so they
 * need an absolute URL, which is why this file exists separately.
 *
 * Why the fallback chain: `NEXT_PUBLIC_API_URL` is only set at runtime in
 * docker-compose (not as a build arg), so during `next build` it is undefined.
 * Pages using this helper must therefore opt out of build-time prerendering
 * with `export const dynamic = 'force-dynamic'`.
 */

import type { DigestData, Hotspot } from '../types';

const API_ORIGIN =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

const TIMEOUT_MS = 5000;

/** Shape of `GET /api/curated` — an object, not a bare array. */
export interface CuratedResponse {
  period: 'today' | 'week';
  total: number;
  limit: number;
  offset: number;
  items: Hotspot[];
}

/** Shape of `GET /api/hotspots` — `{ data, pagination }`, not `{ items, total }`. */
export interface HotspotsResponse {
  data: Hotspot[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** One entry of `GET /api/digest/recent`. */
export interface DigestSummary {
  date: string;
  summary: string;
  createdAt: string;
}

/** Shape of `GET /api/digest/:date`. The API returns `null` when absent. */
export interface DigestRecord {
  date: string;
  data: DigestData;
  createdAt: string;
}

/**
 * Shared fetch wrapper. Never throws — callers get `null` and decide the
 * fallback, so a backend outage degrades to an empty page rather than a 500.
 */
async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, {
      // Paired with `dynamic = 'force-dynamic'`: fetch fresh on every request.
      // Note Next 16 no longer caches fetch by default, so this is explicit
      // rather than load-bearing.
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[server-api] ${path} returned HTTP ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    // Covers connection refused (backend down), DNS failure, and timeout.
    console.error(`[server-api] failed to fetch ${path}:`, err);
    return null;
  }
}

const EMPTY: CuratedResponse = {
  period: 'today',
  total: 0,
  limit: 0,
  offset: 0,
  items: [],
};

const EMPTY_HOTSPOTS: HotspotsResponse = {
  data: [],
  pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
};

/**
 * Fetch curated hotspots for the default view (no category/region/search).
 *
 * Never throws: on any failure it returns an empty result so the page still
 * renders and the client-side effect in CuratedView can take over. Returning
 * empty is preferable to a 500 — the shell, metadata, and JSON-LD still reach
 * the crawler even when the backend is down.
 */
export async function fetchCuratedSSR(
  period: 'today' | 'week' = 'today',
  limit = 50,
): Promise<CuratedResponse> {
  const params = new URLSearchParams({
    period,
    limit: String(limit),
    offset: '0',
  });

  const data = await getJson<CuratedResponse>(`/api/curated?${params}`);
  if (!data) return EMPTY;

  return {
    ...EMPTY,
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

/**
 * Fetch the default hotspot feed (page 1, no filters) for the initial HTML.
 *
 * Only the list is prefetched. Keywords and the WebSocket subscription stay
 * client-side — they drive live updates, which crawlers never see anyway.
 */
export async function fetchHotspotsSSR(limit = 20): Promise<HotspotsResponse> {
  const params = new URLSearchParams({ limit: String(limit), page: '1' });

  const data = await getJson<HotspotsResponse>(`/api/hotspots?${params}`);
  if (!data) return EMPTY_HOTSPOTS;

  return {
    data: Array.isArray(data.data) ? data.data : [],
    pagination: data.pagination ?? EMPTY_HOTSPOTS.pagination,
  };
}

/**
 * Fetch one day's digest. Returns `null` when that date has no digest yet —
 * the backend answers 200 with a `null` body rather than a 404, and callers
 * use `null` to render the empty state (or trigger `notFound()`).
 */
export async function fetchDigestSSR(date: string): Promise<DigestRecord | null> {
  return getJson<DigestRecord>(`/api/digest/${date}`);
}

/**
 * Fetch the list of dates that have a digest, newest first.
 *
 * Used both for the sidebar and for `generateStaticParams` / `sitemap.ts`, so
 * it returns `[]` rather than `null` on failure — a build must not break just
 * because the backend is unreachable.
 */
export async function fetchRecentDigestsSSR(): Promise<DigestSummary[]> {
  const data = await getJson<DigestSummary[]>('/api/digest/recent');
  return Array.isArray(data) ? data : [];
}
