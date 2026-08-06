import type { ApiBot, ApiSyncRun } from "@/lib/types";
import {
  formatDurationMs,
  formatExactTime,
  formatRelativeTime,
  minutesSince,
  sourceLabel,
} from "@/lib/format";
import { BotIdentity } from "./BotIdentity";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import styles from "./BotsGrid.module.css";

type BotsGridProps = {
  bots: ApiBot[];
  runs?: ApiSyncRun[];
};

type SourceState = "active" | "paused" | "error" | "inactive";

function resolveState(
  bot: ApiBot,
  lastRun?: ApiSyncRun,
): { kind: SourceState; label: string } {
  if (lastRun?.status === "error") {
    return { kind: "error", label: "فشل الاتصال" };
  }
  if (!bot.lastSyncedAt) {
    return { kind: "inactive", label: "لم تتم المزامنة بعد" };
  }
  const mins = minutesSince(bot.lastSyncedAt);
  if (mins !== null && mins <= 5) {
    return { kind: "active", label: "متصل" };
  }
  if (mins !== null && mins <= 30) {
    return { kind: "paused", label: "متأخر" };
  }
  return { kind: "paused", label: "بيانات قديمة" };
}

export function BotsGrid({ bots, runs = [] }: BotsGridProps) {
  if (bots.length === 0) {
    return (
      <EmptyState
        title="لا توجد مصادر متصلة"
        description="أضف مصدر بيانات في Backend وانتظر أول مزامنة ناجحة."
      />
    );
  }

  const latestByBot = new Map<string, ApiSyncRun>();
  for (const run of runs) {
    if (!latestByBot.has(run.botId)) {
      latestByBot.set(run.botId, run);
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.count} role="status">
        {bots.length} مصادر بيانات متابعة
      </p>
      <ul className={styles.list}>
        {bots.map((bot) => {
          const lastRun = latestByBot.get(bot.id);
          const state = resolveState(bot, lastRun);

          return (
            <li key={bot.id} className={styles.row}>
              <div className={styles.main}>
                <BotIdentity bot={bot} prominent />
                <span className={styles.sourceType}>
                  {sourceLabel(bot.sourceType)}
                </span>
              </div>

              <div className={styles.stats}>
                <div>
                  <span className={styles.statLabel}>المنتجات</span>
                  <div className={styles.statValue}>{bot.productCount}</div>
                </div>
                <div>
                  <span className={styles.statLabel}>آخر مزامنة ناجحة</span>
                  <div className={styles.statValue}>
                    {formatRelativeTime(bot.lastSyncedAt)}
                  </div>
                </div>
                <div>
                  <span className={styles.statLabel}>آخر محاولة</span>
                  <div className={styles.statValue}>
                    {lastRun
                      ? formatRelativeTime(lastRun.startedAt)
                      : "—"}
                  </div>
                </div>
                <div>
                  <span className={styles.statLabel}>مدة آخر تشغيل</span>
                  <div className={styles.statValue}>
                    {lastRun
                      ? formatDurationMs(lastRun.startedAt, lastRun.finishedAt)
                      : "—"}
                  </div>
                </div>
                <div>
                  <span className={styles.statLabel}>وقت دقيق</span>
                  <div className={styles.statValue}>
                    {formatExactTime(bot.lastSyncedAt)}
                  </div>
                </div>
                <div>
                  <span className={styles.statLabel}>تغيّرات آخر تشغيل</span>
                  <div className={styles.statValue}>
                    {lastRun ? lastRun.changesDetected : "—"}
                  </div>
                </div>
              </div>

              <div className={styles.statusRow}>
                <StatusBadge kind={state.kind} />
                <span className="srOnly">{state.label}</span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: "var(--brand-muted)",
                  }}
                >
                  {state.label}
                </span>
              </div>

              {lastRun?.status === "error" && lastRun.errorMessage ? (
                <details className={styles.errorBox}>
                  <summary>تعذّر تحميل بيانات المصدر</summary>
                  <pre>{sanitizeError(lastRun.errorMessage)}</pre>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function sanitizeError(message: string): string {
  return message
    .replace(/mkeapi_[a-z0-9]+/gi, "[redacted]")
    .replace(/rsk_live_[a-z0-9]+/gi, "[redacted]")
    .replace(/mk_[a-z0-9_]+/gi, "[redacted]")
    .replace(/tgb_[a-z0-9]+/gi, "[redacted]")
    .replace(/qamify_[a-z0-9]+/gi, "[redacted]")
    .replace(/tsb_live_[a-zA-Z0-9_]+/gi, "[redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .slice(0, 500);
}
