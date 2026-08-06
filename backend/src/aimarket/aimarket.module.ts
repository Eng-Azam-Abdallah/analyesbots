import { Module } from '@nestjs/common';
import { AiMarketApiClient } from './aimarket-api.client';
import { AiMarketSyncService } from './aimarket-sync.service';

@Module({
  providers: [AiMarketApiClient, AiMarketSyncService],
  exports: [AiMarketSyncService],
})
export class AiMarketModule {}
