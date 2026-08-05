export type CanbosoProductDto = {
  id?: string | number;
  product_id?: string | number;
  name?: string;
  title?: string;
  price?: number | string;
  cost?: number | string;
  wholesale_price?: number | string;
  amount?: number | string;
  stock?: number | string;
  quantity?: number | string;
  available?: number | string;
  available_stock?: number | string;
  currency?: string;
  description?: string | null;
  category?: string | null;
  [key: string]: unknown;
};

export type CanbosoProductsResponse = {
  products?: CanbosoProductDto[];
  data?: CanbosoProductDto[] | { products?: CanbosoProductDto[] };
  items?: CanbosoProductDto[];
  [key: string]: unknown;
};

export type CanbosoBalanceResponse = {
  balance?: number | string;
  wallet_balance?: number | string;
  currency?: string;
  data?: { balance?: number | string; currency?: string };
  [key: string]: unknown;
};

export type NormalizedCanbosoProduct = {
  externalKey: string;
  title: string;
  price: number;
  stock: number;
  currency: string;
  description: string | null;
  raw: CanbosoProductDto;
};
