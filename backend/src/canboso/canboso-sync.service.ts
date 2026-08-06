import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketChangeKind, Prisma, SyncRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor } from '../market-intel/family-classifier';
import { recordStockDeltaSale } from '../market-intel/sales-proxy';
import { CanbosoApiClient } from './canboso-api.client';
import type {
  CanbosoBalanceResponse,
  CanbosoProductDto,
  CanbosoProductsResponse,
  NormalizedCanbosoProduct,
} from './canboso.types';

@Injectable()
export class CanbosoSyncService {
  private readonly logger = new Logger(CanbosoSyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: CanbosoApiClient,
    private readonly config: ConfigService,
  ) {}

  get isRunning() {
    return this.running;
  }

  async ensureBot() {
    const username = this.config.get<string>(
      'CANBOSO_BOT_USERNAME',
      'Canboso',
    );

    return this.prisma.bot.upsert({
      where: { username },
      create: {
        username,
        name: 'Canboso',
        displayName: 'Canboso Buyer',
        sourceType: 'canboso_api',
      },
      update: {
        sourceType: 'canboso_api',
      },
    });
  }

  async runSync() {
    if (this.running) {
      this.logger.warn('Canboso sync already running — skipped');
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
          this.logger.warn(`Canboso balance failed: ${error.message}`);
          return null;
        }),
      ]);

      const remoteProducts = this.extractProducts(productsResponse).map((p) =>
        this.normalizeProduct(p),
      );
      productsSeen = remoteProducts.length;

      const balanceValue = this.extractBalance(balanceResponse);
      if (balanceValue !== null) {
        await this.prisma.balanceSnapshot.create({
          data: {
            botId: bot.id,
            balance: new Prisma.Decimal(balanceValue),
            currency:
              this.readString(balanceResponse?.currency) ||
              this.readString(balanceResponse?.data?.currency) ||
              'USDT',
          },
        });
      }

      const seenKeys = new Set<string>();

      for (const remote of remoteProducts) {
        seenKeys.add(remote.externalKey);
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
        `Canboso sync ok — products=${productsSeen} changes=${changesDetected}`,
      );

      return { skipped: false as const, productsSeen, changesDetected };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Canboso sync error';

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

      this.logger.error(`Canboso sync failed: ${message}`);
      throw error;
    } finally {
      this.running = false;
    }
  }

  private extractProducts(response: CanbosoProductsResponse) {
    if (Array.isArray(response.products)) return response.products;
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.data)) return response.data;
    if (
      response.data &&
      typeof response.data === 'object' &&
      Array.isArray((response.data as { products?: CanbosoProductDto[] }).products)
    ) {
      return (response.data as { products: CanbosoProductDto[] }).products;
    }
    return [];
  }

  private extractBalance(response: CanbosoBalanceResponse | null) {
    if (!response) return null;
    const value =
      response.balance ??
      response.wallet_balance ??
      response.data?.balance;
    if (value === undefined || value === null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private normalizeProduct(remote: CanbosoProductDto): NormalizedCanbosoProduct {
    const externalKey = String(
      remote.id ?? remote.product_id ?? remote.name ?? remote.title ?? '',
    );
    if (!externalKey) {
      throw new Error('Canboso product missing id');
    }

    const title =
      this.readString(remote.name) ||
      this.readString(remote.title) ||
      `Product ${externalKey}`;

    const price = this.readNumber(
      remote.price ??
        remote.cost ??
        remote.wholesale_price ??
        remote.amount,
      0,
    );

    const stock = Math.max(
      0,
      Math.floor(
        this.readNumber(
          remote.stock ??
            remote.quantity ??
            remote.available ??
            remote.available_stock,
          0,
        ),
      ),
    );

    return {
      externalKey,
      title,
      price,
      stock,
      currency: this.readString(remote.currency) || 'USDT',
      description: this.readString(remote.description) || null,
      raw: remote,
    };
  }

  private async upsertProduct(botId: string, remote: NormalizedCanbosoProduct) {
    const existing = await this.prisma.product.findUnique({
      where: {
        botId_externalKey: {
          botId,
          externalKey: remote.externalKey,
        },
      },
    });

    const payload = remote.raw as unknown as Prisma.InputJsonValue;

    if (!existing) {
      const created = await this.prisma.product.create({
        data: {
          botId,
          externalKey: remote.externalKey,
          title: remote.title,
          ...familyFieldsFor(String(remote.title ?? ''), remote.description ?? null),
          description: remote.description,
          currency: remote.currency,
          currentPrice: new Prisma.Decimal(remote.price),
          wholesalePrice: new Prisma.Decimal(remote.price),
          offerPrice: new Prisma.Decimal(remote.price),
          stock: remote.stock,
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
    const priceChanged = previousPrice !== remote.price;
    const stockChanged = previousStock !== remote.stock;

    await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        title: remote.title,
        ...familyFieldsFor(String(remote.title ?? ''), remote.description ?? null),
        description: remote.description,
        currency: remote.currency,
        currentPrice: new Prisma.Decimal(remote.price),
        wholesalePrice: new Prisma.Decimal(remote.price),
        offerPrice: new Prisma.Decimal(remote.price),
        stock: remote.stock,
        isActive: true,
        rawPayload: payload,
      },
    });

    if (priceChanged || stockChanged) {
      await this.prisma.priceSnapshot.create({
        data: {
          productId: existing.id,
          price: new Prisma.Decimal(remote.price),
          stock: remote.stock,
        },
      });
    }

    if (priceChanged) {
      const changePercent =
        previousPrice === 0
          ? null
          : ((remote.price - previousPrice) / previousPrice) * 100;

      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            remote.price > previousPrice
              ? MarketChangeKind.up
              : MarketChangeKind.down,
          fromPrice: new Prisma.Decimal(previousPrice),
          toPrice: new Prisma.Decimal(remote.price),
          changePercent:
            changePercent === null
              ? null
              : new Prisma.Decimal(changePercent.toFixed(4)),
          fromStock: previousStock,
          toStock: remote.stock,
        },
      });
      changes += 1;
    }

    if (stockChanged) {
      await this.prisma.marketChange.create({
        data: {
          productId: existing.id,
          kind:
            remote.stock > previousStock
              ? MarketChangeKind.stock_up
              : MarketChangeKind.stock_down,
          fromPrice: new Prisma.Decimal(remote.price),
          toPrice: new Prisma.Decimal(remote.price),
          fromStock: previousStock,
          toStock: remote.stock,
        },
      });
      changes += 1;
    }
    if (stockChanged && remote.stock < previousStock) {
      await recordStockDeltaSale(this.prisma, {
        productId: existing.id,
        botId,
        fromStock: previousStock,
        toStock: remote.stock,
        unitPrice: Number(remote.price),
      });
    }

    return { changes };
  }

  private readNumber(value: unknown, fallback: number) {
    if (value === null || value === undefined || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  private readString(value: unknown) {
    if (typeof value !== 'string') return '';
    return value.trim();
  }
}
