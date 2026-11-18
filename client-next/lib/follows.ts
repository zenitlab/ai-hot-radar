import { useSyncExternalStore } from 'react';

/**
 * Topics a reader follows, kept in this browser (no account needed). Each entry
 * is a topic slug from server/src/topics/topics.config.ts, so following costs
 * no model calls: the feed is built from topics the site already tracks.
 */
const STORAGE_KEY = 'aihot-follows';
const CHANGE_EVENT = 'aihot-follows-change';
export const MAX_FOLLOWS = 20;

const EMPTY: string[] = [];
let cache: { raw: string | null; value: string[] } = { raw: null, value: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  // Same string → same array, so useSyncExternalStore sees a stable snapshot.
  if (raw === cache.raw) return cache.value;
  let value: string[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{2,40}$/.test(s)).slice(0, MAX_FOLLOWS);
  } catch {
    /* corrupt value: treat as empty */
  }
  cache = { raw, value };
  return value;
}

function write(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* storage blocked: the change only lasts for this page view */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Adds or removes a topic. Returns false when the follow limit is reached. */
export function toggleFollow(slug: string): boolean {
  const cur = read();
  if (cur.includes(slug)) {
    write(cur.filter((s) => s !== slug));
    return true;
  }
  if (cur.length >= MAX_FOLLOWS) return false;
  write([slug, ...cur]);
  return true;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Followed topic slugs, newest first. Empty during server render and first paint. */
export function useFollows(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
