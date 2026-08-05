import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  PackagePlus,
  Radio,
  Boxes,
} from "lucide-react";
import { ApiErrorState } from "@/components/ApiErrorState";
import { ChangesList } from "@/components/ChangesList";
import { MarketActivityChart } from "@/components/MarketChart";
import { PageHeader } from "@/components/PageHeader";
import { StatCards } from "@/components/StatCards";
import {
  ApiError,
  getBots,
  getChanges,
  getMarketSummary,
} from "@/lib/api";
import { formatRelativeTime, minutesSince } from "@/lib/format";
import styles from "./page.module.css";

export default async function DashboardPage() {
  try {
    const [summary, recent, bots, chartChanges] = await Promise.all([
      getMarketSummary(24),
      getChanges({ limit: 8 }),
      getBots(),
      getChanges({ limit: 200 }),
    ]);

    const connected = bots.filter((bot) => {
      const mins = minutesSince(bot.lastSyncedAt);
      return mins !== null && mins <= 10;
    }).length;

    const latestSync = bots
      .map((bot) => bot.lastSyncedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    const latestMins = minutesSince(latestSync);
    const stale = latestMins === null || latestMins > 10;
    const stockMoves = summary.stockUp + summary.stockDown;

    return (
      <div className="pageEnter">
        <PageHeader
          title="لوحة السوق"
          eyebrow="Analyes"
          description="ماذا حدث في السوق منذ آخر مزامنة؟ راقب الارتفاعات والانخفاضات والمنتجات الجديدة بسرعة."
          status={`آخر مزامنة ${formatRelativeTime(latestSync)}`}
        />

        {stale ? (
          <div className={styles.stale} role="status">
            <div>
              <strong>بيانات قديمة أو مزامنة متأخرة</strong>
              آخر بيانات ناجحة ما زالت معروضة. تحقق من حالة المصادر إن استمر التأخير.
            </div>
          </div>
        ) : null}

        <StatCards
          items={[
            {
              key: "products",
              label: "إجمالي المنتجات",
              value: summary.activeProducts,
              hint: "منتجات نشطة",
              href: "/products",
              icon: Package,
              tone: "neutral",
            },
            {
              key: "fresh",
              label: "منتجات جديدة",
              value: summary.fresh,
              hint: "خلال 24 ساعة",
              href: "/changes",
              icon: PackagePlus,
              tone: "fresh",
            },
            {
              key: "up",
              label: "أسعار مرتفعة",
              value: summary.up,
              hint: "ارتفع السعر",
              href: "/changes",
              icon: ArrowUpRight,
              tone: "up",
            },
            {
              key: "down",
              label: "أسعار منخفضة",
              value: summary.down,
              hint: "انخفض السعر",
              href: "/changes",
              icon: ArrowDownRight,
              tone: "down",
            },
            {
              key: "stock",
              label: "تغيّرات الكمية",
              value: stockMoves,
              hint: `+${summary.stockUp} / −${summary.stockDown}`,
              href: "/changes",
              icon: Boxes,
              tone: "neutral",
            },
            {
              key: "sources",
              label: "المصادر المتصلة",
              value: `${connected}/${bots.length}`,
              hint: summary.gone > 0 ? `${summary.gone} اختفى` : "خلال آخر 10 دقائق",
              href: "/bots",
              icon: Radio,
              tone: connected > 0 ? "up" : "down",
            },
          ]}
        />

        <section className={styles.section} aria-labelledby="activity-heading">
          <div className={styles.sectionHead}>
            <h2 id="activity-heading" className={styles.sectionTitle}>
              نشاط السوق
            </h2>
            <Link href="/changes" className={styles.sectionLink}>
              كل التغيّرات
            </Link>
          </div>
          <ChangesList items={recent} variant="table" />
          <p className={styles.closure} role="status">
            أحدث {recent.length} حركات · اختفى {summary.gone} منتج خلال 24 ساعة.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="chart-heading">
          <div className={styles.sectionHead}>
            <h2 id="chart-heading" className={styles.sectionTitle}>
              توزيع التغيّرات عبر الوقت
            </h2>
          </div>
          <MarketActivityChart changes={chartChanges} />
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="pageEnter">
        <PageHeader
          title="لوحة السوق"
          description="ملخص السوق من بيانات المزامنة."
        />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل ملخص السوق."
          }
        />
      </div>
    );
  }
}
