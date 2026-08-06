import Link from "next/link";
import { ApiErrorState } from "@/components/ApiErrorState";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getCategories } from "@/lib/api";
import { formatPrice, formatStock } from "@/lib/format";
import styles from "./page.module.css";

export default async function CategoriesPage() {
  try {
    const result = await getCategories();

    return (
      <div className="pageEnter">
        <PageHeader
          title="الفئات"
          description="تجميع المنتجات عبر كل البوتات حسب العائلة: ChatGPT، Claude، Netflix…"
          status={`${result.count} فئة`}
        />

        {result.data.length === 0 ? (
          <EmptyState
            title="لا توجد فئات بعد"
            description="انتظر المزامنة أو شغّل إعادة التصنيف من الـ API."
          />
        ) : (
          <div className={styles.grid}>
            {result.data.map((family) => (
              <Link
                key={family.slug}
                href={`/categories/${family.slug}`}
                className={styles.card}
              >
                <p className={styles.label}>{family.label}</p>
                <div className={styles.meta}>
                  <div className={styles.metaItem}>
                    <span>العروض</span>
                    <strong>{family.offerCount}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>المخزون</span>
                    <strong>{formatStock(family.totalStock)}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>البوتات</span>
                    <strong>{family.coverage}</strong>
                  </div>
                  <div className={styles.metaItem}>
                    <span>أقل سعر</span>
                    <strong>
                      {family.minPrice !== null
                        ? formatPrice(family.minPrice, "USDT")
                        : "—"}
                    </strong>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <ApiErrorState
        message={
          error instanceof ApiError
            ? error.message
            : "تعذّر تحميل الفئات."
        }
      />
    );
  }
}
