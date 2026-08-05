import { Module } from '@nestjs/common';
import { TechnySoftApiClient } from './technysoft-api.client';
import { TechnySoftSyncService } from './technysoft-sync.service';

@Module({
  providers: [TechnySoftApiClient, TechnySoftSyncService],
  exports: [TechnySoftSyncService],
})
export class TechnySoftModule {}
