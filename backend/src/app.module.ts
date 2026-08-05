import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BotsModule } from './bots/bots.module';
import { ChangesModule } from './changes/changes.module';
import { HealthModule } from './health/health.module';
import { MarketModule } from './market/market.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    SyncModule,
    ProductsModule,
    ChangesModule,
    MarketModule,
    BotsModule,
  ],
})
export class AppModule {}
