"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ApiChange } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import styles from "./MarketChart.module.css";

type MarketChartProps = {
  changes: ApiChange[];
};

export function MarketActivityChart({ changes }: MarketChartProps) {
  if (changes.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات كافية للرسم"
        description="سيظهر توزيع التغيّرات عبر الوقت بعد تسجيل حركات سوق حقيقية."
      />
    );
  }

  const buckets = new Map<string, number>();
  for (const change of changes) {
    const date = new Date(change.capturedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:00`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const data = Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .slice(-24);

  if (data.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات كافية للرسم"
        description="تعذّر بناء سلسلة زمنية من التغيّرات الحالية."
      />
    );
  }

  const summary = `عدد التغيّرات عبر ${data.length} فترة زمنية. أعلى قيمة ${Math.max(...data.map((d) => d.count))}.`;

  return (
    <div className={styles.wrap}>
      <p className="srOnly">{summary}</p>
      <div className={styles.chart} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(17,24,39,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#4b5563" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#4b5563" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid rgba(17,24,39,0.1)",
                fontFamily: "inherit",
              }}
              labelFormatter={(label) => `الفترة: ${label}`}
              formatter={(value) => [`${value}`, "عدد التغيّرات"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#f97316"
              fill="rgba(249,115,22,0.16)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
