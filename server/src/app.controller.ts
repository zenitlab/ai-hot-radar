import { Controller, Get, Post, Inject, HttpCode } from '@nestjs/common';
import { HotspotScheduler } from './scheduler/hotspot.scheduler';

@Controller('api')
export class AppController {
  constructor(@Inject(HotspotScheduler) private scheduler: HotspotScheduler) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Fire-and-forget: returns immediately, scan continues in the background. */
  @Post('check-hotspots')
  @HttpCode(202)
  checkHotspots() {
    const result = this.scheduler.triggerScan();
    if (!result.started) {
      return { message: 'Scan already in progress', ...this.scheduler.getScanStatus() };
    }
    return { message: 'Hotspot check started', ...this.scheduler.getScanStatus() };
  }

  @Get('scan-status')
  scanStatus() {
    return this.scheduler.getScanStatus();
  }
}
