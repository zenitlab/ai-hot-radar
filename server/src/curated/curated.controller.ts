import { Controller, Get, Query } from '@nestjs/common';
import { CuratedService, CuratedPeriod } from './curated.service';

@Controller('api/curated')
export class CuratedController {
  constructor(private readonly curatedService: CuratedService) {}

  @Get()
  getCurated(
    @Query('period') period: CuratedPeriod = 'today',
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @Query('category') category?: string,
    @Query('region') region?: string,
    @Query('search') search?: string,
  ) {
    return this.curatedService.getCurated({
      period,
      limit: Number(limit),
      offset: Number(offset),
      category,
      region,
      search,
    });
  }
}
