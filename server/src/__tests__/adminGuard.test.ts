import { afterEach, describe, expect, it } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard, isAdminToken } from '../auth/admin.guard.js';

const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

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
  const saved = process.env.ADMIN_TOKEN;
  afterEach(() => {
    process.env.ADMIN_TOKEN = saved;
  });

  it('lets the admin through', () => {
    process.env.ADMIN_TOKEN = 's3cret';
    expect(new AdminGuard().canActivate(ctx({ 'x-admin-token': 's3cret' }))).toBe(true);
  });

  it('refuses a missing or wrong token', () => {
    process.env.ADMIN_TOKEN = 's3cret';
    expect(() => new AdminGuard().canActivate(ctx({}))).toThrow(UnauthorizedException);
    expect(() => new AdminGuard().canActivate(ctx({ 'x-admin-token': 'guess' }))).toThrow(UnauthorizedException);
  });

  it('refuses everyone when ADMIN_TOKEN is not configured', () => {
    delete process.env.ADMIN_TOKEN;
    expect(() => new AdminGuard().canActivate(ctx({ 'x-admin-token': '' }))).toThrow(UnauthorizedException);
  });
});
