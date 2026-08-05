import { Module } from '@nestjs/common';
import { ZoomStooreApiClient } from './zoomstoore-api.client';
import { ZoomStooreSyncService } from './zoomstoore-sync.service';

@Module({
  providers: [ZoomStooreApiClient, ZoomStooreSyncService],
  exports: [ZoomStooreSyncService],
})
export class ZoomStooreModule {}
