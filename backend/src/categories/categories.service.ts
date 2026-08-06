import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { familyFieldsFor, listKnownFamilies } from '../market-intel/family-classifier';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listFamilies() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        botId: true,
        currentPrice: true,
        stock: true,
        familySlug: true,
        familyLabel: true,
      },
    });

    const known = new Map(
      listKnownFamilies().map((f) => [f.slug, f.label] as const),
    );
    known.set('other', 'أخرى');

    type Acc = {
      slug: string;
      label: string;
      offerCount: number;
      totalStock: number;
      botIds: Set<string>;
      prices: number[];
    };
    const map = new Map<string, Acc>();

    for (const p of products) {
      const slug = p.familySlug || 'other';
      const label = p.familyLabel || known.get(slug) || slug;
      let acc = map.get(slug);
      if (!acc) {
        acc = {
          slug,
          label,
          offerCount: 0,
          totalStock: 0,
          botIds: new Set(),
          prices: [],
        };
        map.set(slug, acc);
      }
      acc.offerCount += 1;
      const stock = Math.max(0, p.stock);
      acc.totalStock += stock >= 100_000 ? 0 : stock;
      acc.botIds.add(p.botId);
      acc.prices.push(Number(p.currentPrice));
    }

    const items = Array.from(map.values()).map((acc) => {
      const prices = acc.prices.slice().sort((a, b) => a - b);
      const mid = prices.length
        ? prices[Math.floor(prices.length / 2)]
        : null;
      return {
        slug: acc.slug,
        label: acc.label,
        offerCount: acc.offerCount,
        totalStock: acc.totalStock,
        coverage: acc.botIds.size,
        minPrice: prices.length ? prices[0] : null,
        medianPrice: mid,
        maxPrice: prices.length ? prices[prices.length - 1] : null,
      };
    });

    items.sort((a, b) => b.totalStock - a.totalStock || b.offerCount - a.offerCount);

    return {
      count: items.length,
      data: items,
    };
  }

  async getFamily(slug: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        familySlug: slug,
      },
      include: {
        bot: {
          select: {
            id: true,
            username: true,
            displayName: true,
            name: true,
          },
        },
      },
      orderBy: [{ currentPrice: 'asc' }, { title: 'asc' }],
    });

    const label =
      products[0]?.familyLabel ||
      listKnownFamilies().find((f) => f.slug === slug)?.label ||
      (slug === 'other' ? 'أخرى' : slug);

    const prices = products.map((p) => Number(p.currentPrice)).sort((a, b) => a - b);
    const botIds = new Set(products.map((p) => p.botId));

    return {
      slug,
      label,
      offerCount: products.length,
      totalStock: products.reduce(
        (s, p) => s + (p.stock >= 100_000 ? 0 : Math.max(0, p.stock)),
        0,
      ),
      coverage: botIds.size,
      minPrice: prices[0] ?? null,
      medianPrice: prices.length ? prices[Math.floor(prices.length / 2)] : null,
      maxPrice: prices.length ? prices[prices.length - 1] : null,
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.currentPrice),
        stock: p.stock,
        currency: p.currency,
        durationTag: p.durationTag,
        familyConfidence: p.familyConfidence,
        bot: {
          id: p.bot.id,
          username: p.bot.username,
          displayName: p.bot.displayName,
          name: p.bot.name,
        },
      })),
    };
  }

  async reclassifyAll() {
    const products = await this.prisma.product.findMany({
      select: { id: true, title: true, description: true },
    });
    let updated = 0;
    for (const product of products) {
      const fields = familyFieldsFor(product.title, product.description);
      await this.prisma.product.update({
        where: { id: product.id },
        data: fields,
      });
      updated += 1;
    }
    return { updated };
  }
}
