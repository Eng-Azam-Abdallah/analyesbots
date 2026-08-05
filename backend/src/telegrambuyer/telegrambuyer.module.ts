import { Module } from '@nestjs/common';
import { TelegramBuyerApiClient } from './telegrambuyer-api.client';
import { TelegramBuyerSyncService } from './telegrambuyer-sync.service';

@Module({
  providers: [TelegramBuyerApiClient, TelegramBuyerSyncService],
  exports: [TelegramBuyerSyncService],
})
export class TelegramBuyerModule {}
