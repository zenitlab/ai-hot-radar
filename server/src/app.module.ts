import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';
import { ServicesModule } from './services/services.module';
import { KeywordsModule } from './keywords/keywords.module';
import { HotspotsModule } from './hotspots/hotspots.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CuratedModule } from './curated/curated.module';
import { DigestModule } from './digest/digest.module';
import { ChatModule } from './chat/chat.module';
import { AgentModule } from './agent/agent.module';
import { EntitiesModule } from './entities/entities.module';
import { TopicsModule } from './topics/topics.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    GatewayModule,
    ServicesModule,
    KeywordsModule,
    HotspotsModule,
    NotificationsModule,
    SettingsModule,
    SchedulerModule,
    CuratedModule,
    DigestModule,
    ChatModule,
    AgentModule,
    EntitiesModule,
    TopicsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
