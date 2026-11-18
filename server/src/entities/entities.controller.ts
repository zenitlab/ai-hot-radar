import { Controller, Get, Post, Param, Query, HttpCode, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { EntitiesService } from './entities.service';

@Controller('api/entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get()
  findAll() {
    return this.entitiesService.findAll();
  }

  @Get('graph')
  getGraph() {
    return this.entitiesService.getGraph();
  }

  @Get('news')
  getNewsForName(@Query('name') name: string, @Query('limit') limit?: string) {
    return this.entitiesService.getLatestNews(name ?? '', parseInt(limit ?? '6'));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entitiesService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/refresh')
  @HttpCode(200)
  refresh(@Param('id') id: string) {
    return this.entitiesService.refresh(id);
  }
}
