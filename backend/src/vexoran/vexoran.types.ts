export type VexoranProductDto = {
  id: string;
  name: string;
  price?: number | null;
  wholesale_price?: number | null;
  base_price?: number | null;
  offer_price?: number | null;
  regular_price?: number | null;
  currency?: string | null;
  description?: string | null;
  description_text?: string | null;
  delivery_instruction?: string | null;
  delivery_instructions?: string | null;
  stock?: number | null;
  available?: boolean | null;
};

export type VexoranProductsResponse = {
  ok?: boolean;
  reseller?: { name?: string; balance?: number };
  products: VexoranProductDto[];
};

export type VexoranBalanceResponse = {
  ok?: boolean;
  balance?: number;
  currency?: string;
  reseller?: { name?: string; balance?: number };
};
