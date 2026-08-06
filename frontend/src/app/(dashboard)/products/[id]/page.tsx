import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiErrorState } from "@/components/ApiErrorState";
import { BotIdentity } from "@/components/BotIdentity";
import { PageHeader } from "@/components/PageHeader";
import { ProductHistoryPanel } from "@/components/ProductHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiError, getProduct, getProductHistory } from "@/lib/api";
import {
  botDisplayName,
  formatExactTime,
  formatPrice,
  formatRelativeTime,
  formatStock,
  stripHtml,
} from "@/lib/format";
import styles from "./page.module.css";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;

  try {
    const [product, history] = await Promise.all([
      getProduct(id),
      getProductHistory(id),
    ]);

    const description = stripHtml(product.description);
    const delivery = stripHtml(product.deliveryInstruction);

    return (
      <div className="pageEnter">
        <nav aria-label="مسار التنقل">
          <ol className={styles.crumbs}>
            <li>
              <Link href="/">لوحة السوق</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/products">المنتجات</Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{product.title}</li>
          </ol>
        </nav>

        <PageHeader
          title={product.title}
          description={`المصدر ${botDisplayName(product.bot)} · آخر تحديث ${formatRelativeTime(product.updatedAt)}`}
          status={product.isActive ? "نشط" : "موقوف"}
        />

        <div className={styles.metaRow}>
          <span className={styles.botChip}>
            <BotIdentity bot={product.bot} layout="inline" />
          </span>
          <span className={`${styles.chip} ltr`}>{product.externalKey}</span>
          <StatusBadge kind={product.isActive ? "active" : "inactive"} />
        </div>

        <section className={styles.grid} aria-label="ملخص المنتج">
          <div className={styles.cell}>
            <span className={styles.label}>السعر التحليلي</span>
            <strong>
              {formatPrice(product.prices.current, product.currency)}
            </strong>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>سعر الجملة</span>
            <strong>
              {formatPrice(product.prices.wholesale, product.currency)}
            </strong>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>الكمية</span>
            <strong>{formatStock(product.stock)}</strong>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>آخر مزامنة المصدر</span>
            <strong>{formatRelativeTime(product.bot.lastSyncedAt)}</strong>
          </div>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>معلومات المنتج</h2>
          <ul className={styles.priceList}>
            <li>
              <span>العملة</span>
              <strong className="tabular">{product.currency}</strong>
            </li>
            <li>
              <span>عرض</span>
              <strong className="tabular">
                {formatPrice(product.prices.offer, product.currency)}
              </strong>
            </li>
            <li>
              <span>عادي</span>
              <strong className="tabular">
                {formatPrice(product.prices.regular, product.currency)}
              </strong>
            </li>
            <li>
              <span>أساسي</span>
              <strong className="tabular">
                {formatPrice(product.prices.base, product.currency)}
              </strong>
            </li>
            <li>
              <span>تاريخ الإضافة</span>
              <strong className="tabular">
                {formatExactTime(product.createdAt)}
              </strong>
            </li>
            <li>
              <span>المعرّف الخارجي</span>
              <strong className="ltr">{product.externalKey}</strong>
            </li>
          </ul>
          {description ? (
            <>
              <h3 className={styles.blockTitle} style={{ fontSize: "1rem" }}>
                الوصف
              </h3>
              <p className={styles.text}>{description}</p>
            </>
          ) : null}
          {delivery ? (
            <>
              <h3
                className={styles.blockTitle}
                style={{ fontSize: "1rem", marginTop: 16 }}
              >
                تعليمات التسليم
              </h3>
              <p className={styles.text}>{delivery}</p>
            </>
          ) : null}
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>سجل السعر والكمية</h2>
          <ProductHistoryPanel
            history={history}
            currency={product.currency}
          />
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <div className="pageEnter">
        <PageHeader title="تفاصيل المنتج" description="" />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل تفاصيل المنتج."
          }
        />
      </div>
    );
  }
}
