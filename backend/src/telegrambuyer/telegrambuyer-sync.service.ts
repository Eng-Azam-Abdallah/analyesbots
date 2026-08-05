import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBuyerApiClient } from './telegrambuyer-api.client';
import type { TelegramBuyerProductDto } from './telegrambuyer.types';

@Injectable()
export class TelegramBuyerSyncService {
  private readonly logger = new Logger(TelegramBuyerSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: TelegramBuyerApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'TELEGRAM_BUYER_BOT_USERNAME',
      'TelegramBuyer',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'Buyer API',
        displayName: 'Buyer API',
        sourceType: 'telegram_buyer_api',
      },
      update: {
        sourceType: 'telegram_buyer_api',
        name: 'Buyer API',
        displayName: 'Buyer API',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('TelegramBuyer sync already running — skipped');
      return { skipped: true as const };
    }

    this.running = true;
    const bot = await this.ensureBot();
    const startedAt = new Date();
    let productsSeen = 0;
    let changesDetected = 0;

    try {
      const [productsResponse, balanceResponse] = await Promise.all([
        this.api.getProducts(),
        this.api.getBalance().catch((error: Error) => {
          this.logger.warn(`TelegramBuyer balance failed: ${error.message}`);
          return null;
        }),
      ]);

      const remoteProducts = Array.isArray(productsResponse.products)
        ? productsResponse.products
        : [];
      productsSeen = remoteProducts.length;

      if (balanceResponse && typeof balanceResponse.balance === 'number') {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(balanceResponse.balance),
            currency: 'USDT',
          },
        });
      }

      const seenKeys = new Set<string>();

      for (const remote of remoteProducts) {
        const externalKey = String(remote.product_id);
        if (!externalKey) continue;
        seenKeys.add(externalKey);
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
        `TelegramBuyer sync ok — products=${productsSeen} changes=${changesDetected}`,
      );

      return { skipped: false as const, productsSeen, changesDetected };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown TelegramBuyer sync error';

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

      this.logger.error(`TelegramBuyer sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: TelegramBuyerProductDto) {
    const externalKey = String(remote.product_id);
    const title = (remote.name || `Product ${externalKey}`).trim();
    const price = Number(remote.price);
    const stock = Math.max(0, Math.floor(Number(remote.stock) || 0));
    const description =
      typeof remote.description === 'string'
        ? remote.description.trim() || null
        : null;
    const safePrice = Number.isFinite(price) ? price : 0;
    const payload = remote as unknown as Prisma.InputJsonValue;

    const existing = await this.prisma.product.findUnique({
      where: {
        botId_externalKey: {
          botId,
          externalKey,
        },
      },
    });

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey,
          title,
          description,
          currency: 'USDT',
          currentPrice: new Prisma.Decimal(safePrice),
          wholesalePrice: new Prisma.Decimal(safePrice),
          offerPrice: new Prisma.Decimal(safePrice),
          stock,
          isActive: stock > 0,
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
    const priceChanged = previousPrice !== safePrice;
    const stockChanged = previousStock !== stock;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title,
        description,
        currency: 'USDT',
        currentPrice: new Prisma.Decimal(safePrice),
        wholesalePrice: new Prisma.Decimal(safePrice),
        offerPrice: new Prisma.Decimal(safePrice),
        stock,
        isActive: stock > 0,
        rawPayload: payload,
      },
    });

    if (priceChanged || stockChanged) {
      await this.prisma.priceSnapshot.create({
        data: {
          productId: existing.id,
          price: new Prisma.Decimal(safePrice),
          stock,
        },
      });
    }

    if (priceChanged) {
      const changePercent =
        previousPrice === 0
          ? null
          : ((safePrice - previousPrice) / previousPrice) * 100;

      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            safePrice > previousPrice
              ? MarketChangeKind.up
              : MarketChangeKind.down,
          fromPrice: new Prisma.Decimal(previousPrice),
          toPrice: new Prisma.Decimal(safePrice),
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
          fromPrice: new Prisma.Decimal(safePrice),
          toPrice: new Prisma.Decimal(safePrice),
          fromStock: previousStock,
          toStock: stock,
        },
      });
      changes += 1;
    }

    return { changes };
  }
}
