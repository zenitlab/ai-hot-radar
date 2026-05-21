import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    return settings.reduce((acc: Record<string, string>, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException('Setting not found');
    return { key: setting.key, value: setting.value };
  }

  async updateBatch(settings: Record<string, string>) {
    if (typeof settings !== 'object') throw new BadRequestException('Invalid settings format');
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    );
    await Promise.all(updates);
    return { message: 'Settings updated' };
  }

  async updateOne(key: string, value: string) {
    if (value === undefined) throw new BadRequestException('Value is required');
    return this.prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
}
