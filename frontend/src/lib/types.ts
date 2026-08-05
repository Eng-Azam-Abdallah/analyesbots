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
  bot: {
    id: string;
    username: string;
    displayName: string | null;
    name: string;
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
