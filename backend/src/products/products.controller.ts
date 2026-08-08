import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isPriceStale } from '../sync/stale-catalog';

@Controller('products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('botId') botId?: string,
    @Query('username') username?: string,
    @Query('active') active?: string,
    @Query('family') family?: string,
  ) {
    const where: Prisma.ProductWhereInput = {};
    if (botId) where.botId = botId;
    if (username) {
      where.bot = {
        username: {
          equals: decodeURIComponent(username).replace(/^@/, '').trim(),
          mode: 'insensitive',
        },
      };
    }
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (family) where.familySlug = family;

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { title: 'asc' }],
      include: {
        bot: {
          select: {
            id: true,
            username: true,
            displayName: true,
            name: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    return products.map((product) => this.toListItem(product));
  }

  @Get(':id/history')
  async history(@Param('id') id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const snapshots = await this.prisma.priceSnapshot.findMany({
      where: { productId: id },
      orderBy: { capturedAt: 'desc' },
      take: 200,
    });

    return {
      productId: id,
      title: product.title,
      snapshots: snapshots.map((snap) => ({
        id: snap.id,
        price: Number(snap.price),
        stock: snap.stock,
        capturedAt: snap.capturedAt,
      })),
    };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        bot: {
          select: {
            id: true,
            username: true,
            displayName: true,
            name: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      externalKey: product.externalKey,
      title: product.title,
      description: product.description,
      deliveryInstruction: product.deliveryInstruction,
      currency: product.currency,
      prices: {
        current: Number(product.currentPrice),
        wholesale: Number(product.wholesalePrice),
        offer:
          product.offerPrice === null ? null : Number(product.offerPrice),
        regular:
          product.regularPrice === null ? null : Number(product.regularPrice),
        base: product.basePrice === null ? null : Number(product.basePrice),
      },
      stock: product.stock,
      isActive: product.isActive,
      familySlug: product.familySlug,
      familyLabel: product.familyLabel,
      durationTag: product.durationTag,
      soldTotal: product.soldTotal,
      bot: product.bot,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toListItem(
    product: Prisma.ProductGetPayload<{
      include: {
        bot: {
          select: {
            id: true;
            username: true;
            displayName: true;
            name: true;
            lastSyncedAt: true;
          };
        };
      };
    }>,
  ) {
    const priceStale = isPriceStale(product.bot.lastSyncedAt);
    return {
      id: product.id,
      title: product.title,
      currency: product.currency,
      price: Number(product.currentPrice),
      wholesalePrice: Number(product.wholesalePrice),
      stock: product.stock,
      isActive: product.isActive,
      priceStale,
      familySlug: product.familySlug,
      familyLabel: product.familyLabel,
      durationTag: product.durationTag,
      soldTotal: product.soldTotal,
      bot: {
        id: product.bot.id,
        username: product.bot.username,
        displayName: product.bot.displayName,
        name: product.bot.name,
        lastSyncedAt: product.bot.lastSyncedAt,
      },
      updatedAt: product.updatedAt,
    };
  }
}
