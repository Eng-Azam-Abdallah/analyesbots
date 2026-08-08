import { notFound } from "next/navigation";
import { ApiErrorState } from "@/components/ApiErrorState";
import { BotStoreClient } from "@/components/BotStoreClient";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getBotStore } from "@/lib/api";
import { botDisplayName } from "@/lib/format";

type Props = { params: Promise<{ username: string }> };

export default async function BotStorePage({ params }: Props) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw).replace(/^@/, "").trim();
  if (!username) notFound();

  try {
    const store = await getBotStore(username);
    const title = botDisplayName(store);

    return (
      <div className="pageEnter">
        <PageHeader
          title={`متجر ${title}`}
          description="كتالوج كامل لمنتجات هذا التاجر: الأسعار والكميات والحالة من آخر مزامنة."
          status={`${store.counts.active} نشط من ${store.counts.total}`}
        />
        <BotStoreClient store={store} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="pageEnter">
        <PageHeader
          title="متجر التاجر"
          description="كتالوج منتجات مصدر واحد."
        />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل متجر التاجر."
          }
        />
      </div>
    );
  }
}
