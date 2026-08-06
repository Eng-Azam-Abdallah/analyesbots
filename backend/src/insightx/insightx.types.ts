export type InsightXProductDto = {
  id: number | string;
  name: string;
  price_usdt?: number | null;
  price?: number | null;
  base_price_usdt?: number | null;
  stock?: number | null;
  available?: boolean | null;
};

export type InsightXProductsResponse = {
  products: InsightXProductDto[];
};

export type InsightXBalanceResponse = {
  balance_usdt?: number;
  key_prefix?: string;
  status?: string;
  rate_limit_per_min?: number;
  recent_transactions?: unknown[];
};

export type InsightXHealthResponse = {
  ok?: boolean;
  service?: string;
  version?: string;
};
