"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiProductHistory } from "@/lib/types";
import {
  absoluteDiff,
  formatExactTime,
  formatPercent,
  formatPrice,
  formatRelativeTime,
  formatStock,
  safePercentChange,
} from "@/lib/format";
import { EmptyState } from "./EmptyState";
import styles from "./ProductHistory.module.css";
import chartStyles from "./MarketChart.module.css";

type ProductHistoryPanelProps = {
  history: ApiProductHistory;
  currency: string;
};

export function ProductHistoryPanel({
  history,
  currency,
}: ProductHistoryPanelProps) {
  const [mode, setMode] = useState<"price" | "stock">("price");

  const chronological = useMemo(() => {
    return [...history.snapshots].sort(
      (a, b) =>
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    );
  }, [history.snapshots]);

  const chartData = useMemo(() => {
    return chronological.map((snap) => ({
      id: snap.id,
      label: formatExactTime(snap.capturedAt),
      price: snap.price,
      stock: snap.stock,
      capturedAt: snap.capturedAt,
    }));
  }, [chronological]);

  const timeline = useMemo(() => {
    const rows = [];
    for (let i = 1; i < chronological.length; i += 1) {
      const prev = chronological[i - 1];
      const curr = chronological[i];
      const priceDiff = absoluteDiff(prev.price, curr.price);
      const stockDiff = absoluteDiff(prev.stock, curr.stock);
      rows.push({
        id: curr.id,
        capturedAt: curr.capturedAt,
        fromPrice: prev.price,
        toPrice: curr.price,
        priceDiff,
        pricePct: safePercentChange(prev.price, curr.price),
        fromStock: prev.stock,
        toStock: curr.stock,
        stockDiff,
        stockPct: safePercentChange(prev.stock, curr.stock),
      });
    }
    return rows.reverse();
  }, [chronological]);

  if (history.snapshots.length === 0) {
    return (
      <EmptyState
        title="لا يوجد سجل بعد"
        description="سيظهر سجل السعر والكمية بعد أول مزامنات متتالية لهذا المنتج."
      />
    );
  }

  const summary =
    mode === "price"
      ? `مخطط سعر يضم ${chartData.length} نقطة.`
      : `مخطط كمية يضم ${chartData.length} نقطة.`;

  return (
    <div className={styles.wrap}>
      <div className={chartStyles.toggle} role="group" aria-label="نوع المخطط">
        <button
          type="button"
          aria-pressed={mode === "price"}
          onClick={() => setMode("price")}
        >
          السعر
        </button>
        <button
          type="button"
          aria-pressed={mode === "stock"}
          onClick={() => setMode("stock")}
        >
          الكمية
        </button>
      </div>

      <div className={chartStyles.wrap}>
        <p className="srOnly">{summary}</p>
        <div className={chartStyles.chart} role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(17,24,39,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                hide={chartData.length > 8}
                tick={{ fontSize: 11, fill: "#4b5563" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#4b5563" }}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid rgba(17,24,39,0.1)",
                  fontFamily: "inherit",
                }}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as
                    | { capturedAt?: string }
                    | undefined;
                  return point?.capturedAt
                    ? formatExactTime(point.capturedAt)
                    : "";
                }}
                formatter={(value) => {
                  const numeric =
                    typeof value === "number" ? value : Number(value);
                  if (mode === "price") {
                    return [formatPrice(numeric, currency), "السعر"];
                  }
                  return [formatStock(numeric), "الكمية"];
                }}
              />
              <Line
                type="monotone"
                dataKey={mode}
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f97316" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="srOnly">سجل فروقات السعر والكمية</caption>
          <thead>
            <tr>
              <th scope="col">الوقت</th>
              <th scope="col">السعر قبل</th>
              <th scope="col">السعر بعد</th>
              <th scope="col">فرق السعر</th>
              <th scope="col">الكمية قبل</th>
              <th scope="col">الكمية بعد</th>
              <th scope="col">فرق الكمية</th>
            </tr>
          </thead>
          <tbody>
            {timeline.length === 0 ? (
              <tr>
                <td colSpan={7}>نقطة واحدة فقط — لا يوجد فرق للمقارنة بعد.</td>
              </tr>
            ) : (
              timeline.map((row) => (
                <tr key={row.id}>
                  <td>
                    <time dateTime={row.capturedAt}>
                      {formatRelativeTime(row.capturedAt)}
                    </time>
                  </td>
                  <td className="tabular">
                    {formatPrice(row.fromPrice, currency)}
                  </td>
                  <td className="tabular">
                    {formatPrice(row.toPrice, currency)}
                  </td>
                  <td className="tabular">
                    {row.priceDiff === null
                      ? "—"
                      : `${row.priceDiff > 0 ? "+" : ""}${row.priceDiff.toFixed(2)} (${formatPercent(row.pricePct)})`}
                  </td>
                  <td className="tabular">{formatStock(row.fromStock)}</td>
                  <td className="tabular">{formatStock(row.toStock)}</td>
                  <td className="tabular">
                    {row.stockDiff === null
                      ? "—"
                      : `${row.stockDiff > 0 ? "+" : ""}${row.stockDiff} (${formatPercent(row.stockPct)})`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
