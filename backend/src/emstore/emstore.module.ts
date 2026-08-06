import { Module } from '@nestjs/common';
import { EmStoreApiClient } from './emstore-api.client';
import { EmStoreSyncService } from './emstore-sync.service';

@Module({
  providers: [EmStoreApiClient, EmStoreSyncService],
  exports: [EmStoreSyncService],
})
export class EmStoreModule {}
