"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  getAnalyticsAvailability,
  getAnalyticsBotsDaily,
  getAnalyticsProductsTop,
} from "@/lib/api";
import type {
  ApiAnalyticsBotsDaily,
  ApiAnalyticsProductsTop,
  ApiFamilySummary,
} from "@/lib/types";
import { formatPrice, formatStock } from "@/lib/format";
import styles from "./page.module.css";

type Tab = "bots" | "sold" | "stock";

export function AnalyticsClient() {
  const [tab, setTab] = useState<Tab>("bots");
  const [range, setRange] = useState<"1d" | "7d">("1d");
  const [bots, setBots] = useState<ApiAnalyticsBotsDaily | null>(null);
  const [sold, setSold] = useState<ApiAnalyticsProductsTop | null>(null);
  const [stock, setStock] = useState<ApiFamilySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [b, s, a] = await Promise.all([
          getAnalyticsBotsDaily(),
          getAnalyticsProductsTop(range, "family"),
          getAnalyticsAvailability(),
        ]);
        if (cancelled) return;
        setBots(b);
        setSold(s);
        setStock(a.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذّر التحميل");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="pageEnter">
      <PageHeader
        title="التحليل"
        description="مبيعات مستنتجة من انخفاض المخزون، وترتيب التوفر حسب العائلات."
        status={bots ? `يوم ${bots.day}` : "…"}
      />

      <p className={styles.disclaimer} role="note">
        {bots?.disclaimer ??
          "تقدير من انخفاض المخزون — ليس تقرير مبيعات رسمي من البوت"}
      </p>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {(
            [
              ["bots", "البوتات"],
              ["sold", "الأكثر مبيعًا"],
              ["stock", "الأكثر توفرًا"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="uiField">
          <span>النطاق</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "1d" | "7d")}
          >
            <option value="1d">اليوم</option>
            <option value="7d">7 أيام</option>
          </select>
        </label>
      </div>

      {loading ? <p className={styles.muted}>جاري التحميل…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && tab === "bots" && bots ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>البوت</th>
                <th>كمية مستنتجة</th>
                <th>إيراد مستنتج</th>
                <th>أحداث</th>
                <th>معلن (كمية)</th>
                <th>جودة المؤشر</th>
              </tr>
            </thead>
            <tbody>
              {bots.data.map((row) => (
                <tr key={row.botId}>
                  <td>
                    {row.displayName || row.name || row.username}
                    <span className={`${styles.sub} ltr`}>@{row.username}</span>
                  </td>
                  <td className="tabular">{row.unitsProxy}</td>
                  <td className="tabular">
                    {formatPrice(row.revenueProxy, "USDT")}
                  </td>
                  <td className="tabular">{row.stockDownCount}</td>
                  <td className="tabular">{row.declaredUnits}</td>
                  <td>
                    {row.stockSignalQuality === "good"
                      ? "جيد"
                      : row.stockSignalQuality === "weak"
                        ? "متوسط"
                        : "ضعيف"}{" "}
                    <span className={styles.sub}>
                      {Math.round((row.stockSignalRatio ?? 0) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && tab === "sold" && sold ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>العائلة</th>
                <th>كمية</th>
                <th>إيراد مستنتج</th>
              </tr>
            </thead>
            <tbody>
              {sold.data.map((row) => (
                <tr key={row.familySlug || row.productId}>
                  <td>
                    {row.familyLabel ? (
                      <Link href={`/categories/${row.familySlug}`}>
                        {row.familyLabel}
                      </Link>
                    ) : (
                      row.title
                    )}
                  </td>
                  <td className="tabular">{row.unitsProxy}</td>
                  <td className="tabular">
                    {formatPrice(row.revenueProxy, "USDT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && !error && tab === "stock" && stock ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>العائلة</th>
                <th>المخزون</th>
                <th>البوتات</th>
                <th>العروض</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row.slug}>
                  <td>
                    <Link href={`/categories/${row.slug}`}>{row.label}</Link>
                  </td>
                  <td className="tabular">{formatStock(row.totalStock)}</td>
                  <td className="tabular">{row.coverage}</td>
                  <td className="tabular">{row.offerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
