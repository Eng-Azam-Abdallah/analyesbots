import { Module } from '@nestjs/common';
import { AiMarketModule } from '../aimarket/aimarket.module';
import { CanbosoModule } from '../canboso/canboso.module';
import { EmStoreModule } from '../emstore/emstore.module';
import { HyperVinModule } from '../hypervin/hypervin.module';
import { InsightXModule } from '../insightx/insightx.module';
import { QamifyModule } from '../qamify/qamify.module';
import { ResellerModule } from '../reseller/reseller.module';
import { ShopDigitalModule } from '../shopdigital/shopdigital.module';
import { TechnySoftModule } from '../technysoft/technysoft.module';
import { TeleShopBotModule } from '../teleshopbot/teleshopbot.module';
import { TelegramBuyerModule } from '../telegrambuyer/telegrambuyer.module';
import { VexoranModule } from '../vexoran/vexoran.module';
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
    QamifyModule,
    InsightXModule,
    AiMarketModule,
    VexoranModule,
    EmStoreModule,
  ],
  providers: [SyncOrchestrator],
  controllers: [SyncOrchestratorController],
  exports: [SyncOrchestrator],
})
export class SyncModule {}
