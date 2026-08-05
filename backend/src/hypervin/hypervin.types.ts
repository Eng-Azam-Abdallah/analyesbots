export type HyperVinProductDto = {
  id: string;
  name: string;
  price: number;
  group?: string;
  stock: number;
  format?: string;
  description?: string | null;
};

export type HyperVinProductsResponse = {
  success: boolean;
  products: HyperVinProductDto[];
  count?: number;
  error?: string;
};

export type HyperVinBalanceResponse = {
  success: boolean;
  user_id?: number;
  balance: number;
  balance_formatted?: string;
  error?: string;
};
