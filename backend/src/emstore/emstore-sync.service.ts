import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordStockDeltaSale } from '../market-intel/sales-proxy';
import { EmStoreApiClient } from './emstore-api.client';
import type { EmStoreProductDto } from './emstore.types';

@Injectable()
export class EmStoreSyncService {
  private readonly logger = new Logger(EmStoreSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: EmStoreApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'EMSTORE_BOT_USERNAME',
      'EliteMethodsStoreBot',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'EM Store helper',
        displayName: 'EM Store helper',
        sourceType: 'emstore_api',
      },
      update: {
        displayName: 'EM Store helper',
        name: 'EM Store helper',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('EmStore sync already running — skipped');
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
          this.logger.warn(`EmStore balance failed: ${error.message}`);
          return null;
        }),
      ]);

      const remoteProducts = productsResponse.products ?? [];
      productsSeen = remoteProducts.length;

      const balanceValue =
        balanceResponse?.balance ??
        balanceResponse?.reseller?.balance ??
        productsResponse.reseller?.balance;

      if (typeof balanceValue === 'number') {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(balanceValue),
            currency: balanceResponse?.currency ?? 'USDT',
          },
        });
      }

      const seenKeys = new Set<string>();

      for (const remote of remoteProducts) {
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
        `EmStore sync ok — products=${productsSeen} changes=${changesDetected}`,
      );

      return {
        skipped: false as const,
        productsSeen,
        changesDetected,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown sync error';

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

      this.logger.error(`EmStore sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: EmStoreProductDto) {
    const externalKey = String(remote.id);
    const price = Number(remote.price ?? 0);
    const stock = Number(remote.stock ?? 0);
    const currency = remote.currency ?? 'USDT';

    const existing = await this.prisma.product.findUnique({
      where: {
        botId_externalKey: {
          botId,
          externalKey,
        },
      },
    });

    const payload: Prisma.InputJsonValue =
      remote as unknown as Prisma.InputJsonValue;

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey,
          title: remote.name,
          ...familyFieldsFor(String(remote.name ?? ''), (remote as { description?: string | null }).description ?? null),
          description: remote.description ?? null,
          currency,
          currentPrice: new Prisma.Decimal(price),
          wholesalePrice: new Prisma.Decimal(price),
          stock,
          isActive: true,
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
        title: remote.name,
        ...familyFieldsFor(String(remote.name ?? ''), (remote as { description?: string | null }).description ?? null),
        description: remote.description ?? null,
        currency,
        currentPrice: new Prisma.Decimal(price),
        wholesalePrice: new Prisma.Decimal(price),
        stock,
        isActive: true,
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
      if (stock < previousStock) {
        await recordStockDeltaSale(this.prisma, {
          productId: existing.id,
          botId,
          fromStock: previousStock,
          toStock: stock,
          unitPrice: Number(price),
        });
      }


    return { changes };
  }
}
