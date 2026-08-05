import { Controller, Get, Query } from '@nestjs/common';
import { MarketChangeKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('market')
export class MarketController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(@Query('hours') hoursRaw?: string) {
    const hours = Math.max(1, Number(hoursRaw) || 24);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [up, down, fresh, gone, stockUp, stockDown, activeProducts] =
      await Promise.all([
        this.prisma.marketChange.count({
          where: { kind: MarketChangeKind.up, capturedAt: { gte: since } },
        }),
        this.prisma.marketChange.count({
          where: { kind: MarketChangeKind.down, capturedAt: { gte: since } },
        }),
        this.prisma.marketChange.count({
          where: { kind: MarketChangeKind.new, capturedAt: { gte: since } },
        }),
        this.prisma.marketChange.count({
          where: { kind: MarketChangeKind.gone, capturedAt: { gte: since } },
        }),
        this.prisma.marketChange.count({
          where: {
            kind: MarketChangeKind.stock_up,
            capturedAt: { gte: since },
          },
        }),
        this.prisma.marketChange.count({
          where: {
            kind: MarketChangeKind.stock_down,
            capturedAt: { gte: since },
          },
        }),
        this.prisma.product.count({ where: { isActive: true } }),
      ]);

    return {
      windowHours: hours,
      since,
      up,
      down,
      fresh,
      gone,
      stockUp,
      stockDown,
      activeProducts,
    };
  }
}
