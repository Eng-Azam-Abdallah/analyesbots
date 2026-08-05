export type ShopDigitalProductDto = {
  id: string;
  name: string;
  price: number;
  stock: number;
  source?: string;
  min_order?: number;
  bulk_discounts?: Array<{
    min_qty?: number;
    unit_price?: number;
    discount_percent?: number;
  }>;
  description_es?: string | null;
  description_en?: string | null;
};

export type ShopDigitalProductsResponse = {
  success: boolean;
  count?: number;
  products: ShopDigitalProductDto[];
  error?: string;
};

export type ShopDigitalBalanceResponse = {
  success: boolean;
  user_id?: number | string;
  balance: number;
  error?: string;
};
