export type ResellerProductDto = {
  id: string;
  name: string;
  wholesale_price: number;
  offer_price?: number | null;
  regular_price?: number | null;
  base_price?: number | null;
  currency?: string | null;
  description?: string | null;
  delivery_instruction?: string | null;
  stock?: number | null;
};

export type ResellerProductsResponse = {
  ok: boolean;
  reseller?: { name?: string; balance?: number };
  products: ResellerProductDto[];
};

export type ResellerBalanceResponse = {
  ok: boolean;
  balance?: number;
  currency?: string;
  reseller?: { name?: string; balance?: number };
};
