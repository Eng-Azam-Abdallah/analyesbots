import { Module } from '@nestjs/common';
import { ResellerApiClient } from './reseller-api.client';
import { ResellerSyncService } from './reseller-sync.service';

@Module({
  providers: [ResellerApiClient, ResellerSyncService],
  exports: [ResellerSyncService],
})
export class ResellerModule {}
