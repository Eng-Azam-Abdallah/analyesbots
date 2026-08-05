import { Controller, Get, Query } from '@nestjs/common';
import { MarketChangeKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('changes')
export class ChangesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('kind') kind?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = Math.min(Number(limitRaw) || 100, 500);
    const where: Prisma.MarketChangeWhereInput = {};

    if (kind && Object.values(MarketChangeKind).includes(kind as MarketChangeKind)) {
      where.kind = kind as MarketChangeKind;
    }

    const changes = await this.prisma.marketChange.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            currency: true,
            bot: {
              select: { username: true, displayName: true },
            },
          },
        },
      },
    });

    return changes.map((change) => ({
      id: change.id,
      kind: change.kind,
      fromPrice:
        change.fromPrice === null ? null : Number(change.fromPrice),
      toPrice: change.toPrice === null ? null : Number(change.toPrice),
      changePercent:
        change.changePercent === null
          ? null
          : Number(change.changePercent),
      fromStock: change.fromStock,
      toStock: change.toStock,
      capturedAt: change.capturedAt,
      product: change.product,
    }));
  }
}
