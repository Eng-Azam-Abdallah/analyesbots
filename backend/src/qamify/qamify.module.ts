import { Module } from '@nestjs/common';
import { QamifyApiClient } from './qamify-api.client';
import { QamifySyncService } from './qamify-sync.service';

@Module({
  providers: [QamifyApiClient, QamifySyncService],
  exports: [QamifySyncService],
})
export class QamifyModule {}
