import { Module } from '@nestjs/common';
import { CuratedController } from './curated.controller';
import { CuratedService } from './curated.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CuratedController],
  providers: [CuratedService],
  exports: [CuratedService],
})
export class CuratedModule {}
