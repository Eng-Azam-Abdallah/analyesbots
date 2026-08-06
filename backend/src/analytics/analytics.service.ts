import { Injectable } from '@nestjs/common';
import { Prisma, SalesProxySource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ANALYTICS_DISCLAIMER,
  rangeWindow,
  riyadhDayWindow,
} from '../market-intel/day-window';
import { computeStockDeltaSale } from '../market-intel/sales-proxy';
import { CategoriesService } from '../categories/categories.service';

export type StockSignalQuality = 'good' | 'weak' | 'poor';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  private meta(metricType = 'inferred_from_stock') {
    return {
      metricType,
      disclaimer: ANALYTICS_DISCLAIMER,
    };
  }

  /** Ratio of active products with numeric stock — proxy for inferred-sales reliability. */
  private async stockSignalByBot(): Promise<
    Map<
      string,
      {
        stockSignalQuality: StockSignalQuality;
        stockSignalRatio: number;
        activeProducts: number;
        numericStockProducts: number;
      }
    >
  > {
    const groups = await this.prisma.product.groupBy({
      by: ['botId'],
      where: { isActive: true },
      _count: { id: true },
    });
    const numeric = await this.prisma.product.groupBy({
      by: ['botId'],
      where: { isActive: true, stock: { gte: 0 } },
      _count: { id: true },
    });
    const numericMap = new Map(
      numeric.map((g) => [g.botId, g._count.id]),
    );
    const out = new Map<
      string,
      {
        stockSignalQuality: StockSignalQuality;
        stockSignalRatio: number;
        activeProducts: number;
        numericStockProducts: number;
      }
    >();
    for (const g of groups) {
      const activeProducts = g._count.id;
      const numericStockProducts = numericMap.get(g.botId) ?? 0;
      const ratio =
        activeProducts > 0 ? numericStockProducts / activeProducts : 0;
      const stockSignalQuality: StockSignalQuality =
        ratio >= 0.7 ? 'good' : ratio >= 0.25 ? 'weak' : 'poor';
      out.set(g.botId, {
        stockSignalQuality,
        stockSignalRatio: Number(ratio.toFixed(3)),
        activeProducts,
        numericStockProducts,
      });
    }
    return out;
  }

  async botsDaily(day?: string) {
    const window = riyadhDayWindow(day);
    const events = await this.prisma.salesProxyEvent.findMany({
      where: {
        source: SalesProxySource.stock_delta,
        capturedAt: { gte: window.start, lt: window.end },
      },
      select: {
        botId: true,
        productId: true,
        qty: true,
        revenue: true,
      },
    });

    const bots = await this.prisma.bot.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        name: true,
      },
    });

    const byBot = new Map<
      string,
      {
        unitsProxy: number;
        revenueProxy: number;
        stockDownCount: number;
        productIds: Set<string>;
      }
    >();

    for (const e of events) {
      let acc = byBot.get(e.botId);
      if (!acc) {
        acc = {
          unitsProxy: 0,
          revenueProxy: 0,
          stockDownCount: 0,
          productIds: new Set(),
        };
        byBot.set(e.botId, acc);
      }
      acc.unitsProxy += e.qty;
      acc.revenueProxy += Number(e.revenue);
      acc.stockDownCount += 1;
      acc.productIds.add(e.productId);
    }

    const declared = await this.prisma.salesProxyEvent.findMany({
      where: {
        source: SalesProxySource.declared_delta,
        capturedAt: { gte: window.start, lt: window.end },
      },
      select: { botId: true, qty: true, revenue: true },
    });
    const declaredByBot = new Map<
      string,
      { units: number; revenue: number }
    >();
    for (const e of declared) {
      const prev = declaredByBot.get(e.botId) || { units: 0, revenue: 0 };
      prev.units += e.qty;
      prev.revenue += Number(e.revenue);
      declaredByBot.set(e.botId, prev);
    }

    const signals = await this.stockSignalByBot();

    const data = bots
      .map((bot) => {
        const acc = byBot.get(bot.id);
        const d = declaredByBot.get(bot.id);
        const signal = signals.get(bot.id);
        return {
          botId: bot.id,
          username: bot.username,
          displayName: bot.displayName,
          name: bot.name,
          unitsProxy: acc?.unitsProxy ?? 0,
          revenueProxy: Number((acc?.revenueProxy ?? 0).toFixed(4)),
          stockDownCount: acc?.stockDownCount ?? 0,
          activeSkus: acc?.productIds.size ?? 0,
          declaredUnits: d?.units ?? 0,
          declaredRevenue: Number((d?.revenue ?? 0).toFixed(4)),
          stockSignalQuality: signal?.stockSignalQuality ?? 'poor',
          stockSignalRatio: signal?.stockSignalRatio ?? 0,
        };
      })
      .sort((a, b) => b.revenueProxy - a.revenueProxy);

    return {
      ...this.meta(),
      day: window.day,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      data,
    };
  }

  async botsRanking(range: '1d' | '7d' = '1d') {
    const window = rangeWindow(range);
    const events = await this.prisma.salesProxyEvent.findMany({
      where: {
        source: SalesProxySource.stock_delta,
        capturedAt: { gte: window.start, lt: window.end },
      },
      select: {
        botId: true,
        qty: true,
        revenue: true,
        productId: true,
      },
    });

    const bots = await this.prisma.bot.findMany({
      select: { id: true, username: true, displayName: true, name: true },
    });
    const botMap = new Map(bots.map((b) => [b.id, b]));

    const acc = new Map<
      string,
      { units: number; revenue: number; events: number; skus: Set<string> }
    >();
    for (const e of events) {
      let row = acc.get(e.botId);
      if (!row) {
        row = { units: 0, revenue: 0, events: 0, skus: new Set() };
        acc.set(e.botId, row);
      }
      row.units += e.qty;
      row.revenue += Number(e.revenue);
      row.events += 1;
      row.skus.add(e.productId);
    }

    const signals = await this.stockSignalByBot();

    const data = Array.from(acc.entries())
      .map(([botId, row]) => {
        const bot = botMap.get(botId);
        const signal = signals.get(botId);
        return {
          botId,
          username: bot?.username ?? botId,
          displayName: bot?.displayName ?? null,
          name: bot?.name ?? null,
          unitsProxy: row.units,
          revenueProxy: Number(row.revenue.toFixed(4)),
          stockDownCount: row.events,
          stockSignalQuality: signal?.stockSignalQuality ?? 'poor',
          stockSignalRatio: signal?.stockSignalRatio ?? 0,
          activeSkus: row.skus.size,
        };
      })
      .sort((a, b) => b.revenueProxy - a.revenueProxy);

    return {
      ...this.meta(),
      range,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      data,
    };
  }

  async productsTop(range: '1d' | '7d' = '1d', groupBy: 'product' | 'family' = 'family') {
    const window = rangeWindow(range);
    const events = await this.prisma.salesProxyEvent.findMany({
      where: {
        source: SalesProxySource.stock_delta,
        capturedAt: { gte: window.start, lt: window.end },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            familySlug: true,
            familyLabel: true,
            bot: {
              select: { username: true, displayName: true },
            },
          },
        },
      },
    });

    if (groupBy === 'product') {
      const map = new Map<
        string,
        {
          productId: string;
          title: string;
          familySlug: string | null;
          botUsername: string;
          unitsProxy: number;
          revenueProxy: number;
        }
      >();
      for (const e of events) {
        let row = map.get(e.productId);
        if (!row) {
          row = {
            productId: e.productId,
            title: e.product.title,
            familySlug: e.product.familySlug,
            botUsername: e.product.bot.username,
            unitsProxy: 0,
            revenueProxy: 0,
          };
          map.set(e.productId, row);
        }
        row.unitsProxy += e.qty;
        row.revenueProxy += Number(e.revenue);
      }
      const data = Array.from(map.values())
        .map((r) => ({
          ...r,
          revenueProxy: Number(r.revenueProxy.toFixed(4)),
        }))
        .sort((a, b) => b.revenueProxy - a.revenueProxy)
        .slice(0, 50);
      return {
        ...this.meta(),
        range,
        groupBy,
        start: window.start.toISOString(),
        end: window.end.toISOString(),
        data,
      };
    }

    const map = new Map<
      string,
      { familySlug: string; familyLabel: string; unitsProxy: number; revenueProxy: number }
    >();
    for (const e of events) {
      const slug = e.product.familySlug || 'other';
      const label = e.product.familyLabel || slug;
      let row = map.get(slug);
      if (!row) {
        row = { familySlug: slug, familyLabel: label, unitsProxy: 0, revenueProxy: 0 };
        map.set(slug, row);
      }
      row.unitsProxy += e.qty;
      row.revenueProxy += Number(e.revenue);
    }
    const data = Array.from(map.values())
      .map((r) => ({
        ...r,
        revenueProxy: Number(r.revenueProxy.toFixed(4)),
      }))
      .sort((a, b) => b.revenueProxy - a.revenueProxy);

    return {
      ...this.meta(),
      range,
      groupBy,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      data,
    };
  }

  async availability() {
    const families = await this.categories.listFamilies();
    return {
      ...this.meta('availability'),
      disclaimer: 'مجموع المخزون وعدد البوتات التي تعرض العائلة حاليًا',
      data: families.data,
    };
  }

  async backfillFromMarketChanges() {
    const changes = await this.prisma.marketChange.findMany({
      where: {
        kind: 'stock_down',
        fromStock: { not: null },
        toStock: { not: null },
      },
      include: {
        product: { select: { id: true, botId: true, currentPrice: true } },
      },
      orderBy: { capturedAt: 'asc' },
    });

    let created = 0;
    for (const change of changes) {
      const fromStock = change.fromStock ?? 0;
      const toStock = change.toStock ?? 0;
      const computed = computeStockDeltaSale(
        fromStock,
        toStock,
        Number(change.toPrice ?? change.product.currentPrice),
      );
      if (!computed) continue;

      const existing = await this.prisma.salesProxyEvent.findFirst({
        where: {
          productId: change.productId,
          source: SalesProxySource.stock_delta,
          capturedAt: change.capturedAt,
          qty: computed.qty,
          fromStock,
          toStock,
        },
      });
      if (existing) continue;

      await this.prisma.salesProxyEvent.create({
        data: {
          productId: change.productId,
          botId: change.product.botId,
          capturedAt: change.capturedAt,
          qty: computed.qty,
          unitPrice: new Prisma.Decimal(computed.unitPrice),
          revenue: new Prisma.Decimal(computed.revenue),
          source: SalesProxySource.stock_delta,
          fromStock,
          toStock,
        },
      });
      created += 1;
    }

    return { scanned: changes.length, created };
  }
}
