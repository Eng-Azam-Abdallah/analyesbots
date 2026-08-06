import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordStockDeltaSale } from '../market-intel/sales-proxy';
import { ResellerApiClient } from './reseller-api.client';
import type { ResellerProductDto } from './reseller.types';

@Injectable()
export class ResellerSyncService {
  private readonly logger = new Logger(ResellerSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: ResellerApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'RESELLER_BOT_USERNAME',
      'RexovaanShoppieBot',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: username,
        displayName: `@${username}`,
        sourceType: 'reseller_api',
      },
      update: {},
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('Sync already running — skipped');
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
          this.logger.warn(`Balance fetch failed: ${error.message}`);
          return null;
        }),
      ]);

      const remoteProducts = productsResponse.products ?? [];
      productsSeen = remoteProducts.length;

      const resellerName = productsResponse.reseller?.name;
      if (resellerName) {
        await this.prisma.bot.update({
          where: { id: bot.id },
          data: {
            displayName: resellerName,
            name: resellerName.replace(/^@/, '') || bot.name,
          },
        });
      }

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
        seenKeys.add(remote.id);
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
        `Sync ok — products=${productsSeen} changes=${changesDetected}`,
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

      this.logger.error(`Sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: ResellerProductDto) {
    const wholesale = Number(remote.wholesale_price ?? 0);
    const stock = Number(remote.stock ?? 0);
    const offer = this.toNullableNumber(remote.offer_price);
    const regular = this.toNullableNumber(remote.regular_price);
    const base = this.toNullableNumber(remote.base_price);
    const currency = remote.currency ?? 'USDT';

    const existing = await this.prisma.product.findUnique({
      where: {
        botId_externalKey: {
          botId,
          externalKey: remote.id,
        },
      },
    });

    const payload: Prisma.InputJsonValue = remote as unknown as Prisma.InputJsonValue;

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey: remote.id,
          title: remote.name,
          ...familyFieldsFor(String(remote.name ?? ''), (remote as { description?: string | null }).description ?? null),
          description: remote.description ?? null,
          deliveryInstruction: remote.delivery_instruction ?? null,
          currency,
          currentPrice: new Prisma.Decimal(wholesale),
          wholesalePrice: new Prisma.Decimal(wholesale),
          offerPrice:
            offer === null ? null : new Prisma.Decimal(offer),
          regularPrice:
            regular === null ? null : new Prisma.Decimal(regular),
          basePrice: base === null ? null : new Prisma.Decimal(base),
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
    const priceChanged = previousPrice !== wholesale;
    const stockChanged = previousStock !== stock;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title: remote.name,
        ...familyFieldsFor(String(remote.name ?? ''), (remote as { description?: string | null }).description ?? null),
        description: remote.description ?? null,
        deliveryInstruction: remote.delivery_instruction ?? null,
        currency,
        currentPrice: new Prisma.Decimal(wholesale),
        wholesalePrice: new Prisma.Decimal(wholesale),
        offerPrice: offer === null ? null : new Prisma.Decimal(offer),
        regularPrice:
          regular === null ? null : new Prisma.Decimal(regular),
        basePrice: base === null ? null : new Prisma.Decimal(base),
        stock,
        isActive: true,
        rawPayload: payload,
      },
    });

    if (priceChanged || stockChanged) {
      await this.prisma.priceSnapshot.create({
        data: {
          productId: existing.id,
          price: new Prisma.Decimal(wholesale),
          stock,
        },
      });
    }

    if (priceChanged) {
      const changePercent =
        previousPrice === 0
          ? null
          : ((wholesale - previousPrice) / previousPrice) * 100;

      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            wholesale > previousPrice
              ? MarketChangeKind.up
              : MarketChangeKind.down,
          fromPrice: new Prisma.Decimal(previousPrice),
          toPrice: new Prisma.Decimal(wholesale),
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
          fromPrice: new Prisma.Decimal(wholesale),
          toPrice: new Prisma.Decimal(wholesale),
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
          unitPrice: Number(wholesale),
        });
      }


    return { changes };
  }

  private toNullableNumber(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }
    return Number(value);
  }
}
