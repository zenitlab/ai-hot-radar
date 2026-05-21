import { Controller, Get, Post, Put, Patch, Delete, Param, Body, HttpCode } from '@nestjs/common';
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

  @Post()
  create(@Body() body: { text: string; category?: string }) {
    return this.keywordsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { text?: string; category?: string; isActive?: boolean }) {
    return this.keywordsService.update(id, body);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.keywordsService.toggle(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.keywordsService.remove(id);
  }
}
