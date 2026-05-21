import { Controller, Get, Patch, Delete, Param, Query, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query() query: { page?: string; limit?: string; unreadOnly?: string }) {
    return this.notificationsService.findAll(query);
  }

  // /read-all 必须在 /:id/read 之前声明
  @Patch('read-all')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  // DELETE / 必须在 DELETE /:id 之前声明
  @Delete()
  @HttpCode(200)
  clear() {
    return this.notificationsService.clear();
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
