import { Controller, Get, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('bots/daily')
  botsDaily(@Query('day') day?: string) {
    return this.analytics.botsDaily(day);
  }

  @Get('bots/ranking')
  botsRanking(@Query('range') range?: string) {
    const r = range === '7d' ? '7d' : '1d';
    return this.analytics.botsRanking(r);
  }

  @Get('products/top')
  productsTop(
    @Query('range') range?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    const r = range === '7d' ? '7d' : '1d';
    const g = groupBy === 'product' ? 'product' : 'family';
    return this.analytics.productsTop(r, g);
  }

  @Get('availability')
  availability() {
    return this.analytics.availability();
  }

  @Post('backfill')
  backfill() {
    return this.analytics.backfillFromMarketChanges();
  }
}
