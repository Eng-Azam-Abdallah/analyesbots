import { ApiErrorState } from "@/components/ApiErrorState";
import { PageHeader } from "@/components/PageHeader";
import { ProductsTable } from "@/components/ProductsTable";
import { ApiError, getBots, getCategories, getProducts } from "@/lib/api";

export default async function ProductsPage() {
  try {
    const [products, bots, categories] = await Promise.all([
      getProducts(),
      getBots(),
      getCategories(),
    ]);

    return (
      <div className="pageEnter">
        <PageHeader
          title="المنتجات"
          description="اكتشف المنتجات وقارن الأسعار والكميات عبر المصادر المتزامنة."
          status={`${products.length} منتج في القاعدة`}
        />
        <ProductsTable
          products={products}
          bots={bots}
          families={categories.data.map((f) => ({
            slug: f.slug,
            label: f.label,
          }))}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="pageEnter">
        <PageHeader
          title="المنتجات"
          description="قائمة المنتجات من قاعدة البيانات."
        />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل قائمة المنتجات."
          }
        />
      </div>
    );
  }
}
