import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordDeclaredDeltaSale, recordStockDeltaSale } from '../market-intel/sales-proxy';
import { QamifyApiClient } from './qamify-api.client';
import type { QamifyProductDto } from './qamify.types';

@Injectable()
export class QamifySyncService {
  private readonly logger = new Logger(QamifySyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: QamifyApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'QAMIFY_BOT_USERNAME',
      'Qamify',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'Qamify',
        displayName: 'Qamify',
        sourceType: 'qamify_api',
      },
      update: {
        displayName: 'Qamify',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('Qamify sync already running — skipped');
      return { skipped: true as const };
    }

    this.running = true;
    const bot = await this.ensureBot();
    const startedAt = new Date();
    let productsSeen = 0;
    let changesDetected = 0;

    try {
      const [productsResponse, balanceResponse, pingResponse] =
        await Promise.all([
          this.api.getProducts(),
          this.api.getBalance().catch((error: Error) => {
            this.logger.warn(`Qamify balance failed: ${error.message}`);
            return null;
          }),
          this.api.getPing().catch((error: Error) => {
            this.logger.warn(`Qamify ping failed: ${error.message}`);
            return null;
          }),
        ]);

      const remoteProducts = productsResponse.products ?? [];
      productsSeen = remoteProducts.length;

      const resellerName = pingResponse?.reseller?.trim();
      if (resellerName) {
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: {
            displayName: resellerName,
            name: resellerName,
          },
        });
      }

      const balanceValue = this.parseBalance(balanceResponse?.balance);
      if (balanceValue !== null) {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(balanceValue),
            currency: balanceResponse?.currency ?? 'USD',
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
        `Qamify sync ok — products=${productsSeen} changes=${changesDetected}`,
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

      this.logger.error(`Qamify sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: QamifyProductDto) {
    const externalKey = String(remote.id);
    const price = this.parsePrice(remote);
    const stock = Number(remote.stock ?? 0);
    const currency = remote.currency ?? 'USD';

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
    const soldTotal =
      remote.sold_total === null || remote.sold_total === undefined
        ? null
        : Math.max(0, Math.floor(Number(remote.sold_total)));

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey,
          title: remote.name,
          ...familyFieldsFor(String(remote.name ?? ''), remote.description ?? null),
          description: remote.description ?? null,
          currency,
          currentPrice: new Prisma.Decimal(price),
          wholesalePrice: new Prisma.Decimal(price),
          stock,
          soldTotal,
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
    const previousSold = existing.soldTotal;
    const priceChanged = previousPrice !== price;
    const stockChanged = previousStock !== stock;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title: remote.name,
        ...familyFieldsFor(String(remote.name ?? ''), remote.description ?? null),
        description: remote.description ?? null,
        currency,
        currentPrice: new Prisma.Decimal(price),
        wholesalePrice: new Prisma.Decimal(price),
        stock,
        soldTotal,
        isActive: true,
        rawPayload: payload,
      },
    });

    if (
      soldTotal !== null &&
      previousSold !== null &&
      soldTotal > previousSold
    ) {
      await recordDeclaredDeltaSale(this.prisma, {
        productId: existing.id,
        botId,
        qty: soldTotal - previousSold,
        unitPrice: price,
        fromSold: previousSold,
        toSold: soldTotal,
      });
      changes += 1;
    } else if (soldTotal !== null && previousSold === null) {
      // first time we see declared total — store only, no delta event
    }

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

  private parsePrice(remote: QamifyProductDto): number {
    if (remote.unit_price !== null && remote.unit_price !== undefined) {
      const n = Number(remote.unit_price);
      if (!Number.isNaN(n)) return n;
    }
    if (
      remote.unit_price_cents !== null &&
      remote.unit_price_cents !== undefined
    ) {
      return Number(remote.unit_price_cents) / 100;
    }
    return 0;
  }

  private parseBalance(value: string | number | null | undefined) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
}
