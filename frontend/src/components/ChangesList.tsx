import Link from "next/link";
import type { ApiChange } from "@/lib/types";
import {
  absoluteDiff,
  formatPercent,
  formatPrice,
  formatRelativeTime,
  formatStock,
} from "@/lib/format";
import { isStockKind } from "@/lib/labels";
import { BotIdentity } from "./BotIdentity";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import styles from "./ChangesList.module.css";

type ChangesListProps = {
  items: ApiChange[];
  variant?: "feed" | "table";
};

function ChangeValues({ item }: { item: ApiChange }) {
  const currency = item.product.currency || "USDT";
  const stockChange = isStockKind(item.kind);

  if (stockChange) {
    return (
      <div className={styles.values} aria-label="تغيّر الكمية">
        <span className={`${styles.from} tabular`}>
          {formatStock(item.fromStock)}
        </span>
        <span className={styles.arrow} aria-hidden>
          ←
        </span>
        <span className={`${styles.to} tabular`}>
          {formatStock(item.toStock)}
        </span>
      </div>
    );
  }

  if (item.kind === "new" || item.kind === "gone") {
    return (
      <div className={styles.values} aria-label="قيمة المنتج">
        <span className={`${styles.to} tabular`}>
          {item.toPrice !== null
            ? formatPrice(item.toPrice, currency)
            : item.fromPrice !== null
              ? formatPrice(item.fromPrice, currency)
              : "—"}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.values} aria-label="تغيّر السعر">
      <span className={`${styles.from} tabular`}>
        {formatPrice(item.fromPrice, currency)}
      </span>
      <span className={styles.arrow} aria-hidden>
        ←
      </span>
      <span className={`${styles.to} tabular`}>
        {formatPrice(item.toPrice, currency)}
      </span>
    </div>
  );
}

function DiffMeta({ item }: { item: ApiChange }) {
  const stockChange = isStockKind(item.kind);
  const currency = item.product.currency || "USDT";

  if (stockChange) {
    const diff = absoluteDiff(item.fromStock, item.toStock);
    return (
      <>
        <span className={styles.percent}>
          {item.changePercent !== null
            ? formatPercent(item.changePercent)
            : "تغيّر كمية"}
        </span>
        {diff !== null ? (
          <span className={styles.diff}>
            الفرق {diff > 0 ? "+" : ""}
            {diff}
          </span>
        ) : null}
      </>
    );
  }

  if (item.kind === "new") {
    return <span className={styles.percent}>أول ظهور</span>;
  }
  if (item.kind === "gone") {
    return <span className={styles.percent}>خرج من السوق</span>;
  }

  const diff = absoluteDiff(item.fromPrice, item.toPrice);
  return (
    <>
      <span className={styles.percent}>
        {formatPercent(item.changePercent)}
      </span>
      {diff !== null ? (
        <span className={styles.diff}>
          الفرق {diff > 0 ? "+" : ""}
          {diff.toFixed(2)} {currency}
        </span>
      ) : null}
    </>
  );
}

export function ChangesList({ items, variant = "feed" }: ChangesListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="لا توجد تغيّرات مطابقة للفلاتر"
        description="جرّب تصفية أخرى أو امسح الفلاتر. عند حدوث تغيّر سعر أو كمية في المزامنة سيظهر هنا."
      />
    );
  }

  if (variant === "table") {
    return (
      <>
        <div className={`${styles.mobileOnly}`}>
          <FeedList items={items} />
        </div>
        <div className={`${styles.desktopOnly} ${styles.tableWrap}`}>
          <table className={styles.table}>
            <caption className="srOnly">سجل تغيّرات السوق</caption>
            <thead>
              <tr>
                <th scope="col">المنتج</th>
                <th scope="col">المصدر</th>
                <th scope="col">النوع</th>
                <th scope="col">قبل</th>
                <th scope="col">بعد</th>
                <th scope="col">النسبة</th>
                <th scope="col">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const currency = item.product.currency || "USDT";
                const stock = isStockKind(item.kind);
                return (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/products/${item.product.id}`}>
                        {item.product.title}
                      </Link>
                    </td>
                    <td>
                      <BotIdentity bot={item.product.bot} compact linkToStore />
                    </td>
                    <td>
                      <StatusBadge kind={item.kind} />
                    </td>
                    <td className="tabular">
                      {stock
                        ? formatStock(item.fromStock)
                        : formatPrice(item.fromPrice, currency)}
                    </td>
                    <td className="tabular">
                      {stock
                        ? formatStock(item.toStock)
                        : formatPrice(item.toPrice, currency)}
                    </td>
                    <td className="tabular">
                      {item.changePercent !== null
                        ? formatPercent(item.changePercent)
                        : item.kind === "new"
                          ? "أول ظهور"
                          : item.kind === "gone"
                            ? "خرج"
                            : "—"}
                    </td>
                    <td>
                      <time
                        className={`${styles.time} tabular`}
                        dateTime={item.capturedAt}
                        title={item.capturedAt}
                      >
                        {formatRelativeTime(item.capturedAt)}
                      </time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return <FeedList items={items} />;
}

function FeedList({ items }: { items: ApiChange[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={`${styles.row} ${styles[item.kind]}`}>
          <div className={styles.main}>
            <StatusBadge kind={item.kind} />
            <div>
              <p className={styles.title}>
                <Link href={`/products/${item.product.id}`}>
                  {item.product.title}
                </Link>
              </p>
              <p className={styles.meta}>
                <BotIdentity bot={item.product.bot} compact layout="inline" linkToStore />
              </p>
            </div>
          </div>

          <ChangeValues item={item} />

          <div className={styles.side}>
            <DiffMeta item={item} />
            <time
              className={`${styles.time} tabular`}
              dateTime={item.capturedAt}
            >
              {formatRelativeTime(item.capturedAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
