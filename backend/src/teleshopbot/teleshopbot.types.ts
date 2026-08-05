export type TeleShopBotProductDto = {
  id: string;
  active?: boolean;
  published?: boolean;
  name: string;
  names?: Record<string, string>;
  price: number;
  stock: number;
  inStock?: boolean;
  category?: string;
  categories?: Record<string, string>;
  description?: string | null;
  descriptions?: Record<string, string>;
  minBuy?: number;
  maxBuy?: number;
};

export type TeleShopBotListResponse<T> = {
  success: boolean;
  count?: number;
  data: T;
  code?: string;
  error?: string;
};

export type TeleShopBotBalanceData = {
  balance: number;
  totalDeposit?: number;
  totalSpent?: number;
};

export type TeleShopBotAccountInfo = {
  chatId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance?: number;
  totalDeposit?: number;
  totalSpent?: number;
  createdAt?: string;
};
