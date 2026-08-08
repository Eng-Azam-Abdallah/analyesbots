import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiErrorState } from "@/components/ApiErrorState";
import { BotIdentity } from "@/components/BotIdentity";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getCategory } from "@/lib/api";
import { formatPrice, formatStock } from "@/lib/format";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;

  try {
    const family = await getCategory(slug);
    if (!family) notFound();

    return (
      <div className="pageEnter">
        <PageHeader
          title={family.label}
          description={`مقارنة عروض ${family.label} عبر كل البوتات — السعر والكمية.`}
          status={`${family.offerCount} عرض`}
        />

        <div className={styles.summary}>
          <div className={styles.cell}>
            <span>المخزون الكلي</span>
            <strong>{formatStock(family.totalStock)}</strong>
          </div>
          <div className={styles.cell}>
            <span>تغطية البوتات</span>
            <strong>{family.coverage}</strong>
          </div>
          <div className={styles.cell}>
            <span>أقل سعر</span>
            <strong>
              {family.minPrice !== null
                ? formatPrice(family.minPrice, "USDT")
                : "—"}
            </strong>
          </div>
          <div className={styles.cell}>
            <span>وسيط السعر</span>
            <strong>
              {family.medianPrice !== null
                ? formatPrice(family.medianPrice, "USDT")
                : "—"}
            </strong>
          </div>
        </div>

        {family.products.length === 0 ? (
          <EmptyState
            title="لا عروض في هذه الفئة"
            description="قد تحتاج إعادة تصنيف المنتجات بعد تحديث القواعد."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المصدر</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>المدة</th>
                </tr>
              </thead>
              <tbody>
                {family.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/products/${product.id}`}>
                        {product.title}
                      </Link>
                    </td>
                    <td>
                      <BotIdentity bot={product.bot} compact linkToStore />
                    </td>
                    <td className="tabular">
                      {formatPrice(product.price, product.currency)}
                    </td>
                    <td className="tabular">{formatStock(product.stock)}</td>
                    <td>{product.durationTag ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <ApiErrorState
        message={
          error instanceof ApiError
            ? error.message
            : "تعذّر تحميل تفاصيل الفئة."
        }
      />
    );
  }
}
