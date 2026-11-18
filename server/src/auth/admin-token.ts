import { timingSafeEqual } from 'node:crypto';

/** Constant-time comparison; false when either side is empty. */
export function isAdminToken(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when `given` is the configured ADMIN_TOKEN. */
export const isAdminTokenValue = (given: unknown) => typeof given === 'string' && isAdminToken(given, process.env.ADMIN_TOKEN);
