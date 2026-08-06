import { Module } from '@nestjs/common';
import { InsightXApiClient } from './insightx-api.client';
import { InsightXSyncService } from './insightx-sync.service';

@Module({
  providers: [InsightXApiClient, InsightXSyncService],
  exports: [InsightXSyncService],
})
export class InsightXModule {}
