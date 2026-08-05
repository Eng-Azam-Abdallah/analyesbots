import type { MarketChangeKind } from "./types";

export const CHANGE_LABELS: Record<MarketChangeKind, string> = {
  up: "ارتفع",
  down: "انخفض",
  new: "منتج جديد",
  gone: "اختفى",
  stock_up: "زادت الكمية",
  stock_down: "انخفضت الكمية",
};

export const CHANGE_FILTERS: Array<{
  id: "all" | MarketChangeKind;
  label: string;
}> = [
  { id: "all", label: "الكل" },
  { id: "up", label: "ارتفع السعر" },
  { id: "down", label: "انخفض السعر" },
  { id: "new", label: "منتج جديد" },
  { id: "gone", label: "اختفى" },
  { id: "stock_up", label: "زادت الكمية" },
  { id: "stock_down", label: "انخفضت الكمية" },
];

export function isStockKind(kind: MarketChangeKind): boolean {
  return kind === "stock_up" || kind === "stock_down";
}

export function isPriceKind(kind: MarketChangeKind): boolean {
  return kind === "up" || kind === "down";
}
