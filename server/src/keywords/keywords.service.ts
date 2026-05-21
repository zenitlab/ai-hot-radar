import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitiesService } from '../entities/entities.service';

@Injectable()
export class KeywordsService {
  constructor(
    private prisma: PrismaService,
    private entitiesService: EntitiesService,
  ) {}

  findAll() {
    return this.prisma.keyword.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { hotspots: true } } },
    });
  }

  async findOne(id: string) {
    const keyword = await this.prisma.keyword.findUnique({
      where: { id },
      include: { hotspots: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!keyword) throw new NotFoundException('Keyword not found');
    return keyword;
  }

  async create(data: { text: string; category?: string }) {
    if (!data.text || data.text.trim().length === 0) {
      throw new BadRequestException('Keyword text is required');
    }
    let keyword: Awaited<ReturnType<typeof this.prisma.keyword.create>>;
    try {
      keyword = await this.prisma.keyword.create({
        data: { text: data.text.trim(), category: data.category?.trim() || null },
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('Keyword already exists');
      throw error;
    }
    // Fire-and-forget entity profile generation
    this.entitiesService.createForKeyword(keyword.id, keyword.text).catch((err) => {
      console.error('[Keywords] entity generation failed:', err);
    });
    return keyword;
  }

  async update(id: string, data: { text?: string; category?: string; isActive?: boolean }) {
    try {
      return await this.prisma.keyword.update({
        where: { id },
        data: {
          ...(data.text && { text: data.text.trim() }),
          ...(data.category !== undefined && { category: data.category?.trim() || null }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException('Keyword not found');
      throw error;
    }
  }

  async toggle(id: string) {
    const keyword = await this.prisma.keyword.findUnique({ where: { id } });
    if (!keyword) throw new NotFoundException('Keyword not found');
    return this.prisma.keyword.update({ where: { id }, data: { isActive: !keyword.isActive } });
  }

  async remove(id: string) {
    try {
      await this.prisma.keyword.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException('Keyword not found');
      throw error;
    }
  }
}
