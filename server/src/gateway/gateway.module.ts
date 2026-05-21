import { Module } from '@nestjs/common';
import { HotspotGateway } from './hotspot.gateway';

@Module({
  providers: [HotspotGateway],
  exports: [HotspotGateway],
})
export class GatewayModule {}
