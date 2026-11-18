import { Controller, Get, Post, Inject, HttpCode, UseGuards } from '@nestjs/common';
import { AdminGuard } from './auth/admin.guard';
import { HotspotScheduler } from './scheduler/hotspot.scheduler';

@Controller('api')
export class AppController {
  constructor(@Inject(HotspotScheduler) private scheduler: HotspotScheduler) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** 200 when the x-admin-token header is valid, 401 otherwise. Lets the frontend check a token before storing it. */
  @UseGuards(AdminGuard)
  @Get('admin/verify')
  verifyAdmin() {
    return { ok: true };
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
