import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly prisma: PrismaService,
  ) {}

  // ===== REST API =====

  @Get('api/agent/curated')
  getCurated(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.agentService.getCurated(Number(limit), Number(offset));
  }

  @Get('api/agent/search')
  search(@Query('q') q = '', @Query('limit') limit = '20') {
    return this.agentService.search(q, Number(limit));
  }

  @Get('api/agent/stats')
  getStats() {
    return this.agentService.getStats();
  }

  @Get('api/agent/digest')
  async getDigest(@Query('date') date?: string) {
    const targetDate = date || this.getTodayBeijing();
    const digest = await this.prisma.dailyDigest.findUnique({ where: { date: targetDate } });
    return digest ? { date: digest.date, data: JSON.parse(digest.data) } : null;
  }

  // ===== RSS Feeds =====

  @Get('api/agent/rss/curated.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async getCuratedRss(@Res() res: any) {
    const items = await this.agentService.getCurated(50, 0);
    const xml = this.agentService.buildRssXml(
      'AIHOT 精选 AI 资讯',
      '经过 AI 质量评分精选的 AI 行业资讯',
      items,
    );
    res.type('application/xml').send(xml);
  }

  @Get('api/agent/rss/all.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async getAllRss(@Res() res: any) {
    const items = await this.prisma.hotspot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const xml = this.agentService.buildRssXml(
      'AIHOT 全部 AI 资讯',
      '所有 AI 相关资讯（含关键词监控和 RSS 信源）',
      items,
    );
    res.type('application/xml').send(xml);
  }

  @Get('api/agent/rss/digest.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async getDigestRss(@Res() res: any) {
    const digests = await this.prisma.dailyDigest.findMany({
      orderBy: { date: 'desc' },
      take: 7,
    });
    const items = digests.map((d) => ({
      title: `AI 日报 ${d.date}`,
      url: `https://aihot.example.com/digest/${d.date}`,
      summary: `${d.date} 的 AI 行业精选日报`,
      publishedAt: d.createdAt,
      source: 'AIHOT Daily Digest',
    }));
    const xml = this.agentService.buildRssXml(
      'AIHOT AI 日报',
      '每日 AI 行业精选资讯日报',
      items,
    );
    res.type('application/xml').send(xml);
  }

  // ===== Skill Descriptor =====

  @Get('aihot-skill')
  getSkill() {
    return {
      name: 'AIHOT',
      version: '1.0',
      description: 'AI 热点监控数据查询 - 精选 AI 行业资讯、每日日报、关键词搜索',
      endpoints: [
        {
          path: '/api/agent/curated',
          method: 'GET',
          description: '获取精选 AI 资讯（经质量评分筛选）',
          params: { limit: '条数（默认20）', offset: '偏移（默认0）' },
        },
        {
          path: '/api/agent/digest',
          method: 'GET',
          description: '获取 AI 日报',
          params: { date: '日期 YYYY-MM-DD（默认今天）' },
        },
        {
          path: '/api/agent/search',
          method: 'GET',
          description: '按关键词搜索 AI 资讯',
          params: { q: '搜索关键词', limit: '条数（默认20）' },
        },
        {
          path: '/api/agent/stats',
          method: 'GET',
          description: '获取系统统计数据',
        },
        {
          path: '/api/agent/rss/curated.xml',
          method: 'GET',
          description: '精选资讯 RSS Feed',
        },
        {
          path: '/api/agent/rss/all.xml',
          method: 'GET',
          description: '全部资讯 RSS Feed',
        },
        {
          path: '/api/agent/rss/digest.xml',
          method: 'GET',
          description: 'AI 日报 RSS Feed',
        },
      ],
    };
  }

  private getTodayBeijing(): string {
    const now = new Date();
    const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijing.toISOString().slice(0, 10);
  }
}
