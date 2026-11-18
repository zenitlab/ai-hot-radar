import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { RequestLike, SESSION_DAYS, sameOrigin, sessionCookie } from './session';

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

function checkOrigin(req: RequestLike) {
  if (!sameOrigin(req)) throw new ForbiddenException('来源不对');
}

/** Reader accounts: sign up, sign in, sign out, current user, follows, password. */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Req() req: RequestLike, @Res({ passthrough: true }) res: ResponseLike, @Body() body: Record<string, unknown>) {
    checkOrigin(req);
    const { user, token } = await this.auth.register(req, body);
    res.setHeader('Set-Cookie', sessionCookie(token, SESSION_DAYS * 86_400));
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Req() req: RequestLike, @Res({ passthrough: true }) res: ResponseLike, @Body() body: Record<string, unknown>) {
    checkOrigin(req);
    const { user, token } = await this.auth.login(req, body);
    res.setHeader('Set-Cookie', sessionCookie(token, SESSION_DAYS * 86_400));
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: RequestLike, @Res({ passthrough: true }) res: ResponseLike) {
    await this.auth.logout(req);
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return { ok: true };
  }

  /** `{ user: null }` when signed out, so the page doesn't log a 401 on every visit. */
  @Get('me')
  async me(@Req() req: RequestLike) {
    const user = await this.auth.userFromRequest(req);
    return { user: user ? this.auth.toPublic(user) : null };
  }

  @Put('follows')
  async follows(@Req() req: RequestLike, @Body() body: { follows?: unknown }) {
    checkOrigin(req);
    return { follows: await this.auth.setFollows(req, body.follows) };
  }

  @Post('password')
  @HttpCode(200)
  async password(@Req() req: RequestLike, @Body() body: Record<string, unknown>) {
    checkOrigin(req);
    await this.auth.changePassword(req, body);
    return { ok: true };
  }
}

/** /admin page data: registered users. Site numbers come from AppController (api/admin/overview). */
@UseGuards(AdminGuard)
@Controller('api/admin/users')
export class AdminUsersController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  list() {
    return this.auth.listUsers();
  }

  @Post(':id/password')
  @HttpCode(200)
  async reset(@Param('id') id: string, @Body() body: { password?: unknown }) {
    await this.auth.adminResetPassword(id, body.password);
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.auth.adminDeleteUser(id);
    return { ok: true };
  }
}
