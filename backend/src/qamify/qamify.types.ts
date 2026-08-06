export type QamifyProductDto = {
  id: number | string;
  name: string;
  description?: string | null;
  unit_price_cents?: number | null;
  unit_price?: string | number | null;
  currency?: string | null;
  stock?: number | null;
  min_qty?: number | null;
  max_qty?: number | null;
  units_per_item?: number | null;
  sold_total?: number | null;
};

export type QamifyProductsResponse = {
  ok: boolean;
  products: QamifyProductDto[];
};

export type QamifyBalanceResponse = {
  ok: boolean;
  balance_cents?: number;
  balance?: string | number;
  currency?: string;
};

export type QamifyPingResponse = {
  ok: boolean;
  reseller?: string;
  status?: string;
  build?: string;
};
