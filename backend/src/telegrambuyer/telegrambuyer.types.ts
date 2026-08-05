export type TelegramBuyerProductDto = {
  product_id: number | string;
  name: string;
  price: number | string;
  stock: number | string;
  description?: string | null;
  bulk_tiers?: Array<{
    min?: number;
    max?: number;
    price?: number;
  }>;
  [key: string]: unknown;
};

export type TelegramBuyerProductsResponse = {
  products: TelegramBuyerProductDto[];
};

export type TelegramBuyerBalanceResponse = {
  balance: number;
  status?: string;
  user_id?: number;
  username?: string;
};
