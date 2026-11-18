import { describe, expect, it } from 'vitest';
import { hashPassword, normalizeEmail, passwordProblem, verifyPassword } from '../auth/password.js';
import { AttemptLimiter } from '../auth/rate-limit.js';
import { hashToken, readCookie, sameOrigin, sessionCookie } from '../auth/session.js';
import { cleanFollows, parseFollows } from '../auth/auth.service.js';

describe('passwords', () => {
  it('verifies the right password and nothing else', async () => {
    const stored = await hashPassword('correct horse');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', stored)).toBe(true);
    expect(await verifyPassword('correct hors', stored)).toBe(false);
    expect(await verifyPassword('correct horse', 'garbage')).toBe(false);
  });

  it('salts each hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('checks length', () => {
    expect(passwordProblem('short')).toMatch(/至少/);
    expect(passwordProblem('x'.repeat(73))).toMatch(/最多/);
    expect(passwordProblem('12345678')).toBeNull();
    expect(passwordProblem(undefined)).toBeTruthy();
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and trims, rejects non-emails', () => {
    expect(normalizeEmail('  A@QQ.com ')).toBe('a@qq.com');
    expect(normalizeEmail('admin')).toBeNull();
    expect(normalizeEmail('a@b')).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});

describe('sessions', () => {
  it('reads the session cookie among others', () => {
    expect(readCookie({ headers: { cookie: 'a=1; aihot_session=tok%2Bx; b=2' } }, 'aihot_session')).toBe('tok+x');
    expect(readCookie({ headers: {} }, 'aihot_session')).toBeUndefined();
  });

  it('builds an HttpOnly, SameSite cookie and never stores the raw token', () => {
    const c = sessionCookie('abc', 60);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(hashToken('abc')).not.toBe('abc');
    expect(hashToken('abc')).toHaveLength(64);
  });

  it('compares Origin with Host', () => {
    expect(sameOrigin({ headers: { host: 'aihotradar.com' } })).toBe(true);
    expect(sameOrigin({ headers: { host: 'aihotradar.com', origin: 'https://aihotradar.com' } })).toBe(true);
    expect(sameOrigin({ headers: { host: 'aihotradar.com', origin: 'https://evil.example' } })).toBe(false);
  });
});

describe('AttemptLimiter', () => {
  it('locks after max failures and unlocks when the window passes', () => {
    const l = new AttemptLimiter(3, 1000);
    for (let i = 0; i < 3; i++) l.hit('k', 0);
    expect(l.retryAfter('k', 10)).toBe(990);
    expect(l.retryAfter('k', 1001)).toBe(0);
    l.hit('k', 2000);
    l.clear('k');
    expect(l.retryAfter('k', 2001)).toBe(0);
  });
});

describe('follows', () => {
  it('keeps valid unique slugs, at most 20', () => {
    expect(cleanFollows(['openai', 'openai', 'Bad Slug', 3, 'deepseek'])).toEqual(['openai', 'deepseek']);
    expect(cleanFollows(Array.from({ length: 30 }, (_, i) => `t${i}x`))).toHaveLength(20);
    expect(() => cleanFollows('openai')).toThrow();
    expect(parseFollows('not json')).toEqual([]);
  });
});

describe('registering the admin email', () => {
  it('needs ADMIN_TOKEN, so nobody can claim the admin account first', async () => {
    const { AuthService } = await import('../auth/auth.service.js');
    const created: string[] = [];
    const prisma = {
      user: { findUnique: async () => null, create: async ({ data }: { data: { email: string } }) => (created.push(data.email), { id: 'u', email: data.email, follows: '[]', createdAt: new Date() }), update: async () => ({}) },
      session: { create: async () => ({}) },
    };
    const saved = { email: process.env.ADMIN_EMAIL, token: process.env.ADMIN_TOKEN };
    process.env.ADMIN_EMAIL = 'owner@example.com';
    process.env.ADMIN_TOKEN = 'tok';
    try {
      const svc = new AuthService(prisma as never);
      const req = { headers: {} };
      await expect(svc.register(req, { email: 'Owner@example.com', password: '12345678' })).rejects.toThrow(/管理员口令/);
      await expect(svc.register(req, { email: 'owner@example.com', password: '12345678', adminToken: 'wrong' })).rejects.toThrow(/管理员口令/);
      const ok = await svc.register(req, { email: 'owner@example.com', password: '12345678', adminToken: 'tok' });
      expect(ok.user.isAdmin).toBe(true);
      await svc.register(req, { email: 'reader@example.com', password: '12345678' });
      expect(created).toEqual(['owner@example.com', 'reader@example.com']);
    } finally {
      process.env.ADMIN_EMAIL = saved.email;
      process.env.ADMIN_TOKEN = saved.token;
    }
  });
});
