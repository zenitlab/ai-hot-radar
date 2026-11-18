import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'aihot_session';
export const SESSION_DAYS = 30;

export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  ip?: string;
}

export const newSessionToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function header(req: RequestLike, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

export function readCookie(req: RequestLike, name: string): string | undefined {
  const raw = header(req, 'cookie');
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/**
 * Set-Cookie value. HttpOnly keeps it from page scripts; SameSite=Lax means
 * other sites can't make the browser send it on a cross-site POST.
 */
export function sessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Client address for rate limiting: first X-Forwarded-For hop (set by nginx), else the socket. */
export function clientIp(req: RequestLike): string {
  return header(req, 'x-forwarded-for')?.split(',')[0].trim() || header(req, 'x-real-ip') || req.ip || 'unknown';
}

/**
 * For cookie-authenticated writes: a browser always sends Origin on a
 * cross-site POST, so a mismatch with Host means another site is submitting.
 * Requests without Origin (curl, same-origin GET) pass.
 */
export function sameOrigin(req: RequestLike): boolean {
  const origin = header(req, 'origin');
  if (!origin) return true;
  const host = header(req, 'x-forwarded-host') || header(req, 'host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
