import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordStockDeltaSale } from '../market-intel/sales-proxy';
import { InsightXApiClient } from './insightx-api.client';
import type { InsightXProductDto } from './insightx.types';

@Injectable()
export class InsightXSyncService {
  private readonly logger = new Logger(InsightXSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InsightXApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'INSIGHTX_BOT_USERNAME',
      'InsightXStore',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'InsightX Store',
        displayName: 'InsightX Store',
        sourceType: 'insightx_api',
      },
      update: {
        displayName: 'InsightX Store',
        name: 'InsightX Store',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('InsightX sync already running — skipped');
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
          this.logger.warn(`InsightX balance failed: ${error.message}`);
          return null;
        }),
      ]);

      const remoteProducts = productsResponse.products ?? [];
      productsSeen = remoteProducts.length;

      const balanceValue = balanceResponse?.balance_usdt;
      if (typeof balanceValue === 'number' && !Number.isNaN(balanceValue)) {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(balanceValue),
            currency: 'USDT',
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
        `InsightX sync ok — products=${productsSeen} changes=${changesDetected}`,
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

      this.logger.error(`InsightX sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: InsightXProductDto) {
    const externalKey = String(remote.id);
    const price = this.parsePrice(remote);
    const stock = Number(remote.stock ?? 0);
    const base = this.toNullableNumber(remote.base_price_usdt);
    const isActive = remote.available !== false;

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
          currency: 'USDT',
          currentPrice: new Prisma.Decimal(price),
          wholesalePrice: new Prisma.Decimal(price),
          basePrice: base === null ? null : new Prisma.Decimal(base),
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
        title: remote.name,
        ...familyFieldsFor(String(remote.name ?? ''), (remote as { description?: string | null }).description ?? null),
        currency: 'USDT',
        currentPrice: new Prisma.Decimal(price),
        wholesalePrice: new Prisma.Decimal(price),
        basePrice: base === null ? null : new Prisma.Decimal(base),
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

  private parsePrice(remote: InsightXProductDto): number {
    const candidates = [remote.price_usdt, remote.price, remote.base_price_usdt];
    for (const value of candidates) {
      if (value === null || value === undefined) continue;
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  }

  private toNullableNumber(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }
    return Number(value);
  }
}
