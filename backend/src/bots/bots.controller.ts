import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    }));
  }
}
