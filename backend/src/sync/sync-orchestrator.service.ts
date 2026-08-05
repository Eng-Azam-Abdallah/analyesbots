import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CanbosoSyncService } from '../canboso/canboso-sync.service';
import { HyperVinSyncService } from '../hypervin/hypervin-sync.service';
import { ResellerSyncService } from '../reseller/reseller-sync.service';
import { ShopDigitalSyncService } from '../shopdigital/shopdigital-sync.service';
import { TechnySoftSyncService } from '../technysoft/technysoft-sync.service';
import { TeleShopBotSyncService } from '../teleshopbot/teleshopbot-sync.service';
import { TelegramBuyerSyncService } from '../telegrambuyer/telegrambuyer-sync.service';
import { ZoomStooreSyncService } from '../zoomstoore/zoomstoore-sync.service';

@Injectable()
export class SyncOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(SyncOrchestrator.name);
  private running = false;

  constructor(
    private readonly reseller: ResellerSyncService,
    private readonly canboso: CanbosoSyncService,
    private readonly zoomstoore: ZoomStooreSyncService,
    private readonly technysoft: TechnySoftSyncService,
    private readonly telegramBuyer: TelegramBuyerSyncService,
    private readonly hypervin: HyperVinSyncService,
    private readonly shopdigital: ShopDigitalSyncService,
    private readonly teleshopbot: TeleShopBotSyncService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.runAll('startup');
  }

  @Cron('*/1 * * * *')
  async handleCron() {
    await this.runAll('cron');
  }

  async runAll(trigger: 'startup' | 'cron' | 'manual') {
    if (this.running) {
      this.logger.warn(`Sync orchestrator busy — skipped (${trigger})`);
      return { skipped: true as const };
    }

    this.running = true;
    const results: Record<string, unknown> = {};

    const jobs: Array<[string, string, () => Promise<unknown>]> = [
      ['reseller', 'RESELLER_API_KEY', () => this.reseller.runSync()],
      ['canboso', 'CANBOSO_API_KEY', () => this.canboso.runSync()],
      ['zoomstoore', 'ZOOMSTOORE_API_KEY', () => this.zoomstoore.runSync()],
      ['technysoft', 'TECHNYSOFT_API_KEY', () => this.technysoft.runSync()],
      [
        'telegrambuyer',
        'TELEGRAM_BUYER_API_KEY',
        () => this.telegramBuyer.runSync(),
      ],
      ['hypervin', 'HYPERVIN_API_KEY', () => this.hypervin.runSync()],
      [
        'shopdigital',
        'SHOPDIGITAL_API_KEY',
        () => this.shopdigital.runSync(),
      ],
      [
        'teleshopbot',
        'TELESHOPBOT_API_KEY',
        () => this.teleshopbot.runSync(),
      ],
    ];

    try {
      for (const [name, envKey, run] of jobs) {
        if (!this.config.get<string>(envKey)) continue;
        try {
          results[name] = await run();
        } catch (error) {
          results[name] = {
            error: error instanceof Error ? error.message : String(error),
          };
          this.logger.error(
            `${name} sync failed on ${trigger}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }

      return { skipped: false as const, results };
    } finally {
      this.running = false;
    }
  }
}
