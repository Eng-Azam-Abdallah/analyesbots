import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { MarketChangeKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPriceStale } from '../sync/stale-catalog';

@Controller('bots')
export class BotsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const bots = await this.prisma.bot.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      username: bot.username,
      displayName: bot.displayName,
      sourceType: bot.sourceType,
      lastSyncedAt: bot.lastSyncedAt,
      productCount: bot._count.products,
      createdAt: bot.createdAt,
      priceStale: isPriceStale(bot.lastSyncedAt),
    }));
  }

  @Get(':username')
  async detail(
    @Param('username') usernameParam: string,
    @Query('active') active?: string,
  ) {
    const username = decodeURIComponent(usernameParam)
      .replace(/^@/, '')
      .trim();
    if (!username) {
      throw new NotFoundException('Bot not found');
    }

    const bot = await this.prisma.bot.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
      },
    });
    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    const productWhere: Prisma.ProductWhereInput = { botId: bot.id };
    if (active === 'true') productWhere.isActive = true;
    if (active === 'false') productWhere.isActive = false;

    const [products, activeCount, inactiveCount, lastRun, latestBalance, recentPriceChanges] =
      await Promise.all([
        this.prisma.product.findMany({
          where: productWhere,
          orderBy: [{ isActive: 'desc' }, { title: 'asc' }],
        }),
        this.prisma.product.count({
          where: { botId: bot.id, isActive: true },
        }),
        this.prisma.product.count({
          where: { botId: bot.id, isActive: false },
        }),
        this.prisma.syncRun.findFirst({
          where: { botId: bot.id },
          orderBy: { startedAt: 'desc' },
        }),
        this.prisma.balanceSnapshot.findFirst({
          where: { botId: bot.id },
          orderBy: { capturedAt: 'desc' },
        }),
        this.prisma.marketChange.findMany({
          where: {
            kind: { in: [MarketChangeKind.up, MarketChangeKind.down] },
            capturedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            product: { botId: bot.id },
          },
          select: { productId: true, kind: true, capturedAt: true },
          orderBy: { capturedAt: 'desc' },
        }),
      ]);

    const changedIds = new Set<string>();
    const latestChangeKind = new Map<string, 'up' | 'down'>();
    for (const change of recentPriceChanges) {
      if (!changedIds.has(change.productId)) {
        changedIds.add(change.productId);
        latestChangeKind.set(
          change.productId,
          change.kind === MarketChangeKind.up ? 'up' : 'down',
        );
      }
    }

    const activeProducts = products.filter((p) => p.isActive);
    const prices = activeProducts.map((p) => Number(p.currentPrice));
    const stocks = activeProducts.map((p) => p.stock);
    const familyMap = new Map<string, string>();
    for (const p of activeProducts) {
      if (p.familySlug) {
        familyMap.set(p.familySlug, p.familyLabel || p.familySlug);
      }
    }

    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const maxStock = stocks.length ? Math.max(...stocks) : null;
    const totalStock = stocks.reduce((sum, s) => sum + s, 0);

    const priceStale = isPriceStale(bot.lastSyncedAt);

    return {
      id: bot.id,
      name: bot.name,
      username: bot.username,
      displayName: bot.displayName,
      sourceType: bot.sourceType,
      lastSyncedAt: bot.lastSyncedAt,
      createdAt: bot.createdAt,
      priceStale,
      counts: {
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      summary: {
        minPrice,
        maxPrice,
        maxStock,
        totalStock,
        familyCount: familyMap.size,
        priceChanges24h: changedIds.size,
      },
      families: Array.from(familyMap.entries())
        .map(([slug, label]) => ({ slug, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ar')),
      balance: latestBalance
        ? {
            balance: Number(latestBalance.balance),
            currency: latestBalance.currency,
            capturedAt: latestBalance.capturedAt,
          }
        : null,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            productsSeen: lastRun.productsSeen,
            changesDetected: lastRun.changesDetected,
            errorMessage: lastRun.errorMessage
              ? sanitizeError(lastRun.errorMessage)
              : null,
            startedAt: lastRun.startedAt,
            finishedAt: lastRun.finishedAt,
          }
        : null,
      products: products.map((product) => ({
        id: product.id,
        title: product.title,
        currency: product.currency,
        price: Number(product.currentPrice),
        wholesalePrice: Number(product.wholesalePrice),
        offerPrice:
          product.offerPrice === null ? null : Number(product.offerPrice),
        stock: product.stock,
        isActive: product.isActive,
        priceStale,
        familySlug: product.familySlug,
        familyLabel: product.familyLabel,
        durationTag: product.durationTag,
        soldTotal: product.soldTotal,
        updatedAt: product.updatedAt,
        priceChanged24h: changedIds.has(product.id),
        priceChangeKind: latestChangeKind.get(product.id) ?? null,
      })),
    };
  }
}

function sanitizeError(message: string): string {
  return message
    .replace(/mkeapi_[a-z0-9]+/gi, '[redacted]')
    .replace(/rsk_live_[a-z0-9]+/gi, '[redacted]')
    .replace(/vex_sk_[a-z0-9]+/gi, '[redacted]')
    .replace(/emstore_[a-z0-9]+/gi, '[redacted]')
    .replace(/mk_[a-z0-9_]+/gi, '[redacted]')
    .replace(/tgb_[a-z0-9]+/gi, '[redacted]')
    .replace(/qamify_[a-z0-9]+/gi, '[redacted]')
    .replace(/isk_live_[a-zA-Z0-9_]+/gi, '[redacted]')
    .replace(/tsb_live_[a-zA-Z0-9_]+/gi, '[redacted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}
