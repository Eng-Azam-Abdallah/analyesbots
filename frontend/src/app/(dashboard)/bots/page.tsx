import { ApiErrorState } from "@/components/ApiErrorState";
import { BotsGrid } from "@/components/BotsGrid";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getAnalyticsBotsDaily, getBots, getSyncRuns } from "@/lib/api";
import { minutesSince } from "@/lib/format";

export default async function BotsPage() {
  try {
    const [bots, runs, daily] = await Promise.all([
      getBots(),
      getSyncRuns(),
      getAnalyticsBotsDaily().catch(() => null),
    ]);
    const connected = bots.filter((bot) => {
      const mins = minutesSince(bot.lastSyncedAt);
      return mins !== null && mins <= 10;
    }).length;

    const dailyByBotId: Record<
      string,
    {
      unitsProxy: number;
      revenueProxy: number;
      declaredUnits: number;
      stockSignalQuality: "good" | "weak" | "poor";
      stockSignalRatio: number;
    }
  > = {};
    for (const row of daily?.data ?? []) {
      dailyByBotId[row.botId] = {
        unitsProxy: row.unitsProxy,
        revenueProxy: row.revenueProxy,
        declaredUnits: row.declaredUnits,
        stockSignalQuality: row.stockSignalQuality,
        stockSignalRatio: row.stockSignalRatio,
      };
    }

    return (
      <div className="pageEnter">
        <PageHeader
          title="المصادر"
          description="حالة تشغيل مصادر البيانات: الاتصال، حداثة المزامنة، وعدد المنتجات."
          status={`${connected} متصل من ${bots.length}`}
        />
        <BotsGrid bots={bots} runs={runs} dailyByBotId={dailyByBotId} />
      </div>
    );
  } catch (error) {
    return (
      <div className="pageEnter">
        <PageHeader
          title="المصادر"
          description="مصادر البيانات المتابعة."
        />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل بيانات المصادر."
          }
        />
      </div>
    );
  }
}
