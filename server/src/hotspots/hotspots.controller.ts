import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { HotspotsService, HotspotFilterQuery } from './hotspots.service';

@Controller('api/hotspots')
export class HotspotsController {
  constructor(private readonly hotspotsService: HotspotsService) {}

  @Get()
  findAll(@Query() query: HotspotFilterQuery) {
    return this.hotspotsService.findAll(query);
  }

  // /stats 必须在 /:id 之前声明
  @Get('stats')
  getStats() {
    return this.hotspotsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hotspotsService.findOne(id);
  }

  @Post('search')
  search(@Body() body: { query: string; sources?: string[] }) {
    return this.hotspotsService.search(body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.hotspotsService.remove(id);
  }
}
