import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isAdminTokenValue } from './admin-token';
import { hashPassword, normalizeEmail, passwordProblem, verifyPassword } from './password';
import { AttemptLimiter } from './rate-limit';
import { RequestLike, SESSION_COOKIE, SESSION_DAYS, clientIp, hashToken, newSessionToken, readCookie } from './session';

export interface PublicUser {
  id: string;
  email: string;
  isAdmin: boolean;
  follows: string[];
  createdAt: Date;
}

const SLUG_RE = /^[a-z0-9-]{2,40}$/;
export const MAX_FOLLOWS = 20;

/** The admin account's email (ADMIN_EMAIL), lower-cased; empty means no admin account. */
export const adminEmail = () => (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();

export function parseFollows(raw: string | null | undefined): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s)).slice(0, MAX_FOLLOWS) : [];
  } catch {
    return [];
  }
}

export function cleanFollows(raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new BadRequestException('follows 必须是数组');
  return [...new Set(raw.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s)))].slice(0, MAX_FOLLOWS);
}

function tooMany(ms: number): HttpException {
  return new HttpException(`尝试次数太多，请 ${Math.ceil(ms / 60_000)} 分钟后再试`, HttpStatus.TOO_MANY_REQUESTS);
}

/**
 * Email + password accounts and cookie sessions. The admin is whoever signs
 * in with ADMIN_EMAIL; AdminGuard asks `userFromRequest` and checks that.
 */
@Injectable()
export class AuthService {
  /** 5 wrong passwords per email in 15 minutes locks that email for the rest of the window. */
  private loginFails = new AttemptLimiter(5, 15 * 60_000);
  /** 20 failed logins per address in 15 minutes, across emails. */
  private ipFails = new AttemptLimiter(20, 15 * 60_000);
  /** 5 sign-ups per address per hour. */
  private signups = new AttemptLimiter(5, 60 * 60_000);

  constructor(private readonly prisma: PrismaService) {}

  toPublic(u: { id: string; email: string; follows: string; createdAt: Date }): PublicUser {
    return { id: u.id, email: u.email, isAdmin: !!adminEmail() && u.email === adminEmail(), follows: parseFollows(u.follows), createdAt: u.createdAt };
  }

  private async startSession(userId: string): Promise<string> {
    const token = newSessionToken();
    await this.prisma.session.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return token;
  }

  async register(req: RequestLike, body: { email?: unknown; password?: unknown; follows?: unknown; adminToken?: unknown }) {
    const ip = clientIp(req);
    const wait = this.signups.retryAfter(ip);
    if (wait) throw tooMany(wait);
    const email = normalizeEmail(body.email);
    if (!email) throw new BadRequestException('邮箱格式不对');
    const problem = passwordProblem(body.password);
    if (problem) throw new BadRequestException(problem);
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('这个邮箱已经注册过，请直接登录');
    this.signups.hit(ip);
    // Email ownership isn't verified (no mail delivery yet), so without this
    // whoever registered ADMIN_EMAIL first would become the admin.
    if (email === adminEmail() && !isAdminTokenValue(body.adminToken)) {
      throw new ForbiddenException({ message: '注册管理员账号需要填写管理员口令（服务器上的 ADMIN_TOKEN）', needAdminToken: true });
    }
    const follows = Array.isArray(body.follows) ? cleanFollows(body.follows) : [];
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(body.password as string), follows: JSON.stringify(follows) },
    });
    return { user: this.toPublic(user), token: await this.startSession(user.id) };
  }

  async login(req: RequestLike, body: { email?: unknown; password?: unknown }) {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== 'string') throw new UnauthorizedException('邮箱或密码不对');
    const ip = clientIp(req);
    const wait = Math.max(this.loginFails.retryAfter(email), this.ipFails.retryAfter(ip));
    if (wait) throw tooMany(wait);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      this.loginFails.hit(email);
      this.ipFails.hit(ip);
      throw new UnauthorizedException('邮箱或密码不对');
    }
    this.loginFails.clear(email);
    return { user: this.toPublic(user), token: await this.startSession(user.id) };
  }

  async logout(req: RequestLike): Promise<void> {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  /** The signed-in user for this request, or null. Expired sessions are removed on sight. */
  async userFromRequest(req: RequestLike) {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) return null;
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    return session.user;
  }

  async requireUser(req: RequestLike) {
    const user = await this.userFromRequest(req);
    if (!user) throw new UnauthorizedException('请先登录');
    return user;
  }

  async setFollows(req: RequestLike, raw: unknown): Promise<string[]> {
    const user = await this.requireUser(req);
    const follows = cleanFollows(raw);
    await this.prisma.user.update({ where: { id: user.id }, data: { follows: JSON.stringify(follows) } });
    return follows;
  }

  async changePassword(req: RequestLike, body: { oldPassword?: unknown; newPassword?: unknown }): Promise<void> {
    const user = await this.requireUser(req);
    if (typeof body.oldPassword !== 'string' || !(await verifyPassword(body.oldPassword, user.passwordHash))) {
      throw new BadRequestException('原密码不对');
    }
    const problem = passwordProblem(body.newPassword);
    if (problem) throw new BadRequestException(problem);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword as string) } });
    // Sign out other devices; the current session stays.
    const current = hashToken(readCookie(req, SESSION_COOKIE) ?? '');
    await this.prisma.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: current } } });
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, follows: true, createdAt: true, lastLoginAt: true, _count: { select: { sessions: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      isAdmin: u.email === adminEmail(),
      follows: parseFollows(u.follows),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      sessions: u._count.sessions,
    }));
  }

  /** Sets a new password chosen by the admin (no email delivery yet) and signs the user out everywhere. */
  async adminResetPassword(id: string, password: unknown): Promise<void> {
    const problem = passwordProblem(password);
    if (problem) throw new BadRequestException(problem);
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password as string) } });
    await this.prisma.session.deleteMany({ where: { userId: id } });
  }

  async adminDeleteUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.email === adminEmail()) throw new BadRequestException('不能删除管理员账号');
    await this.prisma.user.delete({ where: { id } });
  }
}
