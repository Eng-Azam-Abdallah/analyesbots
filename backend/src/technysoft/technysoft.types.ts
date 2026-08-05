export type TechnySoftCategory = {
  id: number;
  name_ar?: string;
  name_en?: string;
};

export type TechnySoftProductDto = {
  id: number;
  category?: TechnySoftCategory | null;
  name_ar?: string;
  name_en?: string;
  description_ar?: string | null;
  description_en?: string | null;
  stock: number | null;
  unlimited?: boolean;
  instant?: boolean;
  activation_url?: string | null;
  price_usd: number;
  bulk_tiers?: Array<{ min_qty: number; unit_price: number }> | null;
  offer?: unknown;
};

export type TechnySoftMeResponse = {
  tg_id?: number;
  name?: string;
  balance: number;
  currency?: string;
  key_prefix?: string;
  created_at?: string;
};
