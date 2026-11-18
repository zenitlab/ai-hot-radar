import { useSyncExternalStore } from 'react';

/**
 * Reader / admin session (server/src/auth). The session itself is an HttpOnly
 * cookie the page can't read; this module keeps what `GET /api/auth/me`
 * returned and lets components subscribe to it.
 */
export interface SessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
  follows: string[];
}

export type Session = { status: 'loading' } | { status: 'ready'; user: SessionUser | null };

const LOADING: Session = { status: 'loading' };
let state: Session = LOADING;
let started = false;
const listeners = new Set<() => void>();

function set(next: Session) {
  state = next;
  listeners.forEach((l) => l());
}

export async function refreshSession(): Promise<SessionUser | null> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
  const user = res?.ok ? (((await res.json()) as { user: SessionUser | null }).user ?? null) : null;
  set({ status: 'ready', user });
  return user;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!started) {
    started = true;
    void refreshSession();
  }
  return () => listeners.delete(cb);
}

/** Current session; `loading` during server render and until /me answers. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

export const useUser = (): SessionUser | null => {
  const s = useSession();
  return s.status === 'ready' ? s.user : null;
};

/** Failed auth call, with the backend's message. */
export class AuthError extends Error {
  constructor(message: string, readonly needAdminToken = false) {
    super(message);
  }
}

async function post(path: string, body: unknown, method = 'POST') {
  const res = await fetch(`/api/auth/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { user?: SessionUser; message?: string | string[]; needAdminToken?: boolean };
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new AuthError(msg || (res.status === 429 ? '尝试次数太多，请稍后再试' : '操作失败，请稍后再试'), !!data.needAdminToken);
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { user } = await post('login', { email, password });
  set({ status: 'ready', user: user ?? null });
  return user ?? null;
}

/** `adminToken` is only needed to register the ADMIN_EMAIL account. */
export async function signUp(email: string, password: string, follows: string[], adminToken?: string) {
  const { user } = await post('register', { email, password, follows, adminToken });
  set({ status: 'ready', user: user ?? null });
  return user ?? null;
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  set({ status: 'ready', user: null });
}

export async function changePassword(oldPassword: string, newPassword: string) {
  await post('password', { oldPassword, newPassword });
}

/** Saves the account's followed topics; the server returns the cleaned list. */
export async function saveFollows(follows: string[]): Promise<string[]> {
  const data = (await post('follows', { follows }, 'PUT')) as { follows?: string[] };
  const saved = data.follows ?? follows;
  if (state.status === 'ready' && state.user) set({ status: 'ready', user: { ...state.user, follows: saved } });
  return saved;
}
