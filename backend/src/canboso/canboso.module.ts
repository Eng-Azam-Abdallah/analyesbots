import { Module } from '@nestjs/common';
import { CanbosoApiClient } from './canboso-api.client';
import { CanbosoSyncService } from './canboso-sync.service';

@Module({
  providers: [CanbosoApiClient, CanbosoSyncService],
  exports: [CanbosoSyncService],
})
export class CanbosoModule {}
