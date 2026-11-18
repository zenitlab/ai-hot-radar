import { Module } from '@nestjs/common';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [DigestController],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
