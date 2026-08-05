import { Module } from '@nestjs/common';
import { HyperVinApiClient } from './hypervin-api.client';
import { HyperVinSyncService } from './hypervin-sync.service';

@Module({
  providers: [HyperVinApiClient, HyperVinSyncService],
  exports: [HyperVinSyncService],
})
export class HyperVinModule {}
