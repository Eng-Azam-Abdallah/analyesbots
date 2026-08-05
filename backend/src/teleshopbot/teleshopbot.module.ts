import { Module } from '@nestjs/common';
import { TeleShopBotApiClient } from './teleshopbot-api.client';
import { TeleShopBotSyncService } from './teleshopbot-sync.service';

@Module({
  providers: [TeleShopBotApiClient, TeleShopBotSyncService],
  exports: [TeleShopBotSyncService],
})
export class TeleShopBotModule {}
