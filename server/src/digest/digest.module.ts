import { Module } from '@nestjs/common';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DigestController],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
