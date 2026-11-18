import { Module } from '@nestjs/common';
import { HotspotsController } from './hotspots.controller';
import { HotspotsService } from './hotspots.service';
import { DiscoveryJob } from './discovery.job';
import { StoryDigestJob } from './story-digest.job';
import { ServicesModule } from '../services/services.module';
import { TranslateJob } from './translate.job';

@Module({
  imports: [ServicesModule],
  controllers: [HotspotsController],
  providers: [HotspotsService, DiscoveryJob, StoryDigestJob, TranslateJob],
})
export class HotspotsModule {}
