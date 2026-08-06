import { Module } from '@nestjs/common';
import { VexoranApiClient } from './vexoran-api.client';
import { VexoranSyncService } from './vexoran-sync.service';

@Module({
  providers: [VexoranApiClient, VexoranSyncService],
  exports: [VexoranSyncService],
})
export class VexoranModule {}
