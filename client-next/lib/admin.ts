import { useSyncExternalStore } from 'react';

/**
 * Admin mode for the site owner. The backend guards every write and every
 * quota-spending route with ADMIN_TOKEN (server/src/auth/admin.guard.ts);
 * the token is entered once in this browser and sent as `x-admin-token`.
 * Visitors never see admin controls; a stale or wrong token just means the
 * controls stay hidden after verification fails.
 */
const STORAGE_KEY = 'aihot-admin-token';
const CHANGE_EVENT = 'aihot-admin-change';
export const ADMIN_HEADER = 'x-admin-token';

function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function getAdminToken(): string {
  return typeof window === 'undefined' ? '' : read();
}

/** Headers to add to a write request; empty for visitors. */
export function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { [ADMIN_HEADER]: token } : {};
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Checks the token against the backend and stores it only if it works. */
export async function signInAdmin(token: string): Promise<boolean> {
  const value = token.trim();
  if (!value) return false;
  const res = await fetch('/api/admin/verify', { headers: { [ADMIN_HEADER]: value } }).catch(() => null);
  if (!res?.ok) return false;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return false;
  }
  notify();
  return true;
}

export function signOutAdmin() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: nothing stored either */
  }
  notify();
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

/** True when this browser holds an admin token. Server render and first paint are always false. */
export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, () => read() !== '', () => false);
}
