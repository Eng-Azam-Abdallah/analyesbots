export type ZoomStooreProductDto = {
  id: string;
  name: string;
  price: number;
  list_price?: number | null;
  stock: number;
  in_stock?: boolean;
  currency?: string;
};

export type ZoomStooreProductsResponse = {
  products: ZoomStooreProductDto[];
};

export type ZoomStooreBalanceResponse = {
  balance: number;
  currency?: string;
};
