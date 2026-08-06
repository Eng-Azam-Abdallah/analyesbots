const UNLIMITED_STOCK_THRESHOLD = 999_999;

export function formatPrice(
  value: number | null | undefined,
  currency = "USDT",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 4,
  }).format(value);

  return `${formatted} ${currency}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatStock(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "غير معروف";
  }
  if (value <= 0) return "0";
  if (value >= UNLIMITED_STOCK_THRESHOLD) return "غير محدود";
  return formatNumber(value);
}

export function isUnlimitedStock(value: number | null | undefined): boolean {
  return typeof value === "number" && value >= UNLIMITED_STOCK_THRESHOLD;
}

export function formatPercent(
  value: number | null | undefined,
  options?: { signed?: boolean },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const signed = options?.signed !== false;
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function safePercentChange(
  from: number | null | undefined,
  to: number | null | undefined,
): number | null {
  if (
    from === null ||
    from === undefined ||
    to === null ||
    to === undefined ||
    Number.isNaN(from) ||
    Number.isNaN(to) ||
    from === 0
  ) {
    return null;
  }

  return ((to - from) / Math.abs(from)) * 100;
}

export function absoluteDiff(
  from: number | null | undefined,
  to: number | null | undefined,
): number | null {
  if (
    from === null ||
    from === undefined ||
    to === null ||
    to === undefined ||
    Number.isNaN(from) ||
    Number.isNaN(to)
  ) {
    return null;
  }
  return to - from;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;

  return formatExactTime(iso);
}

export function formatExactTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDurationMs(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): string {
  if (!startedAt || !finishedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";

  const ms = end - start;
  if (ms < 1000) return `${ms} مللي ثانية`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} ثانية`;
  return `${(seconds / 60).toFixed(1)} دقيقة`;
}

export function minutesSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 60_000);
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "reseller_api":
      return "Reseller API";
    case "canboso_api":
      return "Canboso API";
    case "zoomstoore_api":
      return "Zoom Store API";
    case "technysoft_api":
      return "TechnySoft API";
    case "telegram_buyer_api":
      return "Buyer API";
    case "hypervin_api":
      return "HyleHub / HyperVin";
    case "shopdigital_api":
      return "KOKORO SHOP";
    case "teleshopbot_api":
      return "TeleShopBot";
    case "qamify_api":
      return "Qamify";
    default:
      return sourceType;
  }
}

export function botDisplayName(bot: {
  displayName?: string | null;
  name?: string;
  username?: string;
}): string {
  return bot.displayName || bot.name || bot.username || "مصدر غير معروف";
}

/** "اسم المتجر (@username)" — للفلاتر والقوائم المنسدلة */
export function botLabel(bot: {
  displayName?: string | null;
  name?: string;
  username?: string;
}): string {
  const name = botDisplayName(bot);
  const username = bot.username?.replace(/^@/, "").trim();
  if (!username) return name;
  if (name.toLowerCase() === username.toLowerCase() || name === `@${username}`) {
    return `@${username}`;
  }
  return `${name} (@${username})`;
}

export function telegramBotUrl(username?: string | null): string | null {
  const handle = username?.replace(/^@/, "").trim();
  if (!handle) return null;
  return `https://t.me/${handle}`;
}
