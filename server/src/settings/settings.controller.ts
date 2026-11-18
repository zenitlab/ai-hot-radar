import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SettingsService } from './settings.service';

@UseGuards(AdminGuard)
@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  // PUT / 必须在 PUT /:key 之前声明
  @Put()
  updateBatch(@Body() body: Record<string, string>) {
    return this.settingsService.updateBatch(body);
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Put(':key')
  updateOne(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.updateOne(key, value);
  }
}
