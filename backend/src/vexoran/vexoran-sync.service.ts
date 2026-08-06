import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordStockDeltaSale } from '../market-intel/sales-proxy';
import { VexoranApiClient } from './vexoran-api.client';
import type { VexoranProductDto } from './vexoran.types';

@Injectable()
export class VexoranSyncService {
  private readonly logger = new Logger(VexoranSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: VexoranApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'VEXORAN_BOT_USERNAME',
      'VexoranShoppieBot',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'Vexoran Shoppie',
        displayName: 'Vexoran Shoppie',
        sourceType: 'vexoran_api',
      },
      update: {
        displayName: 'Vexoran Shoppie',
        name: 'Vexoran Shoppie',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('Vexoran sync already running — skipped');
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
          this.logger.warn(`Vexoran balance failed: ${error.message}`);
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
        seenKeys.add(String(remote.id));
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
        `Vexoran sync ok — products=${productsSeen} changes=${changesDetected}`,
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

      this.logger.error(`Vexoran sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async upsertProduct(botId: string, remote: VexoranProductDto) {
    const externalKey = String(remote.id);
    const price = this.parsePrice(remote);
    const stock = Number(remote.stock ?? 0);
    const currency = remote.currency ?? 'USDT';
    const base = this.toNullableNumber(remote.base_price);
    const offer = this.toNullableNumber(remote.offer_price);
    const regular = this.toNullableNumber(remote.regular_price);
    const description =
      remote.description_text ?? remote.description ?? null;
    const delivery =
      remote.delivery_instruction ?? remote.delivery_instructions ?? null;
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
          description,
          deliveryInstruction: delivery,
          currency,
          currentPrice: new Prisma.Decimal(price),
          wholesalePrice: new Prisma.Decimal(price),
          basePrice: base === null ? null : new Prisma.Decimal(base),
          offerPrice: offer === null ? null : new Prisma.Decimal(offer),
          regularPrice:
            regular === null ? null : new Prisma.Decimal(regular),
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
        description,
        deliveryInstruction: delivery,
        currency,
        currentPrice: new Prisma.Decimal(price),
        wholesalePrice: new Prisma.Decimal(price),
        basePrice: base === null ? null : new Prisma.Decimal(base),
        offerPrice: offer === null ? null : new Prisma.Decimal(offer),
        regularPrice:
          regular === null ? null : new Prisma.Decimal(regular),
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

  private parsePrice(remote: VexoranProductDto): number {
    const candidates = [
      remote.wholesale_price,
      remote.price,
      remote.base_price,
      remote.offer_price,
    ];
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
