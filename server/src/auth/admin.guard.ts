import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/** Header carrying the admin token, set by the frontend once the admin has entered it. */
export const ADMIN_HEADER = 'x-admin-token';

/** Constant-time comparison; false when either side is empty. */
export function isAdminToken(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Guards every route that writes data or spends quota (scans, digest
 * generation, deletes, settings, keywords, chat). The site is public and has
 * no user accounts, so these were open to anyone before.
 *
 * ADMIN_TOKEN unset means no one is admin: the routes refuse every request
 * rather than fall back to open.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = req.headers[ADMIN_HEADER];
    const given = Array.isArray(raw) ? raw[0] : raw;
    if (!isAdminToken(given, process.env.ADMIN_TOKEN)) {
      throw new UnauthorizedException('需要管理员口令');
    }
    return true;
  }
}
