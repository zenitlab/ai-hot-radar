import { Controller, Get, Post, Put, Patch, Delete, Param, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { KeywordsService } from './keywords.service';

@Controller('api/keywords')
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get()
  findAll() {
    return this.keywordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.keywordsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() body: { text: string; category?: string }) {
    return this.keywordsService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: { text?: string; category?: string; isActive?: boolean }) {
    return this.keywordsService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.keywordsService.toggle(id);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.keywordsService.remove(id);
  }
}
