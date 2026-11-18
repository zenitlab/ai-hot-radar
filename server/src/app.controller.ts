import { Controller, Get, Post, Inject, HttpCode, UseGuards } from '@nestjs/common';
import { AdminGuard } from './auth/admin.guard';
import { HotspotScheduler } from './scheduler/hotspot.scheduler';
import { PrismaService } from './prisma/prisma.service';
import { AiService } from './services/ai.service';

@Controller('api')
export class AppController {
  constructor(
    @Inject(HotspotScheduler) private scheduler: HotspotScheduler,
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** 200 for the admin (signed in as ADMIN_EMAIL, or x-admin-token), 401/403 otherwise. */
  @UseGuards(AdminGuard)
  @Get('admin/verify')
  verifyAdmin() {
    return { ok: true };
  }

  /** Site numbers for the /admin page. */
  @UseGuards(AdminGuard)
  @Get('admin/overview')
  async adminOverview() {
    const now = Date.now();
    const dayAgo = new Date(now - 86_400_000);
    const weekAgo = new Date(now - 7 * 86_400_000);
    const [hotspots, hotspots24h, curated24h, untranslated, users, users7d, activeUsers7d, digests, keywords] = await Promise.all([
      this.prisma.hotspot.count(),
      this.prisma.hotspot.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.hotspot.count({ where: { createdAt: { gte: dayAgo }, isCurated: true } }),
      this.prisma.hotspot.count({ where: { createdAt: { gte: dayAgo }, isCurated: true, titleZh: null } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      this.prisma.dailyDigest.findMany({ orderBy: { date: 'desc' }, take: 7, select: { date: true, data: true, createdAt: true } }),
      this.prisma.keyword.count({ where: { isActive: true } }),
    ]);
    return {
      scan: this.scheduler.getScanStatus(),
      ai: this.ai.getStats(),
      content: { hotspots, hotspots24h, curated24h, untranslated, keywords },
      users: { total: users, new7d: users7d, active7d: activeUsers7d },
      digests: digests.map((d) => {
        let fallback = false;
        let highlights = 0;
        try {
          const parsed = JSON.parse(d.data) as { fallback?: boolean; highlights?: unknown[] };
          fallback = !!parsed.fallback;
          highlights = parsed.highlights?.length ?? 0;
        } catch {
          /* unreadable digest: report as-is */
        }
        return { date: d.date, createdAt: d.createdAt, fallback, highlights };
      }),
    };
  }

  /**
   * Fire-and-forget: returns immediately, scan continues in the background.
   * Admin only, and at most one manual scan per MANUAL_SCAN_COOLDOWN_MS: a
   * scan costs dozens of model calls.
   */
  @UseGuards(AdminGuard)
  @Post('check-hotspots')
  @HttpCode(202)
  checkHotspots() {
    const result = this.scheduler.triggerScan({ manual: true });
    if (!result.started) {
      const message = result.reason === 'cooldown' ? 'Manual scan cooling down' : 'Scan already in progress';
      return { message, reason: result.reason, ...this.scheduler.getScanStatus() };
    }
    return { message: 'Hotspot check started', ...this.scheduler.getScanStatus() };
  }

  @Get('scan-status')
  scanStatus() {
    return this.scheduler.getScanStatus();
  }
}
