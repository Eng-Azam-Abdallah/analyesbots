"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApiBotStore } from "@/lib/types";
import {
  botDisplayName,
  formatPrice,
  formatRelativeTime,
  formatStock,
  sourceLabel,
  telegramBotUrl,
} from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import styles from "./BotStoreClient.module.css";

type Availability = "active" | "inactive" | "all";
type SortKey = "updated" | "price" | "stock" | "name";

type BotStoreClientProps = {
  store: ApiBotStore;
};

export function BotStoreClient({ store }: BotStoreClientProps) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<Availability>("active");
  const [family, setFamily] = useState("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [changedOnly, setChangedOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = store.products.filter((product) => {
      const matchesAvailability =
        availability === "all" ||
        (availability === "active" ? product.isActive : !product.isActive);
      const matchesFamily =
        family === "all" || product.familySlug === family;
      const matchesChanged = !changedOnly || product.priceChanged24h;
      const matchesQuery =
        !q ||
        product.title.toLowerCase().includes(q) ||
        (product.familyLabel?.toLowerCase().includes(q) ?? false);
      return (
        matchesAvailability && matchesFamily && matchesChanged && matchesQuery
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "price":
          return b.price - a.price;
        case "stock":
          return b.stock - a.stock;
        case "name":
          return a.title.localeCompare(b.title, "ar");
        case "updated":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });
    return sorted;
  }, [store.products, query, availability, family, sort, changedOnly]);

  const handle = store.username.replace(/^@/, "");
  const telegramHref = telegramBotUrl(handle);
  const title = botDisplayName(store);

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <p className={styles.eyebrow}>{sourceLabel(store.sourceType)}</p>
          <h2 className={styles.storeName}>{title}</h2>
          {telegramHref ? (
            <a
              className={`${styles.handle} ltr`}
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{handle}
            </a>
          ) : (
            <span className={`${styles.handlePlain} ltr`}>@{handle}</span>
          )}
          <p className={styles.meta}>
            آخر مزامنة ناجحة: {formatRelativeTime(store.lastSyncedAt)}
            {store.lastRun
              ? ` · آخر محاولة: ${formatRelativeTime(store.lastRun.startedAt)}`
              : null}
          </p>
          {store.priceStale ? (
            <p className={styles.staleBanner} role="status">
              بيانات قديمة — المزامنة متوقفة أو متأخرة. الأسعار غير مؤكدة.
            </p>
          ) : null}
          {store.lastRun?.status === "error" && store.lastRun.errorMessage ? (
            <details className={styles.errorBox}>
              <summary>آخر خطأ مزامنة</summary>
              <pre>{store.lastRun.errorMessage}</pre>
            </details>
          ) : null}
        </div>
        <div className={styles.heroActions}>
          {telegramHref ? (
            <a
              className={styles.primaryBtn}
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              فتح في تليجرام
            </a>
          ) : null}
          <Link className={styles.secondaryBtn} href="/bots">
            كل المصادر
          </Link>
        </div>
      </section>

      <div className={styles.summary}>
        <div className={styles.cell}>
          <span>نشط / إجمالي</span>
          <strong>
            {store.counts.active} / {store.counts.total}
          </strong>
        </div>
        <div className={styles.cell}>
          <span>أقل سعر نشط</span>
          <strong>
            {store.summary.minPrice !== null
              ? formatPrice(store.summary.minPrice, "USDT")
              : "—"}
          </strong>
        </div>
        <div className={styles.cell}>
          <span>أعلى سعر نشط</span>
          <strong>
            {store.summary.maxPrice !== null
              ? formatPrice(store.summary.maxPrice, "USDT")
              : "—"}
          </strong>
        </div>
        <div className={styles.cell}>
          <span>المخزون الكلي</span>
          <strong>{formatStock(store.summary.totalStock)}</strong>
        </div>
        <div className={styles.cell}>
          <span>عائلات</span>
          <strong>{store.summary.familyCount}</strong>
        </div>
        <div className={styles.cell}>
          <span>تغيّر سعر 24س</span>
          <strong>{store.summary.priceChanges24h}</strong>
        </div>
        {store.balance ? (
          <div className={styles.cell}>
            <span>رصيد API</span>
            <strong>
              {formatPrice(store.balance.balance, store.balance.currency)}
            </strong>
          </div>
        ) : null}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className="uiField">
            <span>بحث</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اسم المنتج أو العائلة…"
            />
          </label>
          <label className="uiField">
            <span>التوفر</span>
            <select
              value={availability}
              onChange={(e) =>
                setAvailability(e.target.value as Availability)
              }
            >
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
              <option value="all">الكل</option>
            </select>
          </label>
          <label className="uiField">
            <span>العائلة</span>
            <select
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="all">كل العائلات</option>
              {store.families.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="uiField">
            <span>ترتيب</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="updated">آخر تحديث</option>
              <option value="price">السعر</option>
              <option value="stock">الكمية</option>
              <option value="name">الاسم</option>
            </select>
          </label>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={changedOnly}
            onChange={(e) => setChangedOnly(e.target.checked)}
          />
          تغيّر سعر خلال 24 ساعة فقط
        </label>
        <p className={styles.count} role="status">
          {filtered.length} منتج معروض
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="لا منتجات مطابقة"
          description="جرّب تغيير البحث أو الفلتر أو إظهار الموقوف."
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="srOnly">منتجات متجر {title}</caption>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>العائلة</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>آخر تحديث</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className={
                      product.priceChanged24h ? styles.changedRow : undefined
                    }
                  >
                    <td>
                      <Link
                        href={`/products/${product.id}`}
                        className={styles.productTitle}
                      >
                        {product.title}
                      </Link>
                      {product.durationTag ? (
                        <span className={styles.productSub}>
                          مدة {product.durationTag}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {product.familySlug ? (
                        <Link href={`/categories/${product.familySlug}`}>
                          {product.familyLabel || product.familySlug}
                        </Link>
                      ) : (
                        "—"
                      )}
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
                      {product.priceChanged24h ? (
                        <span className={styles.changeHint}>
                          {product.priceChangeKind === "up"
                            ? "طلع خلال 24س"
                            : "نزل خلال 24س"}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular">{formatStock(product.stock)}</td>
                    <td>{formatRelativeTime(product.updatedAt)}</td>
                    <td>
                      <StatusBadge
                        kind={
                          store.priceStale
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
                className={`${styles.card} ${product.priceChanged24h ? styles.changedRow : ""}`}
              >
                <div className={styles.cardTop}>
                  <div>
                    <Link
                      href={`/products/${product.id}`}
                      className={styles.productTitle}
                    >
                      {product.title}
                    </Link>
                    <span className={styles.productSub}>
                      {product.familyLabel || "بدون عائلة"}
                      {product.durationTag ? ` · ${product.durationTag}` : ""}
                    </span>
                  </div>
                  <StatusBadge
                    kind={
                      store.priceStale
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
