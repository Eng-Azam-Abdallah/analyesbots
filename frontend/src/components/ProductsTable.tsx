"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApiBot, ApiProductListItem } from "@/lib/types";
import {
  botLabel,
  formatPrice,
  formatRelativeTime,
  formatStock,
} from "@/lib/format";
import { BotIdentity } from "./BotIdentity";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import styles from "./ProductsTable.module.css";

type ProductsTableProps = {
  products: ApiProductListItem[];
  bots: ApiBot[];
  families?: Array<{ slug: string; label: string }>;
};

type SortKey = "name" | "price" | "stock" | "source" | "updated";
type Availability = "all" | "active" | "inactive";

export function ProductsTable({
  products,
  bots,
  families = [],
}: ProductsTableProps) {
  const [query, setQuery] = useState("");
  const [botId, setBotId] = useState("all");
  const [family, setFamily] = useState("all");
  const [availability, setAvailability] = useState<Availability>("active");
  const [sort, setSort] = useState<SortKey>("updated");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((product) => {
      const matchesBot = botId === "all" || product.bot.id === botId;
      const matchesFamily =
        family === "all" || product.familySlug === family;
      const matchesAvailability =
        availability === "all" ||
        (availability === "active" ? product.isActive : !product.isActive);
      const matchesQuery =
        !q ||
        product.title.toLowerCase().includes(q) ||
        product.id.toLowerCase().includes(q) ||
        product.bot.name.toLowerCase().includes(q) ||
        product.bot.username.toLowerCase().includes(q) ||
        (product.bot.displayName?.toLowerCase().includes(q) ?? false) ||
        (product.familyLabel?.toLowerCase().includes(q) ?? false);
      return (
        matchesBot && matchesFamily && matchesAvailability && matchesQuery
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.title.localeCompare(b.title, "ar");
        case "price":
          return b.price - a.price;
        case "stock":
          return b.stock - a.stock;
        case "source":
          return a.bot.username.localeCompare(b.bot.username);
        case "updated":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });
    return sorted;
  }, [products, botId, family, query, availability, sort]);

  const isFiltered =
    query.trim() !== "" ||
    botId !== "all" ||
    family !== "all" ||
    availability !== "all";

  function resetFilters() {
    setQuery("");
    setBotId("all");
    setFamily("all");
    setAvailability("all");
    setSort("updated");
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="لا توجد منتجات بعد"
        description="لم تُزامَن منتجات إلى قاعدة البيانات. انتظر دورة المزامنة التالية."
      />
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className="uiField">
            <span>بحث</span>
            <input
              type="search"
              placeholder="اسم المنتج أو المعرّف أو المصدر..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-describedby="products-result-count"
            />
          </label>
          <label className="uiField">
            <span>المصدر</span>
            <select
              value={botId}
              onChange={(event) => setBotId(event.target.value)}
            >
              <option value="all">كل المصادر</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {botLabel(bot)}
                </option>
              ))}
            </select>
          </label>
          <label className="uiField">
            <span>الفئة</span>
            <select
              value={family}
              onChange={(event) => setFamily(event.target.value)}
            >
              <option value="all">كل الفئات</option>
              {families.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="uiField">
            <span>التوفر</span>
            <select
              value={availability}
              onChange={(event) =>
                setAvailability(event.target.value as Availability)
              }
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>
          </label>
          <label className="uiField">
            <span>ترتيب حسب</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              <option value="updated">آخر تحديث</option>
              <option value="name">الاسم</option>
              <option value="price">السعر</option>
              <option value="stock">الكمية</option>
              <option value="source">المصدر</option>
            </select>
          </label>
        </div>

        <div className={styles.actions}>
          <p
            id="products-result-count"
            className={styles.count}
            role="status"
            aria-live="polite"
          >
            عرض {filtered.length} من أصل {products.length}
          </p>
          {isFiltered ? (
            <button
              type="button"
              className="uiButtonSecondary"
              onClick={resetFilters}
            >
              مسح الفلاتر
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="لا توجد منتجات مطابقة للفلاتر الحالية"
          description="جرّب كلمات بحث أقصر أو امسح الفلاتر للرجوع لكل المنتجات."
          action={
            <button type="button" className="uiButton" onClick={resetFilters}>
              مسح الفلاتر
            </button>
          }
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="srOnly">قائمة المنتجات</caption>
              <thead>
                <tr>
                  <th scope="col">المنتج</th>
                  <th scope="col">المصدر</th>
                  <th scope="col">السعر</th>
                  <th scope="col">الكمية</th>
                  <th scope="col">آخر تحديث</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className={product.priceStale ? styles.staleRow : undefined}
                  >
                    <td>
                      <Link
                        href={`/products/${product.id}`}
                        className={styles.productTitle}
                      >
                        {product.title}
                      </Link>
                      <span className={`${styles.productSub} ltr`}>
                        {product.id.slice(0, 10)}…
                      </span>
                    </td>
                    <td>
                      <BotIdentity bot={product.bot} />
                    </td>
                    <td className={styles.price}>
                      {formatPrice(product.price, product.currency)}
                      {product.wholesalePrice !== product.price ? (
                        <span className={styles.secondaryPrice}>
                          جملة{" "}
                          {formatPrice(
                            product.wholesalePrice,
                            product.currency,
                          )}
                        </span>
                      ) : null}
                      {product.priceStale ? (
                        <span className={styles.staleHint}>
                          غير مؤكد — المزامنة متوقفة
                        </span>
                      ) : null}
                    </td>
                    <td className={styles.stock}>
                      {formatStock(product.stock)}
                    </td>
                    <td className={styles.time}>
                      {formatRelativeTime(product.updatedAt)}
                    </td>
                    <td>
                      <StatusBadge
                        kind={
                          product.priceStale
                            ? "stale"
                            : product.isActive
                              ? "active"
                              : "inactive"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.cards}>
            {filtered.map((product) => (
              <article
                key={product.id}
                className={`${styles.card} ${product.priceStale ? styles.staleRow : ""}`}
              >
                <div className={styles.cardTop}>
                  <div>
                    <Link
                      href={`/products/${product.id}`}
                      className={styles.productTitle}
                    >
                      {product.title}
                    </Link>
                    <BotIdentity bot={product.bot} compact className={styles.cardBot} />
                  </div>
                  <StatusBadge
                    kind={
                      product.priceStale
                        ? "stale"
                        : product.isActive
                          ? "active"
                          : "inactive"
                    }
                  />
                </div>
                <div className={styles.cardMeta}>
                  <div>
                    <span className={styles.cardMetaLabel}>السعر</span>
                    <span className={styles.cardMetaValue}>
                      {formatPrice(product.price, product.currency)}
                    </span>
                    {product.priceStale ? (
                      <span className={styles.staleHint}>غير مؤكد</span>
                    ) : null}
                  </div>
                  <div>
                    <span className={styles.cardMetaLabel}>الكمية</span>
                    <span className={styles.cardMetaValue}>
                      {formatStock(product.stock)}
                    </span>
                  </div>
                  <div>
                    <span className={styles.cardMetaLabel}>التحديث</span>
                    <span className={styles.cardMetaValue}>
                      {formatRelativeTime(product.updatedAt)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
