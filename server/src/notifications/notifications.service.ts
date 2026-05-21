import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: string; limit?: string; unreadOnly?: string }) {
    const { page = '1', limit = '50', unreadOnly } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      data: notifications,
      unreadCount,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async markRead(id: string) {
    try {
      return await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException('Notification not found');
      throw error;
    }
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }

  async remove(id: string) {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException('Notification not found');
      throw error;
    }
  }

  async clear() {
    await this.prisma.notification.deleteMany({});
    return { message: 'All notifications deleted' };
  }
}
