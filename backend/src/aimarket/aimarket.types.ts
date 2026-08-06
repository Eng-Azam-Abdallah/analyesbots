export type AiMarketProductDto = {
  id: string | number;
  name: string;
  description?: string | null;
  price?: number | null;
  stock?: number | null;
  in_stock?: boolean | null;
  manual_delivery?: boolean | null;
  currency?: string | null;
};

export type AiMarketProductsResponse = {
  products: AiMarketProductDto[];
};

export type AiMarketBalanceResponse = {
  balance?: number;
  currency?: string;
};
