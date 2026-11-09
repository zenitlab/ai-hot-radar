import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, NotFoundException } from '@nestjs/common';
import { HotspotsService, HotspotFilterQuery } from './hotspots.service';

@Controller('api/hotspots')
export class HotspotsController {
  constructor(private readonly hotspotsService: HotspotsService) {}

  @Get()
  findAll(@Query() query: HotspotFilterQuery) {
    return this.hotspotsService.findAll(query);
  }

  // /trending 和 /stats 必须在 /:id 之前声明
  @Get('trending')
  getTrending(@Query('limit') limit?: string) {
    return this.hotspotsService.getTrending(limit);
  }

  @Get('stories')
  listStories() {
    return this.hotspotsService.listStories();
  }

  @Get('story/:clusterKey')
  async getStory(@Param('clusterKey') clusterKey: string) {
    const story = await this.hotspotsService.getStory(clusterKey);
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

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
