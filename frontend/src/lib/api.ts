import type {
  ApiBot,
  ApiChange,
  ApiMarketSummary,
  ApiProductDetail,
  ApiProductHistory,
  ApiProductListItem,
  ApiSyncRun,
  MarketChangeKind,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new ApiError(
        `تعذّر تحميل ${path} (رمز الحالة ${response.status})`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "تعذّر الاتصال بالخادم. تأكد أن Backend يعمل على المنفذ 3001.",
    );
  }
}

export function getMarketSummary(hours = 24) {
  return apiFetch<ApiMarketSummary>(`/market/summary?hours=${hours}`);
}

export function getProducts(params?: { active?: boolean; botId?: string }) {
  const search = new URLSearchParams();
  if (params?.active === true) search.set("active", "true");
  if (params?.active === false) search.set("active", "false");
  if (params?.botId) search.set("botId", params.botId);
  const query = search.toString();
  return apiFetch<ApiProductListItem[]>(
    `/products${query ? `?${query}` : ""}`,
  );
}

export function getProduct(id: string) {
  return apiFetch<ApiProductDetail>(`/products/${id}`);
}

export function getProductHistory(id: string) {
  return apiFetch<ApiProductHistory>(`/products/${id}/history`);
}

export function getChanges(params?: {
  kind?: MarketChangeKind;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.kind) search.set("kind", params.kind);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiFetch<ApiChange[]>(`/changes${query ? `?${query}` : ""}`);
}

export function getBots() {
  return apiFetch<ApiBot[]>("/bots");
}

export function getSyncRuns() {
  return apiFetch<ApiSyncRun[]>("/sync/runs");
}
