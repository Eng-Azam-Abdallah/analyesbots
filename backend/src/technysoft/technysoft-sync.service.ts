import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TechnySoftApiClient } from './technysoft-api.client';
import type { TechnySoftProductDto } from './technysoft.types';

@Injectable()
export class TechnySoftSyncService {
  private readonly logger = new Logger(TechnySoftSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: TechnySoftApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'TECHNYSOFT_BOT_USERNAME',
      'mkeshopbot',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'MKE Store',
        displayName: '@mkeshopbot',
        sourceType: 'technysoft_api',
      },
      update: {
        sourceType: 'technysoft_api',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('TechnySoft sync already running — skipped');
      return { skipped: true as const };
    }

    this.running = true;
    const bot = await this.ensureBot();
    const startedAt = new Date();
    let productsSeen = 0;
    let changesDetected = 0;

    try {
      const [products, me] = await Promise.all([
        this.api.getProducts(),
        this.api.getMe().catch((error: Error) => {
          this.logger.warn(`TechnySoft /me failed: ${error.message}`);
          return null;
        }),
      ]);

      productsSeen = products.length;

      if (me?.name) {
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: {
            displayName: me.name,
            name: me.name,
          },
        });
      }

      if (me && typeof me.balance === 'number') {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(me.balance),
            currency: me.currency || 'USD',
          },
        });
      }

      const seenKeys = new Set<string>();

      for (const remote of products) {
        const key = String(remote.id);
        seenKeys.add(key);
        const result = await this.upsertProduct(bot.id, remote);
        changesDetected += result.changes;
      }

      const activeProducts = await this.prisma.product.findMany({
        where: { botId: bot.id, isActive: true },
      });

      for (const existing of activeProducts) {
        if (!seenKeys.has(existing.externalKey)) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: { isActive: false },
          });
          await this.prisma.marketChange.create({
            data: {
              productId: existing.id,
              kind: MarketChangeKind.gone,
              fromPrice: existing.currentPrice,
              toPrice: existing.currentPrice,
              fromStock: existing.stock,
              toStock: existing.stock,
            },
          });
          changesDetected += 1;
        }
      }

      await this.prisma.bot.update({
        where: { id: bot.id },
        data: { lastSyncedAt: new Date() },
      });

      await this.prisma.syncRun.create({
        data: {
          botId: bot.id,
          status: SyncRunStatus.ok,
          productsSeen,
          changesDetected,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `TechnySoft sync ok — products=${productsSeen} changes=${changesDetected}`,
      );

      return { skipped: false as const, productsSeen, changesDetected };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown TechnySoft sync error';

      await this.prisma.syncRun.create({
        data: {
          botId: bot.id,
          status: SyncRunStatus.error,
          productsSeen,
          changesDetected,
          errorMessage: message,
          startedAt,
          finishedAt: new Date(),
        },
      });

      this.logger.error(`TechnySoft sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: TechnySoftProductDto) {
    const externalKey = String(remote.id);
    const title =
      remote.name_ar?.trim() ||
      remote.name_en?.trim() ||
      `Product ${externalKey}`;
    const description =
      remote.description_ar?.trim() ||
      remote.description_en?.trim() ||
      null;
    const price = Number(remote.price_usd ?? 0);
    const stock =
      remote.unlimited || remote.stock === null
        ? 999999
        : Math.max(0, Math.floor(Number(remote.stock)));
    const isActive =
      remote.unlimited === true ||
      remote.stock === null ||
      Number(remote.stock) > 0;

    const existing = await this.prisma.product.findUnique({
      where: {
        botId_externalKey: { botId, externalKey },
      },
    });

    const payload = remote as unknown as Prisma.InputJsonValue;
    const deliveryInstruction = remote.activation_url ?? null;

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey,
          title,
          description,
          deliveryInstruction,
          currency: 'USD',
          currentPrice: new Prisma.Decimal(price),
          wholesalePrice: new Prisma.Decimal(price),
          offerPrice: new Prisma.Decimal(price),
          stock,
          isActive,
          rawPayload: payload,
        },
      });

      await this.prisma.priceSnapshot.create({
        data: {
          productId: created.id,
          price: created.currentPrice,
          stock: created.stock,
        },
      });

      await this.prisma.marketChange.create({
        data: {
          productId: created.id,
          kind: MarketChangeKind.new,
          toPrice: created.currentPrice,
          toStock: created.stock,
        },
      });

      return { changes: 1 };
    }

    let changes = 0;
    const previousPrice = Number(existing.currentPrice);
    const previousStock = existing.stock;
    const priceChanged = previousPrice !== price;
    const stockChanged = previousStock !== stock;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title,
        description,
        deliveryInstruction,
        currency: 'USD',
        currentPrice: new Prisma.Decimal(price),
        wholesalePrice: new Prisma.Decimal(price),
        offerPrice: new Prisma.Decimal(price),
        stock,
        isActive,
        rawPayload: payload,
      },
    });

    if (priceChanged || stockChanged) {
      await this.prisma.priceSnapshot.create({
        data: {
          productId: existing.id,
          price: new Prisma.Decimal(price),
          stock,
        },
      });
    }

    if (priceChanged) {
      const changePercent =
        previousPrice === 0
          ? null
          : ((price - previousPrice) / previousPrice) * 100;

      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            price > previousPrice
              ? MarketChangeKind.up
              : MarketChangeKind.down,
          fromPrice: new Prisma.Decimal(previousPrice),
          toPrice: new Prisma.Decimal(price),
          changePercent:
            changePercent === null
              ? null
              : new Prisma.Decimal(changePercent.toFixed(4)),
          fromStock: previousStock,
          toStock: stock,
        },
      });
      changes += 1;
    }

    if (stockChanged) {
      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            stock > previousStock
              ? MarketChangeKind.stock_up
              : MarketChangeKind.stock_down,
          fromPrice: new Prisma.Decimal(price),
          toPrice: new Prisma.Decimal(price),
          fromStock: previousStock,
          toStock: stock,
        },
      });
      changes += 1;
    }

    return { changes };
  }
}
