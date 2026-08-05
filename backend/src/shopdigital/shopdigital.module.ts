import { Module } from '@nestjs/common';
import { ShopDigitalApiClient } from './shopdigital-api.client';
import { ShopDigitalSyncService } from './shopdigital-sync.service';

@Module({
  providers: [ShopDigitalApiClient, ShopDigitalSyncService],
  exports: [ShopDigitalSyncService],
})
export class ShopDigitalModule {}
