import { Module } from '@nestjs/common';
import { HotspotsController } from './hotspots.controller';
import { HotspotsService } from './hotspots.service';
import { DiscoveryJob } from './discovery.job';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [HotspotsController],
  providers: [HotspotsService, DiscoveryJob],
})
export class HotspotsModule {}
