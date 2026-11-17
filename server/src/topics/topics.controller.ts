import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { TopicsService } from './topics.service';

@Controller('api/topics')
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  list() {
    return this.topics.list();
  }

  /** For the sitemap: topics with enough items to index. */
  @Get('indexable')
  indexable() {
    return this.topics.indexable();
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string, @Query('page') page?: string) {
    const data = await this.topics.detail(slug, page);
    if (!data) throw new NotFoundException('Topic not found');
    return data;
  }
}
