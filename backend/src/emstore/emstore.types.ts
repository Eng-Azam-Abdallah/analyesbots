export type EmStoreProductDto = {
  id: number | string;
  numeric_id?: number | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  stock?: number | null;
  category?: string | null;
  product_type?: string | null;
  currency?: string | null;
};

export type EmStoreProductsResponse = {
  ok?: boolean;
  reseller?: { user_id?: number; balance?: number; name?: string };
  products: EmStoreProductDto[];
};

export type EmStoreBalanceResponse = {
  ok?: boolean;
  reseller?: { user_id?: number; balance?: number; name?: string };
  balance?: number;
  currency?: string;
};
