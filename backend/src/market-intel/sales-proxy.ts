import { Prisma, SalesProxySource } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export function computeStockDeltaSale(
  fromStock: number,
  toStock: number,
  unitPrice: number,
) {
  const from = Math.floor(fromStock);
  const to = Math.floor(toStock);
  // Ignore unlimited / sentinel stocks used by some APIs (e.g. 999999)
  if (from >= 100_000 || to >= 100_000) return null;
  const qty = Math.max(0, from - to);
  if (qty <= 0 || qty > 10_000) return null;
  const price = Number(unitPrice);
  const safePrice = Number.isFinite(price) ? price : 0;
  return {
    qty,
    unitPrice: safePrice,
    revenue: Number((qty * safePrice).toFixed(4)),
  };
}

export async function recordStockDeltaSale(
  prisma: PrismaService,
  input: {
    productId: string;
    botId: string;
    fromStock: number;
    toStock: number;
    unitPrice: number;
    capturedAt?: Date;
  },
) {
  const computed = computeStockDeltaSale(
    input.fromStock,
    input.toStock,
    input.unitPrice,
  );
  if (!computed) return null;

  return prisma.salesProxyEvent.create({
    data: {
      productId: input.productId,
      botId: input.botId,
      qty: computed.qty,
      unitPrice: new Prisma.Decimal(computed.unitPrice),
      revenue: new Prisma.Decimal(computed.revenue),
      source: SalesProxySource.stock_delta,
      fromStock: input.fromStock,
      toStock: input.toStock,
      capturedAt: input.capturedAt,
    },
  });
}

export async function recordDeclaredDeltaSale(
  prisma: PrismaService,
  input: {
    productId: string;
    botId: string;
    qty: number;
    unitPrice: number;
    fromSold?: number | null;
    toSold?: number | null;
    capturedAt?: Date;
  },
) {
  const qty = Math.max(0, Math.floor(input.qty));
  if (qty <= 0) return null;
  const price = Number(input.unitPrice);
  const safePrice = Number.isFinite(price) ? price : 0;

  return prisma.salesProxyEvent.create({
    data: {
      productId: input.productId,
      botId: input.botId,
      qty,
      unitPrice: new Prisma.Decimal(safePrice),
      revenue: new Prisma.Decimal(Number((qty * safePrice).toFixed(4))),
      source: SalesProxySource.declared_delta,
      fromStock: input.fromSold ?? null,
      toStock: input.toSold ?? null,
      capturedAt: input.capturedAt,
    },
  });
}
