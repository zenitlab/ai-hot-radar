import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { DigestService } from './digest.service';

@Controller('api/digest')
export class DigestController {
  constructor(private readonly digestService: DigestService) {}

  @Get('today')
  getToday() {
    return this.digestService.getTodayDigest();
  }

  /** Manually generate digest. date defaults to today (Beijing time). */
  @Post('generate')
  async generate(@Query('date') date?: string) {
    const target = date || this.digestService.getBeijingDatePublic();
    await this.digestService.generateDigest(target);
    return { message: `Digest generated for ${target}` };
  }

  @Get('recent')
  getRecent() {
    return this.digestService.getRecentDigests();
  }

  @Get(':date')
  getByDate(@Param('date') date: string) {
    return this.digestService.getDigestByDate(date);
  }
}
