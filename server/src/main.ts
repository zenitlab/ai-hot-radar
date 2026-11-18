import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './app.module';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Local development against a copy of the data without spending model
  // quota: DISABLE_CRON=true stops every scheduled job (scans, digest,
  // translation); pair it with SCAN_ON_BOOT=false.
  if (process.env.DISABLE_CRON === 'true') {
    // Cron jobs are registered during init, so initialise before stopping them.
    await app.init();
    const jobs = app.get(SchedulerRegistry).getCronJobs();
    jobs.forEach((job) => job.stop());
    console.log(`⏸  DISABLE_CRON: stopped ${jobs.size} scheduled jobs`);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  🔥 热点监控服务启动成功!
  📡 Server running on http://localhost:${port}
  🔌 WebSocket ready
  ⏰ Hotspot check scheduled every 30 minutes
  `);
}

bootstrap();
