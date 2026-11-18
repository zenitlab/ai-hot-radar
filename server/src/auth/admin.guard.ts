import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { isAdminToken } from './admin-token';
import { AuthService, adminEmail } from './auth.service';
import { RequestLike, header, sameOrigin } from './session';

/** Header carrying ADMIN_TOKEN, for scripts and curl. The site itself signs in with ADMIN_EMAIL. */
export const ADMIN_HEADER = 'x-admin-token';

export { isAdminToken } from './admin-token';

/**
 * Guards every route that writes data or spends quota (scans, digest
 * generation, deletes, settings, keywords, chat, user admin). Two ways in:
 *
 * - signed in on the site as the ADMIN_EMAIL account (session cookie);
 * - the x-admin-token header matching ADMIN_TOKEN, for scripts.
 *
 * Neither configured means no one is admin: the routes refuse every request.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Optional() private readonly auth?: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestLike>();
    if (isAdminToken(header(req, ADMIN_HEADER), process.env.ADMIN_TOKEN)) return true;

    const user = this.auth ? await this.auth.userFromRequest(req) : null;
    if (!user) throw new UnauthorizedException('需要管理员登录');
    if (!adminEmail() || user.email !== adminEmail()) throw new ForbiddenException('需要管理员账号');
    // Cookie auth on a write: refuse submissions from other sites.
    if (req.method && req.method !== 'GET' && !sameOrigin(req)) throw new ForbiddenException('来源不对');
    return true;
  }
}
