import { Module } from '@nestjs/common';
import { CanbosoModule } from '../canboso/canboso.module';
import { HyperVinModule } from '../hypervin/hypervin.module';
import { ResellerModule } from '../reseller/reseller.module';
import { ShopDigitalModule } from '../shopdigital/shopdigital.module';
import { TechnySoftModule } from '../technysoft/technysoft.module';
import { TeleShopBotModule } from '../teleshopbot/teleshopbot.module';
import { TelegramBuyerModule } from '../telegrambuyer/telegrambuyer.module';
import { ZoomStooreModule } from '../zoomstoore/zoomstoore.module';
import { SyncOrchestrator } from './sync-orchestrator.service';
import { SyncOrchestratorController } from './sync-orchestrator.controller';

@Module({
  imports: [
    ResellerModule,
    CanbosoModule,
    ZoomStooreModule,
    TechnySoftModule,
    TelegramBuyerModule,
    HyperVinModule,
    ShopDigitalModule,
    TeleShopBotModule,
  ],
  providers: [SyncOrchestrator],
  controllers: [SyncOrchestratorController],
  exports: [SyncOrchestrator],
})
export class SyncModule {}
