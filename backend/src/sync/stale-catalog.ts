import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** After this many minutes without a successful sync, active prices are unreliable. */
export const STALE_SYNC_MINUTES = 30;

/**
 * Deactivate active products for bots whose last successful sync is too old.
 * Prevents frozen prices/stock from failed sources (e.g. revoked API key)
 * from looking like live market data.
 */
export async function deactivateStaleBotCatalogs(
  prisma: PrismaService,
  logger: Logger,
  staleAfterMinutes = STALE_SYNC_MINUTES,
): Promise<{ bots: number; products: number }> {
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60_000);
  const bots = await prisma.bot.findMany({
    where: {
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
      products: { some: { isActive: true } },
    },
    select: { id: true, username: true, lastSyncedAt: true },
  });

  let products = 0;
  for (const bot of bots) {
    const result = await prisma.product.updateMany({
      where: { botId: bot.id, isActive: true },
      data: { isActive: false },
    });
    if (result.count > 0) {
      products += result.count;
      logger.warn(
        `Stale catalog: deactivated ${result.count} products for @${bot.username} (lastSyncedAt=${bot.lastSyncedAt?.toISOString() ?? 'never'})`,
      );
    }
  }

  return { bots: bots.length, products };
}

export function isPriceStale(
  lastSyncedAt: Date | string | null | undefined,
  staleAfterMinutes = STALE_SYNC_MINUTES,
): boolean {
  if (!lastSyncedAt) return true;
  const ts =
    typeof lastSyncedAt === 'string'
      ? new Date(lastSyncedAt).getTime()
      : lastSyncedAt.getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > staleAfterMinutes * 60_000;
}
