import { ApiErrorState } from "@/components/ApiErrorState";
import { BotsGrid } from "@/components/BotsGrid";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getBots, getSyncRuns } from "@/lib/api";
import { minutesSince } from "@/lib/format";

export default async function BotsPage() {
  try {
    const [bots, runs] = await Promise.all([getBots(), getSyncRuns()]);
    const connected = bots.filter((bot) => {
      const mins = minutesSince(bot.lastSyncedAt);
      return mins !== null && mins <= 10;
    }).length;

    return (
      <div className="pageEnter">
        <PageHeader
          title="المصادر"
          description="حالة تشغيل مصادر البيانات: الاتصال، حداثة المزامنة، وعدد المنتجات."
          status={`${connected} متصل من ${bots.length}`}
        />
        <BotsGrid bots={bots} runs={runs} />
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
