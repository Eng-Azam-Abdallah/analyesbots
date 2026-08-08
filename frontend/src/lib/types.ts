export type MarketChangeKind =
  | "up"
  | "down"
  | "new"
  | "gone"
  | "stock_up"
  | "stock_down";

export type ApiBot = {
  id: string;
  name: string;
  username: string;
  displayName: string | null;
  sourceType: string;
  lastSyncedAt: string | null;
  productCount: number;
  createdAt: string;
};

export type ApiProductListItem = {
  id: string;
  title: string;
  currency: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  isActive: boolean;
  priceStale?: boolean;
  familySlug?: string | null;
  familyLabel?: string | null;
  durationTag?: string | null;
  soldTotal?: number | null;
  bot: {
    id: string;
    username: string;
    displayName: string | null;
    name: string;
    lastSyncedAt?: string | null;
  };
  updatedAt: string;
};

export type ApiProductDetail = {
  id: string;
  externalKey: string;
  title: string;
  description: string | null;
  deliveryInstruction: string | null;
  currency: string;
  prices: {
    current: number;
    wholesale: number;
    offer: number | null;
    regular: number | null;
    base: number | null;
  };
  stock: number;
  isActive: boolean;
  familySlug?: string | null;
  familyLabel?: string | null;
  durationTag?: string | null;
  soldTotal?: number | null;
  bot: {
    id: string;
    username: string;
    displayName: string | null;
    name: string;
    lastSyncedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type ApiFamilySummary = {
  slug: string;
  label: string;
  offerCount: number;
  totalStock: number;
  coverage: number;
  minPrice: number | null;
  medianPrice: number | null;
  maxPrice: number | null;
};

export type ApiFamilyDetail = ApiFamilySummary & {
  products: Array<{
    id: string;
    title: string;
    price: number;
    stock: number;
    currency: string;
    durationTag: string | null;
    familyConfidence: string | null;
    bot: {
      id: string;
      username: string;
      displayName: string | null;
      name: string;
    };
  }>;
};

export type StockSignalQuality = "good" | "weak" | "poor";

export type ApiBotDailyStat = {
  botId: string;
  username: string;
  displayName: string | null;
  name: string | null;
  unitsProxy: number;
  revenueProxy: number;
  stockDownCount: number;
  activeSkus: number;
  declaredUnits: number;
  declaredRevenue: number;
  stockSignalQuality: StockSignalQuality;
  stockSignalRatio: number;
};

export type ApiAnalyticsBotsDaily = {
  metricType: string;
  disclaimer: string;
  day: string;
  start: string;
  end: string;
  data: ApiBotDailyStat[];
};

export type ApiAnalyticsRanking = {
  metricType: string;
  disclaimer: string;
  range: string;
  start: string;
  end: string;
  data: Array<{
    botId: string;
    username: string;
    displayName: string | null;
    name: string | null;
    unitsProxy: number;
    revenueProxy: number;
    stockDownCount: number;
    activeSkus: number;
  }>;
};

export type ApiAnalyticsProductsTop = {
  metricType: string;
  disclaimer: string;
  range: string;
  groupBy: string;
  start: string;
  end: string;
  data: Array<{
    familySlug?: string;
    familyLabel?: string;
    productId?: string;
    title?: string;
    botUsername?: string;
    unitsProxy: number;
    revenueProxy: number;
  }>;
};

export type ApiProductHistory = {
  productId: string;
  title: string;
  snapshots: Array<{
    id: string;
    price: number;
    stock: number;
    capturedAt: string;
  }>;
};

export type ApiChange = {
  id: string;
  kind: MarketChangeKind;
  fromPrice: number | null;
  toPrice: number | null;
  changePercent: number | null;
  fromStock: number | null;
  toStock: number | null;
  capturedAt: string;
  product: {
    id: string;
    title: string;
    currency: string;
    bot: {
      username: string;
      displayName: string | null;
    };
  };
};

export type ApiMarketSummary = {
  windowHours: number;
  since: string;
  up: number;
  down: number;
  fresh: number;
  gone: number;
  stockUp: number;
  stockDown: number;
  activeProducts: number;
};

export type ApiSyncRun = {
  id: string;
  botId: string;
  status: "ok" | "error";
  productsSeen: number;
  changesDetected: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  bot: {
    id: string;
    username: string;
    displayName: string | null;
    sourceType: string;
  };
};
