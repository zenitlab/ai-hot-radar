import { Module } from '@nestjs/common';
import { HotspotScheduler } from './hotspot.scheduler';
import { GatewayModule } from '../gateway/gateway.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [GatewayModule, ServicesModule],
  providers: [HotspotScheduler],
  exports: [HotspotScheduler],
})
export class SchedulerModule {}
