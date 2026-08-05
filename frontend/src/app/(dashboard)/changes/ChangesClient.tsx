"use client";

import { useMemo, useState } from "react";
import { ChangesList } from "@/components/ChangesList";
import { PageHeader } from "@/components/PageHeader";
import type { ApiChange, MarketChangeKind } from "@/lib/types";
import { CHANGE_FILTERS } from "@/lib/labels";
import { botDisplayName } from "@/lib/format";
import styles from "./page.module.css";

type ChangesClientProps = {
  items: ApiChange[];
};

export function ChangesClient({ items }: ChangesClientProps) {
  const [kind, setKind] = useState<"all" | MarketChangeKind>("all");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");

  const sources = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(
        item.product.bot.username,
        botDisplayName(item.product.bot),
      );
    }
    return Array.from(map.entries());
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKind = kind === "all" || item.kind === kind;
      const matchesSource =
        source === "all" || item.product.bot.username === source;
      const matchesQuery =
        !q ||
        item.product.title.toLowerCase().includes(q) ||
        item.product.bot.username.toLowerCase().includes(q);
      return matchesKind && matchesSource && matchesQuery;
    });
  }, [items, kind, query, source]);

  const isFiltered = kind !== "all" || query.trim() !== "" || source !== "all";

  function reset() {
    setKind("all");
    setQuery("");
    setSource("all");
  }

  return (
    <div className="pageEnter">
      <PageHeader
        title="التغيّرات"
        description="سجل تدقيق لحركة السوق: الأسعار، الكميات، المنتجات الجديدة والمختفية."
        status={`عرض ${filtered.length} من ${items.length}`}
      />

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className="uiField">
            <span>بحث</span>
            <input
              type="search"
              placeholder="اسم المنتج أو المصدر..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="uiField">
            <span>المصدر</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="all">كل المصادر</option>
              {sources.map(([username, label]) => (
                <option key={username} value={username}>
                  {label} (@{username})
                </option>
              ))}
            </select>
          </label>
          {isFiltered ? (
            <button type="button" className="uiButtonSecondary" onClick={reset}>
              مسح الفلاتر
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className={styles.tabs} role="group" aria-label="تصفية نوع التغيّر">
          {CHANGE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={kind === item.id}
              className={`${styles.tab} ${kind === item.id ? styles.active : ""}`}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <ChangesList items={filtered} variant="table" />

      <p className={styles.closure} role="status">
        {isFiltered
          ? `اكتمل عرض ${filtered.length} نتيجة للفلاتر الحالية.`
          : `اكتمل عرض كل التغيّرات (${filtered.length}).`}
      </p>
    </div>
  );
}
