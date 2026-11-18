import { afterEach, describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard, isAdminToken } from '../auth/admin.guard.js';
import type { AuthService } from '../auth/auth.service.js';

const ctx = (headers: Record<string, string>, method = 'GET') =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers, method }) }) }) as unknown as ExecutionContext;

/** AuthService stand-in that "signs in" whoever the test says. */
const authAs = (email: string | null) =>
  ({ userFromRequest: async () => (email ? { id: 'u1', email } : null) }) as unknown as AuthService;

describe('isAdminToken', () => {
  it('matches only the exact token', () => {
    expect(isAdminToken('s3cret', 's3cret')).toBe(true);
    expect(isAdminToken('s3cre', 's3cret')).toBe(false);
    expect(isAdminToken('S3cret', 's3cret')).toBe(false);
  });

  it('never matches when either side is empty', () => {
    expect(isAdminToken('', '')).toBe(false);
    expect(isAdminToken(undefined, undefined)).toBe(false);
    expect(isAdminToken('anything', undefined)).toBe(false);
  });
});

describe('AdminGuard', () => {
  const saved = { token: process.env.ADMIN_TOKEN, email: process.env.ADMIN_EMAIL };
  afterEach(() => {
    process.env.ADMIN_TOKEN = saved.token;
    process.env.ADMIN_EMAIL = saved.email;
  });

  it('lets a script with the token through', async () => {
    process.env.ADMIN_TOKEN = 's3cret';
    await expect(new AdminGuard(authAs(null)).canActivate(ctx({ 'x-admin-token': 's3cret' }))).resolves.toBe(true);
  });

  it('lets the ADMIN_EMAIL account through, case-insensitively', async () => {
    process.env.ADMIN_EMAIL = ' Owner@Example.com ';
    await expect(new AdminGuard(authAs('owner@example.com')).canActivate(ctx({}))).resolves.toBe(true);
  });

  it('refuses other signed-in users', async () => {
    process.env.ADMIN_EMAIL = 'owner@example.com';
    await expect(new AdminGuard(authAs('reader@example.com')).canActivate(ctx({}))).rejects.toThrow(ForbiddenException);
  });

  it('refuses everyone when ADMIN_EMAIL is empty', async () => {
    process.env.ADMIN_EMAIL = '';
    await expect(new AdminGuard(authAs('')).canActivate(ctx({}))).rejects.toThrow(UnauthorizedException);
    await expect(new AdminGuard(authAs('reader@example.com')).canActivate(ctx({}))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a wrong token and a signed-out visitor', async () => {
    process.env.ADMIN_TOKEN = 's3cret';
    await expect(new AdminGuard(authAs(null)).canActivate(ctx({ 'x-admin-token': 'guess' }))).rejects.toThrow(UnauthorizedException);
    delete process.env.ADMIN_TOKEN;
    await expect(new AdminGuard(authAs(null)).canActivate(ctx({ 'x-admin-token': '' }))).rejects.toThrow(UnauthorizedException);
  });

  it('refuses a cookie-authenticated write submitted from another site', async () => {
    process.env.ADMIN_EMAIL = 'owner@example.com';
    const guard = new AdminGuard(authAs('owner@example.com'));
    await expect(guard.canActivate(ctx({ origin: 'https://evil.example', host: 'aihotradar.com' }, 'POST'))).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx({ origin: 'https://aihotradar.com', host: 'aihotradar.com' }, 'POST'))).resolves.toBe(true);
  });
});
